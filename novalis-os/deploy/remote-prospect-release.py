"""One-time rollout wrapper, with prospective client identity checked privately."""
import hashlib,json,os,sqlite3,subprocess,tempfile,urllib.request
from pathlib import Path
SOURCE='0d9fac6bc19ee9b57ec9d98e219ca603ad854b2f'
TARGET='77a510f5beb0ead786afd9a3bf2cd6aeb95c79cec18273c1e2034428318beafc'
ENV=Path('/etc/novalis-os/production.env')
settings={}
for line in ENV.read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1)
        if k.startswith('NOVALIS_'):settings[k]=v.strip().strip('"').strip("'")
if settings.get('NOVALIS_ORG_ID','novalis')!='novalis' or settings.get('NOVALIS_MODE','production')!='production':
    raise RuntimeError('Not the expected production installation')
db=sqlite3.connect('file:'+str((Path(settings.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3').resolve())+'?mode=ro',uri=True)
matching=[(ref,email) for ref,email in db.execute("""SELECT i.reference,l.email
  FROM lead_intake i JOIN leads l ON l.id=i.lead_id WHERE l.org_id='novalis'""")
  if hashlib.sha256((ref+chr(10)+email.lower()).encode()).hexdigest()==TARGET]
db.close()
if len(matching)!=1:raise RuntimeError('First real client cannot be uniquely identified')
env=dict(os.environ)
env.update({k:v for k,v in settings.items()})
env['NOVALIS_PROTECTED_REFERENCE'],env['NOVALIS_PROTECTED_EMAIL']=matching[0][0],matching[0][1].lower()
env['NOVALIS_DEPLOY_SOURCE']=SOURCE
raw='https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/novalis-os/deploy/safe-prospect-rollout.py'
with urllib.request.urlopen(raw,timeout=30) as response:
    if response.status!=200:raise RuntimeError('Pinned tested release unavailable')
    code=response.read(100000)
if not code.startswith(b'"""Conservative Novalis-only rollout'):
    raise RuntimeError('Unexpected release operator script')
with tempfile.TemporaryDirectory(prefix='novalis-msg-release-') as work:
    path=Path(work)/'publish.py'
    path.write_bytes(code);path.chmod(0o600)
    done=subprocess.run(['/usr/bin/python3',str(path)],env=env,text=True,
        capture_output=True,timeout=450)
    if done.returncode:
        print(json.dumps({'deployed':False,'error':done.stderr[-3500:],
            'report':done.stdout[-1200:]}))
        raise SystemExit(1)
    print(done.stdout.strip() or '{"deployed":true}')
