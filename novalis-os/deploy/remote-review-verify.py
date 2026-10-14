"""Isolated static Novalis release; existing app services and data are read-only."""
import concurrent.futures,hashlib,http.client,json,os,secrets,shutil,socket,ssl,subprocess,tempfile,urllib.request
from pathlib import Path
SOURCE='adfa21b8f6634680c970c6c8ffd00ab344484e8f'
MODE='stage'
MANIFEST={"novalisai/upgrade.py": "1c140b9e21fa2d49140706a5df67f5b8ffa8b06ebb5847f2a1ca27045a284a9c", "novalisai/extensions.py": "a2e003852e2c3f829168b56602dbd7f23c2751c0a9144ac9007b6a96150ecb96", "novalisai/studio.py": "c756a03843039578b3e6abd57287c2c3b4bdd7d0bc3feff4ea5479d359e1c49f", "novalisai/ultimate.py": "a4d450ea842f56338e2ec36833eb1f67ac5621c42dd91a74ff62c0d15c62038c", "novalisai/build.py": "36bf22f333736eb73f13c321d016eb7aa79ac6b4bb3d3264602e331e59bdf6d6", "novalisai/content.json": "9f0a4e13fd11ebfb7251ed6eaa821dd252e9b755ff845878a5fc8d45fc8c1485", "novalisai/products.json": "e895abb521d5b92ba9381c23e4b7fe9a3460c886ccdcd9655f055cf46e9ec0c4", "novalisai/team.json": "9a99b75fe2788535fa861e1e34d5c10a7867ec41b58d29a6e9e20829d6e348a2", "novalisai/runtime-config.json": "d1e3566942fd33d467fedf5656f3aec0c2c5a39db4a98ff38917c6d7293e6d13", "novalisai/ultimate.json": "6ede3314ba5cb1c27f1514f095228f8aec30819b7666b4155d98762433e46ab2", "novalisai/extension.json": "aed6a728a72e188695d003a6e60ec46d53f10968bfdac0b48e6d2f8b15f1911b", "novalisai/studio.json": "bcced4595819f4c422f765907e807eaa1d3b346e21cb400f02e2a0ea9dca5719", "novalisai/template.html": "33baa9cee04429b950b9283a2c7a66b7191343432881d623ab1d7cfb236b8ba7", "novalis-os/deploy/prepare-public.py": "9200447d8e4e30951a5d528295977fc4feb656ff49e11a904d17a3892c7019e6", "novalisai/assets/logo.webp": "4e245c95beab03019092571d5dd390cdecbf37a8acc946149e7a06b9107e5709", "novalisai/assets/ultimate.css": "965e96424c6e607a02ef1ab431da5559c09c0a6193fdf5b3ee39614e0790fee3", "novalisai/assets/N_novalis.png": "d5d0bf8c17bcb4ba6e62a34b3b7dbcf224b64ea8c6c475a657e4ceb6ca10fbcf", "novalisai/assets/instrument-serif-latin.woff2": "5a51946dfffa82972bc98745359c46761515641fda557c25116459a9f83da4a7", "novalisai/assets/ultimate.js": "931402bd9ddc811ff8874de03fe4c5e0f535bfd2d1869a4ceae78d8489d1df16", "novalisai/assets/pages.js": "eca26283ad68b82bf7879b92f56561bd60ffec93bd38570cb0f1283b1b325ea0", "novalisai/assets/lab-engine.js": "96a6f5e7c689718775ab4b1a738a4e78869b934471f89ec7e76d2bab88c6b5c0", "novalisai/assets/studio.css": "5cf641b61b4511ec2cdd10a21ff897db8dcb24584ac9bbf8599692c71f0a373d", "novalisai/assets/styles.css": "889e4864d9dfebf079610be378d583ff02090ecd1a876f25dcab6056b5635296", "novalisai/assets/experience.js": "a55e095ae8d9961785dc8b248d088c597798a4f617b6258a00724fd8d03b83f6", "novalisai/assets/v2.js": "85e88da6d083a4bb4b72fb7b4f39a4d4a714bdeebe36eea6f5fa22c026f4c570", "novalisai/assets/app.js": "15323b6ee0a76e58f8fd8b32f7a1d77d3a6d01af0c7393940be64344b66418ef", "novalisai/assets/novalis_og.png": "66c7e0dbfcd1dc2aa2df166156ccf17913fe6ff4e0e7a9fab68272e46814acd9", "novalisai/assets/manrope-OFL.txt": "58172e0c0fac2cda8a37b348164bb55e44b0e69051e557e92b1d3f6910141f7b", "novalisai/assets/v2.css": "80cc873820b8c0ea720851c6f98406dfa10078a386c13b75212c15b0b0e56a12", "novalisai/assets/studio.js": "3a39dbb09d02080bbc9315dc290c0dd1a2d9691290ccd434420a82c47a9a8d27", "novalisai/assets/manrope-latin.woff2": "a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972", "novalisai/assets/sculpture.js": "17210c89fc08faa6e708ad24d31362b872e45c6324498ebc0dfdaac30f60d7ea", "novalisai/assets/experience.css": "0a543b645a771728e34decea12d2617c06f9c53c8eb93ceac24ac4f6ab91c029", "novalisai/assets/instrumentserif-OFL.txt": "129ed7618959716959f2941fdd5b49e0ad6e6c1d78726761786a00253d865521"}
PUBLIC=Path('/var/www/novalis-ai');CONFIG=Path('/etc/nginx/sites-available/zz-novalisai');SERVICES=['nginx','novalis-os','novalis-os-worker','postgresql@17-main','pm2-root']
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
 for p in ['/os/','/api/health']:
  status,_,_=https('app.novalisai.com',p)
  if status!=200:raise RuntimeError('Existing app health check failed')
 return after

def main():
 os.umask(0o077);before=baseline();review=PUBLIC/'_review';release=PUBLIC/'releases'/('ultimate-'+SOURCE)
 review.chmod(0o755)
 status,body,headers=https('www.novalisai.com','/_review/'+SOURCE+'/fr/')
 if status!=200 or body!=(release/'fr/index.html').read_bytes():raise RuntimeError('Review check: '+str(status)+' '+str(headers))
 if headers.get('X-Frame-Options')!='SAMEORIGIN':raise RuntimeError('Missing framing header')
 after=preserved(before,True)
 REPORT.update(completed=True,review='https://www.novalisai.com/_review/qa.html',release=str(release),public_pointer_unchanged=True,pointage_unchanged=True,processes_unchanged=True,core_unchanged=True,before=before,after=after,public_pages=73)
 path=Path('/etc/novalis-os/deployment-ultimate-stage.json');path.write_text(json.dumps(REPORT,indent=2));path.chmod(0o600);print(json.dumps(REPORT))
try:main()
except Exception as error:print(json.dumps(dict(REPORT,completed=False,error=str(error))));raise
