"""Read-only production verification of Novalis OS and the isolated demo release."""
import json,sqlite3,subprocess,urllib.request,urllib.error
from pathlib import Path

def probe(uri):
 try:
  with urllib.request.urlopen(uri,timeout=10) as r:
   body=r.read(2000)
   return {'code':r.status,'payload':json.loads(body) if 'healthz' in uri else {'bytes':len(body)}}
 except Exception as e:
  return {'error':type(e).__name__}
root=Path('/opt/novalis-os/current')
releases=sorted(Path('/srv/novalis-os/backups').glob('finish-demo-*'))
if not releases:raise RuntimeError('No successful demo-release directory found')
last=next((p for p in reversed(releases) if (p/'demo-access.json').is_file() and (p/'report.json').is_file()),None)
if last is None:raise RuntimeError('Demo access/release report not found')
report=json.loads((last/'report.json').read_text())
access=json.loads((last/'demo-access.json').read_text())
expected={'manager','account','developer','client','finance','sysadmin'}
if set(access)!=expected or any('email' not in u or 'password' not in u for u in access.values()):
 raise RuntimeError('Invalid stored demo account set')
if report.get('deployed') is not True or report.get('existing_business_preserved') is not True:
 raise RuntimeError('No confirmed successful rollout report')
if root.resolve()!=Path(report['release']).resolve():
 raise RuntimeError('Current release differs from last successful rollout')
dbpath=Path('/srv/novalis-os/data/novalis.sqlite3')
with sqlite3.connect('file:'+str(dbpath)+'?mode=ro',uri=True) as db:
 db.row_factory=sqlite3.Row
 userrows=[dict(x) for x in db.execute("SELECT email,role,status,totp_cipher IS NOT NULL has_mfa FROM users WHERE org_id='novalis-demo'")]
 counts={k:db.execute("SELECT COUNT(*) FROM "+t+" "+w).fetchone()[0] for k,t,w in [
  ('projects','projects',"WHERE org_id='novalis-demo'"),
  ('users','users',"WHERE org_id='novalis-demo'"),
  ('test_invoices','billing_documents',"WHERE org_id='novalis-demo' AND test_mode=1"),
  ('real_invoices','billing_documents',"WHERE org_id='novalis-demo' AND test_mode=0"),
  ('stakeholders','project_stakeholders',"WHERE project_id IN (SELECT id FROM projects WHERE org_id='novalis-demo')"),
  ('phases','project_phases',"WHERE project_id IN (SELECT id FROM projects WHERE org_id='novalis-demo')")
 ]}
 integrity=db.execute('PRAGMA quick_check').fetchone()[0]
if integrity!='ok' or counts['projects']!=4 or counts['users']!=6 or counts['real_invoices']!=0:
 raise RuntimeError('Database counts or integrity check failed')
if set(x['role'] for x in userrows)!=expected or any(x['status']!='active' for x in userrows):
 raise RuntimeError('Demo user state check failed')
assets={name:(root/'novalis-os/web'/name).is_file() for name in ('app.js','planning.js','billing.js','app.css')}
services={name:subprocess.run(['systemctl','is-active',name],capture_output=True,text=True,timeout=10).stdout.strip() for name in ('novalis-os.service','novalis-worker.service')}
data={'deployed':True,'release':str(root.resolve()),'health_internal':probe('http://127.0.0.1:18080/healthz'),
 'health_public':probe('https://app.novalisai.com/healthz'),'counts':counts,'users':userrows,'services':services,
 'ui_assets':assets,'database_integrity':integrity,'mfa_expected':True,'real_payments':False,
 'credentials':access}
print(json.dumps(data,ensure_ascii=False))
