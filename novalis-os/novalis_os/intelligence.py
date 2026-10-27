"""Project stakeholders and role-aware, explainable workflow recommendations."""
from datetime import date
from flask import Blueprint, g, jsonify, abort
from .db import get_db, row, rows, transaction, uid, now, audit
from .security import required, project_access
from .validation import data, text, choice, integer, email

intelligence = Blueprint('intelligence', __name__)
CATEGORIES = {'sponsor':'Sponsor','decision':'Décision','delivery':'Réalisation',
              'consulted':'Consultation','informed':'Information'}

def access(project_id, edit=False):
    p = project_access(project_id, staff=edit, finances=g.user['role']=='finance')
    if edit and p['status']=='archived':
        abort(409, 'Le projet est archivé.')
    return p

def visible_stakeholders(project_id):
    sql = 'SELECT * FROM project_stakeholders WHERE project_id=?'
    if g.user['role'] in {'client','developer'}:
        sql += " AND visibility='shared'"
    return rows(sql+' ORDER BY category,name',(project_id,))

@intelligence.get('/api/projects/<project_id>/stakeholders')
@required('manager','account','developer','client','finance')
def stakeholders(project_id):
    access(project_id)
    return jsonify(items=visible_stakeholders(project_id),categories=CATEGORIES,
                   editable=g.user['role'] in {'manager','account'})

def clean(d):
    address=text(d,'email',254,0,'')
    if address:address=email({'email':address})
    return (text(d,'name',120),text(d,'organisation',150,0,''),
            address,text(d,'responsibility',1000),
            choice(d,'category',CATEGORIES),
            choice(d,'visibility',['internal','shared'],'internal'),
            choice(d,'status',['active','pending','inactive'],'active'))

@intelligence.post('/api/projects/<project_id>/stakeholders')
@required('manager','account')
def add(project_id):
    d=data()
    with transaction() as db:
        access(project_id,True)
        if row('SELECT COUNT(*) n FROM project_stakeholders WHERE project_id=?',(project_id,))['n']>=150:
            abort(409,'Le registre est limité à 150 parties prenantes par projet.')
        identifier=uid()
        db.execute('''INSERT INTO project_stakeholders
          (id,project_id,name,organisation,email,responsibility,category,visibility,status,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?)''',(identifier,project_id,*clean(d),now()))
        audit('stakeholder.created',identifier,{'project_id':project_id})
    return jsonify(id=identifier),201

@intelligence.patch('/api/projects/<project_id>/stakeholders/<identifier>')
@required('manager','account')
def edit(project_id,identifier):
    d=data()
    with transaction() as db:
        access(project_id,True)
        person=row('SELECT * FROM project_stakeholders WHERE id=? AND project_id=?',(identifier,project_id))
        if not person:abort(404)
        version=integer(d,'version',1)
        count=db.execute('''UPDATE project_stakeholders SET name=?,organisation=?,email=?,responsibility=?,
          category=?,visibility=?,status=?,version=version+1 WHERE id=? AND version=?''',
          (*clean(d),identifier,version)).rowcount
        if not count:abort(409,'La fiche a changé. Actualisez la page.')
        audit('stakeholder.updated',identifier,{'project_id':project_id})
    return jsonify(ok=True)

def workflow(project_id):
    """Suggestions are advisory. Existing write endpoints remain the authority."""
    p=access(project_id)
    role=g.user['role']
    phases=rows('''SELECT ph.id,ph.name,ph.price_cents,m.status,
          (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id=ph.milestone_id) task_count
          FROM project_phases ph JOIN milestones m ON m.id=ph.milestone_id
          WHERE ph.project_id=? ORDER BY ph.position''',(project_id,))
    spec=row('SELECT id,status,number,sections FROM project_specs WHERE project_id=? ORDER BY number DESC LIMIT 1',(project_id,))
    invoices=rows('''SELECT i.id,i.status,i.due_date,i.external_number,b.published_at,b.canceled_at,b.test_mode
       FROM invoices i JOIN billing_documents b ON b.invoice_id=i.id
       WHERE i.project_id=? AND b.canceled_at IS NULL''',(project_id,))
    decisions=[]
    def suggest(code,title,reason,target,priority):
        decisions.append(dict(code=code,title=title,reason=reason,target=target,priority=priority))
    if role in {'manager','account'}:
        if not phases:suggest('create_phase','Structurer les étapes','Créer une phase génère son jalon et prépare ses livrables.','phase-new',1)
        if any(not ph['task_count'] for ph in phases):
            suggest('link_tasks','Affecter les tâches aux phases','Au moins une phase ne comporte pas de tâche reliée.','plan',2)
        if not spec:
            suggest('specification','Créer le cahier des charges','Centraliser le périmètre, les acteurs et les prix par étape.','specification',1)
        elif spec['status']=='draft':
            import json
            content=json.loads(spec['sections'])
            missing=[k for k in ('context','scope','deliverables','acceptance','payment') if not content.get(k,'').strip()]
            suggest('complete_spec','Préparer l’accord des parties',('Rubriques à compléter : '+', '.join(missing)+'.') if missing else 'Le brouillon peut être soumis à validation.','specification',1)
        elif spec['status']=='shared':
            suggest('approvals','Suivre les accords','La version partagée attend la validation des parties.','specification',1)
        elif spec['status']=='accepted' and role=='manager':
            for ph in phases:
                reserved=row('''SELECT COALESCE(SUM(pi.amount_cents),0) n FROM phase_invoices pi
                  JOIN billing_documents b ON b.invoice_id=pi.invoice_id
                  WHERE pi.phase_id=? AND b.canceled_at IS NULL''',(ph['id'],))['n']
                if ph['price_cents']>reserved:
                    suggest('bill_phase','Préparer la facturation de '+ph['name'],
                      'La phase dispose encore de '+f"{(ph['price_cents']-reserved)/100:,.2f}".replace(',',' ').replace('.',',')+' € HT à facturer.',
                      'phase-invoice:'+ph['id'],2)
                    break
        if not row('SELECT 1 FROM project_stakeholders WHERE project_id=?',(project_id,)):
            suggest('stakeholders','Identifier les parties prenantes','Préciser qui décide, valide, réalise et doit être informé.','stakeholders',2)
    if role in {'manager','finance'} and invoices:
        unpaid=[i for i in invoices if i['published_at'] and i['status']!='paid' and i['due_date']<date.today().isoformat()]
        if unpaid:suggest('overdue','Vérifier les échéances','Une facture publiée est arrivée à échéance ; vérifier les règlements et relancer si nécessaire.','invoice:'+unpaid[0]['id'],1)
    if role=='client' and spec and spec['status']=='shared':
        suggest('client_signoff','Examiner le cahier des charges','Les accords portent sur la version, les prix et les livrables figés.','specification',1)
    if role=='developer' and any(not ph['task_count'] for ph in phases):
        suggest('task_mapping','Suivre les étapes','Certaines phases n’ont pas encore de tâches liées.','plan',2)
    return sorted(decisions,key=lambda a:a['priority'])[:6]

@intelligence.get('/api/projects/<project_id>/intelligence')
@required('manager','account','developer','client','finance')
def insights(project_id):
    return jsonify(actions=workflow(project_id))
