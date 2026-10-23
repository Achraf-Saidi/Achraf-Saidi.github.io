"""Publish tailored OS presentation and an additive isolated engineering demo."""
import hashlib,json,os,secrets,shutil,subprocess,time,urllib.request
from pathlib import Path
SOURCE='284ce7f6bb752d62c096a4a771a8b6ab011c74ef'
MANIFEST={'novalis-os/novalis_os/auth.py': '90479f624ee4fc77c7a2111ba4afd8fe2472d42db78e100444f32c6dc7c38826', 'novalis-os/novalis_os/demo_engineering.py': 'cc856c432bf4d863749d47a2c9370c1e9ba2808db5ab0827da8993cc6ff9d2eb', 'novalis-os/tests/test_demo_engineering.py': '3d684b23cdeab99c0725ffefebbbd281160bbf83be239e84606675f58b710634', 'novalis-os/web/app.js': 'f239baf5953f85d48c6098d35f267bd78d3913ed0c7adc8e2820eed760df0f2b', 'novalis-os/web/app.css': '9cff240928f6d06b1c52dd294677d394bc3d689d754dcd09bb6de952543e44e8', 'novalisai/premium.py': '68d0c612821daa7caf5d6d9e0e097a5652773dc6410723d9448aaed78393c3cc', 'novalisai/premium.json': '29bbb17f4ea44b998779180db3f2d38c43e86f6bebbbf30c0b72664c06d1d5f7', 'novalisai/assets/premium.css': 'ac450f76af1c3cc9c3e941455e98b17e7ace12989f9fa1d581c9a4a879a3a869'}
BOOTSTRAP="import json,os\nfrom pathlib import Path\nfrom werkzeug.security import generate_password_hash\nfrom novalis_os import create_app\nfrom novalis_os.db import get_db,transaction,uid\nfrom novalis_os.cli import backup\nfrom novalis_os.demo_seed import seed,ROLES,DEMO_ORG\nfrom novalis_os.demo_engineering import seed_engineering\napp=create_app()\nwith app.app_context():\n backup(app.config['DATABASE'],app.config['FILES_DIR'],Path('/srv/novalis-os/backups')/('before-engineering-'+uid()))\nseed(app)\nresult=seed_engineering(app)\nwith app.app_context():\n with transaction() as db:\n  for role,(email,_) in ROLES.items():\n   user=db.execute('SELECT id FROM users WHERE org_id=? AND email=? AND role=?',(DEMO_ORG,email,role)).fetchone()\n   if not user:raise RuntimeError('Demo identity mismatch')\n   db.execute('UPDATE users SET password_hash=?,totp_cipher=NULL,totp_pending=NULL,totp_counter=-1 WHERE id=?',(generate_password_hash('Azerty00',method='scrypt:32768:8:1'),user['id']))\n   db.execute('DELETE FROM recovery_codes WHERE user_id=?',(user['id'],))\n   db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))\n checks=[]\n for role,(email,_) in ROLES.items():\n  c=app.test_client();r=c.post('/api/auth/login',json={'email':email,'password':'Azerty00'},headers={'Origin':app.config['APP_ORIGIN']})\n  if r.status_code!=200 or r.json['mfa_required']:raise RuntimeError('Demo login failed: '+role)\n  if c.get('/api/session').status_code!=200:raise RuntimeError('Session failed')\n  checks.append({'role':role,'email':email,'mfa_required':False})\n print(json.dumps({'seed':result,'accounts':checks,'foreign_keys_ok':not get_db().execute('PRAGMA foreign_key_check').fetchall()}))\n"
ROOT=Path('/opt/novalis-os');PUBLIC=Path('/var/www/novalis-ai')
def pointer(root,target):
 p=root/('.next-engineering-'+secrets.token_hex(4));p.symlink_to(target);os.replace(p,root/'current')
def probe(url):
 with urllib.request.urlopen(url,timeout=20) as r:return r.status,hashlib.sha256(r.read()).hexdigest()
def protected():
 return {'page':probe('https://pointagevdc.cloud/'),'config':hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest(),'pids':{s:subprocess.check_output(['systemctl','show',s,'--property=MainPID','--value'],text=True).strip() for s in ['nginx','pm2-root','postgresql@17-main']}}
def run(args,**kw):
 r=subprocess.run(args,capture_output=True,text=True,**kw)
 if r.returncode:raise RuntimeError(r.stderr[-4000:])
 return r.stdout
def main():
 os.umask(0o077);os.nice(10)
 before=protected();previous=(ROOT/'current').resolve(strict=True);oldpublic=(PUBLIC/'current').resolve(strict=True)
 release=ROOT/'releases'/(SOURCE+'-engineering-'+secrets.token_hex(4));output=PUBLIC/'releases'/(SOURCE+'-engineering-'+secrets.token_hex(4))
 shutil.copytree(previous,release,ignore=shutil.ignore_patterns('.venv','__pycache__'),symlinks=True);(release/'.venv').symlink_to(previous/'.venv')
 env=dict(os.environ)
 for line in Path('/etc/novalis-os/production.env').read_text().splitlines():
  if line and not line.startswith('#'):
   k,v=line.split('=',1);env[k]=v
 env['PYTHONPATH']=str(release/'novalis-os');switched=False
 try:
  for name,digest in MANIFEST.items():
   with urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+name,timeout=30) as r:body=r.read(1000000)
   if hashlib.sha256(body).hexdigest()!=digest:raise RuntimeError('Checksum mismatch: '+name)
   path=release/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(body);path.chmod(0o644)
  release.chmod(0o755)
  tested=run([str(release/'.venv/bin/python'),'-m','unittest','discover','-s','tests','-p','test_demo_engineering.py','-v'],cwd=release/'novalis-os',env=env,timeout=120)
  run([str(release/'.venv/bin/python'),str(release/'novalis-os/deploy/prepare-public.py'),'--output',str(output),'--site-url','https://www.novalisai.com','--api-origin','https://app.novalisai.com','--portal-url','https://app.novalisai.com/os/'],timeout=90)
  for p in [output,*output.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
  # The additive demo migration is transactional; all existing production rows remain intact.
  changed=run(['runuser','-u','novalis-os','--',str(release/'.venv/bin/python'),'-'],input=BOOTSTRAP,env=env,cwd=release/'novalis-os',timeout=120)
  pointer(ROOT,release);pointer(PUBLIC,output);switched=True
  run(['systemctl','restart','novalis-os.service','novalis-worker.service'],timeout=30)
  for i in range(30):
   try:
    if probe('https://app.novalisai.com/healthz')[0]==200:break
   except Exception:pass
   time.sleep(1)
  else:raise RuntimeError('Health check failed')
  for path in ['/','/fr/realisations/novalis-os/','/en/','/nl/','/de/']:
   if probe('https://www.novalisai.com'+path)[0]!=200:raise RuntimeError('Public page unavailable')
  if protected()!=before:raise RuntimeError('Pointage preservation failed')
  print(json.dumps({'deployed':True,'release':SOURCE,'demo':json.loads(changed),'pointage_unchanged':True,'public_url':'https://www.novalisai.com/#saas','app_url':'https://app.novalisai.com/os/'}))
 except Exception:
  if switched:
   pointer(ROOT,previous);pointer(PUBLIC,oldpublic);subprocess.run(['systemctl','restart','novalis-os.service','novalis-worker.service'],timeout=30)
  raise
main()
