"""Deploy the Novalis financial journal and sign-in; preserve Pointage VDC."""
import concurrent.futures,csv,hashlib,http.client,io,json,os,pwd,secrets,shutil,socket,sqlite3,ssl,subprocess,time,urllib.request
from pathlib import Path
PRIVATE=__ENCRYPTED_PRIVATE_INPUT__
SOURCE='5d72f532965109561fab504751a788c398eff6bd'
MANIFEST={"novalis-os/docs/billing.md":"8788b2ec186cd00422ce4b76a1de1654c61c49fe0f5f88a931061847535f339c","novalis-os/novalis_os/__init__.py":"87065c667fbc5eb642e75cf1168d355f3c6e510e780d8d67ecbfa0953c9e1b99","novalis-os/novalis_os/finance.py":"f3dd5161309cd9e77cc6b3394e0602f855c32dc78a3caa3e1e2f30b29cb47b5c","novalis-os/tests/billing-fixture.py":"f31d2117079874786ad266904b09e9b38368edd42a518b3cad4ff42ae2d25c4d","novalis-os/tests/payments-ui.cjs":"ca7f0d9e16d22e41b28caa4eb2858ef56179ffaacb6e3287cf0168c334f69512","novalis-os/tests/ui.cjs":"0f3b960ad78217f68297586f49e5d223f009924ae4b749e7dd33091fea16c19b","novalis-os/tests/finance-ui.cjs":"b41d26af927e9fdded454a66cb9af021becacc415d679637ac5df721ae67315b","novalis-os/tests/test_finance.py":"2e31441cae5f8d414e4ca55b692c0a8c24ad1b96821ef3702625dd66e747d2f4","novalis-os/web/app.js":"804e4d4ead506414ebe8507fc2f5daaadac951b76cf3807a15d66de416af5af5","novalis-os/web/index.html":"dc235052462bd18957dfc53c1f5e75c1703f47e37d0f6e8afb2a2fdb836d7863","novalis-os/web/auth.css":"6f3c753dc5bc58259f6da288d2c4a1343d5ee179e96e06bbec2ae5e8e0bc55c1","novalis-os/web/finance.css":"8b567b2a6534c6997bb06ee2ae50187b390e1af40ddc028690c8bbf4cd91d111","novalis-os/web/finance.js":"42348decefdd1a32fff803f3e5c69d7cd11eaf7a5d4ec980580dbf405248298e"}
ROOT=Path('/opt/novalis-os');ENV=Path('/etc/novalis-os/production.env');PREVIOUS=(ROOT/'current').resolve(strict=True)
RELEASE=ROOT/'releases'/('finance-login-'+SOURCE)
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

def login(address,role):
 status,body,headers=https('app.novalisai.com','/api/auth/login','POST',{'email':address,'password':PRIVATE['password']})
 assert status==200,'Live '+role+' login failed'
 session=json.loads(body);assert session['user']['role']==role and session['mfa_required'] is False
 cookie=next(v.split(';',1)[0] for k,v in headers.items() if k.lower()=='set-cookie')
 return cookie,session['csrf']

def verify_live():
 cookie,csrf=login('saidi@novalisai.com','manager')
 try:
  snapshots={}
  for mode in ['live','test']:
   status,body,_=https('app.novalisai.com','/api/finance?mode='+mode,cookie=cookie);assert status==200
   d=json.loads(body);assert d['mode']==mode;snapshots[mode]=d
   assert all(bool(i['test_mode'])==(mode=='test') for i in d['invoices'])
   assert all(bool(m['test_mode'])==(mode=='test') for m in d['movements'])
   incoming=sum(m['amount_cents'] for m in d['movements'] if m['direction']=='in')
   outgoing=sum(m['amount_cents'] for m in d['movements'] if m['direction']=='out')
   assert d['totals']['received_cents']==incoming and d['totals']['net_flow_cents']==incoming-outgoing
   status,body,headers=https('app.novalisai.com','/api/finance/movements.csv?mode='+mode,cookie=cookie);assert status==200
   entries=list(csv.DictReader(io.StringIO(body.decode('utf-8-sig'))))
   assert len(entries)==len(d['movements']) and all(e['environnement']==('TEST' if mode=='test' else 'REEL') for e in entries)
  demo=snapshots['test'];assert demo['demo_invoice_count']>=3 and demo['totals']['received_cents']>0
  pdf_count=0
  for movement in demo['movements']:
   if movement['receipt_url']:
    status,pdf,_=https('app.novalisai.com',movement['receipt_url'],cookie=cookie);assert status==200 and pdf.startswith(b'%PDF');pdf_count+=1
  assert pdf_count>=2
  REPORT.update(direction_login_verified=True,financial_journal_verified=True,test_movement_count=len(demo['movements']),test_receipts_verified=pdf_count,csv_exports_verified=True)
 finally:
  assert https('app.novalisai.com','/api/auth/logout','POST',{},cookie,csrf)[0]==200
 cookie,csrf=login('client.test@novalisai.com','client')
 try:
  for mode in ['live','test']:
   assert https('app.novalisai.com','/api/finance?mode='+mode,cookie=cookie)[0]==403
   assert https('app.novalisai.com','/api/finance/movements.csv?mode='+mode,cookie=cookie)[0]==403
  status,body,_=https('app.novalisai.com','/api/billing',cookie=cookie);assert status==200
  assert len(json.loads(body)['items'])>=3
  REPORT.update(client_login_verified=True,client_finance_access_forbidden=True)
 finally:
  assert https('app.novalisai.com','/api/auth/logout','POST',{},cookie,csrf)[0]==200

def main():
 os.umask(0o022);os.nice(10);before=protected()
 assert PREVIOUS.name=='billing-3714c60069e517c5eeeff5411cab480f8c217245','The live code changed; inspect before deploying'
 assert not RELEASE.exists(),'Release already exists; inspect before retry'
 env=environment(PREVIOUS);database=Path(env.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3';assert database.is_file()
 old_users=user_hash(database);RELEASE.mkdir(mode=0o755)
 shutil.copytree(PREVIOUS/'novalis-os',RELEASE/'novalis-os',ignore=shutil.ignore_patterns('__pycache__','.pytest_cache'))
 (RELEASE/'novalisai').symlink_to(PREVIOUS/'novalisai');(RELEASE/'.venv').symlink_to(PREVIOUS/'.venv')
 def fetch(entry):
  name,expected=entry;assert name.startswith('novalis-os/') and '..' not in Path(name).parts
  content=urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+name,timeout=40).read(2000000)
  assert hashlib.sha256(content).hexdigest()==expected,'Source mismatch: '+name
  p=RELEASE/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(content);p.chmod(0o644)
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(fetch,MANIFEST.items()))
 python=str(RELEASE/'.venv/bin/python');newenv=environment(RELEASE)
 run([python,'-m','unittest','discover','-s','tests','-v'],env=newenv,cwd=RELEASE/'novalis-os',timeout=360)
 REPORT['backend_tests_passed']=True
 assert user_hash(database)==old_users,'Live users changed before deployment'
 backup=Path('/srv/novalis-os/backups')/('before-finance-login-'+SOURCE[:12]);switched=False
 run(['systemctl','stop','novalis-worker.service','novalis-os.service'],timeout=30)
 try:
  run([str(PREVIOUS/'.venv/bin/python'),'-m','novalis_os.cli','backup','--destination',str(backup)],env=env,cwd=PREVIOUS/'novalis-os',timeout=120)
  run([str(PREVIOUS/'.venv/bin/python'),'-m','novalis_os.cli','check-backup','--source',str(backup)],env=env,cwd=PREVIOUS/'novalis-os',timeout=120)
  assert user_hash(database)==old_users,'Existing accounts changed'
  pointer(RELEASE);switched=True
  run(['systemctl','start','novalis-os.service','novalis-worker.service'],timeout=30)
  for attempt in range(30):
   try:
    if https('app.novalisai.com','/healthz')[0]==200:break
   except (OSError,http.client.HTTPException):pass
   time.sleep(1)
  else:raise RuntimeError('Novalis startup failed')
  for name in ['index.html','app.js','app.css','billing.js','billing.css','finance.js','finance.css','auth.css']:
   status,body,_=https('app.novalisai.com','/os/' if name=='index.html' else '/os/'+name)
   assert status==200 and body==(RELEASE/'novalis-os/web'/name).read_bytes(),'Live asset mismatch: '+name
  verify_live()
  assert user_hash(database)==old_users,'Existing accounts changed after checks'
  assert protected()==before,'Pointage, proxy, public website or environment changed'
 except Exception:
  run(['systemctl','stop','novalis-worker.service','novalis-os.service'],timeout=30)
  if switched:pointer(PREVIOUS)
  run(['systemctl','start','novalis-os.service','novalis-worker.service'],timeout=30)
  REPORT['rolled_back_code']=True;raise
 REPORT.update(completed=True,backup_verified=True,release=str(RELEASE),previous_release=str(PREVIOUS),pointage_unchanged=True,public_showcase_unchanged=True,existing_accounts_unchanged=True)
 dest=Path('/etc/novalis-os')/('deployment-finance-login-'+SOURCE[:12]+'.json');dest.write_text(json.dumps(REPORT,indent=2));dest.chmod(0o600);print(json.dumps(REPORT))
try:main()
except Exception as e:REPORT.update(error=str(e));print(json.dumps(REPORT));raise
