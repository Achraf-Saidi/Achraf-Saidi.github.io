"""Pinned Novalis release: isolated rehearsal, static review, backup and dual rollback."""
import concurrent.futures,hashlib,http.client,json,os,secrets,shutil,socket,sqlite3,ssl,subprocess,tempfile,urllib.request
from pathlib import Path
from datetime import datetime,timezone
SOURCE='afc7415325ea1d490c2ee661276189173130ee62'
MODE='stage'
MANIFEST={'novalis-os/novalis_os/payment-schema.sql': '1d3259ea0cfa02e56d13f7bdeece93316f37fdb65b89c108ffa708e0b90e7e81', 'novalis-os/novalis_os/crm.py': '34c1ebf5d8a9ccf5542cba2ca5a93e5e493bc86e73426441e32613486a97f057', 'novalis-os/novalis_os/payment_provider.py': '75630d1d663b1c21bb295214f58062f561d1f1daab746f105661b9289f32dc7a', 'novalis-os/novalis_os/workspace-schema.sql': '55384335dd1825d2dc39c2636f1c8d419ef0205f7c310c4d9ba2bd821fe29bfc', 'novalis-os/novalis_os/validation.py': '3ffcf4d16fed932ff476d1678c866472c3b235f6a439819ceff52d93e5a1367b', 'novalis-os/novalis_os/workspace.py': '9ec2770e28ef27224245d2e27d83f13b459e7e584bd287306c0755b785d3d8fc', 'novalis-os/novalis_os/__init__.py': '4d19094a5fcd6d46498c7cee515f815c6f956960b37436d4e9791e8f21baf446', 'novalis-os/novalis_os/payments.py': 'd5c95324c768b5c85c84acbf852c8359e737ed90508f89ce0c2b0be130ab5d55', 'novalis-os/novalis_os/schema.sql': '02d62414456f66a77462e62485103e577d866e034f7af20ff8658807dfdf66fe', 'novalis-os/novalis_os/finance.py': 'c09fdd2caf3917487d345d2b70e9f5159dc9474b4082cc137d519d464cd6c1e2', 'novalis-os/novalis_os/outbox.py': '36da00928e744889f0cefe7c54dab81dec4166e7448bb2f2792f3923a33a1ab2', 'novalis-os/novalis_os/documents.py': '10d9f36b2fc779d8a93ed46ff133ba5ae3e14a63c248561a0837d4a2de94eb9f', 'novalis-os/novalis_os/intake.py': '6ed0f3eac4fb804b862fc8d3ef4845d81fa9a997244f2ae1802a0358226d4fa2', 'novalis-os/novalis_os/intake-schema.sql': '7c47eb2084abb39d98796e2d087bf7be12b4873e130cd10ff03adde0f610e3bb', 'novalis-os/novalis_os/db.py': 'b476f944a48bb7949b938d4e49d6a28959c941c0b0b78b39b881aace5bfc62a1', 'novalis-os/novalis_os/projects.py': '4d9054229defb74be7a2fe6e3a966d457a431541d82bfb5aa3d84ea1ab736bdb', 'novalis-os/novalis_os/cli.py': '1fce498aa5a0c53e388191b1c13ec62b9d95c7d1292ba5a8b5cb3af34a3994df', 'novalis-os/novalis_os/security.py': 'd70a103fbbb5b7072bc0971a6c7a127ce7ba65394cc56d946bd607c7ceb7c25e', 'novalis-os/novalis_os/auth.py': 'f5d571a6a74a42cfc193163487b57b001202b27038dbfc321e8f4afed595266f', 'novalis-os/novalis_os/worker.py': '7f47a09d38ca6d6dee68dcbe726071135bd8c1bd0f71d099c5009e150fd9fbaf', 'novalis-os/web/index.html': '78b3d5e817272ca16caddfaadd8919dd2186e36a0cd889a549cfc796fabe1798', 'novalis-os/web/app.js': '2b005693351a4a2fb8ee3711072425e6a58f944f1ed40b640ccdbeb7c8b32168', 'novalis-os/web/app.css': '5b063548bfbd0d4fbaa12b5eaa05d024fcf5ffbf997483a1630724c6f0a88623', 'novalis-os/tests/test_intake.py': '50ad992f01da7910bb597f3fee434153705482eacc33d349d6f7a69b0b68c70a', 'novalis-os/tests/visual-fixture.js': '0463cd16639eade95bde495d2e6a4b4122394bbc456b9b13b8b469c65be4517b', 'novalis-os/tests/test_workflows.py': 'ea6003d276b65910919042263136708285b37c3784e8b1a02a0ae9208f083499', 'novalis-os/tests/test_workspace.py': 'e80de216969194d18db7d10fd1defa37ad44e17df331331ac46dd1af1c1c90ce', 'novalis-os/tests/test_payments.py': '944e33e6c3a1dc47b0a6468b68e0bd618101248ca431169852d96057f29b4b5f', 'novalisai/assets/studio.css': '5cf641b61b4511ec2cdd10a21ff897db8dcb24584ac9bbf8599692c71f0a373d', 'novalisai/assets/concept-fashion.webp': 'c909d0cd70d4acc9e17b503c52493b92d1c8478dc489fd4ed8910c37193e2221', 'novalisai/assets/concept-stock.webp': '02e72dd4cfaf2bc440d013c3fcb07b8e36fd47b4128c5fca9c6362b74812ae71', 'novalisai/assets/manrope-OFL.txt': '58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b', 'novalisai/assets/sculpture.js': '17210c89fc08faa6e708ad24d31362b872e45c6324498ebc0dfdaac30f60d7ea', 'novalisai/assets/app.js': '9d61333c736061b07548ad8da913ba80894986fe61c98c021d2ac084665bde27', 'novalisai/assets/concept-support.webp': 'fd42a5495acaeabb491360867804c8cf4ab30a7611699d76ce986cfa060bbba6', 'novalisai/assets/premium.css': '34be199094bcedb14d935e4e237bf2ed952938d96fe448bd445598a261aafbb4', 'novalisai/assets/concept-restaurant.webp': '9f3aa9d4c9b028868066e4c11c727f1d010bd994e8a358a1d3de8badd7ed8573', 'novalisai/assets/concept-projects.webp': '89b9a29e3c72bea746984d3bfb5965953eca4685b2d563d9cb20a4a2a399c160', 'novalisai/assets/v2.css': '80cc873820b8c0ea720851c6f98406dfa10078a386c13b75212c15b0b0e56a12', 'novalisai/assets/instrument-serif-latin.woff2': '5a51946dfffa82972bc98745359c46761515641fda557c25116459a9f83da4a7', 'novalisai/assets/concept-insight.webp': 'a66f02340e02ead6f468b15f3481de75d56700a665da82bf12112793afcc71db', 'novalisai/assets/v2.js': 'b49460abe2f3c704928beca0bc88cf773b6417226ce1221f1145c4ababa87f2f', 'novalisai/assets/decision-engine.js': '748547465b7561bc7c96e648a3e6446de32b47c3bc59b5e7a21a3770068642fe', 'novalisai/assets/showcase.js': 'fbecd1bb33bfaef52098ea878e593f329d18a48f11bd7597892012fb73e6673c', 'novalisai/assets/styles.css': '889e4864d9dfebf079610be378d583ff02090ecd1a876f25dcab6056b5635296', 'novalisai/assets/experience.css': '0a543b645a771728e34decea12d2617c06f9c53c8eb93ceac24ac4f6ab91c029', 'novalisai/assets/showcase.css': 'c102b0e89562e23b2cfc830823ebdf6237428d4ea639632ffb94d42af666ed40', 'novalisai/assets/studio.js': '9a92a26277d6a31a8ac80d89ae4b92ab7c83a700509cc5fad79d1300217b7d05', 'novalisai/assets/N_novalis.png': 'd5d0bf8c17bcb4ba6e62a34b3b7dbcf224b64ea8c6c475a657e4ceb6ca10fbcf', 'novalisai/assets/novalis_og.png': '66c7e0dbfcd1dc2aa2df166156ccf17913fe6ff4e0e7a9fab68272e46814acd9', 'novalisai/assets/logo.webp': '4e245c95beab03019092571d5dd390cdecbf37a8acc946149e7a06b9107e5709', 'novalisai/assets/instrumentserif-OFL.txt': '129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521', 'novalisai/assets/premium.js': '2b886cd0654a3195d6d6fd388b10baf66173c81c71a38eaea996d6ad56bd9169', 'novalisai/assets/concept-copilot.webp': '79eb641cb596c15bae056fcbf94dd898078912471365a27fe69cb2c6c8365457', 'novalisai/assets/ultimate.js': 'b82e427eb4a628ad23a7aa929392a466c89cff52570dc4e41a3c4a79d9c0b900', 'novalisai/assets/experience.js': 'a55e095ae8d9961785dc8b248d088c597798a4f617b6258a00724fd8d03b83f6', 'novalisai/assets/manrope-latin.woff2': 'a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972', 'novalisai/assets/concept-food.webp': 'f72fd55ac1bac493098d7210d261abd9ef515bb81e3788a501b8cd4f9e188cea', 'novalisai/assets/operations-engine.js': '14f5b6b79d5d0fff832735b7a1bd71e56bf8f63decf624c1ebae2a02d545ccbd', 'novalisai/assets/case-biladi.jpg': 'b48065f1e7b679540487c9e5226a0572adbb9380eac5059acfb47fd361db06df', 'novalisai/assets/case-code32.jpg': '19d312af57da65f68887b7709ec3e996a6398d455c71506a3e7e36050816f32a', 'novalisai/assets/pages.js': 'eca26283ad68b82bf7879b92f56561bd60ffec93bd38570cb0f1283b1b325ea0', 'novalisai/assets/ultimate.css': 'c669de25038f0e4f71d351b25118e90da01ce5ee679d75d9924c65ba4b827f69', 'novalisai/assets/lab-engine.js': '96a6f5e7c689718775ab4b1a738a4e78869b934471f89ec7e76d2bab88c6b5c0', 'novalisai/assets/engineering.css': '6dae7344a96186a9e719da845b673fa3a804db51ca051f95874005439c79f452', 'novalisai/assets/intake.js': '4c2a326a5639a56bcffc75de209f8652e1ed1c5abc8ec04e20e91226d1f74323', 'novalisai/index.html': 'c18f18ccd36c68e27513f4329a659f0e7d63189235ef801bd523028caa558174', 'novalisai/studio.json': 'bcced4595819f4c422f765907e807eaa1d3b346e21cb400f02e2a0ea9dca5719', 'novalisai/showcase.json': '2b96912b984e441df5445242df031c0556543a0ed56c96dd42ef796479005913', 'novalisai/premium.json': 'f87b7cfd97a81af063870b97d2c9406b264cb64846a451958da07ef5bc97dbcf', 'novalisai/build.py': '8d1b2cf557b2cd6773944ad16a4166b18a9d6e773fb114607888925e2fa3d159', 'novalisai/extension.json': '448336fca1537cf96251a8d0b7b691ded8b30cb8be0284f578731937bacd21e7', 'novalisai/extensions.py': '34d276c3d462eacf9d34768534c9cc384298622dbb9a4763cdd2cf9ae46a59d5', 'novalisai/upgrade.py': '1c140b9e21fa2d49140706a5df67f5b8ffa8b06ebb5847f2a1ca27045a284a9c', 'novalisai/products.json': 'bbc73a9b9b52ad4fde75d80f8995b3603c6080da3b363d6566c2bcf3414ac645', 'novalisai/content.json': '9f0a4e13fd11ebfb7251ed6eaa821dd252e9b755ff845878a5fc8d45fc8c1485', 'novalisai/showcase.py': '15b2a1e93badc429b10fd34b696940440cd02207b8c88c32c2350beb35fca69e', 'novalisai/ultimate.py': '0d60fa7120ba110b9501c67942720eeaa82ec16a7b1fc07dd2a3ba08582e49b7', 'novalisai/runtime-config.json': 'd1e3566942fd33d467fedf5656f3aec0c2c5a39db4a98ff38917c6d7293e6d13', 'novalisai/template.html': '0bdec198ceb3ed500809834074673b8c840ede817b2b94fbda25f5f662ee804f', 'novalisai/studio.py': 'c756a03843039578b3e6abd57287c2c3b4bdd7d0bc3feff4ea5479d359e1c49f', 'novalisai/ultimate.json': '6ede3314ba5cb1c27f1514f095228f8aec30819b7666b4155d98762433e46ab2', 'novalisai/engineering.py': 'f063cedf46ed1606a25c4774358aa5574897aa020d58f812cf9a2d995345882b', 'novalisai/team.json': '9a99b75fe2788535fa861e1e34d5c10a7867ec41b58d29a6e9e20829d6e348a2', 'novalisai/premium.py': '259df3ec955d1af32185e2927db94761ca6f7573fba0ba70f9c52e832a343600', 'novalis-os/requirements.txt': '1659ceb0bfa5add3d12b51c96553dfe47257fcc985855bc67b0169e118fbc71b', 'novalis-os/deploy/prepare-public.py': '9200447d8e4e30951a5d528295977fc4feb656ff49e11a904d17a3892c7019e6'}
ROOT=Path('/opt/novalis-os');PUBLIC=Path('/var/www/novalis-ai');REPORT={'stage':MODE,'source':SOURCE}
UNRELATED=['nginx','postgresql@17-main','pm2-root']
def run(args,env=None,cwd=None,timeout=120):
 r=subprocess.run(args,capture_output=True,text=True,env=env,cwd=cwd,timeout=timeout)
 if r.returncode:raise RuntimeError('Command failed: '+args[0]+' ('+str(r.returncode)+') '+r.stderr[-500:])
 return r.stdout.strip()
def https(host,path='/',method='GET',payload=None):
 context=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=20,context=context)
 c.sock=context.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=20),server_hostname=host)
 headers={'Host':host}
 if payload is not None:headers.update({'Content-Type':'application/json','Origin':'https://www.novalisai.com'})
 c.request(method,path,body=json.dumps(payload) if payload is not None else None,headers=headers);r=c.getresponse();data=r.read(3000000);status=r.status;c.close();return status,data

def baseline():
 status,data=https('pointagevdc.cloud');assert status==200
 return dict(pointage_sha=hashlib.sha256(data).hexdigest(),pointage_config=hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest(),pids={n:run(['systemctl','show',n,'--property=MainPID','--value']) for n in UNRELATED},core=str((ROOT/'current').resolve()),public=str((PUBLIC/'current').resolve()),public_sha=hashlib.sha256(https('www.novalisai.com','/fr/')[1]).hexdigest())
def environment(release):
 values={}
 for line in Path('/etc/novalis-os/production.env').read_text().splitlines():
  if line and not line.startswith('#'):
   k,v=line.split('=',1);values[k]=v
 return dict(os.environ,**values,PYTHONPATH=str(release/'novalis-os'))
def database(env):return Path(env['NOVALIS_DATA_DIR'])/'novalis.sqlite3'
def digest_users(path):
 c=sqlite3.connect(path);v=c.execute('SELECT * FROM users ORDER BY id').fetchall();c.close();return hashlib.sha256(json.dumps(v).encode()).hexdigest()
def preserve(before,stage=False):
 after=baseline()
 for key in ['pointage_sha','pointage_config','pids']:
  if after[key]!=before[key]:raise RuntimeError('Preservation mismatch: '+key)
 if stage and any(after[k]!=before[k] for k in ['core','public','public_sha']):raise RuntimeError('Active Novalis release changed during review stage')
 return after
def main():
 os.umask(0o077);os.nice(10);before=baseline();old=Path(before['core']);oldpublic=Path(before['public']);release=ROOT/'releases'/('premium-'+SOURCE);public=PUBLIC/'releases'/('premium-'+SOURCE);env=environment(old)
 if MODE=='stage':
  if release.exists() or public.exists():raise RuntimeError('Immutable release already exists')
  release.mkdir(mode=0o755)
  def fetch(entry):
   path,digest=entry;target=release/path;target.parent.mkdir(parents=True,exist_ok=True)
   with urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+path,timeout=45) as response:content=response.read(3000000)
   if hashlib.sha256(content).hexdigest()!=digest:raise RuntimeError('Source integrity mismatch: '+path)
   target.write_bytes(content)
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(fetch,MANIFEST.items()))
  (release/'.venv').symlink_to(old/'.venv',target_is_directory=True)
  for p in [release,*release.rglob('*')]:
   if not p.is_symlink():p.chmod(0o755 if p.is_dir() else 0o644)
  python=str(release/'.venv/bin/python');stage_env=environment(release)
  run([python,'-m','compileall','-q',str(release/'novalis-os/novalis_os')],env=stage_env)
  with tempfile.TemporaryDirectory(prefix='novalis-premium-rehearsal-') as directory:
   probe=Path(directory);src=sqlite3.connect(database(env));dst=sqlite3.connect(probe/'novalis.sqlite3');src.backup(dst);src.close();dst.close();pre=digest_users(probe/'novalis.sqlite3')
   copy_env=dict(stage_env,NOVALIS_DATA_DIR=str(probe),NOVALIS_BACKUP_DIR=str(probe/'backups'))
   run([python,'-m','novalis_os.cli','migrate'],env=copy_env,cwd=release/'novalis-os');run([python,'-m','novalis_os.cli','migrate'],env=copy_env,cwd=release/'novalis-os')
   if digest_users(probe/'novalis.sqlite3')!=pre:raise RuntimeError('User security data changed in rehearsal')
   c=sqlite3.connect(probe/'novalis.sqlite3');assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not c.execute('PRAGMA foreign_key_check').fetchone();versions=[r[0] for r in c.execute('SELECT version FROM migrations ORDER BY version')];c.close();assert versions==[1,2,3,4]
  # Execute tests in fresh temporary databases without loading production secrets.
  test_env=dict(os.environ,PYTHONPATH=str(release/'novalis-os'))
  run([python,'-m','unittest','discover','-s','tests','-v'],env=test_env,cwd=release/'novalis-os',timeout=180)
  run([python,str(release/'novalis-os/deploy/prepare-public.py'),'--output',str(public),'--site-url','https://www.novalisai.com','--api-origin','https://app.novalisai.com','--portal-url','https://app.novalisai.com/os/'],timeout=90)
  for p in [public,*public.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
  base=PUBLIC/'_review';link=base/('premium-'+SOURCE);link.symlink_to(public)
  review=PUBLIC/'_review'/('erp-'+SOURCE);review.mkdir(mode=0o755);(review/'assets').mkdir(mode=0o755);(review/'brand').mkdir(mode=0o755)
  for name in ['app.js','app.css']:
   content=(release/'novalis-os/web'/name).read_text()
   if name=='app.css':content=content.replace('/brand/','../brand/')
   (review/'assets'/name).write_text(content)
  fixture=(release/'novalis-os/tests/visual-fixture.js').read_text()+"\nconst select=document.getElementById('review-role');select.value=new URLSearchParams(location.search).get('role')||'manager';select.addEventListener('change',()=>{location.search='?role='+select.value;});\n"
  (review/'assets/visual-fixture.js').write_text(fixture)
  for name in ['logo.webp','N_novalis.png','manrope-latin.woff2','instrument-serif-latin.woff2']:shutil.copy2(release/'novalisai/assets'/name,review/'brand'/name)
  markup=(release/'novalis-os/web/index.html').read_text().replace('/brand/','./brand/').replace('/os/app.css','./assets/app.css').replace('/os/app.js','./assets/app.js')
  markup=markup.replace('<script src="./assets/app.js"','<script src="./assets/visual-fixture.js" defer></script><script src="./assets/app.js"').replace('<body>','<body><div class="review-banner"><strong>REVUE UI · DONNÉES FICTIVES · API SIMULÉE</strong><label>Rôle<select id="review-role">'+''.join('<option>'+r+'</option>' for r in ['manager','account','developer','client','finance','sysadmin'])+'</select></label></div>')
  markup=markup.replace('</head>','<link rel="stylesheet" href="./assets/review.css"></head>');(review/'index.html').write_text(markup)
  (review/'assets/review.css').write_text('.review-banner{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;padding:10px 18px;background:#ecd4ae;color:#493a27;font:12px system-ui}.review-banner label{display:flex;gap:10px;align-items:center;margin:0;font:12px system-ui}.review-banner select{font:14px system-ui;min-height:35px;margin:0;padding:5px;width:auto}.sidebar{height:calc(100dvh - 56px)}@media(max-width:860px){.sidebar{height:calc(100dvh - 76px)}}')
  harness='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>NovalisOS — revue responsive</title><link rel="stylesheet" href="erp-qa.css"><script src="erp-qa.js" defer></script></head><body><header><strong>NOVALIS OS / REVUE — DONNÉES FICTIVES</strong><label>Largeur<select id="qa-width">'+''.join('<option'+(' selected' if w=='390' else '')+'>'+w+'</option>' for w in ['320','360','390','430','768','1024','1280','1440'])+'</select></label><label>Rôle<select id="qa-role">'+''.join('<option>'+r+'</option>' for r in ['manager','account','developer','client','finance','sysadmin'])+'</select></label></header><iframe id="qa-frame" title="NovalisOS — données fictives" src="./erp-'+SOURCE+'/?role=manager"></iframe></body></html>'
  base=PUBLIC/'_review';(base/'erp-qa.html').write_text(harness);(base/'erp-qa.css').write_text('body{margin:0;background:#d5dfd0;font:13px system-ui}header{display:flex;align-items:center;gap:20px;padding:12px 18px;flex-wrap:wrap}label{display:flex;align-items:center;gap:9px}select{font:inherit;padding:8px}iframe{border:0;display:block;margin:0 auto;width:390px;height:830px;background:#f4f6f2}')
  (base/'erp-qa.js').write_text("const f=document.getElementById('qa-frame'),w=document.getElementById('qa-width'),r=document.getElementById('qa-role');w.addEventListener('change',()=>f.style.width=w.value+'px');r.addEventListener('change',()=>f.src='./erp-"+SOURCE+"/?role='+r.value);")
  for p in [review,*review.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
  for name in ['erp-qa.html','erp-qa.js','erp-qa.css']:(base/name).chmod(0o644)
  assert https('www.novalisai.com','/_review/erp-'+SOURCE+'/')[0]==200
  (base/'premium-qa.html').write_text('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Novalis AI — revue premium</title><link rel="stylesheet" href="premium-qa.css"><script src="premium-qa.js" defer></script></head><body><header><strong>NOVALIS / REVUE PREMIUM</strong><label>Largeur<select id="qa-width"><option>320</option><option>360</option><option>375</option><option selected>390</option><option>430</option><option>768</option><option>1024</option><option>1280</option><option>1440</option><option>1920</option></select></label><label>Langue<select id="qa-language"><option>fr</option><option>en</option><option>nl</option><option>de</option></select></label><label>Vue<select id="qa-page"><option value="">Accueil</option><option value="#solutions">Showroom</option><option value="#saas">Novalis OS</option><option value="#methode">Méthode</option><option value="#lab">Assistant</option><option value="#equipe">Équipe</option><option value="#contact">Contact</option><option value="expertise/">Expertises</option><option value="data-ia/">Data et optimisation</option><option value="sites-web/">Sites web</option><option value="solutions/optimisation/">Optimisation</option><option value="suivi/">Suivi privé</option><option value="solutions/commerce-mode/">Commerce</option></select></label><span>Revue visuelle · ne pas envoyer de demande</span><span id="qa-ready" role="status">Chargement…</span></header><iframe id="qa-frame" title="Novalis AI — revue" src="./premium-__SOURCE__/fr/"></iframe></body></html>'.replace('__SOURCE__',SOURCE));(base/'premium-qa.html').chmod(0o644)
  (base/'premium-qa.js').write_text("const f=document.getElementById('qa-frame'),w=document.getElementById('qa-width'),l=document.getElementById('qa-language'),p=document.getElementById('qa-page');const ready=document.getElementById('qa-ready');f.addEventListener('load',()=>ready.textContent='Prête');function route(){ready.textContent='Chargement…';f.src='./premium-__SOURCE__/'+l.value+'/'+p.value;}w.addEventListener('change',()=>f.style.width=w.value+'px');l.addEventListener('change',route);p.addEventListener('change',route);".replace('__SOURCE__',SOURCE));(base/'premium-qa.js').chmod(0o644)
  (base/'premium-qa.css').write_text('body{margin:0;background:#dce1d4;font:12px system-ui}header{display:flex;gap:17px;align-items:center;padding:12px 16px;flex-wrap:wrap}label{display:flex;align-items:center;gap:8px}select{font:inherit;padding:7px;min-height:35px}header>span{font-size:10px}iframe{display:block;width:390px;height:880px;border:0;margin:0 auto;background:#f7f4ee}'.replace('__SOURCE__',SOURCE));(base/'premium-qa.css').chmod(0o644)
  assert https('www.novalisai.com','/_review/premium-'+SOURCE+'/fr/')[0]==200
  REPORT.update(release=str(release),public_release=str(public),review='https://www.novalisai.com/_review/premium-qa.html',erp_review='https://www.novalisai.com/_review/erp-qa.html',schema_rehearsal_versions=versions,backend_tests_passed=True,live_database_untouched=True,after=preserve(before,True))
 else:
  if not release.is_dir() or not public.is_dir():raise RuntimeError('Reviewed release missing')
  for path,digest in MANIFEST.items():
   if hashlib.sha256((release/path).read_bytes()).hexdigest()!=digest:raise RuntimeError('Reviewed source changed')
  old_user_hash=digest_users(database(env));db_owner=database(env).stat();backup=Path('/srv/novalis-os/backups')/('pre-premium-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
  run(['systemctl','stop','novalis-worker']);run(['systemctl','stop','novalis-os']);switched=False;public_switched=False
  try:
   run([str(old/'.venv/bin/python'),'-m','novalis_os.cli','backup','--destination',str(backup)],env=env,cwd=old/'novalis-os')
   run([str(old/'.venv/bin/python'),'-m','novalis_os.cli','check-backup','--source',str(backup)],env=env,cwd=old/'novalis-os')
   newenv=environment(release);run([str(release/'.venv/bin/python'),'-m','novalis_os.cli','migrate'],env=newenv,cwd=release/'novalis-os')
   if digest_users(database(env))!=old_user_hash:raise RuntimeError('User access data changed during migration')
   for file in [database(env),Path(str(database(env))+'-wal'),Path(str(database(env))+'-shm')]:
    if file.exists():os.chown(file,db_owner.st_uid,db_owner.st_gid);file.chmod(0o600)
   link=ROOT/('.next-'+secrets.token_hex(4));link.symlink_to(release);os.replace(link,ROOT/'current');switched=True
   run(['systemctl','start','novalis-os']);run(['systemctl','start','novalis-worker'])
   import time
   deadline=time.monotonic()+35
   while time.monotonic()<deadline:
    try:
     if https('app.novalisai.com','/healthz')[0]==200:break
    except (OSError,http.client.HTTPException):pass
    time.sleep(1)
   else:raise RuntimeError('Upgraded ERP health did not become ready')
   for name in ['app.js','app.css']:
    status,content=https('app.novalisai.com','/os/'+name)
    if status!=200 or content!=(release/'novalis-os/web'/name).read_bytes():raise RuntimeError('Live ERP asset mismatch')
   assert https('app.novalisai.com','/api/payments/config')[0]==401
   assert https('app.novalisai.com','/api/leads')[0]==401
   assert https('app.novalisai.com','/api/public/request-status','POST',{'token':'a'*43})[0]==404
   assert https('app.novalisai.com','/api/public/request-lookup','POST',{'reference':'NV-26-FFFFFFFF','email':'no-real-request@example.invalid'})[0]==404
   assert https('app.novalisai.com','/os/')[0]==200
   link=PUBLIC/('.next-'+secrets.token_hex(4));link.symlink_to(public);os.replace(link,PUBLIC/'current');public_switched=True
   verified=[]
   for language in ['fr','en','nl','de']:
    for suffix in ['', 'lab/','suivi/','realisations/novalis-os/','expertise/','sites-web/','sur-mesure/','automatisation/','data-ia/','saas/','solutions/optimisation/','solutions/projets-industriels/','solutions/gestion-stock/','solutions/commerce-mode/','solutions/restaurant-reservation/','solutions/assistant-flux/','solutions/aide-decision/','solutions/novalis-food/','solutions/service-client/']:
     path='/'+language+'/'+suffix;status,content=https('www.novalisai.com',path)
     if status!=200 or content!=(public/language/suffix/'index.html').read_bytes():raise RuntimeError('Published page mismatch: '+path)
     verified.append(path)
   for name in ['premium.js','premium.css','engineering.css','decision-engine.js','intake.js','concept-fashion.webp','concept-restaurant.webp','concept-food.webp','concept-support.webp']:
    status,content=https('www.novalisai.com','/assets/'+name)
    if status!=200 or content!=(public/'assets'/name).read_bytes():raise RuntimeError('Published asset mismatch: '+name)
   after=preserve(before)
   assert after['core']==str(release) and after['public']==str(public)
   REPORT.update(backup=str(backup),backup_verified=True,user_security_unchanged=True,after=after,release=str(release),public_release=str(public),previous_release=str(old),previous_public=str(oldpublic),verified_paths=verified,public_pages=len(list(public.rglob('*.html'))),live='https://www.novalisai.com/fr/',erp_live='https://app.novalisai.com/os/',intake_status_route_verified=True)
  except Exception:
   if public_switched:
    link=PUBLIC/('.rollback-'+secrets.token_hex(4));link.symlink_to(oldpublic);os.replace(link,PUBLIC/'current')
   run(['systemctl','stop','novalis-worker']);run(['systemctl','stop','novalis-os'])
   if switched:
    link=ROOT/('.rollback-'+secrets.token_hex(4));link.symlink_to(old);os.replace(link,ROOT/'current')
   run(['systemctl','start','novalis-os']);run(['systemctl','start','novalis-worker']);REPORT['rolled_back']=True;raise
 REPORT.update(completed=True,before=before,pointage_unchanged=True,public_showcase_unchanged=MODE=='stage')
 path=Path('/etc/novalis-os')/('deployment-premium-'+MODE+'.json');path.write_text(json.dumps(REPORT,indent=2));path.chmod(0o600);print(json.dumps(REPORT))
try:main()
except Exception as error:print(json.dumps(dict(REPORT,completed=False,error=str(error))));raise
