import hashlib,http.client,json,socket,ssl,subprocess,urllib.request
from pathlib import Path
PUBLIC=Path("/var/www/novalis-ai")
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


SOURCE='f0659a461975bb9bcb5d092a98292341e6214601'
EXPECTED={'index.html': '78b3d5e817272ca16caddfaadd8919dd2186e36a0cd889a549cfc796fabe1798', 'app.js': '2b005693351a4a2fb8ee3711072425e6a58f944f1ed40b640ccdbeb7c8b32168', 'app.css': '5b063548bfbd0d4fbaa12b5eaa05d024fcf5ffbf997483a1630724c6f0a88623'}
FIXTURE_SHA='cca94968a1139f53c87023af3ff894153f4b195438e60144224d3b96e4b03ad6'
before=baseline();core=Path(before['core'])/'novalis-os/web';target=PUBLIC/'_review'/('client-tour-'+SOURCE);target.mkdir(mode=0o755,exist_ok=True)
for name,expected in EXPECTED.items():
 b=(core/name).read_bytes();assert hashlib.sha256(b).hexdigest()==expected, name
 text=b.decode().replace('/brand/','brand/').replace('/os/app.','app.')
 if name=='index.html':text=text.replace('<script src="app.js"','<script src="fixture.js" defer></script><script src="app.js"').replace('<body>','<body><div style="padding:7px 20px;background:#172d36;color:#fff;font:11px system-ui;letter-spacing:.08em">NOVALIS OS · PROJET EXEMPLE</div>')
 p=target/name;p.write_text(text);p.chmod(0o644)
b=urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/novalisai/qa/client-guide-fixture.js',timeout=30).read();assert hashlib.sha256(b).hexdigest()==FIXTURE_SHA
(target/'fixture.js').write_bytes(b);(target/'fixture.js').chmod(0o644)
brand=target/'brand';brand.mkdir(mode=0o755,exist_ok=True)
for name in ['logo.webp','N_novalis.png','manrope-latin.woff2','instrument-serif-latin.woff2']:
 src=PUBLIC/'current/assets'/name
 if src.exists():(brand/name).write_bytes(src.read_bytes());(brand/name).chmod(0o644)
after=preserve(before,True);route='/_review/client-tour-'+SOURCE+'/';assert https('www.novalisai.com',route)[0]==200
print(json.dumps({'completed':True,'before':before,'after':after,'review':'https://www.novalisai.com'+route,'source_hashes':EXPECTED}))
