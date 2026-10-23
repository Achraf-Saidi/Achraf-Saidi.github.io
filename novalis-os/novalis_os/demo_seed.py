"""Opt-in synthetic demonstration tenant. Never deletes production records."""
import argparse
import json
import secrets
from datetime import date, datetime, timedelta, timezone

DEMO_ORG = 'novalis-demo'
ROLES = {
 'manager': ('direction.demo@novalisai.com','Direction — démo'),
 'account': ('projets.demo@novalisai.com','Camille — relation client'),
 'developer': ('developpement.demo@novalisai.com','Noah — développement'),
 'client': ('client@novalisai.com','Alex — client démo'),
 'finance': ('finance.demo@novalisai.com','Robin — finances'),
 'sysadmin': ('administration.demo@novalisai.com','Sam — accès et sécurité')
}
SECTIONS=['context','audience','scope','requirements','quality','data','deliverables','acceptance',
          'responsibilities','constraints','exclusions','changes','support','payment']
STORIES=[
 {
 'company':'ATELIER HORIZON — DÉMONSTRATION','slug':'atelier','contact':'horizon.demo@example.test',
 'title':'Horizon · ERP production et stocks (démo)',
 'scope':'Centraliser les achats, les mouvements de stock, les ordres de fabrication et les validations.',
 'phases':[
  ('Audit des flux et inventaire',420000,-40,-18,'Cartographie des articles, magasins et écarts','Validation des besoins et des rôles'),
  ('Stock, achats et réservations',870000,-15,28,'Réceptions, réservations, alertes et historique','Inventaire cohérent sur trois scénarios métier'),
  ('Déploiement et formation',310000,29,63,'Guide opérateur, recette et formation','Validation en situation et passation documentée')],
 'invoice':'paid','amount':420000,'method':'bancontact','status':'active','features':['Stocks','Achats','Planification']
 },
 {
 'company':'COMPTOIR BELGO — DÉMONSTRATION','slug':'comptoir','contact':'comptoir.demo@example.test',
 'title':'Comptoir · boutique et caisse connectée (démo)',
 'scope':'Relier catalogue, commandes en ligne, retrait en magasin et reporting commercial.',
 'phases':[
  ('Identité, catalogue et parcours',180000,-50,-27,'Charte, navigation et catalogue accessible','Validation des parcours mobiles'),
  ('Commande et retrait',360000,-25,-7,'Panier, paiement et retrait test','Commande de bout en bout sans erreur'),
  ('Tableaux de bord et transmission',160000,-6,22,'Suivi des commandes, ventes et formation','Recette finale et documents de livraison')],
 'invoice':'partial','amount':180000,'method':'transfer','status':'active','features':['E-commerce','Commandes','Analytics']
 },
 {
 'company':'CLINIQUE BORÉALE — DÉMONSTRATION','slug':'boreale','contact':'boreale.demo@example.test',
 'title':'Boréale · portail administratif (démo)',
 'scope':'Gérer les rendez-vous administratifs, documents non médicaux et accès par rôle, sur données fictives.',
 'phases':[
  ('Cadrage et responsabilités',250000,-8,14,'Registre des acteurs et politiques d’accès','Validation du périmètre sans données patients'),
  ('Portail client et agenda',610000,15,61,'Agenda partagé, messages, documents et droits','Tests de permission et parcours utilisateur'),
  ('Recette et passage de relais',220000,62,94,'Rapport de tests et formation','Accord écrit sur les scénarios de recette')],
 'invoice':'draft','amount':250000,'method':'qr','status':'active','features':['Calendrier','Portail','Accès']
 },
 {
 'company':'NORD LOGISTIQUE — DÉMONSTRATION','slug':'nord','contact':'nord.demo@example.test',
 'title':'Nord · pilotage des interventions (démo)',
 'scope':'Coordonner techniciens, urgences, jalons, documents et validations sur un calendrier partagé.',
 'phases':[
  ('Diagnostic terrain',220000,-67,-51,'Carte des interventions et risques','Validation par les responsables terrain'),
  ('Planning et circuit de validation',490000,-48,-12,'Planning partagé et circuit de validation','Recette des scénarios de réaffectation'),
  ('Formation et suivi',140000,-10,17,'Indicateurs et support initial','Accord client sur les procédures')],
 'invoice':'overdue','amount':220000,'method':'bancontact','status':'awaiting_client','features':['Planning','Terrain','Maintenance']
 }
]

def seed(app, passwords=None):
    """Build all rows atomically in a fresh, separate demo tenant only."""
    from flask import g
    from .db import get_db, transaction, uid, now, migrate
    from .security import hash_password
    from .billing import calculations, replace_lines
    import os
    from pathlib import Path
    migrate(app.config['DATABASE'])
    today=date.today()
    def iso(offset):return (today+timedelta(days=offset)).isoformat()
    stamp=now()
    with app.app_context():
        existing=get_db().execute('SELECT id FROM organisations WHERE id=?',(DEMO_ORG,)).fetchone()
        if existing:
            count=get_db().execute('SELECT COUNT(*) n FROM projects WHERE org_id=?',(DEMO_ORG,)).fetchone()['n']
            return {'created':False,'tenant':DEMO_ORG,'projects':count,'existing_preserved':True}
        addresses=[email for email,_ in ROLES.values()]
        conflict=get_db().execute('SELECT email FROM users WHERE lower(email) IN ('+','.join('?' for _ in addresses)+')',
                                  [v.lower() for v in addresses]).fetchone()
        if conflict:
            raise RuntimeError('A requested demonstration email is already in use. No records were changed.')
        if passwords is None:
            passwords={role:secrets.token_urlsafe(19)+'!aZ8' for role in ROLES}
        if set(passwords)!=set(ROLES):
            raise ValueError('Provide exactly one initial password for each of the six roles.')
        for role,password in passwords.items():
            if len(password)<12:
                raise ValueError('Password policy: at least 12 characters; no weaker production exception.')
        actors={role:'demo-'+role+'-'+secrets.token_hex(6) for role in ROLES}
        clients={}
        projects=[]
        invoices=[]
        with transaction() as db:
            db.execute('INSERT INTO organisations(id,name) VALUES(?,?)',(DEMO_ORG,'Novalis OS · environnement de démonstration'))
            for story in STORIES:
                ident='demo-'+story['slug']+'-'+secrets.token_hex(6)
                clients[story['slug']]=ident
                db.execute('INSERT INTO clients(id,org_id,name,email,company_number,created_at) VALUES(?,?,?,?,?,?)',
                           (ident,DEMO_ORG,story['company'],story['contact'],'ENTREPRISE-FICTIVE',stamp))
                db.execute('INSERT INTO billing_test_clients(client_id) VALUES(?)',(ident,))
            for role,(address,label) in ROLES.items():
                actor=actors[role]
                client_id=clients['atelier'] if role=='client' else None
                db.execute('''INSERT INTO users(id,org_id,client_id,name,email,role,status,password_hash,verified_at,created_at)
                  VALUES(?,?,?,?,?,?,'active',?,?,?)''',
                  (actor,DEMO_ORG,client_id,label,address,role,hash_password(passwords[role]),stamp,stamp))
                db.execute('INSERT INTO user_profiles(user_id,job_title,engagement,updated_at) VALUES(?,?,?,?)',
                           (actor,{'manager':'Direction','account':'Chargée de projet','developer':'Développement','client':'Responsable métier','finance':'Finance','sysadmin':'Sécurité'}[role],
                            'client' if role=='client' else 'employee',stamp))
            seller={'legal_name':'NOVALIS AI — DOCUMENT FICTIF','trade_name':'Novalis OS DEMO','address':'Aucune adresse réelle',
                    'postal_code':'','city':'','country':'BE','company_number':'FICTIF','vat_number':'','email':'demo@example.test',
                    'iban':'','bic':'','bank_name':'','terms':'Document synthétique sans paiement réel.',
                    'default_due_days':15}
            db.execute('INSERT INTO billing_settings(org_id,payload,updated_at) VALUES(?,?,?)',(DEMO_ORG,json.dumps(seller),stamp))
            for position,story in enumerate(STORIES):
                client_id=clients[story['slug']]
                pid='demo-project-'+story['slug']+'-'+secrets.token_hex(5)
                projects.append(pid)
                budget=sum(x[1] for x in story['phases'])
                db.execute('''INSERT INTO projects(id,org_id,client_id,account_id,name,scope,budget_cents,due_date,status,created_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?)''',
                    (pid,DEMO_ORG,client_id,actors['account'],story['title'],story['scope'],budget,iso(story['phases'][-1][3]),story['status'],stamp))
                db.execute('INSERT INTO project_members VALUES(?,?)',(pid,actors['developer']))
                db.execute('INSERT INTO project_members VALUES(?,?)',(pid,actors['manager']))
                phase_snap=[]
                phase_ids=[]
                first_task=''
                for idx,(name,price,start,end,description,acceptance) in enumerate(story['phases']):
                    phase_id=uid();milestone_id=uid();task_id=uid()
                    phase_ids.append(phase_id)
                    ms_status='approved' if idx==0 and position<=1 else 'awaiting_client' if idx==1 and position==3 else 'planned'
                    db.execute('INSERT INTO milestones(id,project_id,name,due_date,description,status) VALUES(?,?,?,?,?,?)',
                               (milestone_id,pid,name,iso(end),acceptance,ms_status))
                    db.execute('''INSERT INTO project_phases
                      (id,project_id,milestone_id,name,description,acceptance,starts_on,due_date,
                       price_cents,vat_basis_points,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)''',
                       (phase_id,pid,milestone_id,name,description,acceptance,iso(start),iso(end),price,2100,idx,stamp))
                    estimate=720+idx*450
                    status='approved' if idx==0 and position<=1 else 'review' if idx==1 and position==3 else 'in_progress' if idx==1 else 'todo'
                    db.execute('''INSERT INTO tasks(id,project_id,milestone_id,assignee_id,name,description,
                       estimate_minutes,remaining_minutes,due_date,status,priority,client_visible,created_at)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                       (task_id,pid,milestone_id,actors['developer'],'Livrer : '+name,description,estimate,
                        0 if status=='approved' else estimate//2,iso(end),status,'high' if idx==1 else 'normal',1,stamp))
                    db.execute('INSERT INTO phase_tasks(task_id,phase_id) VALUES(?,?)',(task_id,phase_id))
                    if idx==0:
                        first_task=task_id
                        db.execute('INSERT INTO time_entries VALUES(?,?,?,?,?,?,?,?,?)',
                                   (uid(),task_id,actors['developer'],iso(-8),240,1,
                                    'Atelier et revue des besoins de démonstration','approved',stamp))
                    phase_snap.append({'id':phase_id,'project_id':pid,'milestone_id':milestone_id,'name':name,
                       'description':description,'acceptance':acceptance,'starts_on':iso(start),'due_date':iso(end),
                       'price_cents':price,'vat_basis_points':2100,'position':idx,'status':ms_status,'task_ids':[task_id]})
                stakeholders=[]
                for cat,name,role,visible in [('sponsor','Direction '+story['slug'].capitalize(),'Sponsor métier','shared'),
                                               ('decision','Comité de validation','Validation de la recette et du périmètre','shared'),
                                               ('delivery','Référent technique','Coordination des intégrations','internal')]:
                    sid=uid()
                    db.execute('''INSERT INTO project_stakeholders
                      (id,project_id,name,organisation,responsibility,category,visibility,status,created_at)
                      VALUES(?,?,?,?,?,?,?,'active',?)''',(sid,pid,name,story['company'],role,cat,visible,stamp))
                    stakeholders.append({'id':sid,'name':name,'organisation':story['company'],'responsibility':role,
                                         'category':cat,'visibility':visible})
                project_view={'id':pid,'name':story['title'],'scope':story['scope'],'due_date':iso(story['phases'][-1][3])}
                team=[{'id':actors[role],'name':ROLES[role][1],'role':role}
                      for role in ('manager','account','developer')]+([{'id':actors['client'],'name':ROLES['client'][1],'role':'client'}] if position==0 else [])
                section_values={
                    'context':story['scope'],'audience':'Direction, responsable métier, équipes opérationnelles.',
                    'scope':story['scope'],'requirements':'Traçabilité, permissions par rôle, validations contrôlées.',
                    'quality':'Accessibilité mobile, historique et séparation stricte des droits.',
                    'data':'Connecteurs à définir après audit. Aucune donnée réelle.',
                    'deliverables':'\n'.join(x[0]+' — '+x[4] for x in story['phases']),
                    'acceptance':'\n'.join(x[0]+' — '+x[5] for x in story['phases']),
                    'responsibilities':'\n'.join(x['name']+' — '+x['responsibility'] for x in stakeholders),
                    'constraints':'Environnement fictif ; conformité et intégrations à vérifier.',
                    'exclusions':'Aucune intégration bancaire réelle ni flux Peppol.',
                    'changes':'Toute modification nécessite une nouvelle version acceptée.',
                    'support':'Formation, documentation et transfert de compétences.',
                    'payment':'Échéancier par phase ; montants et paiements uniquement simulés.'}
                spec_status='accepted' if position in (0,1,3) else 'draft'
                snapshot={'project':project_view,'client':{'name':story['company'],'email':story['contact'],'company_number':'ENTREPRISE-FICTIVE'},
                          'phases':phase_snap,'team':team,'stakeholders':[v for v in stakeholders if v['visibility']=='shared'],
                          'documents':[],'graph':{'nodes':[],'edges':[],'positions':{},'version':0},
                          'total_cents':budget,'frozen_at':stamp}
                sid=uid()
                db.execute('''INSERT INTO project_specs(id,project_id,number,title,sections,attachments,snapshot,status,
                        created_by,created_at,shared_at,manager_by,manager_at,manager_name,client_by,client_at,client_name)
                  VALUES(?,?,1,?,?,'[]',?,?,?,?,?,?,?,?,?,?,?)''',
                  (sid,pid,'Cahier des charges · '+story['title'],json.dumps(section_values),json.dumps(snapshot),
                   spec_status,actors['manager'],stamp,stamp if spec_status=='accepted' else None,
                   actors['manager'] if spec_status=='accepted' else None,
                   stamp if spec_status=='accepted' else None,ROLES['manager'][1] if spec_status=='accepted' else '',
                   actors['client'] if spec_status=='accepted' and position==0 else None,
                   stamp if spec_status=='accepted' and position==0 else None,
                   ROLES['client'][1] if spec_status=='accepted' and position==0 else ''))
                # Demo agreements for projects without a designated client user are staff-authored fixture snapshots;
                # only the project with a linked demo client is marked as client-accepted.
                if position in (1,3):
                    db.execute("UPDATE project_specs SET status='shared',client_by=NULL,client_at=NULL WHERE id=?",(sid,))
                db.execute('''INSERT INTO proposals(id,project_id,version,title,scope,assumptions,exclusions,
                     amount_cents,status,created_at) VALUES(?,?,1,?,?,?,?,?,'shared',?)''',
                     (uid(),pid,'Proposition · '+story['title'],story['scope'],
                      'Données fictives, spécifications à valider.','Services et paiements externes non inclus.',budget,stamp))
                db.execute('''INSERT INTO messages(id,project_id,author_id,channel,body,created_at) VALUES(?,?,?,?,?,?)''',
                           (uid(),pid,actors['account'],'external','Bonjour, voici les jalons et la synthèse du projet fictif.',stamp))
                db.execute('''INSERT INTO messages(id,project_id,author_id,channel,body,created_at) VALUES(?,?,?,?,?,?)''',
                           (uid(),pid,actors['developer'],'internal','Contrôle de la dépendance entre livrables et tests.',stamp))
                db.execute('''INSERT INTO requests(id,project_id,author_id,title,description,status,created_at)
                      VALUES(?,?,?,?,?,?,?)''',
                      (uid(),pid,actors['account'],'Vérifier la recette mobile',
                       'Valider trois parcours et consigner les résultats dans le dossier.','analysing',stamp))
                db.execute('''INSERT INTO calendar_events(id,org_id,project_id,title,description,starts_at,ends_at,kind,
                  visibility,creator_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)''',
                  (uid(),DEMO_ORG,pid,'Atelier de suivi · '+story['slug'],
                   'Réunion fictive, ne correspond à aucune réservation réelle.',
                   datetime.combine(today+timedelta(days=3+position),datetime.min.time(),timezone.utc).replace(hour=9).isoformat(),
                   datetime.combine(today+timedelta(days=3+position),datetime.min.time(),timezone.utc).replace(hour=10).isoformat(),
                   'workshop','team',actors['account'],stamp))
                if position in (0,1,3):
                    amount=story['amount']
                    iid=uid()
                    issued=date.today().isoformat()
                    overdue=story['invoice']=='overdue'
                    due=iso(-7 if overdue else 15)
                    inv_status='paid' if story['invoice']=='paid' else 'registered'
                    number='TEST-NV-'+str(today.year)+'-'+str(position+1).zfill(5)
                    title='Situation · '+story['phases'][0][0]
                    lines=calculations([{'description':title,'quantity':'1','unit_cents':amount,
                                         'vat_basis_points':2100}])
                    total=lines[0]['total_cents']
                    db.execute('''INSERT INTO invoices(id,project_id,external_number,due_date,status,created_at)
                      VALUES(?,?,?,?,?,?)''',(iid,pid,number,due,'draft',stamp))
                    replace_lines(db,iid,lines)
                    db.execute('UPDATE invoices SET status=? WHERE id=?',(inv_status,iid))
                    snap={'recipient':{'name':story['company'],'email':story['contact'],'address':'',
                                         'postal_code':'','city':'','country':'BE','company_number':'ENTREPRISE-FICTIVE','vat_number':''},
                          'seller':seller,'lines':lines,'issue_date':issued,'service_date':iso(story['phases'][0][3]),
                          'notes':'DOCUMENT DE TEST · aucun paiement réel','vat_note':'','terms':'Simulation uniquement',
                          'reference':phase_ids[0],'buyer_reference':'','title':title}
                    db.execute('''INSERT INTO billing_documents(invoice_id,org_id,test_mode,title,recipient_type,snapshot,
                         issued_at,published_at) VALUES(?,?,1,?,'belgian_business',?,?,?)''',
                         (iid,DEMO_ORG,title,json.dumps(snap),stamp,stamp))
                    db.execute('INSERT INTO phase_invoices VALUES(?,?,?,?,?)',
                               (iid,phase_ids[0],sid,amount,stamp))
                    if story['invoice'] in ('paid','partial'):
                        paid=total if story['invoice']=='paid' else total//3
                        db.execute('''INSERT INTO billing_test_receipts(id,invoice_id,amount_cents,method,reference,
                         paid_at,idempotency_key) VALUES(?,?,?,?,?,?,?)''',
                         (uid(),iid,paid,story['method'],'DEMO / AUCUN ARGENT TRANSFÉRÉ',stamp,'seed-'+iid))
                    invoices.append({'number':number,'status':story['invoice'],'total_cents':total,'test_mode':True})
                db.execute('''INSERT INTO project_graph(project_id,payload,updated_at)
                  VALUES(?,?,?)''',(pid,json.dumps({'positions':{},'edges':[],'notes':[]}),stamp))
            # Technical audit trail is append-only and non-sensitive.
            db.execute('''INSERT INTO audit(org_id,actor_id,action,entity_id,detail,created_at)
               VALUES(?,?,?,?,?,?)''',(DEMO_ORG,actors['manager'],'demo.seeded',DEMO_ORG,
                            json.dumps({'projects':len(projects),'version':1}),stamp))
    return {'created':True,'tenant':DEMO_ORG,'projects':len(projects),'invoices':invoices,
            'profiles':{k:v[0] for k,v in ROLES.items()},'passwords':passwords,
            'existing_preserved':True,'payments_real':False}

def main():
    from . import create_app
    app=create_app()
    result=seed(app)
    print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':
    main()
