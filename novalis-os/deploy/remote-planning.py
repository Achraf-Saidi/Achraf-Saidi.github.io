"""Atomic Novalis release; existing data and the Pointage services are preserved."""
import hashlib,json,os,secrets,shutil,sqlite3,subprocess,tarfile,time,urllib.request,urllib.error
from datetime import datetime,timezone
from pathlib import Path
RELEASE='5a4176e54847f2c6d914a7d01f388aea99e68666'
MANIFEST={'novalis-os/PLANNING.md': 'df567cc98b1afdff7c5e0cffe4093189de9a846d200f2acdc8713bb601bf7358', 'novalis-os/novalis_os/__init__.py': '5397947bc09ab79a4d164a69c75dcf437ebabefa1f8d94c3c80e152e8e7c3906', 'novalis-os/novalis_os/billing.py': '456f9ad3b608d328730e548bb6784cbf41b6f0578bd1d51b45d71fd2c420712c', 'novalis-os/novalis_os/calendar.py': '1e7331b865b3073dde036df61510031f5d92dd033568286ba4c12b3be27d28bf', 'novalis-os/novalis_os/db.py': '49424f3fcc546a134644d19f146efe785fd0b49f075d01c82ca2d22ffc5d7e2c', 'novalis-os/novalis_os/planning-schema.sql': 'c995c932af99b7b87e3023b10e8d7604ba130f1bbd4c1c8c4d165bee98df7c56', 'novalis-os/novalis_os/planning.py': '616a6414aeaff2cdfb07aa9f57fac19a2745977bfb84b504f167cd930e4e9b38', 'novalis-os/novalis_os/planning_pdf.py': '3ea1a4348e883a8ef46f821ed308fe1862adb8e90a3d8744d8946dfd3e7c3f41', 'novalis-os/tests/documents-ui.cjs': 'a21864d8360aed85cca68db0868ab5093b32cc3f678d5673d6d8febe59b954a4', 'novalis-os/tests/test_intake.py': '6a1522ae215e0e90f0e70dfa52533befd4fe3b7fe3e1bfdc3ee66c5ed60c7495', 'novalis-os/tests/test_planning.py': 'aa573bf8fadf13766953577953ff25de78cfc8b1e52deae7a515e85e183cbada', 'novalis-os/tests/ui.cjs': 'f1fe143ac5ee16911924d8aae2e62628b9033b053c59eeee61cc206d89cc451c', 'novalis-os/tests/visual-fixture.js': '0b9bf7af60531cf418407af025c1e019c1b6f9149fea265628d8f2a7d5a52940', 'novalis-os/web/app.js': '79ed5882b588d8346a550626470d27360a43ffdd2279c0f90fb96b2e153e1d90', 'novalis-os/web/index.html': '2726a2af9d01aefbf22104c7ee3ae95f85a50349e5456143bae6a16b355c273d', 'novalis-os/web/planning.css': '05810b1d090bab3023164bb60535db1a97654ea9eef9bff760fdefc3127db81c', 'novalis-os/web/planning.js': '12790effca95d33cbd72d0899e030283ceb9064d09013cc36f75d9c42139983e', 'novalisai/assets/launch.css': 'f5d0699e6e0dec4dd0c3df7db178d9045971d6394f012dc1a00b24c7b1736127', 'novalisai/assets/launch.js': '5b3677bdbd61740aba52b6e4459bbdb6ccf36eb4e7ef515949e1db572823e115', 'novalisai/de/index.html': '866e0652a4bbbb2f2fcc9f984d2dddc9257a3a534b9b5ea96348257ce1743ea7', 'novalisai/en/index.html': '72d303c3cc108b60f72ff57ceb3dac76c5f47fd1d1731aa03778b6939456c7eb', 'novalisai/fr/index.html': '4f7197850506757237c037965e75f57bf50f97c8348cb71c00085664bc620090', 'novalisai/index.html': '0e9cb3c853956c1d1f304ffa218e117bdf6a615f7f3b51e7147023c6160ca24f', 'novalisai/launch.py': '39c9e4806d6baa0f9a348c35b9e15224040afc6e45cd4e1cd52ddac56620db81', 'novalisai/nl/index.html': '5d3e62d4a14753484e316cc062d022164696190610487ab6f31db63f49a2af7a', 'novalisai/premium.py': 'e3a926d9f63e6b70c657981ef1648cb1bf0b269c942fc2fa697fda32314d8d47', 'novalisai/qa/engineering.cjs': '9319128a3ef27b66b46afc244cfcdc52adab2cb393ce0e2a5c034a6542d6f1d3', 'novalisai/template.html': '01de85be3ac5bf330eacf148ad94b7adc2a71dc90eaf10945d352fe9680d0b24', 'novalisai/workflow.py': '682a8f770ed7da0e0aaefcf00dbb0c080175faaba09544c4edd7bbc5aa9e97d4'}
ROOT=Path('/opt/novalis-os');PUBLIC=Path('/var/www/novalis-ai')
REPORT={'release':RELEASE,'stage':'planning-upgrade','completed':False}

def run(args,timeout=120,env=None,cwd=None):
    p=subprocess.run(args,capture_output=True,text=True,timeout=timeout,env=env,cwd=cwd)
    if p.returncode:raise RuntimeError(args[0]+' failed: '+p.stderr[-1200:])
    return p.stdout.strip()
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def probe(url):
    try:
        with urllib.request.urlopen(url,timeout=20) as r:return r.status,r.read(3000000)
    except urllib.error.HTTPError as e:return e.code,e.read(3000000)
def replace_link(link,target):
    temp=link.parent/('.next-'+secrets.token_hex(5));temp.symlink_to(target);os.replace(temp,link)
def main():
    os.umask(0o077);os.nice(10)
    if not (ROOT/'current').is_symlink() or not (PUBLIC/'current').is_symlink():raise RuntimeError('Expected release symlinks are absent.')
    old=(ROOT/'current').resolve();old_public=(PUBLIC/'current').resolve()
    if not old.is_relative_to(ROOT/'releases') or not old_public.is_relative_to(PUBLIC/'releases'):raise RuntimeError('Release roots changed.')
    proxy=Path('/etc/nginx/sites-enabled/pointagevdc');proxy_hash=sha(proxy)
    status,body=probe('https://pointagevdc.cloud/');before=(status,hashlib.sha256(body).hexdigest())
    if status!=200:raise RuntimeError('Pointage baseline is not healthy.')
    units=['nginx.service','pm2-root.service','postgresql@17-main.service']
    pids={u:run(['systemctl','show',u,'--property=MainPID','--value']) for u in units}
    for u in ['novalis-os.service','novalis-worker.service']:
        if run(['systemctl','is-active',u])!='active':raise RuntimeError('Novalis baseline is not active.')
        if run(['systemctl','show',u,'--property=WorkingDirectory','--value'])!='/opt/novalis-os/current/novalis-os':raise RuntimeError('Application working directory changed.')
    config=Path('/etc/novalis-os/production.env');values={}
    for line in config.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            key,value=line.split('=',1);values[key]=value.strip().strip('"').strip("'")
    data=Path(values['NOVALIS_DATA_DIR'])
    if data!=Path('/srv/novalis-os/data'):raise RuntimeError('Data directory changed.')
    backup=Path('/srv/novalis-os/backups')/('pre-planning-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup.mkdir(mode=0o700)
    with sqlite3.connect('file:'+str(data/'novalis.sqlite3')+'?mode=ro',uri=True) as src,sqlite3.connect(backup/'novalis.sqlite3') as dst:
        src.backup(dst)
        if dst.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Database backup integrity failed.')
    shutil.copy2(config,backup/'production.env')
    (backup/'release.json').write_text(json.dumps({'core':str(old),'public':str(old_public)}))
    REPORT['backup']=str(backup)
    destination=ROOT/'releases'/(RELEASE+'-planning')
    if destination.exists():raise RuntimeError('New release already exists; no existing files overwritten.')
    destination.mkdir(mode=0o755)
    archive=backup/'source.tar.gz'
    url='https://codeload.github.com/Achraf-Saidi/Achraf-Saidi.github.io/tar.gz/'+RELEASE
    with urllib.request.urlopen(url,timeout=60) as response,archive.open('wb') as f:
        total=0
        while chunk:=response.read(1048576):
            total+=len(chunk)
            if total>350*1048576:raise RuntimeError('Unexpected archive size.')
            f.write(chunk)
    with tarfile.open(archive) as package:
        for member in package:
            parts=Path(member.name).parts
            if len(parts)<2 or parts[1] not in {'novalis-os','novalisai'}:continue
            relative=Path(*parts[1:]);path=destination/relative
            if '..' in relative.parts or not path.resolve().is_relative_to(destination):raise RuntimeError('Unsafe archive path.')
            if member.isdir():path.mkdir(parents=True,exist_ok=True)
            elif member.isfile():
                path.parent.mkdir(parents=True,exist_ok=True)
                with package.extractfile(member) as source,path.open('wb') as target:shutil.copyfileobj(source,target)
            else:raise RuntimeError('Unexpected archive entry.')
    for file,digest in MANIFEST.items():
        if sha(destination/file)!=digest:raise RuntimeError('Release integrity mismatch: '+file)
    if (old/'novalis-os/requirements.txt').read_bytes()!=(destination/'novalis-os/requirements.txt').read_bytes():raise RuntimeError('Dependency upgrade requires a separate environment.')
    (destination/'.venv').symlink_to(old/'.venv')
    for path in destination.rglob('*'):
        if not path.is_symlink():path.chmod(0o755 if path.is_dir() else 0o644)
    python=destination/'.venv/bin/python'
    env=dict(os.environ,**values,PYTHONPATH=str(destination/'novalis-os'))
    # A copy of the production database verifies the additive migration before switching.
    migration_check=backup/'migration-check.sqlite3';shutil.copy2(backup/'novalis.sqlite3',migration_check)
    code='from novalis_os.db import migrate; import sys; migrate(sys.argv[1])'
    run([str(python),'-c',code,str(migration_check)],env=env)
    with sqlite3.connect(migration_check) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Migration rehearsal failed.')
        REPORT['migration_rehearsed']=db.execute('SELECT MAX(version) FROM migrations').fetchone()[0]
    public=PUBLIC/'releases'/(RELEASE+'-planning')
    run([str(python),str(destination/'novalis-os/deploy/prepare-public.py'),'--output',str(public),'--site-url','https://www.novalisai.com','--api-origin','https://app.novalisai.com','--portal-url','https://app.novalisai.com/os/'],timeout=120)
    for path in [public,*public.rglob('*')]:path.chmod(0o755 if path.is_dir() else 0o644)
    if not (public/'assets/launch.js').is_file():raise RuntimeError('Public interactive asset missing.')
    switched=False
    try:
        run(['runuser','-u','novalis-os','--',str(python),'-m','novalis_os.cli','migrate'],env=env,cwd=destination/'novalis-os')
        replace_link(ROOT/'current',destination);switched=True
        run(['systemctl','restart','novalis-os.service','novalis-worker.service'])
        for n in range(12):
            try:
                if probe('http://127.0.0.1:18080/healthz')[0]==200:break
            except Exception:pass
            time.sleep(1)
        else:raise RuntimeError('Application health check failed.')
        replace_link(PUBLIC/'current',public)
        checks={}
        for path,file in [('/os/planning.js','novalis-os/web/planning.js'),('/os/planning.css','novalis-os/web/planning.css'),('/os/app.js','novalis-os/web/app.js')]:
            status,body=probe('https://app.novalisai.com'+path)
            if status!=200 or hashlib.sha256(body).hexdigest()!=sha(destination/file):raise RuntimeError('Published application asset mismatch: '+path)
            checks[path]=status
        for path in ['/api/planner/calendar','/api/planning/unknown']:
            status,_=probe('https://app.novalisai.com'+path)
            if status!=401:raise RuntimeError('Authenticated API boundary changed: '+path+' '+str(status))
            checks[path]=status
        for lang in ['','fr/','en/','nl/','de/']:
            status,body=probe('https://www.novalisai.com/'+lang)
            if status!=200 or hashlib.sha256(body).hexdigest()!=sha(public/lang/'index.html'):raise RuntimeError('Published homepage mismatch: '+lang)
            checks['/'+lang]=status
        status,body=probe('https://pointagevdc.cloud/')
        if (status,hashlib.sha256(body).hexdigest())!=before or sha(proxy)!=proxy_hash or any(run(['systemctl','show',u,'--property=MainPID','--value'])!=pids[u] for u in units):raise RuntimeError('Pointage preservation verification failed.')
        for u in ['novalis-os.service','novalis-worker.service']:run(['systemctl','is-active',u])
        REPORT.update(completed=True,checks=checks,pointage_unchanged=True,previous_core=str(old),previous_public=str(old_public),public_pages=len(list(public.rglob('*.html'))))
        saved=Path('/etc/novalis-os/deployment-planning.json');saved.write_text(json.dumps(REPORT,indent=2));saved.chmod(0o600)
    except Exception:
        if switched:
            replace_link(ROOT/'current',old);replace_link(PUBLIC/'current',old_public)
            run(['systemctl','restart','novalis-os.service','novalis-worker.service'])
            REPORT['rolled_back']=True
        raise
try:
    main();print(json.dumps(REPORT))
except Exception as error:
    REPORT['error']=str(error);print(json.dumps(REPORT));raise SystemExit(1)
