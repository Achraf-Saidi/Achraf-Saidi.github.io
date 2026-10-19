"""Isolated Novalis billing deployment. Explicit temporary access authorized by the owner on 2026-10-19."""
import concurrent.futures,hashlib,http.client,json,os,pwd,secrets,shutil,socket,sqlite3,ssl,subprocess,time,urllib.request,venv
from pathlib import Path
PRIVATE=__ENCRYPTED_PRIVATE_INPUT__
SOURCE='3714c60069e517c5eeeff5411cab480f8c217245'
MANIFEST={"novalis-os/docs/billing.md":"e0ac94d5f68783b19b6352c5ebf2824199f4bf591094bf870b0486ab140c1eee","novalis-os/novalis_os/__init__.py":"b7e2d256f6a3a7f06a4bd91281c0819a077ceb8d892cc42015080766abc16193","novalis-os/novalis_os/billing-schema.sql":"a231dff0ce31465196dbd9690b3b9afb8c5566e4b9fb65eb62bcb7f7655fb277","novalis-os/novalis_os/billing.py":"c6d7ee21ca531a22ea98e583f8cd026b8137dff9df3619f4ce016366d88abfe8","novalis-os/novalis_os/billing_pdf.py":"147047a5c6ad7d12133ec072e8473394a8ffa3cfe468dc5101741391a105c57f","novalis-os/novalis_os/db.py":"ffab76b37cb28b6c52d717ded4d12a4cd350a026ee03c42e9e27a059c512cd4a","novalis-os/novalis_os/finance.py":"2d549a1e4d710678bb670b9c464af55e5e952f33c0a7b76b65aa4a9eb8a90389","novalis-os/novalis_os/fonts/LICENSE.txt":"e81d9dced49fea2a7d576cbea283873de58563c5d488f954deb282843c3ea79c","novalis-os/novalis_os/fonts/NovalisSans-Bold.ttf":"0f89375a23e8b9c7af0b0c8fd534a0d4eeafb8247466362e78c2058267cca454","novalis-os/novalis_os/fonts/NovalisSans.ttf":"e8e052a68005b63a3cad7d56fb37ea0616543bce177f5f71a08a5c93b55749a2","novalis-os/novalis_os/payments.py":"9320a8e9b541023bb7834a261ff8324096a2ef22e00805e696e5bd8384a7c70d","novalis-os/requirements.txt":"213acd8b658e4ffa59586d3005f672b4941c7aa7f993c25e2d7ccbb5603c025c","novalis-os/tests/billing-fixture.py":"688fc7756b77c5a34f20fec4a3f42ecd5dcd8f1cb4ab103c2b0407fc28406cbe","novalis-os/tests/billing-ui.cjs":"5a50b84ed47a72f3953d4ca60bbff0c041734817b05c6b6887a5ef95394f8ac0","novalis-os/tests/payments-ui.cjs":"1c8f8ad452eb734a76a32c0434ca7ae8b731accc59670db3858974a6db297f5e","novalis-os/tests/test_billing.py":"cabf832a9550a40a668c0389e8b55bacca591a6377a6426149261c88e0c10b5e","novalis-os/tests/test_intake.py":"f073f8a9459ec11662579e46d21c0b611c0acfe12a4dd9056958fc4787dc19b7","novalis-os/tests/test_payments.py":"4aab9c95ab3ffee3b6a399b1e5c49e13a50b570e7dfd313ff73fd15b9164845b","novalis-os/tests/test_workflows.py":"586a3b5d42344b0a49e969b24448c181a6f96dd0717879a996a104949266f74d","novalis-os/web/app.js":"3a72d9bef630d6fb08199f1a674213d5ec804e3425ce7f4a78ae2c96b0b56de1","novalis-os/web/billing.css":"34e5e534c24fcfd51a227004caa858cb9e96ca7470b50865e1fde4166b27f97a","novalis-os/web/billing.js":"dd4be1757dec85097ac3a1a3f145b1cc2c610654ae81e493ab41f0009af9a3eb","novalis-os/web/index.html":"1fbc97ce6679a19cef36f7d525816ba4d8118ce4350a8d48228fe2beb89bf269"}
ROOT=Path('/opt/novalis-os');ENV=Path('/etc/novalis-os/production.env');PREVIOUS=(ROOT/'current').resolve(strict=True)
RELEASE=ROOT/'releases'/('billing-'+SOURCE)
REPORT={'source':SOURCE,'completed':False}
def run(args,env=None,cwd=None,timeout=180,input=None):
 r=subprocess.run(args,env=env,cwd=cwd,input=input,capture_output=True,text=True,timeout=timeout)
 if r.returncode:raise RuntimeError('Command failed: '+str(args[0])+': '+r.stderr[-2000:])
 return r.stdout

def https(host,path='/',method='GET',body=None,cookie=None,csrf=None):
 ctx=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=20,context=ctx);c.sock=ctx.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=20),server_hostname=host)
 headers={'Host':host,'Origin':'https://'+host,'Content-Type':'application/json'}
 if cookie:headers['Cookie']=cookie
 if csrf:headers['X-CSRF-Token']=csrf
 c.request(method,path,body=json.dumps(body) if body is not None else None,headers=headers);r=c.getresponse();b=r.read(4000000);status=r.status;h=dict(r.getheaders());c.close();return status,b,h

def protected():
 status,body,_=https('pointagevdc.cloud');assert status==200,'Pointage not healthy before operation'
 services=['nginx','postgresql@17-main','pm2-root']
 return {'pointage_sha':hashlib.sha256(body).hexdigest(),'pointage_config':hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest(),'pids':{s:run(['systemctl','show',s,'--property=MainPID','--value']).strip() for s in services},'public':str(Path('/var/www/novalis-ai/current').resolve()),'public_home':hashlib.sha256(https('www.novalisai.com','/fr/')[1]).hexdigest(),'env_sha':hashlib.sha256(ENV.read_bytes()).hexdigest()}
def environment(release):
 env=dict(os.environ)
 for line in ENV.read_text().splitlines():
  if line and not line.startswith('#'):
   k,v=line.split('=',1);env[k]=v
 env['PYTHONPATH']=str(release/'novalis-os');return env

def user_hash(database):
 db=sqlite3.connect(database);d=db.execute('SELECT * FROM users ORDER BY id').fetchall();db.close();return hashlib.sha256(repr(d).encode()).hexdigest()
def pointer(target):
 p=ROOT/('.billing-next-'+secrets.token_hex(4));p.symlink_to(target);os.replace(p,ROOT/'current')

def main():
 os.umask(0o022);os.nice(10);before=protected();assert not RELEASE.exists(),'Release already exists; inspect before retry'
 env=environment(PREVIOUS);database=Path(env.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3';assert database.is_file()
 old_users=user_hash(database);RELEASE.mkdir(mode=0o755)
 shutil.copytree(PREVIOUS/'novalis-os',RELEASE/'novalis-os',ignore=shutil.ignore_patterns('__pycache__','.pytest_cache'))
 (RELEASE/'novalisai').symlink_to(PREVIOUS/'novalisai')
 def fetch(entry):
  name,expected=entry;assert name.startswith('novalis-os/') and '..' not in Path(name).parts
  b=urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+name,timeout=40).read(2000000)
  assert hashlib.sha256(b).hexdigest()==expected,'Source mismatch: '+name
  p=RELEASE/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);p.chmod(0o644)
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(fetch,MANIFEST.items()))
 venv.EnvBuilder(with_pip=False).create(RELEASE/'.venv');python=str(RELEASE/'.venv/bin/python')
 # Use the existing trusted pip installation only as the installer; target a fresh venv.
 run([str(PREVIOUS/'.venv/bin/python'),'-m','pip','--python',python,'install','--isolated','--index-url','https://pypi.org/simple','--only-binary=:all:','--no-cache-dir','--disable-pip-version-check','-r',str(RELEASE/'novalis-os/requirements.txt')],timeout=360)
 newenv=environment(RELEASE)
 test=run([python,'-m','unittest','discover','-s','tests','-v'],env=newenv,cwd=RELEASE/'novalis-os',timeout=360)
 REPORT['backend_tests_passed']=True
 assert user_hash(database)==old_users,'Live users changed before deployment'
 backup=Path('/srv/novalis-os/backups')/('before-billing-'+SOURCE[:12]);switched=False
 account=pwd.getpwnam('novalis-os')
 run(['systemctl','stop','novalis-worker.service','novalis-os.service'],timeout=30)
 try:
  run([str(PREVIOUS/'.venv/bin/python'),'-m','novalis_os.cli','backup','--destination',str(backup)],env=env,cwd=PREVIOUS/'novalis-os',timeout=120)
  run([str(PREVIOUS/'.venv/bin/python'),'-m','novalis_os.cli','check-backup','--source',str(backup)],env=env,cwd=PREVIOUS/'novalis-os',timeout=120)
  run([python,'-m','novalis_os.cli','migrate'],env=newenv,cwd=RELEASE/'novalis-os',timeout=45)
  assert user_hash(database)==old_users,'Migration changed existing accounts'
  for file in [database,Path(str(database)+'-wal'),Path(str(database)+'-shm')]:
   if file.exists():os.chown(file,account.pw_uid,account.pw_gid);file.chmod(0o600)
  pointer(RELEASE);switched=True
  run(['systemctl','start','novalis-os.service','novalis-worker.service'],timeout=30)
  for attempt in range(30):
   try:
    if https('app.novalisai.com','/healthz')[0]==200:break
   except (OSError,http.client.HTTPException):pass
   time.sleep(1)
  else:raise RuntimeError('Novalis startup failed')
  for name in ['index.html','app.js','app.css','billing.js','billing.css']:
   path='/os/' if name=='index.html' else '/os/'+name
   status,body,_=https('app.novalisai.com',path);assert status==200 and body==(RELEASE/'novalis-os/web'/name).read_bytes(),'Live asset mismatch'
  assert protected()==before,'Pointage, proxy, public website or environment changed'
 except Exception:
  run(['systemctl','stop','novalis-worker.service','novalis-os.service'],timeout=30)
  if switched:pointer(PREVIOUS)
  run(['systemctl','start','novalis-os.service','novalis-worker.service'],timeout=30)
  REPORT['rolled_back_code']=True;raise
 REPORT.update(backup_verified=True,previous_release=str(PREVIOUS),release=str(RELEASE),pointage_unchanged=True)
 # Add an isolated client and fictional documents; never send invitations or external emails.
 child=r'''
import hashlib,json,sys
from datetime import date,timedelta
from flask import g
from werkzeug.security import generate_password_hash
from novalis_os import create_app
from novalis_os.db import get_db,transaction,uid,now,row,rows,audit
from novalis_os.security import password_matches
from novalis_os import billing
private=json.loads(sys.stdin.read());app=create_app();address=private['email'];assert address=='client.test@novalisai.com'
with app.app_context():
 org=app.config['ORG_ID'];owner=row("SELECT * FROM users WHERE email='saidi@novalisai.com' AND role='manager' AND status='active' AND org_id=?",(org,));assert owner,'Requested Direction account not found'
 with transaction() as db:
  old=row('SELECT * FROM users WHERE email=?',(address,));others=rows('SELECT * FROM users WHERE email!=? ORDER BY id',(address,))
  if old:
   assert old['org_id']==org and old['role']=='client' and row('SELECT 1 FROM billing_test_clients WHERE client_id=?',(old['client_id'],)),'Existing address is not a test client'
   client_id=old['client_id'];user_id=old['id']
  else:
   client_id=uid();user_id=uid();db.execute('INSERT INTO clients VALUES(?,?,?,?,?,?)',(client_id,org,'Atelier Horizon - TEST',address,'TEST',now()));db.execute('INSERT INTO billing_test_clients VALUES(?)',(client_id,));db.execute("INSERT INTO users(id,org_id,client_id,name,email,role,status,password_hash,verified_at,created_at) VALUES(?,?,?,?,?,'client','active',?,?,?)",(user_id,org,client_id,'Client de démonstration',address,generate_password_hash(private['password'],method='scrypt:32768:8:1'),now(),now()));db.execute('INSERT INTO user_profiles VALUES(?,?,?,?)',(user_id,'Client TEST','client',now()))
  assert rows('SELECT * FROM users WHERE email!=? ORDER BY id',(address,))==others,'Other users changed'
  project=row('SELECT id FROM projects WHERE client_id=? AND org_id=?',(client_id,org))
  if not project:
   project_id=uid();db.execute('INSERT INTO projects(id,org_id,client_id,account_id,name,scope,due_date,created_at) VALUES(?,?,?,?,?,?,?,?)',(project_id,org,client_id,owner['id'],'Projet client - démonstration facturation','Environnement isolé pour tester les factures, règlements et reçus.',(date.today()+timedelta(days=30)).isoformat(),now()))
  else:project_id=project['id']
  audit('operator.billing_test_client_created',user_id,{'test_only':True},org_id=org)
 def invoke(fn,url,payload,actor=owner,args=()):
  with app.test_request_context(url,method='POST',json=payload):
   g.user=actor;g.session={'limited':0};value=fn(*args);response=value[0] if isinstance(value,tuple) else value;return response.get_json()
 samples=[('Site vitrine - facture TEST',100000,0,True),('Maintenance - règlement confirmé TEST',15000,18150,True),('Audit et optimisation - acompte TEST',60000,20000,True),('Prochaine prestation - brouillon TEST',25000,0,False)]
 created=[]
 for title,net,paid,publish in samples:
  existing=row('SELECT b.invoice_id FROM billing_documents b JOIN invoices i ON i.id=b.invoice_id WHERE b.test_mode=1 AND b.title=? AND i.project_id=?',(title,project_id))
  if existing:created.append(existing['invoice_id']);continue
  payload={'project_id':project_id,'test_mode':True,'recipient_type':'belgian_business','title':title,'issue_date':date.today().isoformat(),'service_date':date.today().isoformat(),'due_date':(date.today()+timedelta(days=15)).isoformat(),'recipient':{'name':'Atelier Horizon - TEST','address':'Adresse de démonstration','postal_code':'1000','city':'Bruxelles','country':'BE','email':address},'lines':[{'description':title,'quantity':'1','unit':'forfait','unit_cents':net,'vat_basis_points':2100}],'notes':'Document exclusivement destiné aux essais de Novalis OS. Aucun paiement réel.','terms':'Simulation : aucun virement réel à effectuer.'}
  identifier=invoke(billing.create,'/api/billing',payload)['id'];created.append(identifier)
  if publish:invoke(billing.publish,'/api/billing/'+identifier+'/publish',{'version':1,'compliance_confirmed':True},args=(identifier,))
  if paid:invoke(billing.simulate,'/api/billing/'+identifier+'/simulate',{'amount_cents':paid,'method':'bancontact' if paid==18150 else 'transfer','idempotency_key':'seed-'+identifier},actor=row('SELECT * FROM users WHERE id=?',(user_id,)),args=(identifier,))
 assert rows('SELECT * FROM users WHERE email!=? ORDER BY id',(address,))==others,'Existing users changed'
 print(json.dumps({'email':address,'role':'client','mfa_required':False,'project_id':project_id,'documents':created,'other_accounts_unchanged':True}))
'''
 child=child.replace('private=json.loads(sys.stdin.read())','private='+repr(PRIVATE))
 seeded=json.loads(run(['runuser','-u','novalis-os','--',python,'-'],env=newenv,cwd=RELEASE/'novalis-os',input=child,timeout=90));REPORT['client']=seeded
 # Verify the actual live app, not only a local test client.
 status,body,headers=https('app.novalisai.com','/api/auth/login','POST',PRIVATE);assert status==200,'Live client login failed';session=json.loads(body);assert session['mfa_required'] is False and session['user']['role']=='client'
 cookie=next(v.split(';',1)[0] for k,v in headers.items() if k.lower()=='set-cookie')
 try:
  status,body,_=https('app.novalisai.com','/api/billing',cookie=cookie);assert status==200
  documents=json.loads(body)['items'];assert len(documents)==3,'Unexpected published test documents'
  for document in documents:
   identifier=document['id'];status,body,_=https('app.novalisai.com','/api/billing/'+identifier,cookie=cookie);assert status==200;detail=json.loads(body)['document']
   status,pdf,_=https('app.novalisai.com','/api/billing/'+identifier+'/pdf',cookie=cookie);assert status==200 and pdf.startswith(b'%PDF')
   for receipt in detail['receipts']:
    status,pdf,_=https('app.novalisai.com','/api/billing/'+identifier+'/receipts/'+receipt['id']+'/pdf',cookie=cookie);assert status==200 and pdf.startswith(b'%PDF')
  status,_,_=https('app.novalisai.com','/api/billing','POST',{},cookie,session['csrf']);assert status==403,'Client was allowed to create an invoice'
 finally:
  assert https('app.novalisai.com','/api/auth/logout','POST',{},cookie,session['csrf'])[0]==200
 assert protected()==before,'Protected VPS state changed'
 REPORT.update(completed=True,live_client_login_verified=True,live_pdf_downloads_verified=True,client_creation_forbidden=True,pointage_unchanged=True,public_showcase_unchanged=True)
 dest=Path('/etc/novalis-os')/('deployment-billing-'+SOURCE[:12]+'.json');dest.write_text(json.dumps(REPORT,indent=2));dest.chmod(0o600);print(json.dumps(REPORT))
try:main()
except Exception as e:REPORT.update(error=str(e));print(json.dumps(REPORT));raise

