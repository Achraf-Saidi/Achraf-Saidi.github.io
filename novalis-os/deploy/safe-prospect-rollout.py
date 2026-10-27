"""Conservative Novalis-only rollout of already-CI-verified prospect messaging.

Root operator entrypoint, never invoked by importing the module.
Does not delete rows or change users. Existing release pointers provide rollback.
"""
import hashlib,http.client,json,os,re,secrets,shutil,socket,ssl,sqlite3,subprocess,urllib.request
from pathlib import Path
CORE=Path('/opt/novalis-os');PUBLIC=Path('/var/www/novalis-ai');ENV=Path('/etc/novalis-os/production.env')
PROTECTED=['nginx','pm2-root','postgresql@17-main']
CHANGES=['novalis-os/novalis_os/intake.py','novalis-os/novalis_os/intake-schema.sql',
         'novalis-os/web/app.js','novalis-os/tests/test_intake.py',
         'novalisai/assets/intake.js','novalisai/assets/engineering.css']
TABLES=['leads','lead_intake','lead_public_events','projects','proposals','documents',
        'billing_documents','clients']
def compare():
    p=Path(os.environ.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3'
    db=sqlite3.connect('file:'+str(p.resolve())+'?mode=ro',uri=True)
    try:
        signature=hashlib.sha256()
        for table in TABLES:
            for r in db.execute('SELECT * FROM '+table+' ORDER BY 1'):
                signature.update(repr((table,tuple(r))).encode())
        for table in ['users','leads','projects','clients']:
            for r in db.execute("SELECT * FROM "+table+" WHERE org_id='novalis-demo' ORDER BY 1"):
                signature.update(repr(('demo',table,tuple(r))).encode())
        protected=db.execute("""SELECT COUNT(*) FROM lead_intake i JOIN leads l ON l.id=i.lead_id
             WHERE i.reference=? AND lower(l.email)=? AND l.org_id='novalis'""",
             (os.environ['NOVALIS_PROTECTED_REFERENCE'],os.environ['NOVALIS_PROTECTED_EMAIL'])).fetchone()[0]
        if protected!=1:raise RuntimeError('Protected first request absent / mismatched')
        if db.execute('PRAGMA quick_check').fetchone()[0]!='ok':raise RuntimeError('Database health changed')
        return signature.hexdigest()
    finally:db.close()
def https(host,path='/'):
    ctx=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=15,context=ctx)
    c.sock=ctx.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=15),server_hostname=host)
    c.request('GET',path,headers={'Host':host,'Cache-Control':'no-store'});r=c.getresponse()
    out=r.status,r.read(700000);c.close();return out
def baseline():
    sha=hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest()
    pids={name:subprocess.check_output(['systemctl','show',name,'--property=MainPID','--value'],text=True).strip() for name in PROTECTED}
    code,body=https('pointagevdc.cloud')
    if code!=200:raise RuntimeError('Unrelated site is unhealthy before update')
    return (sha,pids,hashlib.sha256(body).hexdigest())
def pointer(root,target):
    symlink=root/('.novalis-next-'+secrets.token_hex(5));symlink.symlink_to(target)
    os.replace(symlink,root/'current')
def main():
    os.umask(0o077);os.nice(10)
    release=os.environ.get('NOVALIS_DEPLOY_SOURCE','')
    if not re.fullmatch('[0-9a-f]{40}',release):raise RuntimeError('Pinned GitHub commit required')
    if os.environ.get('NOVALIS_PROTECTED_REFERENCE') is None or os.environ.get('NOVALIS_PROTECTED_EMAIL') is None:
        raise RuntimeError('Protected original request must be matched, from private environment only')
    before=baseline();data_before=compare()
    old_core=(CORE/'current').resolve(strict=True);old_public=(PUBLIC/'current').resolve(strict=True)
    if https('app.novalisai.com','/healthz')[0]!=200:raise RuntimeError('Novalis unhealthy before update')
    env=dict(os.environ)
    for line in ENV.read_text().splitlines():
        if line and not line.startswith('#') and '=' in line:
            k,v=line.split('=',1)
            if k.startswith('NOVALIS_'):env[k]=v
    env['PYTHONPATH']=str(CORE/'current'/'novalis-os')
    destination=Path('/srv/novalis-os/backups')/('pre-message-rollout-'+secrets.token_hex(8))
    from subprocess import run
    backed=run([str(old_core/'.venv/bin/python'),'-m','novalis_os.cli','backup',
        '--destination',str(destination)],cwd=old_core/'novalis-os',env=env,capture_output=True,text=True,timeout=180)
    if backed.returncode:raise RuntimeError('Backup failed: '+backed.stderr[-1500:])
    new_core=CORE/'releases'/(release+'-tracking-'+secrets.token_hex(4))
    new_public=PUBLIC/'releases'/(release+'-tracking-'+secrets.token_hex(4))
    shutil.copytree(old_core,new_core,ignore=shutil.ignore_patterns('.venv','__pycache__'),symlinks=True)
    (new_core/'.venv').symlink_to(old_core/'.venv')
    swapped_core=False;swapped_public=False
    try:
        for rel in CHANGES:
            url='https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+release+'/'+rel
            with urllib.request.urlopen(url,timeout=35) as response:
                if response.status!=200:raise RuntimeError('Missing release file '+rel)
                body=response.read(1000000)
            target=new_core/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(body)
            target.chmod(0o644)
        env['PYTHONPATH']=str(new_core/'novalis-os')
        tested=run([str(new_core/'.venv/bin/python'),'-m','unittest','discover','-s','tests','-v'],
            cwd=new_core/'novalis-os',env=env,capture_output=True,text=True,timeout=150)
        if tested.returncode:raise RuntimeError('Isolated regression suite failed: '+tested.stderr[-2500:])
        # One additive table, no existing business fields altered.
        migrated=run([str(new_core/'.venv/bin/python'),'-m','novalis_os.cli','migrate'],
            cwd=new_core/'novalis-os',env=env,capture_output=True,text=True,timeout=45)
        if migrated.returncode:raise RuntimeError('Additive schema migration failed')
        if compare()!=data_before:raise RuntimeError('Any business/demo data unexpectedly changed by schema patch')
        pointer(CORE,new_core);swapped_core=True
        run(['systemctl','restart','novalis-os.service','novalis-worker.service'],check=True,timeout=35)
        if https('app.novalisai.com','/healthz')[0]!=200:raise RuntimeError('New Novalis server unhealthy')
        if https('app.novalisai.com','/os/app.js')[1]!=(new_core/'novalis-os/web/app.js').read_bytes():
            raise RuntimeError('New internal client app does not match release')
        built=run([str(new_core/'.venv/bin/python'),str(new_core/'novalis-os/deploy/prepare-public.py'),
            '--output',str(new_public),'--site-url','https://www.novalisai.com',
            '--api-origin','https://app.novalisai.com','--portal-url','https://app.novalisai.com/os/'],
            cwd=new_core/'novalis-os',env=env,capture_output=True,text=True,timeout=120)
        if built.returncode:raise RuntimeError('Public site preparation failed: '+built.stderr[-2000:])
        if len(list(new_public.rglob('*.html')))!=57:raise RuntimeError('Public page count changed')
        for p in [new_public,*new_public.rglob('*')]:
            p.chmod(0o755 if p.is_dir() else 0o644)
        pointer(PUBLIC,new_public);swapped_public=True
        for lang in ['fr','en','nl','de']:
            status,body=https('www.novalisai.com','/'+lang+'/suivi/')
            if status!=200 or body!=(new_public/lang/'suivi/index.html').read_bytes():
                raise RuntimeError('Tracking page release mismatch: '+lang)
        if https('www.novalisai.com','/assets/intake.js')[1]!=(new_public/'assets/intake.js').read_bytes():
            raise RuntimeError('Prospect messaging frontend asset mismatch')
        if baseline()!=before:raise RuntimeError('Unrelated service changed during rollout')
        if compare()!=data_before:raise RuntimeError('Protected business data or demo tenant changed')
        print(json.dumps({'deployed':True,'code_release':release,
           'old_code_release':str(old_core),'old_public_release':str(old_public),
           'application_backup':str(destination),'business_data_unchanged':True,
           'demo_unchanged':True,'unrelated_services_unchanged':True,'ui_tests_passed':True}))
    except Exception:
        if swapped_public:pointer(PUBLIC,old_public)
        if swapped_core:
            pointer(CORE,old_core)
            run(['systemctl','restart','novalis-os.service','novalis-worker.service'],check=True,timeout=35)
        raise

if __name__=='__main__':main()
