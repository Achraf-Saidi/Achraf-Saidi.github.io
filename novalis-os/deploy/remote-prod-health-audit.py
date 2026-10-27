"""Read-only Novalis health and rollback diagnosis after guarded deployment attempt."""
import json,os,sqlite3,subprocess
from pathlib import Path
def cmd(values,timeout=20):
    q=subprocess.run(values,text=True,capture_output=True,timeout=timeout)
    return {'code':q.returncode,'stdout':q.stdout[-9000:],'stderr':q.stderr[-1000:]}
envfile=Path('/etc/novalis-os/production.env')
env={}
for line in envfile.read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1)
        if k.startswith('NOVALIS_'):env[k]=v.strip().strip('"').strip("'")
database=Path(env.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3'
db=sqlite3.connect('file:'+str(database.resolve())+'?mode=ro',uri=True)
report={'stage':'read_only_post_rollback','production_core':str(Path('/opt/novalis-os/current').resolve()),
  'public_release':str(Path('/var/www/novalis-ai/current').resolve()),
  'services':{name:cmd(['systemctl','is-active',name]) for name in ['novalis-os','novalis-worker','nginx','pm2-root','postgresql@17-main']},
  'health':cmd(['curl','--max-time','12','-sS','-o','/dev/null','-w','%{http_code}','https://app.novalisai.com/healthz']),
  'logs':cmd(['journalctl','-u','novalis-os.service','-n','55','--no-pager','--output=cat']),
  'message_table_exists':bool(db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='lead_public_messages'").fetchone()),
  'db_integrity':db.execute('PRAGMA quick_check').fetchone()[0],
  'foreign_keys':len(db.execute('PRAGMA foreign_key_check').fetchall()),
  'protected_lead_count':db.execute("""SELECT COUNT(*) FROM lead_intake i JOIN leads l ON l.id=i.lead_id
     WHERE i.reference=? AND lower(l.email)=? AND l.org_id='novalis'""",('NV-26-46DAC03F','anne.vanoost@formestructure.be')).fetchone()[0],
  'production_user_statuses':list(db.execute("SELECT role,status,COUNT(*) FROM users WHERE org_id='novalis' GROUP BY role,status")),
  'demo_users':db.execute("SELECT COUNT(*) FROM users WHERE org_id='novalis-demo'").fetchone()[0]}
db.close()
report['production_user_statuses']=[list(v) for v in report['production_user_statuses']]
print(json.dumps(report))
