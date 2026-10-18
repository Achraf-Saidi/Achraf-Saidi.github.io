"""Public-only Novalis showcase release. No service, database or ERP mutation."""
import concurrent.futures,hashlib,http.client,json,os,re,secrets,socket,ssl,subprocess,urllib.request
from pathlib import Path
SOURCE='a1cf1c6ec3742f921c82cc40063804f7c8cd1aca'
MODE='publish'
MANIFEST={'novalisai/content.json': '9f0a4e13fd11ebfb7251ed6eaa821dd252e9b755ff845878a5fc8d45fc8c1485', 'novalisai/team.json': '9a99b75fe2788535fa861e1e34d5c10a7867ec41b58d29a6e9e20829d6e348a2', 'novalisai/ultimate.json': '6ede3314ba5cb1c27f1514f095228f8aec30819b7666b4155d98762433e46ab2', 'novalisai/premium.py': 'bf8ed9fa44ee7734348b8cb2791c874ad5f217669869982de765483a7b3bd892', 'novalisai/extension.json': 'ba80e7b691bc4c1899e70503fa509851b7b6976990a71f880d01283b1846ff2a', 'novalisai/extensions.py': '34d276c3d462eacf9d34768534c9cc384298622dbb9a4763cdd2cf9ae46a59d5', 'novalisai/studio.py': 'c756a03843039578b3e6abd57287c2c3b4bdd7d0bc3feff4ea5479d359e1c49f', 'novalisai/workflow.json': 'b2f90ee6fb711c902fe9c4af06739eb924faa804cd9750854c70ccde06a02026', 'novalisai/upgrade.py': '1c140b9e21fa2d49140706a5df67f5b8ffa8b06ebb5847f2a1ca27045a284a9c', 'novalisai/workflow.py': '5026835f7f19356ea450a7aa3810d08e9048cb96bf5cdb9afa2e1d1cda5109eb', 'novalisai/build.py': '8d1b2cf557b2cd6773944ad16a4166b18a9d6e773fb114607888925e2fa3d159', 'novalisai/showcase.py': '15b2a1e93badc429b10fd34b696940440cd02207b8c88c32c2350beb35fca69e', 'novalisai/ultimate.py': '0d60fa7120ba110b9501c67942720eeaa82ec16a7b1fc07dd2a3ba08582e49b7', 'novalisai/products.json': 'bbc73a9b9b52ad4fde75d80f8995b3603c6080da3b363d6566c2bcf3414ac645', 'novalisai/showcase.json': '2b96912b984e441df5445242df031c0556543a0ed56c96dd42ef796479005913', 'novalisai/template.html': '0bdec198ceb3ed500809834074673b8c840ede817b2b94fbda25f5f662ee804f', 'novalisai/studio.json': 'bcced4595819f4c422f765907e807eaa1d3b346e21cb400f02e2a0ea9dca5719', 'novalisai/premium.json': 'a0e9de8ce2db5d1a5b1321ce525bceb2355e65ef67f373c6334736865bb2f0d4', 'novalisai/runtime-config.json': 'd1e3566942fd33d467fedf5656f3aec0c2c5a39db4a98ff38917c6d7293e6d13', 'novalisai/engineering.py': '4a55345bab2d093e1b91e6e3cca518829ad4a0f56db5fa3f8ad964baa1265eca', 'novalisai/assets/intake.js': 'a29f52c0a1bbf7cbb12e29d59c8c8da16ac7a8c94599ce58a3b4ddba1859bd59', 'novalisai/assets/manrope-OFL.txt': '58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b', 'novalisai/assets/instrumentserif-OFL.txt': '129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521', 'novalisai/assets/ultimate.css': 'c669de25038f0e4f71d351b25118e90da01ce5ee679d75d9924c65ba4b827f69', 'novalisai/assets/pages.js': 'eca26283ad68b82bf7879b92f56561bd60ffec93bd38570cb0f1283b1b325ea0', 'novalisai/assets/showcase.js': 'fbecd1bb33bfaef52098ea878e593f329d18a48f11bd7597892012fb73e6673c', 'novalisai/assets/operations-engine.js': '14f5b6b79d5d0fff832735b7a1bd71e56bf8f63decf624c1ebae2a02d545ccbd', 'novalisai/assets/premium.css': '30571fe91b62cf9e8e398b0993019520a09771ba550fa2428feea5d515c30f71', 'novalisai/assets/lab-engine.js': '96a6f5e7c689718775ab4b1a738a4e78869b934471f89ec7e76d2bab88c6b5c0', 'novalisai/assets/case-code32.jpg': '19d312af57da65f68887b7709ec3e996a6398d455c71506a3e7e36050816f32a', 'novalisai/assets/engineering.css': 'c40690019422921937149355cafd7ebf6d342125a84cfbb5e1bdba24c5ea79c1', 'novalisai/assets/v2.css': '80cc873820b8c0ea720851c6f98406dfa10078a386c13b75212c15b0b0e56a12', 'novalisai/assets/novalis_og.png': '66c7e0dbfcd1dc2aa2df166156ccf17913fe6ff4e0e7a9fab68272e46814acd9', 'novalisai/assets/concept-food.webp': 'f72fd55ac1bac493098d7210d261abd9ef515bb81e3788a501b8cd4f9e188cea', 'novalisai/assets/concept-support.webp': 'fd42a5495acaeabb491360867804c8cf4ab30a7611699d76ce986cfa060bbba6', 'novalisai/assets/concept-restaurant.webp': '9f3aa9d4c9b028868066e4c11c727f1d010bd994e8a358a1d3de8badd7ed8573', 'novalisai/assets/app.js': '9d61333c736061b07548ad8da913ba80894986fe61c98c021d2ac084665bde27', 'novalisai/assets/concept-stock.webp': '02e72dd4cfaf2bc440d013c3fcb07b8e36fd47b4128c5fca9c6362b74812ae71', 'novalisai/assets/studio.js': '9a92a26277d6a31a8ac80d89ae4b92ab7c83a700509cc5fad79d1300217b7d05', 'novalisai/assets/concept-insight.webp': 'a66f02340e02ead6f468b15f3481de75d56700a665da82bf12112793afcc71db', 'novalisai/assets/showcase.css': 'c102b0e89562e23b2cfc830823ebdf6237428d4ea639632ffb94d42af666ed40', 'novalisai/assets/concept-copilot.webp': '79eb641cb596c15bae056fcbf94dd898078912471365a27fe69cb2c6c8365457', 'novalisai/assets/concept-projects.webp': '89b9a29e3c72bea746984d3bfb5965953eca4685b2d563d9cb20a4a2a399c160', 'novalisai/assets/experience.js': 'a55e095ae8d9961785dc8b248d088c597798a4f617b6258a00724fd8d03b83f6', 'novalisai/assets/instrument-serif-latin.woff2': '5a51946dfffa82972bc98745359c46761515641fda557c25116459a9f83da4a7', 'novalisai/assets/experience.css': '0a543b645a771728e34decea12d2617c06f9c53c8eb93ceac24ac4f6ab91c029', 'novalisai/assets/decision-engine.js': '0d9e2562ba76e2899753e3a27d08e74430bdf93602fb6915b26075ff56eb12de', 'novalisai/assets/v2.js': 'b49460abe2f3c704928beca0bc88cf773b6417226ce1221f1145c4ababa87f2f', 'novalisai/assets/styles.css': '889e4864d9dfebf079610be378d583ff02090ecd1a876f25dcab6056b5635296', 'novalisai/assets/N_novalis.png': 'd5d0bf8c17bcb4ba6e62a34b3b7dbcf224b64ea8c6c475a657e4ceb6ca10fbcf', 'novalisai/assets/concept-fashion.webp': 'c909d0cd70d4acc9e17b503c52493b92d1c8478dc489fd4ed8910c37193e2221', 'novalisai/assets/case-biladi.jpg': 'b48065f1e7b679540487c9e5226a0572adbb9380eac5059acfb47fd361db06df', 'novalisai/assets/logo.webp': '4e245c95beab03019092571d5dd390cdecbf37a8acc946149e7a06b9107e5709', 'novalisai/assets/ultimate.js': 'b82e427eb4a628ad23a7aa929392a466c89cff52570dc4e41a3c4a79d9c0b900', 'novalisai/assets/sculpture.js': '17210c89fc08faa6e708ad24d31362b872e45c6324498ebc0dfdaac30f60d7ea', 'novalisai/assets/studio.css': '5cf641b61b4511ec2cdd10a21ff897db8dcb24584ac9bbf8599692c71f0a373d', 'novalisai/assets/premium.js': '277199b0cfdae86e8422df955d61ab59573f744b50f9750789e32629cb5c4901', 'novalisai/assets/manrope-latin.woff2': 'a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972', 'novalis-os/deploy/prepare-public.py': '9200447d8e4e30951a5d528295977fc4feb656ff49e11a904d17a3892c7019e6'}
PUBLIC=Path('/var/www/novalis-ai');OPS=Path('/opt/novalis-showcase')
REPORT={'source':SOURCE,'mode':MODE,'completed':False}
def run(args,timeout=90):
 r=subprocess.run(args,capture_output=True,text=True,timeout=timeout)
 if r.returncode:raise RuntimeError('Command failed: '+args[0]+' '+r.stderr[-300:])
 return r.stdout.strip()
def https(host,path='/'):
 ctx=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=20,context=ctx)
 c.sock=ctx.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=20),server_hostname=host)
 c.request('GET',path,headers={'Host':host});r=c.getresponse();b=r.read(4000000);status=r.status;c.close();return status,b

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def baseline():
 status,body=https('pointagevdc.cloud');assert status==200
 health,_=https('app.novalisai.com','/healthz');assert health==200
 names=['nginx','postgresql@17-main','pm2-root','novalis-os','novalis-worker']
 return {'pointage_sha':hashlib.sha256(body).hexdigest(),'pointage_config':digest(Path('/etc/nginx/sites-enabled/pointagevdc')),'pids':{n:run(['systemctl','show',n,'--property=MainPID','--value']) for n in names},'core':str(Path('/opt/novalis-os/current').resolve()),'public':str((PUBLIC/'current').resolve()),'home_sha':hashlib.sha256(https('www.novalisai.com','/fr/')[1]).hexdigest()}
def preserve(before,stage=False):
 after=baseline()
 for key in ['pointage_sha','pointage_config','pids','core']:
  if before[key]!=after[key]:raise RuntimeError('Preservation failed: '+key)
 if stage and (before['public']!=after['public'] or before['home_sha']!=after['home_sha']):raise RuntimeError('Live public release changed during review')
 return after

def make_review(public):
 base=PUBLIC/'_review';base.mkdir(exist_ok=True,mode=0o755);link=base/('workflow-'+SOURCE)
 if not link.exists():link.symlink_to(public)
 html='''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Novalis — revue des flux</title><link rel="stylesheet" href="workflow-qa.css?v=__SOURCE__"><script src="workflow-qa.js?v=__SOURCE__" defer></script></head><body><header><strong>NOVALIS / REVUE</strong><label>Largeur<select id="qa-width"><option>320</option><option>360</option><option>375</option><option selected>390</option><option>430</option><option>768</option><option>1024</option><option>1280</option><option>1440</option><option>1920</option></select></label><label>Langue<select id="qa-language"><option>fr</option><option>en</option><option>nl</option><option>de</option></select></label><label>Vue<select id="qa-page"><option value="">Accueil</option><option value="#saas">Novalis OS</option><option value="#equipe">Collectif</option><option value="#contact">Contact</option><option value="lab/">Lab</option><option value="suivi/">Suivi</option><option value="data-ia/">Data</option><option value="entreprise/">Entreprise</option></select></label><span>Revue isolée · ne pas envoyer de demande</span><span id="qa-ready" role="status">Chargement…</span></header><iframe id="qa-frame" title="Novalis — revue" src="./workflow-__SOURCE__/fr/"></iframe></body></html>'''
 js="const f=document.getElementById('qa-frame'),w=document.getElementById('qa-width'),l=document.getElementById('qa-language'),p=document.getElementById('qa-page'),r=document.getElementById('qa-ready');f.addEventListener('load',()=>r.textContent='Prête');function route(){r.textContent='Chargement…';f.src='./workflow-__SOURCE__/'+l.value+'/'+p.value;}w.addEventListener('change',()=>f.style.width=w.value+'px');l.addEventListener('change',route);p.addEventListener('change',route);"
 css='body{margin:0;background:#dce2e9;font:12px system-ui}header{display:flex;gap:15px;align-items:center;padding:12px 16px;flex-wrap:wrap}label{display:flex;align-items:center;gap:8px}select{font:inherit;padding:7px;min-height:35px}header>span{font-size:10px}iframe{display:block;width:390px;height:880px;border:0;margin:0 auto;background:#f6f7f9}'
 for name,content in [('workflow-qa.html',html),('workflow-qa.js',js),('workflow-qa.css',css)]:
  p=base/name;p.write_text(content.replace('__SOURCE__',SOURCE));p.chmod(0o644)
 assert https('www.novalisai.com','/_review/workflow-'+SOURCE+'/fr/')[0]==200

def main():
 assert re.fullmatch('[a-f0-9]{40}',SOURCE) and MODE in ['stage','publish'];os.umask(0o077);os.nice(10)
 before=baseline();source=OPS/'releases'/('workflow-'+SOURCE);public=PUBLIC/'releases'/('workflow-'+SOURCE);reports=OPS/'reports';reports.mkdir(parents=True,exist_ok=True);stage_report=reports/('workflow-'+SOURCE+'-stage.json')
 if MODE=='stage':
  if source.exists() or public.exists():raise RuntimeError('Choose a new immutable source or inspect the existing stage report')
  source.mkdir(parents=True,mode=0o755)
  def fetch(entry):
   path,expected=entry
   if not (path.startswith('novalisai/') or path=='novalis-os/deploy/prepare-public.py') or '..' in Path(path).parts:raise RuntimeError('Invalid source path')
   b=urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+path,timeout=45).read(4000000)
   if hashlib.sha256(b).hexdigest()!=expected:raise RuntimeError('Source integrity mismatch: '+path)
   p=source/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(fetch,MANIFEST.items()))
  run(['python3',str(source/'novalis-os/deploy/prepare-public.py'),'--output',str(public),'--site-url','https://www.novalisai.com','--api-origin','https://app.novalisai.com','--portal-url','https://app.novalisai.com/os/'])
  for p in [public,*public.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
  checks={str(p.relative_to(public)):digest(p) for p in public.rglob('*') if p.is_file()}
  make_review(public);after=preserve(before,True);REPORT.update(before=before,after=after,public_files=checks,review='https://www.novalisai.com/_review/workflow-qa.html',completed=True)
  stage_report.write_text(json.dumps(REPORT,indent=2));stage_report.chmod(0o600)
 elif MODE=='publish':
  staged=json.loads(stage_report.read_text());assert staged['completed'] and staged['source']==SOURCE
  for path,expected in staged['public_files'].items():
   if digest(public/path)!=expected:raise RuntimeError('Staged release modified: '+path)
  old=Path(before['public']);switched=False
  try:
   link=PUBLIC/('.workflow-next-'+secrets.token_hex(4));link.symlink_to(public);os.replace(link,PUBLIC/'current');switched=True;verified=[]
   for path in staged['public_files']:
    if not (path.endswith('.html') or path in ['assets/premium.js','assets/decision-engine.js','assets/intake.js','assets/premium.css','assets/engineering.css','runtime-config.json']):continue
    route='/'+path
    if route.endswith('/index.html'):route=route[:-10]
    if route=='/index.html':route='/'
    status,b=https('www.novalisai.com',route)
    if status!=200 or hashlib.sha256(b).hexdigest()!=staged['public_files'][path]:raise RuntimeError('Published content mismatch: '+route)
    verified.append(route)
   after=preserve(before);assert after['public']==str(public)
   base=PUBLIC/'_review';prefix='./workflow-'+SOURCE+'/'
   live=(base/'workflow-qa.html').read_text().replace('workflow-qa.js?v='+SOURCE,'workflow-live.js?v='+SOURCE).replace(prefix,'../').replace('Revue isolée · ne pas envoyer de demande','Production · contrôle sans envoi')
   live_js=(base/'workflow-qa.js').read_text().replace(prefix,'../')
   for name,content in [('workflow-live.html',live),('workflow-live.js',live_js)]:
    p=base/name;p.write_text(content);p.chmod(0o644)
   assert https('www.novalisai.com','/_review/workflow-live.html')[0]==200
   REPORT['live_review']='https://www.novalisai.com/_review/workflow-live.html'
   REPORT.update(before=before,after=after,previous_public=str(old),verified_paths=verified,completed=True,pointage_unchanged=True,erp_unchanged=True)
  except Exception:
   if switched:
    link=PUBLIC/('.workflow-rollback-'+secrets.token_hex(4));link.symlink_to(old);os.replace(link,PUBLIC/'current')
   REPORT['rolled_back']=switched;raise
 (reports/('workflow-'+SOURCE+'-'+MODE+'.json')).write_text(json.dumps(REPORT,indent=2));print(json.dumps({k:v for k,v in REPORT.items() if k!='public_files'}))
try:main()
except Exception as error:print(json.dumps(dict(REPORT,error=str(error))));raise
