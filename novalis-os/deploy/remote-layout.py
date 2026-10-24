"""Deploy billing scope and responsive homepage fixes without reseeding data."""
import hashlib,json,os,secrets,shutil,subprocess,time,urllib.request
from pathlib import Path
SOURCE='41e5ad0af8cdb89375207e6a8423fcca7d592b67'
MANIFEST={'novalis-os/novalis_os/billing.py': 'd0fcc53f468d3205dac7019f48ab60e95f1d3a70bd79e2cd7096df07c5c59025', 'novalis-os/novalis_os/security.py': '045f465950a4d6e092427229f139e825829d690e4f03fd986d070e0661948c40', 'novalis-os/web/billing.js': '88af4e3c9273676f777db6e502fc6b7bf2a18592d23822cd2fe9d9cbe4487432', 'novalis-os/web/finance.js': '3f506a59ccc687408ded8178c561379f46f0a7c52b707b7dd1f147394d798ce9', 'novalis-os/tests/test_demo_engineering.py': '19816939b55b9efea609041eb57ba47ab964dbe6929548fde81c8a16e5dcab72', 'novalis-os/tests/billing-ui.cjs': 'd66d3f0e13d6cbb8e1e7878df808924a3db520bff0b15352ec3dd954a764b7bf', 'novalisai/assets/launch.css': '07d916ea6b1ab2edabafd97327614342952548a2596bcb4c8adbd9dc43149c7f', 'novalisai/de/index.html': '364ae3da31a817ce90f8462148f57a90d900ce45903e01663e36cf3fdde105e9', 'novalisai/en/index.html': '554565d33a9ecf6894b97dbc86db48c3f40189ef7d9f5ee5c01fd85ffd3512fa', 'novalisai/fr/index.html': '7b5cd9fba70b5d1edea3737ed8c8f640c18ea2a1ddddac8d28f3553e6cfa5507', 'novalisai/index.html': '17d81021004b75f1bf424ebc930e9d17d4c213623b20569509fa397f46d5a700', 'novalisai/nl/index.html': '2a464a193c7d5f865be52c8a69d2dea1e81d6b232f1ed1021058ddc81deb7157', 'novalis-os/tests/finance-ui.cjs': '0c9e1540626db60151c960df680c343e3f8965f40e16b7223e94aa41e642a82b'}
CHECK="import json\nfrom novalis_os import create_app\nfrom novalis_os.db import get_db\napp=create_app()\nchecks=[]\nfor role,email in [('manager','direction.demo@novalisai.com'),('finance','finance.demo@novalisai.com'),('client','client@novalisai.com')]:\n c=app.test_client()\n login=c.post('/api/auth/login',json={'email':email,'password':'Azerty00'},headers={'Origin':app.config['APP_ORIGIN']})\n if login.status_code!=200 or login.json['mfa_required']:raise RuntimeError('Demo authentication failed')\n b=c.get('/api/billing').json\n if b['default_mode']!='test' or b['test_totals']['invoiced_cents']<=0 or b['test_totals']['paid_cents']<=0:raise RuntimeError('Demo totals failed')\n checks.append({'role':role,'demo_totals':b['test_totals'],'real_totals':b['totals']})\nprint(json.dumps(checks))\n"
ROOT=Path('/opt/novalis-os');PUBLIC=Path('/var/www/novalis-ai')
def pointer(root,target):
 p=root/('.next-layout-'+secrets.token_hex(4));p.symlink_to(target);os.replace(p,root/'current')
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
 release=ROOT/'releases'/(SOURCE+'-layout-'+secrets.token_hex(4));output=PUBLIC/'releases'/(SOURCE+'-layout-'+secrets.token_hex(4))
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
  changed=run(['runuser','-u','novalis-os','--',str(release/'.venv/bin/python'),'-'],input=CHECK,env=env,cwd=release/'novalis-os',timeout=120)
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
  print(json.dumps({'deployed':True,'release':SOURCE,'billing_checks':json.loads(changed),'pointage_unchanged':True,'public_url':'https://www.novalisai.com/#saas','app_url':'https://app.novalisai.com/os/'}))
 except Exception:
  if switched:
   pointer(ROOT,previous);pointer(PUBLIC,oldpublic);subprocess.run(['systemctl','restart','novalis-os.service','novalis-worker.service'],timeout=30)
  raise
main()
