"""Shared project planning, versioned agreements and phase-based billing."""
import json
import math
from flask import Blueprint, g, jsonify, abort, Response
from .db import row, rows, get_db, transaction, uid, now, audit, notify
from .security import required, project_access
from .validation import data, text, integer, day, choice

planning = Blueprint('planning', __name__)
SECTIONS = {'context':'Contexte et objectifs','audience':'Utilisateurs et parcours','scope':'Périmètre fonctionnel',
 'requirements':'Exigences et priorités','quality':'Performance, accessibilité et sécurité','data':'Données et intégrations',
 'deliverables':'Livrables attendus','acceptance':'Recette et critères d’acceptation','responsibilities':'Responsabilités et contributions',
 'constraints':'Hypothèses et contraintes','exclusions':'Exclusions','changes':'Gestion des changements',
 'support':'Livraison, formation et maintenance','payment':'Conditions de règlement'}
RELATIONS = {'depends':'Dépend de','contains':'Contient','assigned':'Réalisé par','validates':'Validé par','invoices':'Facturé par','relates':'En lien avec'}


def access(project_id, edit=False):
    p = project_access(project_id, staff=edit, finances=g.user['role']=='finance')
    if edit and p['status']=='archived': abort(409,'Ce projet est archivé.')
    return p


def team(p, clients=True):
    return rows("""SELECT DISTINCT u.id,u.name,u.role FROM users u WHERE u.org_id=? AND u.status='active' AND
        (u.id=? OR EXISTS(SELECT 1 FROM project_members m WHERE m.project_id=? AND m.user_id=u.id)
        OR (u.role='client' AND u.client_id=? AND ?)) ORDER BY u.name""",
        (p['org_id'],p['account_id'],p['id'],p['client_id'],int(clients)))


def latest(project_id):
    return row('SELECT * FROM project_specs WHERE project_id=? ORDER BY number DESC LIMIT 1',(project_id,))


def plan_writable(project_id):
    spec=latest(project_id)
    if spec and spec['status'] in {'shared','accepted'}:
        abort(409,'Créez une nouvelle version du cahier des charges avant de modifier le périmètre partagé.')


def phases(project_id, financial=True):
    items=rows('''SELECT p.*,m.status FROM project_phases p JOIN milestones m ON m.id=p.milestone_id
        WHERE p.project_id=? ORDER BY p.position,p.created_at''',(project_id,))
    for item in items:
        item['task_ids']=[r['task_id'] for r in rows('SELECT task_id FROM phase_tasks WHERE phase_id=?',(item['id'],))]
        if g.user['role']=='client':
            item['task_ids']=[r['id'] for r in rows('SELECT t.id FROM tasks t JOIN phase_tasks pt ON pt.task_id=t.id WHERE pt.phase_id=? AND t.client_visible=1',(item['id'],))]
        if financial:
            item['reserved_cents']=row('''SELECT COALESCE(SUM(pi.amount_cents),0) n FROM phase_invoices pi
                JOIN billing_documents b ON b.invoice_id=pi.invoice_id WHERE pi.phase_id=? AND b.canceled_at IS NULL''',(item['id'],))['n']
            item['remaining_cents']=max(0,item['price_cents']-item['reserved_cents'])
        else:
            for k in ['price_cents','vat_basis_points']:item.pop(k,None)
    return items


@planning.get('/api/planning/<project_id>')
@required('manager','account','developer','client','finance')
def overview(project_id):
    p=access(project_id)
    financial=g.user['role']!='developer'
    specs=rows('SELECT * FROM project_specs WHERE project_id=? ORDER BY number DESC',(project_id,)) if financial else []
    # Drafts are collaborative; access remains restricted to this project's participants.
    specs=[present_spec(s) for s in specs]
    invoices=[]
    if g.user['role'] in {'manager','finance','client'}:
        from .billing import document, presented
        for r in rows('''SELECT pi.* FROM phase_invoices pi JOIN project_phases ph ON ph.id=pi.phase_id
            JOIN billing_documents b ON b.invoice_id=pi.invoice_id WHERE ph.project_id=?'''+
            (' AND b.published_at IS NOT NULL AND b.canceled_at IS NULL' if g.user['role']=='client' else ''),(project_id,)):
            inv,doc=document(r['invoice_id']);invoices.append({**presented(inv,doc),'phase_id':r['phase_id']})
    documents=rows("SELECT id,filename,mime,size,created_at FROM documents WHERE project_id=? AND channel='external' ORDER BY created_at DESC",(project_id,)) if financial else []
    from .intelligence import visible_stakeholders, workflow
    return jsonify(phases=phases(project_id,financial),specs=specs,team=team(p),stakeholders=visible_stakeholders(project_id),next_actions=workflow(project_id),documents=documents,invoices=invoices,sections=SECTIONS,relations=RELATIONS,
                   budget_cents=p['budget_cents'] if financial else None)


def phase_values(d,p):
    start,end=day(d,'starts_on'),day(d,'due_date')
    if end<start:abort(400,'La fin doit suivre le début de la phase.')
    return (text(d,'name'),text(d,'description',10000,0,''),text(d,'acceptance',10000,0,''),start,end,
            integer(d,'price_cents',0,100000000),integer(d,'vat_basis_points',0,10000,2100),integer(d,'position',0,1000,0))


@planning.post('/api/planning/<project_id>/phases')
@required('manager','account')
def phase_create(project_id):
    d=data()
    with transaction() as db:
        p=access(project_id,True);plan_writable(project_id);v=phase_values(d,p);identifier,milestone=uid(),uid()
        if len(phases(project_id))>=60:abort(400,'Un projet peut contenir au maximum 60 phases.')
        db.execute('INSERT INTO milestones(id,project_id,name,due_date,description) VALUES(?,?,?,?,?)',(milestone,project_id,v[0],v[4],v[2] or v[1]))
        db.execute('INSERT INTO project_phases(id,project_id,milestone_id,name,description,acceptance,starts_on,due_date,price_cents,vat_basis_points,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
                   (identifier,project_id,milestone,*v,now()))
        audit('phase.created',identifier)
    return jsonify(id=identifier),201


@planning.patch('/api/planning/<project_id>/phases/<identifier>')
@required('manager','account')
def phase_edit(project_id,identifier):
    d=data()
    with transaction() as db:
        p=access(project_id,True);plan_writable(project_id);v=phase_values(d,p)
        old=row('SELECT * FROM project_phases WHERE id=? AND project_id=?',(identifier,project_id))
        if not old:abort(404)
        reserved=row('''SELECT COALESCE(SUM(pi.amount_cents),0) n FROM phase_invoices pi JOIN billing_documents b ON b.invoice_id=pi.invoice_id
            WHERE pi.phase_id=? AND b.canceled_at IS NULL''',(identifier,))['n']
        if v[5]<reserved:abort(409,'Le prix ne peut être inférieur aux montants déjà réservés ou facturés.')
        if not db.execute('''UPDATE project_phases SET name=?,description=?,acceptance=?,starts_on=?,due_date=?,price_cents=?,vat_basis_points=?,position=?,version=version+1
            WHERE id=? AND version=?''',(*v,identifier,integer(d,'version',1))).rowcount:abort(409,'Cette phase a changé. Rechargez-la.')
        db.execute('UPDATE milestones SET name=?,due_date=?,description=?,version=version+1 WHERE id=?',(v[0],v[4],v[2] or v[1],old['milestone_id']))
        audit('phase.updated',identifier)
    return jsonify(ok=True)


@planning.put('/api/planning/<project_id>/phases/<identifier>/tasks')
@required('manager','account')
def phase_assign(project_id,identifier):
    d=data()
    with transaction() as db:
        access(project_id,True)
        phase=row('SELECT * FROM project_phases WHERE id=? AND project_id=?',(identifier,project_id))
        if not phase:abort(404)
        task=row('SELECT * FROM tasks WHERE id=? AND project_id=?',(text(d,'task_id',40),project_id))
        if not task:abort(404)
        milestone=row('SELECT status FROM milestones WHERE id=?',(phase['milestone_id'],))
        if milestone['status'] in {'approved','awaiting_client'}:abort(409,'Cette phase est déjà soumise à validation ou validée. Créez une nouvelle phase pour les travaux supplémentaires.')
        db.execute('INSERT INTO phase_tasks VALUES(?,?) ON CONFLICT(task_id) DO UPDATE SET phase_id=excluded.phase_id',(task['id'],identifier))
        db.execute('UPDATE tasks SET milestone_id=?,version=version+1 WHERE id=?',(phase['milestone_id'],task['id']))
        audit('phase.task_linked',identifier,{'task_id':task['id']})
    return jsonify(ok=True)


def graph_data(p):
    financial=g.user['role']!='developer'
    client=g.user['role']=='client'
    nodes=[dict(id='project:'+p['id'],type='project',title=p['name'],detail=p['due_date'])]
    edges=[]
    def add(kind,item,detail='',parent=None):
        identifier=kind+':'+item['id'];nodes.append(dict(id=identifier,type=kind,title=item['name'],detail=detail,record_id=item['id']))
        if parent:edges.append(dict(source=parent,target=identifier,relation='contains',automatic=True))
        return identifier
    client_name=row('SELECT name FROM clients WHERE id=?',(p['client_id'],))['name']
    add('client',{'id':p['client_id'],'name':client_name},'Client du projet','project:'+p['id'])
    people=team(p)
    if client:people=[x for x in people if x['role'] in {'account','manager','client'}]
    for u in people:add('person',u,{'developer':'Développement','account':'Relation client','manager':'Direction','client':'Client'}.get(u['role'],u['role']))
    phase_items=phases(p['id'],financial)
    for ph in phase_items:add('phase',ph,ph['due_date']+(' · '+f"{ph['price_cents']/100:.2f} € HT" if financial else ''),'project:'+p['id'])
    milestone_phases={ph['milestone_id']:ph['id'] for ph in phase_items}
    for m in rows('SELECT * FROM milestones WHERE project_id=?',(p['id'],)):
        add('milestone',m,m['due_date'],'phase:'+milestone_phases[m['id']] if m['id'] in milestone_phases else 'project:'+p['id'])
    tasks=rows('SELECT * FROM tasks WHERE project_id=?'+(' AND client_visible=1' if client else ''),(p['id'],)) if g.user['role']!='finance' else []
    for t in tasks:
        key=add('task',t,t['status']+' · '+t['due_date'],'milestone:'+t['milestone_id'] if t['milestone_id'] else 'project:'+p['id'])
        if not client:edges.append(dict(source=key,target='person:'+t['assignee_id'],relation='assigned',automatic=True))
    if g.user['role'] in {'manager','finance','client'}:
        for inv in rows('''SELECT i.id,COALESCE(i.external_number,b.title) name,i.due_date,pi.phase_id FROM phase_invoices pi
            JOIN invoices i ON i.id=pi.invoice_id JOIN billing_documents b ON b.invoice_id=i.id JOIN project_phases ph ON ph.id=pi.phase_id
            WHERE ph.project_id=? AND b.canceled_at IS NULL'''+(' AND b.published_at IS NOT NULL' if client else ''),(p['id'],)):
            add('invoice',inv,inv['due_date']);edges.append(dict(source='phase:'+inv['phase_id'],target='invoice:'+inv['id'],relation='invoices',automatic=True))
    saved=row('SELECT * FROM project_graph WHERE project_id=?',(p['id'],))
    payload=json.loads(saved['payload']) if saved else {'positions':{},'edges':[],'notes':[]}
    for n in payload.get('notes',[]):
        if not client or n.get('shared'):nodes.append(n)
    visible={n['id'] for n in nodes}
    edges+=[{**e,'automatic':False} for e in payload['edges']]
    edges=[e for e in edges if e['source'] in visible and e['target'] in visible]
    return dict(nodes=nodes,edges=edges,positions={k:v for k,v in payload['positions'].items() if k in visible},version=saved['version'] if saved else 0)


@planning.get('/api/planning/<project_id>/graph')
@required('manager','account','developer','client','finance')
def graph_get(project_id):return jsonify(graph_data(access(project_id)))


@planning.put('/api/planning/<project_id>/graph')
@required('manager','account')
def graph_save(project_id):
    d=data()
    with transaction() as db:
        p=access(project_id,True);current=graph_data(p)
        if d.get('version')!=current['version']:abort(409,'Le schéma a changé. Rechargez-le avant de réessayer.')
        notes=d.get('notes',[]);edges=d.get('edges',[]);positions=d.get('positions',{})
        if not isinstance(notes,list) or len(notes)>50 or not isinstance(edges,list) or len(edges)>500 or not isinstance(positions,dict):abort(400,'Schéma trop volumineux.')
        clean_notes=[]
        import re
        for n in notes:
            if not isinstance(n,dict) or not re.fullmatch(r'note:[a-zA-Z0-9-]{1,50}',str(n.get('id',''))):abort(400,'Note invalide.')
            clean_notes.append(dict(id=n['id'],type='note',title=text(n,'title',300),detail=text(n,'detail',2000,0,''),shared=n.get('shared') is True))
        valid={n['id'] for n in current['nodes'] if n['type']!='note'}|{n['id'] for n in clean_notes}
        if len({n['id'] for n in clean_notes})!=len(clean_notes):abort(400,'Notes dupliquées.')
        clean_edges=[];seen=set();dependencies={}
        for e in edges:
            if not isinstance(e,dict):abort(400,'Relation invalide.')
            source,target=text(e,'source',100),text(e,'target',100);relation=choice(e,'relation',RELATIONS)
            if source not in valid or target not in valid or source==target:abort(400,'Les relations doivent relier deux éléments distincts du projet.')
            key=(source,target,relation)
            if key in seen:continue
            seen.add(key);clean_edges.append(dict(source=source,target=target,relation=relation))
            if relation=='depends':dependencies.setdefault(source,[]).append(target)
        visiting=set();done=set()
        def visit(n):
            if n in visiting:abort(409,'Cette dépendance crée une boucle. Modifiez le lien.')
            if n in done:return
            visiting.add(n)
            for child in dependencies.get(n,[]):visit(child)
            visiting.remove(n);done.add(n)
        for n in dependencies:visit(n)
        clean_positions={}
        for k,v in positions.items():
            if k not in valid:continue
            if not isinstance(v,dict) or any(type(v.get(a)) not in {int,float} or not math.isfinite(v[a]) or not 0<=v[a]<=20000 for a in ['x','y']):abort(400,'Position invalide.')
            clean_positions[k]={'x':round(v['x']),'y':round(v['y'])}
        payload=json.dumps(dict(positions=clean_positions,edges=clean_edges,notes=clean_notes))
        db.execute('INSERT INTO project_graph VALUES(?,?,1,?) ON CONFLICT(project_id) DO UPDATE SET payload=excluded.payload,version=project_graph.version+1,updated_at=excluded.updated_at',(project_id,payload,now()))
        audit('graph.saved',project_id)
    return jsonify(version=current['version']+1)


def present_spec(s):
    result={k:v for k,v in s.items() if k not in {'sections','attachments','snapshot'}}
    result.update(sections=json.loads(s['sections']),attachments=json.loads(s['attachments']),snapshot=json.loads(s['snapshot']))
    result['comments']=rows('SELECT c.*,u.name author FROM spec_comments c JOIN users u ON u.id=c.author_id WHERE c.spec_id=? ORDER BY c.created_at',(s['id'],))
    return result


def spec_access(identifier):
    s=row('SELECT * FROM project_specs WHERE id=?',(identifier,))
    if not s:abort(404)
    p=access(s['project_id'])
    return s,p


@planning.post('/api/planning/<project_id>/specs')
@required('manager','account')
def spec_create(project_id):
    with transaction() as db:
        p=access(project_id,True);old=latest(project_id)
        if old and old['status']=='draft':abort(409,'Un brouillon existe déjà. Poursuivez cette version.')
        identifier=uid();sections=json.loads(old['sections']) if old else {k:'' for k in SECTIONS}
        if not old:
            items=phases(project_id)
            sections.update(context=p['scope'],scope=p['scope'],
                deliverables='\n\n'.join(ph['name']+' — '+ph['description'] for ph in items),
                acceptance='\n\n'.join(ph['name']+' — '+ph['acceptance'] for ph in items),
                responsibilities='\n'.join(u['name']+' — '+{'account':'Coordination du projet','developer':'Réalisation','client':'Contribution et validation','manager':'Direction'}.get(u['role'],u['role']) for u in team(p)),
                changes='Toute évolution du périmètre fait l’objet d’une nouvelle version et d’un accord sur son coût et son calendrier.')
        db.execute('INSERT INTO project_specs(id,project_id,number,title,sections,attachments,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)',
                   (identifier,project_id,old['number']+1 if old else 1,'Cahier des charges · '+p['name'],json.dumps(sections),old['attachments'] if old else '[]',g.user['id'],now()))
        if old and old['status']=='shared':db.execute("UPDATE project_specs SET status='superseded',version=version+1 WHERE id=?",(old['id'],))
        audit('spec.created',identifier)
    return jsonify(id=identifier),201


@planning.patch('/api/planning/specs/<identifier>')
@required('manager','account')
def spec_edit(identifier):
    d=data()
    with transaction() as db:
        s,p=spec_access(identifier);access(p['id'],True)
        if s['status']!='draft' or d.get('version')!=s['version']:abort(409,'Cette version est figée ou a été modifiée.')
        sections=d.get('sections',{})
        if not isinstance(sections,dict) or set(sections)-set(SECTIONS):abort(400,'Rubriques invalides.')
        sections={k:text(sections,k,12000,0,'') for k in SECTIONS}
        attachments=d.get('attachments',[])
        if not isinstance(attachments,list) or len(attachments)>30 or any(not isinstance(x,str) for x in attachments):abort(400,'Pièces jointes invalides.')
        for a in attachments:
            if not row("SELECT id FROM documents WHERE id=? AND project_id=? AND channel='external'",(a,p['id'])):abort(400,'Choisissez une pièce jointe partagée de ce projet.')
        db.execute('UPDATE project_specs SET title=?,sections=?,attachments=?,version=version+1 WHERE id=?',(text(d,'title',200),json.dumps(sections),json.dumps(list(dict.fromkeys(attachments))),identifier))
        audit('spec.updated',identifier)
    return jsonify(ok=True)


@planning.post('/api/planning/specs/<identifier>/comments')
@required('manager','account','client')
def spec_comment(identifier):
    d=data()
    with transaction() as db:
        s,p=spec_access(identifier)
        if s['status'] in {'accepted','declined','superseded'}:abort(409,'Cette version est clôturée. Commentez la nouvelle version.')
        key=choice(d,'section',list(SECTIONS)+['general'],'general')
        db.execute('INSERT INTO spec_comments VALUES(?,?,?,?,?,?)',(uid(),identifier,g.user['id'],key,text(d,'body',6000),now()))
        audit('spec.commented',identifier)
        notify(p['account_id'],'spec_comment',identifier+':'+uid(),'Une contribution au cahier des charges est disponible.')
    return jsonify(ok=True),201


@planning.post('/api/planning/specs/<identifier>/share')
@required('manager','account')
def spec_share(identifier):
    d=data()
    with transaction() as db:
        s,p=spec_access(identifier);access(p['id'],True)
        if s['status']!='draft' or d.get('version')!=s['version'] or latest(p['id'])['id']!=identifier:abort(409,'Rechargez le brouillon courant.')
        sections=json.loads(s['sections']);items=phases(p['id'])
        if not items or any(not sections.get(k,'').strip() for k in ['context','scope','deliverables','acceptance','payment']):abort(400,'Complétez les objectifs, le périmètre, les livrables, la recette, les règlements et au moins une phase.')
        if any(not ph['acceptance'] for ph in items):abort(400,'Précisez les critères de recette de chaque phase.')
        docs=[]
        for a in json.loads(s['attachments']):
            doc=row("SELECT id,filename,mime,size,sha256 FROM documents WHERE id=? AND project_id=? AND channel='external'",(a,p['id']))
            if not doc:abort(409,'Une pièce jointe n’est plus accessible.')
            docs.append(doc)
        # Client view of the graph is frozen to exclude internal tasks and notes.
        staff=g.user;g.user={**staff,'role':'client','client_id':p['client_id']}
        try:
            graph=graph_data(p)
            for ph in items:ph['task_ids']=[x['id'] for x in rows('SELECT t.id FROM tasks t JOIN phase_tasks pt ON pt.task_id=t.id WHERE pt.phase_id=? AND t.client_visible=1',(ph['id'],))]
        finally:g.user=staff
        from .intelligence import visible_stakeholders
        snapshot=dict(stakeholders=[x for x in visible_stakeholders(p['id']) if x['visibility']=='shared'],project={'id':p['id'],'name':p['name'],'scope':p['scope'],'due_date':p['due_date']},
                      client=row('SELECT name,email,company_number FROM clients WHERE id=?',(p['client_id'],)),phases=items,
                      team=team(p),documents=docs,graph=graph,total_cents=sum(x['price_cents'] for x in items),frozen_at=now())
        db.execute("UPDATE project_specs SET status='shared',snapshot=?,shared_at=?,version=version+1 WHERE id=?",(json.dumps(snapshot),now(),identifier))
        for person in team(p):
            if person['role'] in {'client','manager'}:notify(person['id'],'spec_shared',identifier,'Le cahier des charges attend votre accord.')
        audit('spec.shared',identifier)
    return jsonify(ok=True)


@planning.post('/api/planning/specs/<identifier>/decision')
@required('manager','client')
def spec_decision(identifier):
    d=data()
    with transaction() as db:
        s,p=spec_access(identifier)
        if s['status']!='shared' or d.get('version')!=s['version'] or latest(p['id'])['id']!=identifier:abort(409,'Cette version a changé ou n’attend plus d’accord.')
        decision=choice(d,'decision',['accept','decline'])
        role='manager' if g.user['role']=='manager' else 'client'
        if s[role+'_by']:abort(409,'Votre accord est déjà enregistré.')
        if d.get('confirmed') is not True:abort(400,'Confirmez avoir examiné cette version et les prix par phase.')
        if decision=='decline':
            reason=text(d,'reason',3000)
            db.execute("UPDATE project_specs SET status='declined',version=version+1 WHERE id=?",(identifier,))
            db.execute('INSERT INTO spec_comments VALUES(?,?,?,?,?,?)',(uid(),identifier,g.user['id'],'general',reason,now()))
        else:
            db.execute(f'UPDATE project_specs SET {role}_by=?,{role}_at=?,{role}_name=?,version=version+1 WHERE id=?',(g.user['id'],now(),g.user['name'],identifier))
            updated=row('SELECT * FROM project_specs WHERE id=?',(identifier,))
            if updated['manager_by'] and updated['client_by']:
                db.execute("UPDATE project_specs SET status='accepted' WHERE id=?",(identifier,))
                db.execute('UPDATE projects SET budget_cents=?,version=version+1 WHERE id=?',(json.loads(s['snapshot'])['total_cents'],p['id']))
        audit('spec.'+decision,identifier,{'role':role,'version':s['number']})
    return jsonify(ok=True)


@planning.post('/api/planning/<project_id>/phases/<identifier>/invoice')
@required('manager')
def phase_invoice(project_id,identifier):
    from .billing import settings,calculations,replace_lines
    d=data()
    with transaction() as db:
        p=access(project_id,True);spec=latest(project_id)
        if not spec or spec['status']!='accepted':abort(409,'Le cahier des charges courant doit être accepté par la direction et le client.')
        ph=next((x for x in json.loads(spec['snapshot'])['phases'] if x['id']==identifier),None)
        if not ph:abort(404)
        amount=integer(d,'amount_cents',1,100000000)
        reserved=row('''SELECT COALESCE(SUM(pi.amount_cents),0) n FROM phase_invoices pi JOIN billing_documents b ON b.invoice_id=pi.invoice_id
            WHERE pi.phase_id=? AND b.canceled_at IS NULL''',(identifier,))['n']
        if amount+reserved>ph['price_cents']:abort(409,'Ce montant dépasse le solde disponible de la phase, brouillons compris.')
        purpose=choice(d,'purpose',['deposit','progress','balance'],'progress')
        client=row('SELECT * FROM clients WHERE id=?',(p['client_id'],));seller=settings();issue=day(d,'issue_date');due=day(d,'due_date')
        if due<issue:abort(400,'L’échéance doit suivre la date de facture.')
        title={'deposit':'Acompte','progress':'Situation','balance':'Solde'}[purpose]+' · '+ph['name']
        lines=calculations([dict(description=title,quantity='1',unit_cents=amount,vat_basis_points=ph['vat_basis_points'])])
        snap=dict(recipient={'name':client['name'],'email':client['email'],'company_number':client['company_number'],'vat_number':'','address':'','postal_code':'','city':'','country':'BE'},seller=seller,lines=lines,issue_date=issue,service_date=ph['due_date'],
                  notes='Cahier des charges v'+str(spec['number'])+' · phase '+ph['name'],vat_note='',terms=seller['terms'],reference=identifier,buyer_reference='',title=title)
        test=bool(row('SELECT 1 FROM billing_test_clients WHERE client_id=?',(p['client_id'],)))
        invoice_id=uid();db.execute('INSERT INTO invoices(id,project_id,due_date,created_at) VALUES(?,?,?,?)',(invoice_id,project_id,due,now()))
        replace_lines(db,invoice_id,lines)
        db.execute('INSERT INTO billing_documents(invoice_id,org_id,test_mode,title,recipient_type,snapshot) VALUES(?,?,?,?,?,?)',(invoice_id,g.user['org_id'],int(test),title,'belgian_business',json.dumps(snap)))
        db.execute('INSERT INTO phase_invoices VALUES(?,?,?,?,?)',(invoice_id,identifier,spec['id'],amount,now()))
        audit('phase.invoice_drafted',identifier,{'invoice_id':invoice_id,'amount_cents':amount})
    return jsonify(id=invoice_id),201


@planning.get('/api/planning/specs/<identifier>/pdf')
@required('manager','account','client')
def spec_pdf(identifier):
    from .planning_pdf import specification_pdf
    s,p=spec_access(identifier)
    snapshot=json.loads(s['snapshot']) or dict(project=p,phases=phases(p['id']),team=team(p),documents=[x for x in rows("SELECT id,filename,mime,size FROM documents WHERE project_id=? AND channel='external'",(p['id'],)) if x['id'] in json.loads(s['attachments'])],graph=graph_data(p))
    result=specification_pdf(present_spec(s),snapshot,SECTIONS)
    return Response(result,mimetype='application/pdf',headers={'Content-Disposition':f'attachment; filename="Novalis-cahier-des-charges-v{s["number"]}.pdf"'})


@planning.get('/api/planning/<project_id>/graph/pdf')
@required('manager','account','developer','client','finance')
def graph_pdf(project_id):
    from .planning_pdf import graph_pdf as render
    p=access(project_id)
    return Response(render(p['name'],graph_data(p),RELATIONS),mimetype='application/pdf',headers={'Content-Disposition':'attachment; filename="Novalis-organisation-projet.pdf"'})


@planning.get('/api/planning/<project_id>/dossier/pdf')
@required('manager','client')
def dossier_pdf(project_id):
    from .planning_pdf import specification_pdf
    from .billing import document,presented
    p=access(project_id);s=latest(project_id)
    if not s:abort(409,'Créez un cahier des charges avant d’exporter le dossier.')
    snapshot=json.loads(s['snapshot']) or dict(project=p,phases=phases(p['id']),team=team(p),documents=[],graph=graph_data(p))
    invoices=[]
    for i in rows("SELECT i.id FROM invoices i JOIN billing_documents b ON b.invoice_id=i.id WHERE i.project_id=? AND b.published_at IS NOT NULL AND b.canceled_at IS NULL ORDER BY i.due_date",(project_id,)):
        inv,doc=document(i['id']);invoices.append(presented(inv,doc,True))
    result=specification_pdf(present_spec(s),snapshot,SECTIONS,invoices=invoices)
    return Response(result,mimetype='application/pdf',headers={'Content-Disposition':'attachment; filename="Novalis-dossier-projet.pdf"'})
