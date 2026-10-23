"""Deploy pinned Novalis runtime, verify service permissions and six demo logins."""
import hashlib, http.cookiejar, json, os, secrets, shlex, shutil, sqlite3, subprocess, time
import urllib.request, urllib.error
from pathlib import Path
REV='0bc410ff822ad14463ee22bd046b04cc54046a33'
MANIFEST={'novalis-os/novalis_os/projects.py': '4d9054229defb74be7a2fe6e3a966d457a431541d82bfb5aa3d84ea1ab736bdb', 'novalis-os/novalis_os/workspace.py': '9ec2770e28ef27224245d2e27d83f13b459e7e584bd287306c0755b785d3d8fc', 'novalis-os/novalis_os/auth.py': '51a894e9f357b5ceb7479470f29aff8f171a6e99ec5ddd1fe131284ab34c2e37', 'novalis-os/novalis_os/db.py': '54623e9031c13b77874a8a83a71217d4f7ce032bdc20c17a3bd4a025c0dca586', 'novalis-os/novalis_os/security.py': 'd70a103fbbb5b7072bc0971a6c7a127ce7ba65394cc56d946bd607c7ceb7c25e', 'novalis-os/novalis_os/intake-schema.sql': '7c47eb2084abb39d98796e2d087bf7be12b4873e130cd10ff03adde0f610e3bb', 'novalis-os/novalis_os/stakeholders-schema.sql': '895c230a6b889c42b03e7ebfd6d1923d9916420030dc431549935bb472341d4c', 'novalis-os/novalis_os/cli.py': '1fce498aa5a0c53e388191b1c13ec62b9d95c7d1292ba5a8b5cb3af34a3994df', 'novalis-os/novalis_os/documents.py': '10d9f36b2fc779d8a93ed46ff133ba5ae3e14a63c248561a0837d4a2de94eb9f', 'novalis-os/novalis_os/workspace-schema.sql': '55384335dd1825d2dc39c2636f1c8d419ef0205f7c310c4d9ba2bd821fe29bfc', 'novalis-os/novalis_os/billing_pdf.py': '147047a5c6ad7d12133ec072e8473394a8ffa3cfe468dc5101741391a105c57f', 'novalis-os/novalis_os/worker.py': '7f47a09d38ca6d6dee68dcbe726071135bd8c1bd0f71d099c5009e150fd9fbaf', 'novalis-os/novalis_os/payment_provider.py': '75630d1d663b1c21bb295214f58062f561d1f1daab746f105661b9289f32dc7a', 'novalis-os/novalis_os/outbox.py': '04d1d8297e53fdc1b7cb8567200a0f5f8f0a887ade6d6a88ca663e31e4ae749e', 'novalis-os/novalis_os/calendar.py': '1e7331b865b3073dde036df61510031f5d92dd033568286ba4c12b3be27d28bf', 'novalis-os/novalis_os/__init__.py': 'bca99bb35d8941b0255a57dc2282e08007e60de9eaf91ab9c7121e04dfa311e7', 'novalis-os/novalis_os/schema.sql': '02d62414456f66a77462e62485103e577d866e034f7af20ff8658807dfdf66fe', 'novalis-os/novalis_os/crm.py': '34c1ebf5d8a9ccf5542cba2ca5a93e5e493bc86e73426441e32613486a97f057', 'novalis-os/novalis_os/finance.py': 'f3dd5161309cd9e77cc6b3394e0602f855c32dc78a3caa3e1e2f30b29cb47b5c', 'novalis-os/novalis_os/billing.py': 'b45a8c1e0987cc16aa206c7d84e0fb46c9b74bf7571adb32d14f72325f7ba277', 'novalis-os/novalis_os/payment-schema.sql': '1d3259ea0cfa02e56d13f7bdeece93316f37fdb65b89c108ffa708e0b90e7e81', 'novalis-os/novalis_os/validation.py': '3ffcf4d16fed932ff476d1678c866472c3b235f6a439819ceff52d93e5a1367b', 'novalis-os/novalis_os/planning_pdf.py': 'df8f337a6447edbd080c08e15290e5f8bb5470cfc5bcc4138c90707cfb1afbce', 'novalis-os/novalis_os/demo_seed.py': 'f73a9137a60a9082e7dcad94d36400ae1ae168790766690aee6ae235078e9ef6', 'novalis-os/novalis_os/payments.py': '9320a8e9b541023bb7834a261ff8324096a2ef22e00805e696e5bd8384a7c70d', 'novalis-os/novalis_os/planning.py': '5f87cd753bf5084a2c4dc6a621458bfe4aa3db420cd450b41987e560ae311396', 'novalis-os/novalis_os/billing-schema.sql': 'a231dff0ce31465196dbd9690b3b9afb8c5566e4b9fb65eb62bcb7f7655fb277', 'novalis-os/novalis_os/planning-schema.sql': 'c995c932af99b7b87e3023b10e8d7604ba130f1bbd4c1c8c4d165bee98df7c56', 'novalis-os/novalis_os/intake.py': '6ed0f3eac4fb804b862fc8d3ef4845d81fa9a997244f2ae1802a0358226d4fa2', 'novalis-os/novalis_os/intelligence.py': '3d0e8a4c5597694d194ca14778690259116c13ee9e537c8c8c587e39f7185a1b', 'novalis-os/web/billing.css': '34e5e534c24fcfd51a227004caa858cb9e96ca7470b50865e1fde4166b27f97a', 'novalis-os/web/planning.css': 'b21638c4e2c653f18af9ac67c8609f1685344808f20afdc67c633fa2cdaf00cc', 'novalis-os/web/planning.js': '14492347d89e5dbe723fe3ca625c8cc1a93febf27ffe39530770cfc694ca72b3', 'novalis-os/web/billing.js': 'dd4be1757dec85097ac3a1a3f145b1cc2c610654ae81e493ab41f0009af9a3eb', 'novalis-os/web/auth.css': '6f3c753dc5bc58259f6da288d2c4a1343d5ee179e96e06bbec2ae5e8e0bc55c1', 'novalis-os/web/index.html': '2726a2af9d01aefbf22104c7ee3ae95f85a50349e5456143bae6a16b355c273d', 'novalis-os/web/finance.js': '42348decefdd1a32fff803f3e5c69d7cd11eaf7a5d4ec980580dbf405248298e', 'novalis-os/web/finance.css': '8b567b2a6534c6997bb06ee2ae50187b390e1af40ddc028690c8bbf4cd91d111', 'novalis-os/web/app.js': '79ed5882b588d8346a550626470d27360a43ffdd2279c0f90fb96b2e153e1d90', 'novalis-os/web/app.css': '5b063548bfbd0d4fbaa12b5eaa05d024fcf5ffbf997483a1630724c6f0a88623', 'novalis-os/requirements.txt': '213acd8b658e4ffa59586d3005f672b4941c7aa7f993c25e2d7ccbb5603c025c'}
ROOT=Path('/opt/novalis-os');ACTIVE=ROOT/'current'
EXPECTED=ROOT/'releases/5a4176e54847f2c6d914a7d01f388aea99e68666-planning2'
ORIGIN='https://app.novalisai.com'
REPORT={'revision':REV,'deployed':False}

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def run(args,env=None,cwd=None,input=None,timeout=90):
    p=subprocess.run(args,input=input,capture_output=True,text=True,env=env,cwd=cwd,timeout=timeout)
    if p.returncode:raise RuntimeError(args[0]+': '+p.stderr[-1600:])
    return p.stdout.strip()
def probe(url):
    try:
        with urllib.request.urlopen(url,timeout=20) as r:return r.status,r.read(5000000)
    except urllib.error.HTTPError as e:return e.code,e.read(2000)
def healthy():
    try:
        status,body=probe('http://127.0.0.1:18080/healthz')
        return status==200 and json.loads(body).get('status')=='ok'
    except Exception:return False
def wait_health():
    for _ in range(35):
        if healthy():return
        time.sleep(1)
    raise RuntimeError('Application did not become healthy within 35 seconds')
def switch(target):
    p=ROOT/('.next-finish-'+secrets.token_hex(5));p.symlink_to(target);os.replace(p,ACTIVE)
def request(opener,path,data=None,csrf=None):
    headers={'Origin':ORIGIN,'Content-Type':'application/json'}
    if csrf:headers['X-CSRF-Token']=csrf
    query=urllib.request.Request(ORIGIN+path,data=json.dumps(data).encode() if data is not None else None,headers=headers)
    try:
        with opener.open(query,timeout=25) as r:return r.status,r.read(5000000)
    except urllib.error.HTTPError as e:return e.code,e.read(5000)
def verify_accounts(credentials):
    checks={}
    for role,profile in credentials.items():
        opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status,body=request(opener,'/api/auth/login',{'email':profile['email'],'password':profile['password']})
        if status!=200:raise RuntimeError('Login failed for '+role+': '+str(status))
        login=json.loads(body);csrf=login['csrf']
        try:
            if login['user']['role']!=role:raise RuntimeError('Wrong role after login')
            limited=role in {'manager','finance','sysadmin'}
            if login['mfa_required']!=limited:raise RuntimeError('Unexpected MFA requirement for '+role)
            status,body=request(opener,'/api/session')
            if status!=200:raise RuntimeError('Session check failed')
            csrf=json.loads(body)['csrf']
            status,body=request(opener,'/api/projects')
            if limited:
                if status!=403:raise RuntimeError('MFA boundary not enforced')
                checks[role]={'login':200,'session':200,'mfa_setup_required':True}
                continue
            if status!=200:raise RuntimeError('Project list failed')
            projects=json.loads(body)['items'];expected=1 if role=='client' else 4
            if len(projects)!=expected:raise RuntimeError('Unexpected demo project scope for '+role)
            for path in ['/api/dashboard','/api/planner/calendar','/api/planner/calendar.ics']:
                status,body=request(opener,path)
                if status!=200:raise RuntimeError('Endpoint failed: '+role+' '+path+' '+str(status))
            for project in projects:
                pid=project['id']
                for path in ['/api/projects/'+pid+'/intelligence','/api/projects/'+pid+'/stakeholders','/api/planning/'+pid,'/api/planning/'+pid+'/graph']:
                    status,body=request(opener,path)
                    if status!=200:raise RuntimeError('Project endpoint failed: '+role+' '+path+' '+str(status))
                if role=='client':
                    status,body=request(opener,'/api/planning/'+pid+'/dossier/pdf')
                    if status!=200 or not body.startswith(b'%PDF'):raise RuntimeError('Client dossier export failed')
            if role=='client':
                status,body=request(opener,'/api/billing')
                if status!=200:raise RuntimeError('Client billing failed')
                invoices=json.loads(body)['items']
                if not invoices or any(not i['test_mode'] for i in invoices):raise RuntimeError('Client test invoice scope failed')
                for invoice in invoices:
                    status,body=request(opener,'/api/billing/'+invoice['id']+'/pdf')
                    if status!=200 or not body.startswith(b'%PDF'):raise RuntimeError('Client invoice PDF failed')
            checks[role]={'login':200,'session':200,'mfa_setup_required':False,'projects':len(projects),'calendar_and_planning':True,'pdf':role=='client'}
        finally:
            status,_=request(opener,'/api/auth/logout',{},csrf)
            if status!=200:raise RuntimeError('Validation session cleanup failed')
    return checks

def main():
    os.umask(0o077);os.nice(10)
    if ACTIVE.resolve()!=EXPECTED:raise RuntimeError('Active release changed; review concurrent deployment')
    if not healthy():raise RuntimeError('Baseline is not healthy')
    public=Path('/var/www/novalis-ai/current').resolve();public_hash=sha(public/'index.html')
    pointage=sha('/etc/nginx/sites-enabled/pointagevdc')
    untouched={s:run(['systemctl','show',s,'--property=MainPID','--value']) for s in ['nginx.service','pm2-root.service','postgresql@17-main.service']}
    env=dict(os.environ)
    for line in Path('/etc/novalis-os/production.env').read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            k,v=line.split('=',1);vals=shlex.split(v,comments=False);env[k]=vals[0] if vals else ''
    data=Path(env['NOVALIS_DATA_DIR']);database=data/'novalis.sqlite3'
    if data!=Path('/srv/novalis-os/data'):raise RuntimeError('Unexpected data path')
    backup=Path('/srv/novalis-os/backups')/('finish-demo-'+time.strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as src,sqlite3.connect(backup/'database.sqlite3') as dst:
        src.backup(dst)
        if dst.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Backup integrity failed')
        real_before=dst.execute("SELECT COUNT(*) FROM projects WHERE org_id!='novalis-demo'").fetchone()[0]
        if dst.execute("SELECT COUNT(*) FROM users WHERE org_id='novalis-demo'").fetchone()[0]!=6:raise RuntimeError('Expected six existing demo users')
        if dst.execute("SELECT COUNT(*) FROM projects WHERE org_id='novalis-demo'").fetchone()[0]!=4:raise RuntimeError('Expected four existing demo projects')
    REPORT['backup']=str(backup)
    destination=ROOT/'releases'/('demo-finished-'+REV[:12])
    if destination.exists():raise RuntimeError('Destination already exists')
    shutil.copytree(EXPECTED,destination,symlinks=True,ignore=shutil.ignore_patterns('__pycache__','.git'))
    for file,digest in MANIFEST.items():
        target=destination/file
        if target.is_file() and sha(target)==digest:continue
        with urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+REV+'/'+file,timeout=30) as response:body=response.read(500000)
        if hashlib.sha256(body).hexdigest()!=digest:raise RuntimeError('Artifact digest mismatch: '+file)
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(body)
    for p in [destination,* (destination/'novalis-os').rglob('*')]:
        if not p.is_symlink():p.chmod(0o755 if p.is_dir() else 0o644)
    if (destination/'novalis-os/requirements.txt').read_bytes()!=(EXPECTED/'novalis-os/requirements.txt').read_bytes():raise RuntimeError('Dependency upgrade requires a new environment')
    python=str(destination/'.venv/bin/python');env['PYTHONPATH']=str(destination/'novalis-os')
    preflight="from novalis_os import create_app; a=create_app(); r=a.test_client().get('/healthz'); assert r.status_code==200; import novalis_os.intelligence; print('service-user preflight passed')"
    run(['runuser','-u','novalis-os','--',python,'-c',preflight],env=env,cwd=destination/'novalis-os')
    REPORT['service_user_preflight']=True
    # Administrative rotation is restricted to the six confirmed synthetic accounts.
    credential_code='''import json,secrets
from novalis_os import create_app
from novalis_os.demo_seed import ROLES,DEMO_ORG
from novalis_os.db import transaction,audit
from novalis_os.security import hash_password
a=create_app();result={}
with a.app_context(), transaction() as db:
    for role,(address,_) in ROLES.items():
        u=db.execute("SELECT * FROM users WHERE email=? AND org_id=? AND role=?",(address,DEMO_ORG,role)).fetchone()
        if not u or u['status']!='active' or u['totp_cipher']:raise RuntimeError('Demo account state changed; preserve credentials')
        password=secrets.token_urlsafe(16)+'!7a'
        db.execute('UPDATE users SET password_hash=? WHERE id=?',(hash_password(password),u['id']))
        db.execute('DELETE FROM sessions WHERE user_id=?',(u['id'],))
        audit('demo.credentials_reissued',u['id'],org_id=DEMO_ORG)
        result[role]={'email':address,'password':password}
print(json.dumps(result))
'''
    credentials=json.loads(run(['runuser','-u','novalis-os','--',python,'-c',credential_code],env=env,cwd=destination/'novalis-os'))
    access_file=backup/'demo-access.json';access_file.write_text(json.dumps(credentials));access_file.chmod(0o600)
    REPORT['accounts']=credentials
    switched=False
    try:
        if ACTIVE.resolve()!=EXPECTED:raise RuntimeError('Concurrent deployment detected')
        switch(destination);switched=True
        run(['systemctl','restart','novalis-os.service','novalis-worker.service'])
        wait_health()
        for service in ['novalis-os.service','novalis-worker.service']:
            if run(['systemctl','is-active',service])!='active':raise RuntimeError('Service is not active')
        for name in ['planning.js','planning.css','app.js']:
            code,body=probe(ORIGIN+'/os/'+name)
            if code!=200 or hashlib.sha256(body).hexdigest()!=sha(destination/'novalis-os/web'/name):raise RuntimeError('Public application asset mismatch')
        REPORT['checks']=verify_accounts(credentials)
        with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as db:
            if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or db.execute('PRAGMA foreign_key_check').fetchone():raise RuntimeError('Database integrity failed')
            if db.execute("SELECT COUNT(*) FROM projects WHERE org_id!='novalis-demo'").fetchone()[0]!=real_before:raise RuntimeError('Business project count changed')
            if db.execute("SELECT COUNT(*) FROM billing_documents WHERE org_id='novalis-demo' AND test_mode=0").fetchone()[0]:raise RuntimeError('Real invoice in demonstration tenant')
        if pointage!=sha('/etc/nginx/sites-enabled/pointagevdc') or any(run(['systemctl','show',s,'--property=MainPID','--value'])!=pid for s,pid in untouched.items()):raise RuntimeError('Unrelated service changed')
        if Path('/var/www/novalis-ai/current').resolve()!=public or sha(public/'index.html')!=public_hash:raise RuntimeError('Public showcase changed')
        REPORT.update(deployed=True,release=str(destination),existing_business_preserved=True,pointage_unchanged=True,public_preserved=True)
        (backup/'report.json').write_text(json.dumps(REPORT,indent=2))
    except Exception:
        if switched:
            switch(EXPECTED);run(['systemctl','restart','novalis-os.service','novalis-worker.service']);wait_health();REPORT['rolled_back']=True
        raise

try:
    main();print(json.dumps(REPORT))
except Exception as error:
    REPORT['error']=str(error);print(json.dumps(REPORT));raise SystemExit(1)
