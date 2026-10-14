"""Isolated static Novalis release; existing app services and data are read-only."""
import concurrent.futures,hashlib,http.client,json,os,secrets,shutil,socket,ssl,subprocess,tempfile,urllib.request
from pathlib import Path
SOURCE='305dba8ce13071c7ab8858e65f6c917a3174f372'
MODE='publish'
MANIFEST={"novalisai/upgrade.py":"1c140b9e21fa2d49140706a5df67f5b8ffa8b06ebb5847f2a1ca27045a284a9c","novalisai/extensions.py":"a2e003852e2c3f829168b56602dbd7f23c2751c0a9144ac9007b6a96150ecb96","novalisai/studio.py":"c756a03843039578b3e6abd57287c2c3b4bdd7d0bc3feff4ea5479d359e1c49f","novalisai/ultimate.py":"313f99e42272742dd7697854402b1ecdffdef0b2386e57ddc0e2b7ff7a956e0b","novalisai/build.py":"36bf22f333736eb73f13c321d016eb7aa79ac6b4bb3d3264602e331e59bdf6d6","novalisai/content.json":"9f0a4e13fd11ebfb7251ed6eaa821dd252e9b755ff845878a5fc8d45fc8c1485","novalisai/products.json":"e895abb521d5b92ba9381c23e4b7fe9a3460c886ccdcd9655f055cf46e9ec0c4","novalisai/team.json":"9a99b75fe2788535fa861e1e34d5c10a7867ec41b58d29a6e9e20829d6e348a2","novalisai/runtime-config.json":"d1e3566942fd33d467fedf5656f3aec0c2c5a39db4a98ff38917c6d7293e6d13","novalisai/ultimate.json":"6ede3314ba5cb1c27f1514f095228f8aec30819b7666b4155d98762433e46ab2","novalisai/extension.json":"aed6a728a72e188695d003a6e60ec46d53f10968bfdac0b48e6d2f8b15f1911b","novalisai/studio.json":"bcced4595819f4c422f765907e807eaa1d3b346e21cb400f02e2a0ea9dca5719","novalisai/template.html":"33baa9cee04429b950b9283a2c7a66b7191343432881d623ab1d7cfb236b8ba7","novalis-os/deploy/prepare-public.py":"9200447d8e4e30951a5d528295977fc4feb656ff49e11a904d17a3892c7019e6","novalisai/assets/logo.webp":"4e245c95beab03019092571d5dd390cdecbf37a8acc946149e7a06b9107e5709","novalisai/assets/ultimate.css":"c669de25038f0e4f71d351b25118e90da01ce5ee679d75d9924c65ba4b827f69","novalisai/assets/case-code32.jpg":"19d312af57da65f68887b7709ec3e996a6398d455c71506a3e7e36050816f32a","novalisai/assets/N_novalis.png":"d5d0bf8c17bcb4ba6e62a34b3b7dbcf224b64ea8c6c475a657e4ceb6ca10fbcf","novalisai/assets/instrument-serif-latin.woff2":"5a51946dfffa82972bc98745359c46761515641fda557c25116459a9f83da4a7","novalisai/assets/ultimate.js":"b82e427eb4a628ad23a7aa929392a466c89cff52570dc4e41a3c4a79d9c0b900","novalisai/assets/pages.js":"eca26283ad68b82bf7879b92f56561bd60ffec93bd38570cb0f1283b1b325ea0","novalisai/assets/case-biladi.jpg":"b48065f1e7b679540487c9e5226a0572adbb9380eac5059acfb47fd361db06df","novalisai/assets/lab-engine.js":"96a6f5e7c689718775ab4b1a738a4e78869b934471f89ec7e76d2bab88c6b5c0","novalisai/assets/studio.css":"5cf641b61b4511ec2cdd10a21ff897db8dcb24584ac9bbf8599692c71f0a373d","novalisai/assets/styles.css":"889e4864d9dfebf079610be378d583ff02090ecd1a876f25dcab6056b5635296","novalisai/assets/experience.js":"a55e095ae8d9961785dc8b248d088c597798a4f617b6258a00724fd8d03b83f6","novalisai/assets/v2.js":"85e88da6d083a4bb4b72fb7b4f39a4d4a714bdeebe36eea6f5fa22c026f4c570","novalisai/assets/app.js":"15323b6ee0a76e58f8fd8b32f7a1d77d3a6d01af0c7393940be64344b66418ef","novalisai/assets/novalis_og.png":"66c7e0dbfcd1dc2aa2df166156ccf17913fe6ff4e0e7a9fab68272e46814acd9","novalisai/assets/manrope-OFL.txt":"58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b","novalisai/assets/v2.css":"80cc873820b8c0ea720851c6f98406dfa10078a386c13b75212c15b0b0e56a12","novalisai/assets/studio.js":"9a92a26277d6a31a8ac80d89ae4b92ab7c83a700509cc5fad79d1300217b7d05","novalisai/assets/manrope-latin.woff2":"a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972","novalisai/assets/sculpture.js":"17210c89fc08faa6e708ad24d31362b872e45c6324498ebc0dfdaac30f60d7ea","novalisai/assets/experience.css":"0a543b645a771728e34decea12d2617c06f9c53c8eb93ceac24ac4f6ab91c029","novalisai/assets/instrumentserif-OFL.txt":"129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521"}
PUBLIC=Path('/var/www/novalis-ai');CONFIG=Path('/etc/nginx/sites-available/zz-novalisai');SERVICES=['nginx','novalis-os','novalis-worker','postgresql@17-main','pm2-root']
REPORT={'stage':MODE,'source':SOURCE}
def run(args):
 r=subprocess.run(args,capture_output=True,text=True,timeout=90)
 if r.returncode:raise RuntimeError('Command failed: '+args[0]+' '+r.stderr[-1200:])
 return r.stdout.strip()
def https(host,path='/'):
 context=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=20,context=context)
 c.sock=context.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=20),server_hostname=host)
 c.request('GET',path,headers={'Host':host});r=c.getresponse();data=r.read(1500000);headers=dict(r.getheaders());status=r.status;c.close();return status,data,headers
def baseline():
 pointage=https('pointagevdc.cloud');assert pointage[0]==200
 return {'pids':{name:run(['systemctl','show',name,'--property=MainPID','--value']) for name in SERVICES},'pointage_sha':hashlib.sha256(pointage[1]).hexdigest(),'pointage_config':hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest(),'core':str(Path('/opt/novalis-os/current').resolve()),'public':str((PUBLIC/'current').resolve())}
def preserved(before,public_unchanged):
 after=baseline()
 for field in ['pids','pointage_sha','pointage_config','core']:
  if after[field]!=before[field]:raise RuntimeError('Preservation mismatch: '+field)
 if public_unchanged and after['public']!=before['public']:raise RuntimeError('Public pointer moved during review staging')
 for p in ['/os/','/healthz']:
  status,_,_=https('app.novalisai.com',p)
  if status!=200:raise RuntimeError('Existing app health check failed')
 return after

def main():
 os.umask(0o077);os.nice(10);before=baseline();release=PUBLIC/'releases'/('ultimate-'+SOURCE);review=PUBLIC/'_review';link=review/SOURCE
 if MODE=='stage':
  if release.exists():raise RuntimeError('Immutable release already exists')
  with tempfile.TemporaryDirectory(prefix='novalis-ultimate-build-') as directory:
   temp=Path(directory)
   def fetch(entry):
    path,digest=entry;target=temp/path;target.parent.mkdir(parents=True,exist_ok=True)
    with urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+path,timeout=45) as response:data=response.read(2000000)
    if hashlib.sha256(data).hexdigest()!=digest:raise RuntimeError('Source integrity failure: '+path)
    target.write_bytes(data)
   with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(fetch,MANIFEST.items()))
   build=run(['python3',str(temp/'novalis-os/deploy/prepare-public.py'),'--output',str(release),'--site-url','https://www.novalisai.com','--api-origin','https://app.novalisai.com','--portal-url','https://app.novalisai.com/os/'])
  if len(list(release.rglob('*.html')))!=73:raise RuntimeError('Unexpected page count')
  for path in [release,*release.rglob('*')]:path.chmod(0o755 if path.is_dir() else 0o644)
  review.mkdir(mode=0o755,exist_ok=True);review.chmod(0o755);link.symlink_to(release)
  harness='''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Novalis — revue responsive</title><style>body{margin:0;background:#dfd4c1;font:13px system-ui;color:#243d35}header{display:flex;gap:14px;align-items:center;padding:12px 18px;flex-wrap:wrap}select{font:inherit;padding:8px}iframe{display:block;border:0;margin:0 auto;background:#f8f5ef;height:830px;width:390px;max-width:100%}label{display:flex;gap:8px;align-items:center}</style><script src="qa.js" defer></script></head><body><header><strong>NOVALIS / REVUE</strong><label>Largeur<select id="qa-width"><option>320</option><option>360</option><option selected>390</option><option>430</option><option>768</option><option>1280</option></select></label><label>Langue<select id="qa-language"><option>fr</option><option>en</option><option>nl</option><option>de</option></select></label><label>Vue<select id="qa-page"><option value="">Accueil</option><option value="#lab">Lab</option><option value="#studio">Architecte</option><option value="#preuve">ERP</option><option value="#methode">Méthode</option><option value="#equipe">Équipe</option><option value="#contact">Contact</option><option value="lab/">Lab autonome</option><option value="realisations/biladi/">Étude de cas</option></select></label></header><iframe id="qa-frame" title="Vitrine Novalis en revue" src="./__SOURCE__/fr/"></iframe></body></html>'''.replace('__SOURCE__',SOURCE)
  (review/'qa.html').write_text(harness)
  (review/'qa.js').write_text("const f=document.getElementById('qa-frame'),w=document.getElementById('qa-width'),l=document.getElementById('qa-language'),p=document.getElementById('qa-page');w.addEventListener('change',()=>{f.style.width=w.value+'px';});[l,p].forEach(x=>x.addEventListener('change',()=>{f.src='./"+SOURCE+"/'+l.value+'/'+p.value;}));")
  for name in ['qa.html','qa.js']:(review/name).chmod(0o644)
  marker='    # Novalis isolated static review\n'
  block='''    # Novalis isolated static review
    location ^~ /_review/ {
        root /var/www/novalis-ai;
        try_files $uri $uri/ =404;
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header X-Content-Type-Options nosniff always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Frame-Options SAMEORIGIN always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://app.novalisai.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" always;
    }
'''
  original=CONFIG.read_text();anchor='    root /var/www/novalis-ai/current;'
  if marker not in original:
   if original.count(anchor)!=1:raise RuntimeError('Unexpected Novalis vhost structure')
   backup=Path('/var/backups')/('novalis-review-nginx-'+secrets.token_hex(4)+'.conf');backup.write_text(original);backup.chmod(0o600)
   try:
    CONFIG.write_text(original.replace(anchor,block+anchor));CONFIG.chmod(0o644);run(['/usr/sbin/nginx','-t']);run(['systemctl','reload','nginx'])
   except Exception:
    CONFIG.write_text(original);CONFIG.chmod(0o644);run(['/usr/sbin/nginx','-t']);run(['systemctl','reload','nginx']);raise
  status,body,headers=https('www.novalisai.com','/_review/'+SOURCE+'/fr/')
  if status!=200 or body!=(release/'fr/index.html').read_bytes():raise RuntimeError('Review bytes mismatch')
  if headers.get('X-Frame-Options')!='SAMEORIGIN':raise RuntimeError('Review framing headers missing')
  after=preserved(before,True)
  REPORT.update(review='https://www.novalisai.com/_review/qa.html',release=str(release),public_pointer_unchanged=True)
 else:
  if not release.is_dir():raise RuntimeError('Reviewed release is missing')
  previous=PUBLIC/'current';old=previous.resolve();nextlink=PUBLIC/('.next-'+secrets.token_hex(4));nextlink.symlink_to(release);os.replace(nextlink,previous)
  try:
   checks=[]
   for lang in ['fr','en','nl','de']:
    for page in ['', 'lab/', 'realisations/novalis-os/', 'realisations/biladi/', 'realisations/code32/']:
     path='/'+lang+'/'+page;status,body,_=https('www.novalisai.com',path)
     if status!=200 or body!=(release/lang/page/'index.html').read_bytes():raise RuntimeError('Published bytes mismatch: '+path)
     checks.append(path)
   after=preserved(before,False)
  except Exception:
   rollback=PUBLIC/('.rollback-'+secrets.token_hex(4));rollback.symlink_to(old);os.replace(rollback,previous);raise
  REPORT.update(release=str(release),previous_release=str(old),verified_paths=checks,public='https://www.novalisai.com/fr/')
 REPORT.update(completed=True,pointage_unchanged=True,processes_unchanged=True,core_unchanged=True,before=before,after=after,public_pages=73)
 report=Path('/etc/novalis-os')/('deployment-ultimate-'+MODE+'.json');report.write_text(json.dumps(REPORT,indent=2));report.chmod(0o600);print(json.dumps(REPORT))
try:main()
except Exception as error:print(json.dumps(dict(REPORT,completed=False,error=str(error))));raise
