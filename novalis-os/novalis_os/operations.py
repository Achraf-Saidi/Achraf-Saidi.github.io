"""Scoped operational reporting and reversible timesheet corrections."""
import csv
import hashlib
import io
import json
import unicodedata
from datetime import date, timedelta
from flask import Blueprint, g, jsonify, request, abort, Response
from .db import row, rows, transaction, audit, now
from .security import required, project_access
from .validation import data, text, integer, day, choice

operations = Blueprint('operations', __name__)


def revision(entry):
    return hashlib.sha256(json.dumps({k:entry[k] for k in ('id','work_date','minutes','billable','note','status')},sort_keys=True).encode()).hexdigest()[:20]


def period():
    today=date.today(); monday=today-timedelta(days=today.weekday())
    start=day({'start':request.args.get('start',monday.isoformat())},'start')
    end=day({'end':request.args.get('end',(monday+timedelta(days=6)).isoformat())},'end')
    if end<start or (date.fromisoformat(end)-date.fromisoformat(start)).days>366:abort(400,'Choisissez une période de 367 jours maximum.')
    return start,end


def time_data():
    start,end=period()
    sql='''SELECT e.*,t.name task_name,t.project_id,p.name project_name,u.name user_name
      FROM time_entries e JOIN tasks t ON t.id=e.task_id JOIN projects p ON p.id=t.project_id
      JOIN users u ON u.id=e.user_id WHERE p.org_id=? AND e.work_date BETWEEN ? AND ?'''
    values=[g.user['org_id'],start,end]
    if g.user['role']=='account':sql+=' AND p.account_id=?';values.append(g.user['id'])
    if g.user['role']=='developer':sql+=' AND e.user_id=?';values.append(g.user['id'])
    people=rows('SELECT DISTINCT e.user_id id,u.name'+sql[sql.index(' FROM '):]+' ORDER BY u.name',values)
    for key,column in [('project_id','p.id'),('user_id','e.user_id'),('status','e.status')]:
        if request.args.get(key):sql+=' AND '+column+'=?';values.append(request.args[key])
    items=rows(sql+' ORDER BY e.work_date DESC,p.name,u.name,e.created_at DESC',values)
    for e in items:e['revision']=revision(e)
    active=[e for e in items if e['status']!='rejected']
    totals={s+'_minutes':sum(e['minutes'] for e in items if e['status']==s) for s in ['submitted','approved','rejected']}
    totals.update(minutes=sum(e['minutes'] for e in active),billable_minutes=sum(e['minutes'] for e in active if e['billable']),approved_billable_minutes=sum(e['minutes'] for e in active if e['billable'] and e['status']=='approved'))
    daily=[];d=date.fromisoformat(start)
    while d.isoformat()<=end:
        entries=[e for e in active if e['work_date']==d.isoformat()]
        daily.append(dict(day=d.isoformat(),minutes=sum(e['minutes'] for e in entries),approved_minutes=sum(e['minutes'] for e in entries if e['status']=='approved')));d+=timedelta(days=1)
    return dict(start=start,end=end,items=items,totals=totals,daily=daily,people=people)


@operations.get('/api/operations/time')
@required('manager','account','developer')
def timesheet():return jsonify(time_data())


@operations.patch('/api/operations/time/<identifier>')
@required('manager','account','developer')
def correct_time(identifier):
    d=data()
    with transaction() as db:
        e=row('SELECT * FROM time_entries WHERE id=? AND user_id=?',(identifier,g.user['id']))
        if not e:abort(404)
        from .projects import task_access
        _,p=task_access(e['task_id'],edit=True)
        if p['status'] not in {'active','maintenance'}:abort(409,'Ce projet est fermé à la saisie des temps.')
        if e['status']=='approved' or d.get('revision')!=revision(e):abort(409,'Cette saisie a été validée ou modifiée. Actualisez la feuille.')
        work_date=day(d,'work_date');minutes=integer(d,'minutes',1,1440)
        total=row("SELECT COALESCE(SUM(minutes),0) n FROM time_entries WHERE user_id=? AND work_date=? AND status!='rejected' AND id!=?",(g.user['id'],work_date,identifier))['n']
        if total+minutes>1440 or work_date>date.today().isoformat():abort(400,'Durée supérieure à 24 h par jour ou date future.')
        db.execute("UPDATE time_entries SET work_date=?,minutes=?,billable=?,note=?,status='submitted' WHERE id=?",(work_date,minutes,int(d.get('billable') is True),text(d,'note',1000),identifier))
        audit('time.corrected',identifier,{'previous_status':e['status']})
    return jsonify(ok=True)


@operations.post('/api/operations/time/review')
@required('manager','account')
def review_times():
    d=data();selection=d.get('entries');status=choice(d,'status',['approved','rejected'])
    if not isinstance(selection,list) or not 1<=len(selection)<=100 or any(not isinstance(x,dict) for x in selection):abort(400,'Sélectionnez entre 1 et 100 saisies.')
    ids=[text(x,'id',40) for x in selection]
    if len(set(ids))!=len(ids):abort(400,'Une saisie ne peut être sélectionnée deux fois.')
    with transaction() as db:
        for selected in selection:
            e=row('SELECT e.*,t.project_id FROM time_entries e JOIN tasks t ON t.id=e.task_id WHERE e.id=?',(selected['id'],))
            if not e:abort(404)
            project_access(e['project_id'],staff=True)
            if e['status']!='submitted' or selected.get('revision')!=revision(e):abort(409,'Une saisie a changé. Aucun temps n’a été validé ; actualisez la sélection.')
            db.execute('UPDATE time_entries SET status=? WHERE id=?',(status,e['id']))
            audit('time.reviewed',e['id'],{'status':status})
    return jsonify(ok=True,count=len(ids))


@operations.get('/api/operations/time.csv')
@required('manager','account','developer')
def time_csv():
    result=time_data();out=io.StringIO();writer=csv.writer(out,delimiter=';')
    writer.writerow(['Date','Projet','Tâche','Collaborateur','Minutes','Facturable','Statut','Description'])
    def safe(v):
        v=str(v);return "'"+v if v.lstrip().startswith(('=','+','-','@','\t','\r')) else v
    for e in result['items']:writer.writerow([safe(e[k]) for k in ['work_date','project_name','task_name','user_name','minutes','billable','status','note']])
    return Response('\ufeff'+out.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename="temps-'+result['start']+'.csv"'})


@operations.get('/api/operations/time/pdf')
@required('manager','account','developer')
def time_pdf():
    from .planning_pdf import build, table, date_label
    from .billing_pdf import p, logo
    from .billing import settings
    from reportlab.platypus import Spacer
    from reportlab.lib.units import mm
    result=time_data();t=result['totals'];seller=settings()
    duration=lambda v:f'{v//60} h {v%60:02d}'
    story=logo(seller)+[p('FEUILLE DE TEMPS','LabelNovalis'),p(date_label(result['start'])+' au '+date_label(result['end']),'TitleNovalis'),p('Exporté par : '+g.user['name']),p('Temps retenu : '+duration(t['minutes'])+' · Validé : '+duration(t['approved_minutes'])),p('Les temps refusés sont exclus des totaux. Facturable ne signifie pas facturé.','LabelNovalis'),Spacer(1,7*mm)]
    labels={'submitted':'À valider','approved':'Validé','rejected':'Refusé'}
    body=[['Date / personne','Projet / tâche','Travail effectué','Durée / état']]
    body += [[date_label(e['work_date'])+'\n'+e['user_name'],e['project_name']+'\n'+e['task_name'],e['note'],f"{e['minutes']//60} h {e['minutes']%60:02d}\n"+labels[e['status']]+('\nFacturable' if e['billable'] else '')] for e in result['items']]
    story.append(table(body,[48*mm,69*mm,100*mm,40*mm]) if result['items'] else p('Aucune saisie pour cette période et ces filtres.'))
    return Response(build(story,'Feuille de temps',True,seller),mimetype='application/pdf',headers={'Content-Disposition':'attachment; filename="feuille-de-temps.pdf"'})


def project_metrics(project_id):
    from .planning import access, phases
    p=access(project_id);role=g.user['role']
    task_items=rows('SELECT * FROM tasks WHERE project_id=?'+(' AND client_visible=1' if role=='client' else ''),(project_id,)) if role!='finance' else []
    entries=rows('SELECT e.* FROM time_entries e JOIN tasks t ON t.id=e.task_id WHERE t.project_id=? AND e.status!=?',(project_id,'rejected')) if role in {'manager','account','developer'} else []
    if role=='developer':entries=[e for e in entries if e['user_id']==g.user['id']]
    phase_items=phases(project_id,role!='developer')
    for ph in phase_items:
        tasks=[t for t in task_items if t['milestone_id']==ph['milestone_id']]
        estimated=sum(t['estimate_minutes'] for t in tasks)
        ph.update(task_count=len(tasks),approved_tasks=sum(t['status']=='approved' for t in tasks),blocked_tasks=sum(t['status']=='blocked' for t in tasks),progress=round(sum(t['estimate_minutes'] for t in tasks if t['status']=='approved')/estimated*100) if estimated else 0)
        if role in {'manager','account','developer'}:
            ph.update(estimate_minutes=estimated,logged_minutes=sum(e['minutes'] for e in entries if e['task_id'] in {t['id'] for t in tasks}),remaining_minutes=sum(t['remaining_minutes'] for t in tasks if t['status']!='approved'))
    today=date.today().isoformat()
    result=dict(project_id=project_id,project_name=p['name'],as_of=now(),phases=phase_items,task_count=len(task_items),statuses={s:sum(t['status']==s for t in task_items) for s in ['todo','in_progress','blocked','review','approved']},overdue_tasks=sum(t['status']!='approved' and t['due_date']<today for t in task_items),unlinked_tasks=sum(not t['milestone_id'] for t in task_items),time_scope='Mes temps uniquement' if role=='developer' else 'Temps de l’équipe')
    if role in {'manager','account','developer'}:
        result['time']=dict(logged_minutes=sum(e['minutes'] for e in entries),approved_minutes=sum(e['minutes'] for e in entries if e['status']=='approved'),submitted_minutes=sum(e['minutes'] for e in entries if e['status']=='submitted'),estimate_minutes=sum(t['estimate_minutes'] for t in task_items),remaining_minutes=sum(t['remaining_minutes'] for t in task_items if t['status']!='approved'))
    if role in {'manager','finance','client'}:
        from .billing import document,presented
        invoices=[]
        for r in rows('SELECT i.id FROM invoices i JOIN billing_documents b ON b.invoice_id=i.id WHERE i.project_id=? AND b.canceled_at IS NULL'+(' AND b.published_at IS NOT NULL' if role=='client' else ''),(project_id,)):
            inv,doc=document(r['id']);invoices.append(presented(inv,doc,True))
        def amounts(test):
            issued=[i for i in invoices if i['test_mode']==test and i['issued_at']]
            return dict(issued_ht_cents=sum(i['totals']['net_cents'] for i in issued),issued_ttc_cents=sum(i['total_cents'] for i in issued),paid_cents=sum(i['paid_cents'] for i in issued),balance_cents=sum(max(0,i['balance_cents']) for i in issued),draft_ht_cents=sum(i['totals']['net_cents'] for i in invoices if i['test_mode']==test and not i['issued_at']))
        result['finance']={'live':amounts(False),'test':amounts(True),'phase_budget_ht_cents':sum(ph['price_cents'] for ph in phase_items)}
    return result


@operations.get('/api/operations/projects/<project_id>')
@required('manager','account','developer','finance','client')
def metrics(project_id):return jsonify(project_metrics(project_id))


@operations.post('/api/nova/chat')
@required('manager','account','developer','finance','client','sysadmin')
def nova_chat():
    """Deterministic, grounded assistant. No third-party disclosure or write actions."""
    d=data();message=text(d,'message',1500);project_id=d.get('project_id')
    normalized=''.join(c for c in unicodedata.normalize('NFD',message.lower()) if unicodedata.category(c)!='Mn')
    result=dict(name='Nova',experimental=True,mode='local',generated_at=now(),sources=[],actions=[])
    if not project_id:
        result['answer']='Je suis Nova, votre assistant expérimental. Ouvrez un projet pour obtenir une synthèse, repérer les blocages, préparer les accords ou vérifier sa facturation. Mes réponses sont calculées depuis les données accessibles à votre rôle ; je ne modifie aucun dossier.'
        return jsonify(result)
    if g.user['role']=='sysadmin':abort(403)
    m=project_metrics(text(d,'project_id',40));role=g.user['role']
    result['sources']=[{'label':m['project_name'],'tab':'insights'},{'label':'Phases et jalons','tab':'plan'}]
    finance=any(k in normalized for k in ('factur','budget','solde','paiement','tva','argent'))
    timing=any(k in normalized for k in ('temps','heure','charge'))
    agreement=any(k in normalized for k in ('cahier','accord','exigen','recette','perimetre'))
    if finance:
        if 'finance' not in m:
            answer='Votre rôle ne donne pas accès aux montants de facturation. Le responsable et la direction peuvent consulter la situation financière.'
        else:
            mode='test' if g.user['org_id']=='novalis-demo' else 'live';f=m['finance'][mode]
            money=lambda v:f'{v/100:,.2f}'.replace(',',' ').replace('.',',')+' €'
            answer=('Démonstration — aucun encaissement réel.\n' if mode=='test' else '')+f"Factures émises : {money(f['issued_ht_cents'])} HT / {money(f['issued_ttc_cents'])} TTC.\nRèglements enregistrés : {money(f['paid_cents'])}.\nReste à régler : {money(f['balance_cents'])} TTC.\nBrouillons : {money(f['draft_ht_cents'])} HT, exclus des factures émises.\nLes temps facturables ne déclenchent pas de facture automatiquement."
    elif timing:
        t=m.get('time')
        answer=(f"{m['time_scope']} : {t['logged_minutes']/60:g} h saisies, dont {t['approved_minutes']/60:g} h validées et {t['submitted_minutes']/60:g} h en attente.\nLes saisies refusées sont exclues. L’estimation des tâches du projet est de {t['estimate_minutes']/60:g} h et le reste à faire de {t['remaining_minutes']/60:g} h." if t else 'Votre rôle ne donne pas accès aux feuilles de temps internes.')
    elif agreement:
        answer='Pour préparer un cahier des charges : précisez les objectifs, le périmètre, les livrables, les critères de recette et les règlements ; ajoutez au moins une phase avec ses critères de recette. Le partage fige la version. Les accords de la direction et du client autorisent ensuite la facturation par phase. Toute évolution du périmètre partagé passe par une nouvelle version.'
        if role in {'manager','account','client'}:result['sources'].append({'label':'Cahier des charges','tab':'specification'})
    else:
        answer=f"{m['project_name']}\n{len(m['phases'])} phases · {m['task_count']} tâches accessibles · {m['statuses']['approved']} validées.\n{m['statuses']['blocked']} tâche(s) bloquée(s), {m['overdue_tasks']} en retard, {m['statuses']['review']} en revue."
    from .intelligence import workflow
    actions=workflow(project_id)
    if not finance and not timing:
        answer+='\n\nProchaines étapes :\n'+'\n'.join('• '+a['title']+' — '+a['reason'] for a in actions[:3]) if actions else '\nAucune action supplémentaire détectée par les règles actuelles.'
    result['answer']=answer
    result['actions']=[{'label':a['title'],'tab':'specification' if a['target']=='specification' else 'plan'} for a in actions[:3]]
    return jsonify(result)
