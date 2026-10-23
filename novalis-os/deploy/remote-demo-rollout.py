"""Isolated Novalis OS demo deployment with online database backup and rollback."""
import json,os,hashlib,shutil,secrets,subprocess,sys,tempfile,urllib.request,sqlite3,shlex,time
from pathlib import Path
REPO='Achraf-Saidi/Achraf-Saidi.github.io'
REV='d85ec1a8c534708d8afeaf74590c271dd02d3401'
ROOT=Path('/opt/novalis-os')
ACTIVE=ROOT/'current'
RELEASES=ROOT/'releases'
DBDIR=Path('/srv/novalis-os/data')
BACKUPS=Path('/srv/novalis-os/backups')
ENVFILE=Path('/etc/novalis-os/production.env')
FILES=[
'novalis-os/novalis_os/__init__.py',
'novalis-os/novalis_os/db.py',
'novalis-os/novalis_os/stakeholders-schema.sql',
'novalis-os/novalis_os/intelligence.py',
'novalis-os/novalis_os/planning.py',
'novalis-os/novalis_os/planning_pdf.py',
'novalis-os/novalis_os/demo_seed.py',
'novalis-os/novalis_os/outbox.py',
'novalis-os/web/planning.js',
'novalis-os/web/planning.css'
]
def systemctl(*args):
 return subprocess.run(['systemctl',*args],capture_output=True,text=True,timeout=40)
def pointage():
 path=Path('/etc/nginx/sites-enabled/pointagevdc')
 return hashlib.sha256(path.read_bytes()).hexdigest()
def health():
 try:
  with urllib.request.urlopen('http://127.0.0.1:18080/healthz',timeout=10) as response:
   return response.status==200 and json.load(response).get('status')=='ok'
 except Exception:return False
def envvars():
 if not ENVFILE.is_file():raise RuntimeError('Production environment file not found')
 result=os.environ.copy()
 for raw in ENVFILE.read_text().splitlines():
  v=raw.strip()
  if not v or v.startswith('#'):continue
  if v.startswith('export '):v=v[7:]
  if '=' not in v:continue
  key,value=v.split('=',1)
  if not key.replace('_','').isalnum():raise RuntimeError('Unsafe environment variable key')
  parts=shlex.split(value,comments=False)
  result[key]=parts[0] if parts else ''
 return result
def main():
 os.umask(0o077)
 if not ACTIVE.is_symlink() or not RELEASES.is_dir():raise RuntimeError('Unexpected active release layout')
 oldlink=os.readlink(ACTIVE)
 original=ACTIVE.resolve(strict=True)
 if not original.is_relative_to(RELEASES.resolve()):raise RuntimeError('Active version outside release directory')
 if not health():raise RuntimeError('Application must be healthy before changes')
 prior_pointage=pointage()
 prior_services={k:systemctl('is-active',k).stdout.strip() for k in ('novalis-os.service','novalis-worker.service')}
 if prior_services['novalis-os.service']!='active':raise RuntimeError('OS service not active')
 env=envvars()
 data=Path(env.get('NOVALIS_DATA_DIR',str(DBDIR)))
 database=data/'novalis.sqlite3'
 if not database.is_file() or not database.is_relative_to(DBDIR):raise RuntimeError('Unexpected database path')
 with sqlite3.connect(str(database)) as db:
  db.row_factory=sqlite3.Row
  orgs={v['id']:v['n'] for v in db.execute('SELECT o.id,COUNT(p.id) n FROM organisations o LEFT JOIN projects p ON p.org_id=o.id GROUP BY o.id')}
 if 'novalis-demo' in orgs:raise RuntimeError('Demo tenant already exists; refusing to reset or overwrite it')
 BACKUPS.mkdir(parents=True,exist_ok=True)
 backup=BACKUPS/('before-synthetic-demo-'+time.strftime('%Y%m%dT%H%M%S')+'.sqlite3')
 with sqlite3.connect(str(database)) as src,sqlite3.connect(str(backup)) as dst:
  src.backup(dst)
 backup.chmod(0o600)
 with sqlite3.connect(str(backup)) as verified:
  if verified.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Database backup verification failed')
 dst=RELEASES/('demo-'+REV[:12]+'-'+secrets.token_hex(4))
 switched=False
 try:
  shutil.copytree(original,dst,symlinks=True,ignore=shutil.ignore_patterns('__pycache__','.git'))
  if not (dst/'.venv').exists():
   if (original/'.venv').exists():
    (dst/'.venv').symlink_to((original/'.venv').resolve())
   else:raise RuntimeError('Runtime virtual environment missing')
  for item in FILES:
   url='https://raw.githubusercontent.com/'+REPO+'/'+REV+'/'+item
   with urllib.request.urlopen(url,timeout=30) as response:
    body=response.read(200000)
   if not body or len(body)>=200000:raise RuntimeError('Unexpected artifact size: '+item)
   target=dst/item;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(body)
  py=str((original/'.venv/bin/python').resolve())
  check=subprocess.run([py,'-m','compileall','-q',str(dst/'novalis-os/novalis_os')],
                       text=True,capture_output=True,timeout=30)
  if check.returncode:raise RuntimeError('Python validation failed')
  env['PYTHONPATH']=str(dst/'novalis-os')
  created=subprocess.run([py,'-m','novalis_os.demo_seed'],cwd=str(dst),
                         env=env,capture_output=True,text=True,timeout=90)
  if created.returncode:raise RuntimeError('Synthetic seed failed: '+created.stderr[-2200:])
  payload=json.loads(created.stdout)
  if not payload.get('created') or payload.get('projects')!=4 or len(payload.get('profiles',{}))!=6:
   raise RuntimeError('Demo package not created as expected')
  with sqlite3.connect(str(database)) as db:
   after={v[0]:v[1] for v in db.execute('SELECT o.id,COUNT(p.id) FROM organisations o LEFT JOIN projects p ON p.org_id=o.id GROUP BY o.id')}
   if any(after.get(k)!=v for k,v in orgs.items()):raise RuntimeError('Unexpected change to an existing organisation')
   if db.execute('PRAGMA foreign_key_check').fetchone():raise RuntimeError('Foreign key validation failed')
  stage=ROOT/('.next-demo-'+secrets.token_hex(4))
  stage.symlink_to(dst)
  if os.readlink(ACTIVE)!=oldlink:raise RuntimeError('Concurrent deployment detected')
  os.replace(stage,ACTIVE)
  switched=True
  for svc in ('novalis-os.service','novalis-worker.service'):
   if systemctl('restart',svc).returncode:raise RuntimeError('Service restart failed: '+svc)
  if not health():raise RuntimeError('Health check failed after service restart')
  if pointage()!=prior_pointage:raise RuntimeError('Pointage configuration changed unexpectedly')
  for svc in ('novalis-os.service','novalis-worker.service'):
   if systemctl('is-active',svc).stdout.strip()!='active':raise RuntimeError('Service inactive: '+svc)
  if (ACTIVE/'novalis-os/web/planning.js').read_text().find('os-action-ribbon')<0:
   raise RuntimeError('Interactive project shortcuts not deployed')
  report={'deployed':True,'revision':REV,'backup':str(backup),'tenant':payload['tenant'],
          'projects':payload['projects'],'demo_invoices':payload['invoices'],
          'profiles':payload['profiles'],'initial_passwords':payload['passwords'],
          'mfa_required_for_sensitive_roles':True,'real_payments':False,
          'existing_tenants_unchanged':True,'pointage_unchanged':True}
  print(json.dumps(report,ensure_ascii=False))
 except Exception:
  if switched:
   rollback=ROOT/('.rollback-demo-'+secrets.token_hex(4))
   rollback.symlink_to(oldlink)
   os.replace(rollback,ACTIVE)
   for svc in ('novalis-os.service','novalis-worker.service'):systemctl('restart',svc)
  raise
if __name__=='__main__':main()
