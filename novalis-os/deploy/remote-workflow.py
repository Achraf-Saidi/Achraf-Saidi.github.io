"""Verify the public release and remove only the unused iframe QA helper created in this deployment."""
import hashlib,http.client,json,socket,ssl,subprocess
from pathlib import Path
SOURCE='a1cf1c6ec3742f921c82cc40063804f7c8cd1aca'
def https(host,path):
 ctx=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=20,context=ctx);c.sock=ctx.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=20),server_hostname=host);c.request('GET',path,headers={'Host':host});r=c.getresponse();b=r.read(4000000);status=r.status;headers=dict(r.getheaders());c.close();return status,b,headers
public=Path('/var/www/novalis-ai');release=public/'releases'/('workflow-'+SOURCE);assert (public/'current').resolve()==release
status,body,headers=https('www.novalisai.com','/fr/');assert status==200 and body==(release/'fr/index.html').read_bytes()
assert https('app.novalisai.com','/healthz')[0]==200
pointage_status,pointage,_=https('pointagevdc.cloud','/');assert pointage_status==200
assert hashlib.sha256(pointage).hexdigest()=='a55b361e00793f2e34075a00a9423bf061f55e16e71cc208f8002eb5fbcb5f99'
assert hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest()=='937b8694be03479c4601233baa447e155d4a13e69a15ed27ddddcf5f73839bcd'
removed=[]
for name in ['workflow-live.html','workflow-live.js']:
 p=public/'_review'/name
 if p.exists():p.unlink();removed.append(name)
report={'source':SOURCE,'completed':True,'public_matches_source':True,'pointage_healthy':True,'erp_healthy':True,'public_x_frame_options':next((v for k,v in headers.items() if k.lower()=='x-frame-options'),None),'public_csp':next((v for k,v in headers.items() if k.lower()=='content-security-policy'),None),'unused_qa_helpers_removed':removed,'responsive_review':'https://www.novalisai.com/_review/workflow-qa.html'}
Path('/opt/novalis-showcase/reports/workflow-'+SOURCE+'-final.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
