"""Idempotent, additive engineering example; restricted to the synthetic tenant."""
import hashlib
import json
from datetime import date, timedelta
from pathlib import Path
from .db import get_db, transaction, now, uid
from .demo_seed import DEMO_ORG, ROLES

PROJECT='demo-engineering-horizon-v1'
PHASES=[
 ('01 · Diagnostic et relevés',480000,-42,-28,'approved',[
  ('Relever les locaux et équipements',960,'approved','Relevé de 1 200 m², inventaire chauffage et ventilation ; plans et photographies fictifs.'),
  ('Analyser les consommations',720,'approved','Comparer trois années fictives : 210 MWh/an ; vérifier les unités et signaler les données manquantes.'),
  ('Restituer le diagnostic',480,'approved','Présenter trois priorités ; faire accepter le périmètre avant les études.')]),
 ('02 · Avant-projet et variantes',720000,-27,-7,'approved',[
  ('Comparer trois scénarios',1440,'approved','Isolation seule ; isolation et ventilation ; rénovation globale. Documenter coût, confort et maintenance.'),
  ('Préparer les plans de principe',1200,'approved','Repérer les réseaux, les locaux techniques et les contraintes de maintien en activité.'),
  ('Valider la variante retenue',360,'approved','Variante B retenue dans le scénario fictif ; réserve sur les horaires d’intervention.')]),
 ('03 · Études techniques détaillées',1080000,-6,14,'awaiting_client',[
  ('Dimensionner la ventilation',1800,'review','Note v2 disponible ; le client doit confirmer les effectifs et les horaires avant validation.'),
  ('Coordonner les réseaux',1440,'in_progress','Vérifier les réservations avec les plans architecture ; deux interférences à résoudre.'),
  ('Obtenir le relevé électrique',720,'blocked','Le tableau existant doit être relevé avant de figer les protections. Responsable : maître d’ouvrage.')]),
 ('04 · Dossier de consultation',600000,15,28,'planned',[
  ('Rédiger les prescriptions',1440,'todo','Préparer le cahier technique sur la base des études validées.'),
  ('Produire le bordereau quantitatif',960,'todo','Contrôler les quantités avec les plans ; distinguer base et options.'),
  ('Revoir le dossier avec le client',360,'todo','Vérifier la cohérence plans / prescriptions / quantités avant diffusion.')]),
 ('05 · Assistance à la réalisation',480000,29,70,'planned',[
  ('Analyser les offres',720,'todo','Comparer les réponses sur une grille commune ; identifier variantes et exclusions.'),
  ('Suivre les points techniques',1440,'todo','Consigner les décisions de chantier et les réserves, avec responsable et échéance.'),
  ('Contrôler les documents exécutés',720,'todo','Vérifier les documents reçus selon le périmètre de mission convenu.')]),
 ('06 · Réception et transmission',240000,71,84,'planned',[
  ('Vérifier les essais',720,'todo','Contrôler les rapports de mise en service et la levée des réserves.'),
  ('Transmettre le dossier final',480,'todo','Plans exécutés, notices et inventaire des équipements.'),
  ('Clôturer la mission',240,'todo','Accord final du client, bilan des temps et facturation du solde.')])]

def seed_engineering(app):
 from .billing import calculations, replace_lines
 today=date.today();stamp=now()
 def day(n):return (today+timedelta(days=n)).isoformat()
 with app.app_context():
  db=get_db()
  if db.execute('SELECT id FROM projects WHERE id=?',(PROJECT,)).fetchone():return {'created':False,'project':PROJECT}
  actors={r:db.execute('SELECT * FROM users WHERE org_id=? AND email=?',(DEMO_ORG,email)).fetchone() for r,(email,_) in ROLES.items()}
  if not all(actors.values()):raise RuntimeError('Seed the six isolated demo accounts first')
  client=actors['client']['client_id'];ids={r:u['id'] for r,u in actors.items()}
  docs=[]
  with transaction() as db:
   db.execute('INSERT INTO projects(id,org_id,client_id,account_id,name,scope,budget_cents,due_date,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
    (PROJECT,DEMO_ORG,client,ids['account'],'Horizon · rénovation énergétique du centre de bureaux (démo)',
     'Mission fictive de bureau d’études : rénovation de 1 200 m² occupés, diagnostic, études CVC, consultation et réception. Honoraires : 36 000 € HT. Objectif indicatif : réduire la consommation de 210 à 140 MWh/an ; hypothèse de démonstration, sans garantie de performance réelle.',3600000,day(84),'awaiting_client',stamp))
   for r in ['manager','developer']:db.execute('INSERT INTO project_members VALUES(?,?)',(PROJECT,ids[r]))
   phases=[]
   for i,(name,price,start,end,status,tasks) in enumerate(PHASES):
    phase=uid();milestone=uid();taskids=[]
    acceptance=['Diagnostic complet et périmètre approuvé.','Variante B et plans de principe acceptés.','Effectifs confirmés, relevé électrique reçu et note CVC validée.','Cohérence des pièces et accord de diffusion.','Décisions techniques et réserves documentées.','Dossier final transmis et réserves levées.'][i]
    db.execute('INSERT INTO milestones(id,project_id,name,due_date,description,status) VALUES(?,?,?,?,?,?)',(milestone,PROJECT,name,day(end),acceptance,status))
    db.execute('INSERT INTO project_phases(id,project_id,milestone_id,name,description,acceptance,starts_on,due_date,price_cents,vat_basis_points,position,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
     (phase,PROJECT,milestone,name,'\n'.join(t[0] for t in tasks),acceptance,day(start),day(end),price,2100,i,stamp))
    for j,(title,estimate,taskstatus,description) in enumerate(tasks):
     task=uid();taskids.append(task)
     db.execute('INSERT INTO tasks(id,project_id,milestone_id,assignee_id,name,description,estimate_minutes,remaining_minutes,due_date,status,priority,client_visible,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      (task,PROJECT,milestone,ids['developer'],title,description,estimate,0 if taskstatus=='approved' else estimate//2 if taskstatus in ('review','in_progress') else estimate,day(end-2+j),taskstatus,'high' if i==2 else 'normal',1,stamp))
     db.execute('INSERT INTO phase_tasks VALUES(?,?)',(task,phase))
     if i<3 and taskstatus!='blocked':
      # Daily entries stay within 24h and total exactly the completed/partial effort.
      minutes=estimate if i<2 else estimate//2
      while minutes:
       part=min(480,minutes);minutes-=part
       db.execute('INSERT INTO time_entries VALUES(?,?,?,?,?,?,?,?,?)',(uid(),task,ids['developer'],day(start+j),part,1,'Étude fictive · '+title,'approved' if i<2 else 'submitted',stamp))
    phases.append(dict(id=phase,project_id=PROJECT,milestone_id=milestone,name=name,description='\n'.join(t[0] for t in tasks),acceptance=acceptance,starts_on=day(start),due_date=day(end),price_cents=price,vat_basis_points=2100,position=i,status=status,task_ids=taskids))
   stakeholders=[]
   for name,org,responsibility,category,visibility in [
    ('Alex Martin','Atelier Horizon','Maître d’ouvrage : valide variantes, budget et livrables.','decision','shared'),
    ('Camille Laurent','Bureau d’études démo','Cheffe de projet : planning, coordination et échanges.','delivery','shared'),
    ('Noah Bernard','Bureau d’études démo','Ingénieur CVC : calculs, plans et coordination technique.','delivery','shared'),
    ('Émilie Dubois','Architecture démo','Transmet les plans et confirme les réservations.','consulted','shared'),
    ('Robin Petit','Bureau d’études démo','Suit les échéances ; la direction émet les factures.','delivery','internal')]:
     ident=uid();db.execute('INSERT INTO project_stakeholders(id,project_id,name,organisation,responsibility,category,visibility,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)',(ident,PROJECT,name,org,responsibility,category,visibility,'active',stamp))
     stakeholders.append(dict(id=ident,name=name,organisation=org,responsibility=responsibility,category=category,visibility=visibility))
   sections={
    'context':'Bâtiment tertiaire fictif de 1 200 m² maintenu en activité. Consommation de référence : 210 MWh/an. Les valeurs sont synthétiques.',
    'audience':'Maître d’ouvrage, gestionnaire du bâtiment, bureau d’études et architecte.',
    'scope':'Diagnostic, variantes, études CVC, dossier de consultation, assistance technique et réception. Six phases ; 36 000 € HT / 43 560 € TTC à 21 %.',
    'requirements':'Maintenir les bureaux accessibles ; coordonner les réseaux ; tracer chaque décision avec sa version documentaire.',
    'quality':'Relecture croisée des calculs ; contrôle des unités ; cohérence plans et quantitatifs ; validation explicite des hypothèses.',
    'data':'Plans fictifs, consommations synthétiques et hypothèses d’occupation. Le relevé électrique reste à fournir par le client.',
    'deliverables':'\n'.join(p['name']+' : '+p['description'] for p in phases),
    'acceptance':'\n'.join(p['name']+' : '+p['acceptance'] for p in phases),
    'responsibilities':'Client : données d’entrée et décisions. Cheffe de projet : délais et périmètre. Ingénieur : calculs et livrables. Direction : engagement contractuel et factures.',
    'constraints':'Site occupé ; travaux bruyants hors horaires d’ouverture ; aucun dimensionnement réel ne doit être déduit de cet exemple.',
    'exclusions':'Honoraires seuls ; travaux, permis, diagnostics réglementaires et mesures réelles exclus. Aucun paiement bancaire réel.',
    'changes':'Une étude photovoltaïque est demandée en option. Chiffrage indicatif : 2 400 € HT et cinq jours ; non accepté et non inclus dans les 36 000 € HT.',
    'support':'Réunion de transmission, dossier final et revue des réserves dans le périmètre accepté.',
    'payment':'Diagnostic : 4 800 € HT, réglé en simulation. Avant-projet : 7 200 € HT, payé à moitié en simulation. Quatre autres phases : 24 000 € HT non facturés. Aucun débit automatique.'}
   document_texts=[('01-Diagnostic-accepte.txt','external','DIAGNOSTIC — EXEMPLE FICTIF\nSurface : 1 200 m². Référence : 210 MWh/an.\nConstats : horaires de ventilation inadaptés, régulation à revoir, enveloppe à étudier.\nDécision : poursuivre les variantes. Diagnostic accepté dans le scénario.'),
    ('02-Variantes-et-decision.txt','external','AVANT-PROJET — EXEMPLE FICTIF\nA : enveloppe seule. B : enveloppe + ventilation régulée. C : rénovation globale.\nLe client retient B ; objectif de 140 MWh/an à confirmer par étude.\nTravaux non compris dans les honoraires de 36 000 € HT.'),
    ('03-Note-CVC-v2-a-valider.txt','external','NOTE CVC V2 — EXEMPLE FICTIF\nÀ confirmer : 80 occupants, ouverture 08h–18h, salles de réunion à occupation variable.\nLa v2 distingue bureaux et salles de réunion. Aucun calcul utilisable pour un chantier réel.\nAction client : confirmer les effectifs ; action ingénieur : intégrer le relevé électrique.'),
    ('04-Registre-risques-interne.txt','internal','REGISTRE INTERNE — DÉMO\nR1 : relevé électrique absent ; impact : études bloquées ; responsable : maître d’ouvrage.\nR2 : réseaux en conflit ; action : réunion architecte / CVC.\nR3 : extension photovoltaïque ; action : avenant avant engagement.'),
    ('05-Parcours-testeur.txt','external','PARCOURS DE DÉMONSTRATION\n1. Lire les six phases et le cahier des charges accepté.\n2. Ouvrir la note CVC v2 ; commenter les hypothèses.\n3. Vérifier le jalon Études avant de donner votre décision.\n4. Consulter les deux factures TEST et leurs règlements fictifs.\n5. Examiner la demande photovoltaïque, encore hors périmètre.\nLes actions sont conservées dans cet environnement partagé de démonstration.')]
   for name,channel,body in document_texts:
    ident=uid();payload=body.encode();path=Path(app.config['FILES_DIR'])/ident;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(payload);path.chmod(0o600)
    db.execute('INSERT INTO documents VALUES(?,?,?,?,?,?,?,?,?)',(ident,PROJECT,ids['account'],channel,name,'text/plain',len(payload),hashlib.sha256(payload).hexdigest(),stamp))
    db.execute('INSERT INTO document_versions VALUES(?,?,NULL,1)',(ident,ident));docs.append(dict(id=ident,filename=name,channel=channel))
   spec=uid();snapshot=dict(project=dict(id=PROJECT,name='Horizon · rénovation énergétique (démo)',scope=sections['scope'],due_date=day(84)),client=dict(name='ATELIER HORIZON — DÉMONSTRATION'),phases=phases,stakeholders=[s for s in stakeholders if s['visibility']=='shared'],team=[],documents=[d for d in docs if d['channel']=='external'],graph=dict(nodes=[],edges=[],positions={},version=0),total_cents=3600000,frozen_at=stamp)
   db.execute('INSERT INTO project_specs(id,project_id,number,title,sections,attachments,snapshot,status,created_by,created_at,shared_at,manager_by,manager_at,manager_name,client_by,client_at,client_name) VALUES(?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    (spec,PROJECT,'Mission ingénierie · périmètre accepté (scénario fictif)',json.dumps(sections),json.dumps([d['id'] for d in docs if d['channel']=='external']),json.dumps(snapshot),'accepted',ids['manager'],stamp,stamp,ids['manager'],stamp,actors['manager']['name'],ids['client'],stamp,actors['client']['name']))
   for role,channel,body in [('account','external','Bienvenue dans la mission Horizon. Diagnostic et avant-projet acceptés ; les études attendent votre confirmation des effectifs. Consultez la note CVC v2 avant de valider le jalon.'),('client','external','La variante B est retenue. Merci de préserver l’accès aux bureaux et de chiffrer séparément une option photovoltaïque.'),('developer','internal','Ne pas figer les protections avant réception du relevé électrique. Deux conflits de réseaux restent à revoir avec l’architecte.'),('account','external','L’option photovoltaïque est en analyse : 2 400 € HT et cinq jours indicatifs, hors contrat actuel. Aucun travail supplémentaire engagé.')]:
    db.execute('INSERT INTO messages VALUES(?,?,?,?,?,?)',(uid(),PROJECT,ids[role],channel,body,stamp))
   db.execute('INSERT INTO requests(id,project_id,author_id,title,description,status,created_at) VALUES(?,?,?,?,?,?,?)',(uid(),PROJECT,ids['client'],'Option photovoltaïque · à chiffrer','Étudier une option de toiture. Estimation indicative 2 400 € HT / cinq jours. Hors budget signé ; accord et nouvelle version nécessaires.','analysing',stamp))
   for offset,title,visibility in [(2,'Confirmer les effectifs et le relevé électrique','shared'),(5,'Coordination CVC / architecture','team'),(14,'Validation des études techniques','shared')]:
    db.execute('INSERT INTO calendar_events(id,org_id,project_id,title,description,starts_at,ends_at,kind,visibility,creator_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(uid(),DEMO_ORG,PROJECT,title,'Rendez-vous fictif pour tester le suivi de mission.',day(offset)+'T09:00:00+00:00',day(offset)+'T10:00:00+00:00','meeting',visibility,ids['account'],stamp))
   seller=json.loads(db.execute('SELECT payload FROM billing_settings WHERE org_id=?',(DEMO_ORG,)).fetchone()[0])
   seq=db.execute('SELECT number FROM billing_sequences WHERE org_id=? AND year=? AND test_mode=1',(DEMO_ORG,today.year)).fetchone();number=seq[0] if seq else 0
   for i in range(2):
    number+=1;iid=uid();amount=PHASES[i][1];lines=calculations([dict(description=PHASES[i][0],quantity='1',unit_cents=amount,vat_basis_points=2100)])
    db.execute('INSERT INTO invoices(id,project_id,external_number,due_date,status,created_at) VALUES(?,?,?,?,?,?)',(iid,PROJECT,f'DEMO-TEST-NV-{today.year}-{number:05d}',day(-10 if i==0 else 10),'draft',stamp));replace_lines(db,iid,lines)
    snap=dict(recipient=dict(name='ATELIER HORIZON — DÉMONSTRATION',email=ROLES['client'][0],country='BE'),seller=seller,lines=lines,issue_date=day(-14),service_date=day(PHASES[i][3]),notes='EXEMPLE FICTIF · aucun paiement réel',vat_note='',terms='Simulation uniquement',reference=phases[i]['id'],buyer_reference='HORIZON-RENOV',title=PHASES[i][0])
    db.execute("INSERT INTO billing_documents(invoice_id,org_id,test_mode,title,recipient_type,snapshot,issued_at,published_at) VALUES(?,?,1,?,'belgian_business',?,?,?)",(iid,DEMO_ORG,PHASES[i][0],json.dumps(snap),stamp,stamp))
    db.execute('INSERT INTO phase_invoices VALUES(?,?,?,?,?)',(iid,phases[i]['id'],spec,amount,stamp));total=lines[0]['total_cents'];paid=total if i==0 else total//2
    db.execute('INSERT INTO billing_test_receipts VALUES(?,?,?,?,?,?,?)',(uid(),iid,paid,'transfer','SIMULATION HORIZON',stamp,'engineering-'+iid))
    db.execute('UPDATE invoices SET status=? WHERE id=?',('paid' if i==0 else 'registered',iid))
   db.execute('INSERT INTO billing_sequences VALUES(?,?,1,?) ON CONFLICT(org_id,year,test_mode) DO UPDATE SET number=excluded.number',(DEMO_ORG,today.year,number))
   db.execute('INSERT INTO project_graph(project_id,payload,updated_at) VALUES(?,?,?)',(PROJECT,json.dumps(dict(positions={},edges=[],notes=[])),stamp))
   db.execute('INSERT INTO audit(org_id,actor_id,action,entity_id,detail,created_at) VALUES(?,?,?,?,?,?)',(DEMO_ORG,ids['manager'],'demo.engineering_seeded',PROJECT,'{"version":1}',stamp))
  return dict(created=True,project=PROJECT,phases=6,tasks=18,documents=len(docs),budget_cents=3600000)
