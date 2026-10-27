"""Deploy a pinned Novalis OS release with additive migration and rollback."""
import hashlib, json, os, pwd, secrets, shlex, shutil, sqlite3, subprocess, tempfile, time
import urllib.request, urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

REV = '4964f6c270ade9f50387bbbbc0b74faf5c85e9b8'
MANIFEST = {'novalis-os/novalis_os/__init__.py': '6f25587ce4644182e9c3b6952ffb9fa2502caca9a18c3df8c5aa11e09c28c706', 'novalis-os/novalis_os/auth.py': '90479f624ee4fc77c7a2111ba4afd8fe2472d42db78e100444f32c6dc7c38826', 'novalis-os/novalis_os/billing-schema.sql': 'a231dff0ce31465196dbd9690b3b9afb8c5566e4b9fb65eb62bcb7f7655fb277', 'novalis-os/novalis_os/billing.py': '5980ccf3b3493607f19fda4146b67234228825cb9bc4539f815cc48c645e70c7', 'novalis-os/novalis_os/billing_pdf.py': 'f8716f00a0cc17ee74fd9f63cbdff2efbe4f5c881fb4bbac1c0e4854c48d4626', 'novalis-os/novalis_os/calendar.py': '1e7331b865b3073dde036df61510031f5d92dd033568286ba4c12b3be27d28bf', 'novalis-os/novalis_os/cli.py': '1fce498aa5a0c53e388191b1c13ec62b9d95c7d1292ba5a8b5cb3af34a3994df', 'novalis-os/novalis_os/crm.py': '34c1ebf5d8a9ccf5542cba2ca5a93e5e493bc86e73426441e32613486a97f057', 'novalis-os/novalis_os/db.py': 'c8a10856f275530a1807f5c1749babbe227dbc8d3a5a4d7b369a8c3c06df328c', 'novalis-os/novalis_os/demo_engineering.py': '0113ccc6c62a4c145a8868945a4848bb5bab571b2526ef98cc5030104a73d1a8', 'novalis-os/novalis_os/demo_seed.py': 'f73a9137a60a9082e7dcad94d36400ae1ae168790766690aee6ae235078e9ef6', 'novalis-os/novalis_os/documents.py': '10d9f36b2fc779d8a93ed46ff133ba5ae3e14a63c248561a0837d4a2de94eb9f', 'novalis-os/novalis_os/finance.py': 'f3dd5161309cd9e77cc6b3394e0602f855c32dc78a3caa3e1e2f30b29cb47b5c', 'novalis-os/novalis_os/fonts/LICENSE.txt': 'e81d9dced49fea2a7d576cbea283873de58563c5d488f954deb282843c3ea79c', 'novalis-os/novalis_os/fonts/NovalisSans-Bold.ttf': '0f89375a23e8b9c7af0b0c8fd534a0d4eeafb8247466362e78c2058267cca454', 'novalis-os/novalis_os/fonts/NovalisSans.ttf': 'e8e052a68005b63a3cad7d56fb37ea0616543bce177f5f71a08a5c93b55749a2', 'novalis-os/novalis_os/intake-schema.sql': '7c47eb2084abb39d98796e2d087bf7be12b4873e130cd10ff03adde0f610e3bb', 'novalis-os/novalis_os/intake.py': '6ed0f3eac4fb804b862fc8d3ef4845d81fa9a997244f2ae1802a0358226d4fa2', 'novalis-os/novalis_os/intelligence.py': '9941af7487062ca3bf638f662f7ace90302bb882ab324e4cd6f0db129f0f3e34', 'novalis-os/novalis_os/operations.py': 'e9a0bd4046b837627fa0ca03ec4f105e0153628cd5807da8ef805c2150c5ee8f', 'novalis-os/novalis_os/outbox.py': '04d1d8297e53fdc1b7cb8567200a0f5f8f0a887ade6d6a88ca663e31e4ae749e', 'novalis-os/novalis_os/payment-schema.sql': '1d3259ea0cfa02e56d13f7bdeece93316f37fdb65b89c108ffa708e0b90e7e81', 'novalis-os/novalis_os/payment_provider.py': '75630d1d663b1c21bb295214f58062f561d1f1daab746f105661b9289f32dc7a', 'novalis-os/novalis_os/payments.py': '9320a8e9b541023bb7834a261ff8324096a2ef22e00805e696e5bd8384a7c70d', 'novalis-os/novalis_os/planning-schema.sql': '4d5b4a5ed73d7815ad6b0babb36de38953c1ec500d35ac48fe620928b0fb60c1', 'novalis-os/novalis_os/planning.py': 'e12fc006ffab748001dbb6f0f893b273d1b2e9fd879cb66865e756cfdba3e804', 'novalis-os/novalis_os/planning_pdf.py': 'aa7fdde4feb0f6d48b77467384297c683b1d5efda33616c6cf5a22d803a6b0f8', 'novalis-os/novalis_os/projects.py': '979b4dc5b0856e109a9438016b97b6e4ee0055274136ad11b4b742540596157f', 'novalis-os/novalis_os/schema.sql': '02d62414456f66a77462e62485103e577d866e034f7af20ff8658807dfdf66fe', 'novalis-os/novalis_os/security.py': '045f465950a4d6e092427229f139e825829d690e4f03fd986d070e0661948c40', 'novalis-os/novalis_os/stakeholders-schema.sql': '895c230a6b889c42b03e7ebfd6d1923d9916420030dc431549935bb472341d4c', 'novalis-os/novalis_os/validation.py': '3ffcf4d16fed932ff476d1678c866472c3b235f6a439819ceff52d93e5a1367b', 'novalis-os/novalis_os/worker.py': '7f47a09d38ca6d6dee68dcbe726071135bd8c1bd0f71d099c5009e150fd9fbaf', 'novalis-os/novalis_os/workspace-schema.sql': '55384335dd1825d2dc39c2636f1c8d419ef0205f7c310c4d9ba2bd821fe29bfc', 'novalis-os/novalis_os/workspace.py': '9ec2770e28ef27224245d2e27d83f13b459e7e584bd287306c0755b785d3d8fc', 'novalis-os/requirements.txt': '213acd8b658e4ffa59586d3005f672b4941c7aa7f993c25e2d7ccbb5603c025c', 'novalis-os/web/app.css': '9cff240928f6d06b1c52dd294677d394bc3d689d754dcd09bb6de952543e44e8', 'novalis-os/web/app.js': '50481eed3f65d1dcb7f08458e2c6811f4b4bb7e0aaf589bd0e4bf6afdb3ef234', 'novalis-os/web/auth.css': '6f3c753dc5bc58259f6da288d2c4a1343d5ee179e96e06bbec2ae5e8e0bc55c1', 'novalis-os/web/billing.css': '34e5e534c24fcfd51a227004caa858cb9e96ca7470b50865e1fde4166b27f97a', 'novalis-os/web/billing.js': '7e11675390d8de51c74944112b5a3b723cbe2c4d6c4c6502b3fb26b5242c890f', 'novalis-os/web/finance.css': '8b567b2a6534c6997bb06ee2ae50187b390e1af40ddc028690c8bbf4cd91d111', 'novalis-os/web/finance.js': '3f506a59ccc687408ded8178c561379f46f0a7c52b707b7dd1f147394d798ce9', 'novalis-os/web/index.html': '3cc88d3a7c9fa53e8b88fec78dcdeead295a6af10127f4451f8f8d686c428d79', 'novalis-os/web/planning.css': 'b21638c4e2c653f18af9ac67c8609f1685344808f20afdc67c633fa2cdaf00cc', 'novalis-os/web/planning.js': '6c0465e419674b2378de3b6199c56f74b8b63af9ba5058f596060756dae637fb', 'novalis-os/web/premium.css': 'd4596e40e348d40fc1c5fdf6bff9e6b4a433ea89723b01e2ff96c64828bdfc45', 'novalis-os/web/premium.js': '162d763f01dc427b8141b1a10efde34b9b1b9ecd44973516b6a278caf03a9d65'}
BASELINE = {'novalis-os/novalis_os/__init__.py': 'bca99bb35d8941b0255a57dc2282e08007e60de9eaf91ab9c7121e04dfa311e7', 'novalis-os/novalis_os/auth.py': '90479f624ee4fc77c7a2111ba4afd8fe2472d42db78e100444f32c6dc7c38826', 'novalis-os/novalis_os/billing-schema.sql': 'a231dff0ce31465196dbd9690b3b9afb8c5566e4b9fb65eb62bcb7f7655fb277', 'novalis-os/novalis_os/billing.py': 'd0fcc53f468d3205dac7019f48ab60e95f1d3a70bd79e2cd7096df07c5c59025', 'novalis-os/novalis_os/billing_pdf.py': '147047a5c6ad7d12133ec072e8473394a8ffa3cfe468dc5101741391a105c57f', 'novalis-os/novalis_os/calendar.py': '1e7331b865b3073dde036df61510031f5d92dd033568286ba4c12b3be27d28bf', 'novalis-os/novalis_os/cli.py': '1fce498aa5a0c53e388191b1c13ec62b9d95c7d1292ba5a8b5cb3af34a3994df', 'novalis-os/novalis_os/crm.py': '34c1ebf5d8a9ccf5542cba2ca5a93e5e493bc86e73426441e32613486a97f057', 'novalis-os/novalis_os/db.py': '54623e9031c13b77874a8a83a71217d4f7ce032bdc20c17a3bd4a025c0dca586', 'novalis-os/novalis_os/demo_engineering.py': '0113ccc6c62a4c145a8868945a4848bb5bab571b2526ef98cc5030104a73d1a8', 'novalis-os/novalis_os/demo_seed.py': 'f73a9137a60a9082e7dcad94d36400ae1ae168790766690aee6ae235078e9ef6', 'novalis-os/novalis_os/documents.py': '10d9f36b2fc779d8a93ed46ff133ba5ae3e14a63c248561a0837d4a2de94eb9f', 'novalis-os/novalis_os/finance.py': 'f3dd5161309cd9e77cc6b3394e0602f855c32dc78a3caa3e1e2f30b29cb47b5c', 'novalis-os/novalis_os/fonts/LICENSE.txt': 'e81d9dced49fea2a7d576cbea283873de58563c5d488f954deb282843c3ea79c', 'novalis-os/novalis_os/fonts/NovalisSans-Bold.ttf': '0f89375a23e8b9c7af0b0c8fd534a0d4eeafb8247466362e78c2058267cca454', 'novalis-os/novalis_os/fonts/NovalisSans.ttf': 'e8e052a68005b63a3cad7d56fb37ea0616543bce177f5f71a08a5c93b55749a2', 'novalis-os/novalis_os/intake-schema.sql': '7c47eb2084abb39d98796e2d087bf7be12b4873e130cd10ff03adde0f610e3bb', 'novalis-os/novalis_os/intake.py': '6ed0f3eac4fb804b862fc8d3ef4845d81fa9a997244f2ae1802a0358226d4fa2', 'novalis-os/novalis_os/intelligence.py': '3d0e8a4c5597694d194ca14778690259116c13ee9e537c8c8c587e39f7185a1b', 'novalis-os/novalis_os/outbox.py': '04d1d8297e53fdc1b7cb8567200a0f5f8f0a887ade6d6a88ca663e31e4ae749e', 'novalis-os/novalis_os/payment-schema.sql': '1d3259ea0cfa02e56d13f7bdeece93316f37fdb65b89c108ffa708e0b90e7e81', 'novalis-os/novalis_os/payment_provider.py': '75630d1d663b1c21bb295214f58062f561d1f1daab746f105661b9289f32dc7a', 'novalis-os/novalis_os/payments.py': '9320a8e9b541023bb7834a261ff8324096a2ef22e00805e696e5bd8384a7c70d', 'novalis-os/novalis_os/planning-schema.sql': 'c995c932af99b7b87e3023b10e8d7604ba130f1bbd4c1c8c4d165bee98df7c56', 'novalis-os/novalis_os/planning.py': '5f87cd753bf5084a2c4dc6a621458bfe4aa3db420cd450b41987e560ae311396', 'novalis-os/novalis_os/planning_pdf.py': 'df8f337a6447edbd080c08e15290e5f8bb5470cfc5bcc4138c90707cfb1afbce', 'novalis-os/novalis_os/projects.py': '4d9054229defb74be7a2fe6e3a966d457a431541d82bfb5aa3d84ea1ab736bdb', 'novalis-os/novalis_os/schema.sql': '02d62414456f66a77462e62485103e577d866e034f7af20ff8658807dfdf66fe', 'novalis-os/novalis_os/security.py': '045f465950a4d6e092427229f139e825829d690e4f03fd986d070e0661948c40', 'novalis-os/novalis_os/stakeholders-schema.sql': '895c230a6b889c42b03e7ebfd6d1923d9916420030dc431549935bb472341d4c', 'novalis-os/novalis_os/validation.py': '3ffcf4d16fed932ff476d1678c866472c3b235f6a439819ceff52d93e5a1367b', 'novalis-os/novalis_os/worker.py': '7f47a09d38ca6d6dee68dcbe726071135bd8c1bd0f71d099c5009e150fd9fbaf', 'novalis-os/novalis_os/workspace-schema.sql': '55384335dd1825d2dc39c2636f1c8d419ef0205f7c310c4d9ba2bd821fe29bfc', 'novalis-os/novalis_os/workspace.py': '9ec2770e28ef27224245d2e27d83f13b459e7e584bd287306c0755b785d3d8fc', 'novalis-os/requirements.txt': '213acd8b658e4ffa59586d3005f672b4941c7aa7f993c25e2d7ccbb5603c025c', 'novalis-os/web/app.css': '9cff240928f6d06b1c52dd294677d394bc3d689d754dcd09bb6de952543e44e8', 'novalis-os/web/app.js': 'f239baf5953f85d48c6098d35f267bd78d3913ed0c7adc8e2820eed760df0f2b', 'novalis-os/web/auth.css': '6f3c753dc5bc58259f6da288d2c4a1343d5ee179e96e06bbec2ae5e8e0bc55c1', 'novalis-os/web/billing.css': '34e5e534c24fcfd51a227004caa858cb9e96ca7470b50865e1fde4166b27f97a', 'novalis-os/web/billing.js': '88af4e3c9273676f777db6e502fc6b7bf2a18592d23822cd2fe9d9cbe4487432', 'novalis-os/web/finance.css': '8b567b2a6534c6997bb06ee2ae50187b390e1af40ddc028690c8bbf4cd91d111', 'novalis-os/web/finance.js': '3f506a59ccc687408ded8178c561379f46f0a7c52b707b7dd1f147394d798ce9', 'novalis-os/web/index.html': '2726a2af9d01aefbf22104c7ee3ae95f85a50349e5456143bae6a16b355c273d', 'novalis-os/web/planning.css': 'b21638c4e2c653f18af9ac67c8609f1685344808f20afdc67c633fa2cdaf00cc', 'novalis-os/web/planning.js': '14492347d89e5dbe723fe3ca625c8cc1a93febf27ffe39530770cfc694ca72b3'}
ROOT = Path('/opt/novalis-os')
ACTIVE = ROOT/'current'
ORIGIN = 'https://app.novalisai.com'
REPORT = {'revision': REV, 'deployed': False}

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def run(args, env=None, cwd=None, timeout=120):
    p=subprocess.run(args,capture_output=True,text=True,env=env,cwd=cwd,timeout=timeout)
    if p.returncode: raise RuntimeError(args[0]+': '+p.stderr[-1800:])
    return p.stdout.strip()
def probe(url):
    try:
        with urllib.request.urlopen(url,timeout=25) as r: return r.status,r.read(12000000)
    except urllib.error.HTTPError as e: return e.code,e.read(2000)
def healthy():
    try:
        code,body=probe('http://127.0.0.1:18080/healthz')
        return code==200 and json.loads(body).get('status')=='ok'
    except Exception: return False
def wait_health():
    for _ in range(35):
        if healthy(): return
        time.sleep(1)
    raise RuntimeError('Health check failed after restart')
def switch(path):
    link=ROOT/('.premium-next-'+secrets.token_hex(5));link.symlink_to(path);os.replace(link,ACTIVE)
def logical_database(database):
    with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as db:
        result={}
        for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('migrations','phase_invoice_requests') ORDER BY name"):
            values=list(db.execute('SELECT * FROM "'+name.replace('"','""')+'" ORDER BY rowid'))
            result[name]=hashlib.sha256(json.dumps(values,default=str).encode()).hexdigest()
        return result

PREFLIGHT = r'''
import json,secrets,sys
from novalis_os import create_app
from novalis_os.db import get_db,migrate,now
from novalis_os.security import digest,expires
database,documents=sys.argv[1:];migrate(database)
a=create_app({'DATABASE':database,'FILES_DIR':documents});origin=a.config['APP_ORIGIN'];host=origin.split('://',1)[1]
result={}
with a.app_context():
    users=[dict(u) for u in get_db().execute("SELECT id,role FROM users WHERE org_id='novalis-demo' AND status='active'")]
    assert len(users)==6,'Expected six demo roles'
    for u in users:
        token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32)
        get_db().execute('INSERT INTO sessions VALUES(?,?,?,?,?,?)',(digest(token),u['id'],digest(csrf),0,expires(1),now()))
        api=a.test_client();api.set_cookie(a.config['COOKIE_NAME'],token,domain=host)
        def get(path,expected=200):
            r=api.get(path,base_url=origin);assert r.status_code==expected,(u['role'],path,r.status_code);return r
        csrf=get('/api/session').json['csrf']
        result[u['role']]={'session':True}
        allowed=u['role'] in {'manager','account','developer'}
        for path in ['/api/operations/time','/api/operations/time.csv','/api/operations/time/pdf']:get(path,200 if allowed else 403)
        r=api.post('/api/nova/chat',base_url=origin,json={'message':'Priorités'},headers={'Origin':origin,'X-CSRF-Token':csrf});assert r.status_code==200
        projects=get('/api/projects').json['items']
        for project in projects:
            pid=project['id'];get('/api/operations/projects/'+pid)
            r=api.post('/api/nova/chat',base_url=origin,json={'message':'Facturation','project_id':pid},headers={'Origin':origin,'X-CSRF-Token':csrf});assert r.status_code==200,(u['role'],r.status_code)
            if u['role']=='manager':
                plan=get('/api/planning/'+pid).json
                graph=get('/api/planning/'+pid+'/graph/pdf');assert graph.data.startswith(b'%PDF')
                if plan['specs']:
                    pdf=get('/api/planning/specs/'+plan['specs'][0]['id']+'/pdf');assert pdf.data.startswith(b'%PDF')
        result[u['role']]['project_count']=len(projects)
        if u['role']=='manager':
            invoices=get('/api/billing').json['items']
            if invoices:assert get('/api/billing/'+invoices[0]['id']+'/pdf').data.startswith(b'%PDF')
        get_db().execute('DELETE FROM sessions WHERE token_hash=?',(digest(token),))
print(json.dumps(result))
'''

def main():
    previous=ACTIVE.resolve()
    if not previous.is_relative_to(ROOT/'releases') or not previous.is_dir(): raise RuntimeError('Unexpected active release')
    REPORT['previous_release']=str(previous)
    if not healthy(): raise RuntimeError('Baseline application not healthy')
    unexpected=[name for name,digest in BASELINE.items() if not (previous/name).is_file() or sha(previous/name)!=digest]
    if unexpected: raise RuntimeError('Live code differs from reviewed baseline: '+', '.join(unexpected))
    env=dict(os.environ)
    for line in Path('/etc/novalis-os/production.env').read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            key,value=line.split('=',1);parts=shlex.split(value,comments=False);env[key]=parts[0] if parts else ''
    data=Path(env['NOVALIS_DATA_DIR']);database=data/'novalis.sqlite3'
    if data!=Path('/srv/novalis-os/data'): raise RuntimeError('Unexpected data path')
    public=Path('/var/www/novalis-ai/current').resolve();public_hash=sha(public/'index.html')
    pointage=sha('/etc/nginx/sites-enabled/pointagevdc')
    untouched={s:run(['systemctl','show',s,'--property=MainPID','--value']) for s in ['nginx.service','pm2-root.service','postgresql@17-main.service']}
    destination=ROOT/'releases'/('premium-nova-'+REV[:12]+'-v2')
    if destination.exists(): raise RuntimeError('Release already exists')
    shutil.copytree(previous,destination,symlinks=True,ignore=shutil.ignore_patterns('__pycache__','.git'))
    def download(item):
        name,digest=item;target=destination/name
        if target.is_file() and sha(target)==digest:return
        with urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+REV+'/'+name,timeout=30) as r: body=r.read(10000000)
        if hashlib.sha256(body).hexdigest()!=digest: raise RuntimeError('Artifact hash mismatch: '+name)
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(body);target.chmod(0o644)
    with ThreadPoolExecutor(max_workers=4) as executor: list(executor.map(download,MANIFEST.items()))
    for p in [destination,*(destination/'novalis-os').rglob('*')]:
        if not p.is_symlink(): p.chmod(0o755 if p.is_dir() else 0o644)
    if (destination/'novalis-os/requirements.txt').read_bytes()!=(previous/'novalis-os/requirements.txt').read_bytes(): raise RuntimeError('Dependency upgrade requires a separate environment')
    python=str(destination/'.venv/bin/python');env['PYTHONPATH']=str(destination/'novalis-os')
    user=pwd.getpwnam('novalis-os')
    with tempfile.TemporaryDirectory(prefix='novalis-premium-qa-') as temporary:
        temp=Path(temporary);temp.chmod(0o700);os.chown(temp,user.pw_uid,user.pw_gid);copy=temp/'qa.sqlite3'
        with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as src,sqlite3.connect(copy) as dst:src.backup(dst)
        copy.chmod(0o600);os.chown(copy,user.pw_uid,user.pw_gid)
        REPORT['production_copy_checks']=json.loads(run(['runuser','-u','novalis-os','--',python,'-c',PREFLIGHT,str(copy),str(data/'documents')],env=env,cwd=destination/'novalis-os',timeout=180))
    if ACTIVE.resolve()!=previous: raise RuntimeError('Concurrent deployment detected')
    backup=Path('/srv/novalis-os/backups')/('premium-'+time.strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
    stopped=False;switched=False
    try:
        run(['systemctl','stop','novalis-worker.service','novalis-os.service']);stopped=True
        with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as src,sqlite3.connect(backup/'database.sqlite3') as dst:
            src.backup(dst)
            if dst.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Backup integrity check failed')
        REPORT['backup']=str(backup)
        before=logical_database(database)
        run(['runuser','-u','novalis-os','--',python,'-m','novalis_os.cli','migrate'],env=env,cwd=destination/'novalis-os')
        if logical_database(database)!=before:raise RuntimeError('Migration changed existing business records')
        with sqlite3.connect('file:'+str(database)+'?mode=ro',uri=True) as db:
            assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
            assert db.execute('PRAGMA foreign_key_check').fetchone() is None
            assert db.execute('SELECT MAX(version) FROM migrations').fetchone()[0]==8
        switch(destination);switched=True
        run(['systemctl','start','novalis-os.service','novalis-worker.service']);wait_health()
        for service in ['novalis-os.service','novalis-worker.service']:assert run(['systemctl','is-active',service])=='active'
        for name in ['premium.js','premium.css','app.js','planning.js','billing.js']:
            code,body=probe(ORIGIN+'/os/'+name)
            if code!=200 or hashlib.sha256(body).hexdigest()!=sha(destination/'novalis-os/web'/name):raise RuntimeError('Public asset mismatch: '+name)
        code,body=probe(ORIGIN+'/os/')
        assert code==200 and b'premium.js' in body and b'premium.css' in body
        assert probe(ORIGIN+'/api/operations/time')[0]==401
        assert probe(ORIGIN+'/healthz')[0]==200
        if pointage!=sha('/etc/nginx/sites-enabled/pointagevdc') or any(run(['systemctl','show',s,'--property=MainPID','--value'])!=pid for s,pid in untouched.items()):raise RuntimeError('Unrelated service changed')
        if Path('/var/www/novalis-ai/current').resolve()!=public or sha(public/'index.html')!=public_hash:raise RuntimeError('Public showcase changed')
        REPORT.update(deployed=True,release=str(destination),migration=8,business_records_preserved=True,credentials_preserved=True,unrelated_services_preserved=True,public_assets_verified=True)
        (backup/'report.json').write_text(json.dumps(REPORT,indent=2))
    except Exception:
        if switched:switch(previous)
        if stopped:
            run(['systemctl','start','novalis-os.service','novalis-worker.service']) if not switched else run(['systemctl','restart','novalis-os.service','novalis-worker.service'])
            wait_health();REPORT['rolled_back']=True
        raise

try:
    main();print(json.dumps(REPORT))
except Exception as error:
    REPORT['error']=str(error);print(json.dumps(REPORT));raise SystemExit(1)
