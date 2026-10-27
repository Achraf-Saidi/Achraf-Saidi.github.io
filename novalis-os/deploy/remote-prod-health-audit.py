"""Compact, read-only rollback and service diagnostics. No customer data emitted."""
import json,os,sqlite3,subprocess
from pathlib import Path
def run(args,timeout=12):
    p=subprocess.run(args,text=True,capture_output=True,timeout=timeout)
    return p.returncode,p.stdout.strip(),p.stderr.strip()
env={}
for line in Path('/etc/novalis-os/production.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1)
        if k.startswith('NOVALIS_'):env[k]=v.strip().strip('"').strip("'")
p=Path(env.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3'
db=sqlite3.connect('file:'+str(p.resolve())+'?mode=ro',uri=True)
health=run(['curl','-sS','--max-time','10','-o','/dev/null','-w','%{http_code}','https://app.novalisai.com/healthz'])
logs=run(['journalctl','-u','novalis-os.service','--since','2026-10-27 17:07:00','-n','160','--no-pager','--output=cat'])
interesting=[line.strip() for line in logs[1].splitlines() if
    any(term in line for term in ('Traceback','Error','ERROR','failed','Failed','ImportError',
        'ModuleNotFoundError','SyntaxError','OperationalError','Exception','Gunicorn'))]
report={'stage':'compact-readonly-diagnosis','health_http_status':health[1],
 'http_curl_ok':health[0]==0,'services':{name:run(['systemctl','is-active',name])[1]
     for name in ('novalis-os','novalis-worker','nginx')},
 'active_core_looks_like_new_release':'tracking-' in str(Path('/opt/novalis-os/current').resolve()),
 'active_public_looks_like_new_release':'tracking-' in str(Path('/var/www/novalis-ai/current').resolve()),
 'new_message_schema_exists':bool(db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='lead_public_messages'").fetchone()),
 'db_ok':db.execute('PRAGMA quick_check').fetchone()[0]=='ok',
 'foreign_keys_ok':not db.execute('PRAGMA foreign_key_check').fetchone(),
 'original_real_lead_count':db.execute("""SELECT COUNT(*) FROM lead_intake i JOIN leads l ON l.id=i.lead_id
     WHERE i.reference=? AND lower(l.email)=? AND l.org_id='novalis'""",
     ('NV-26-46DAC03F','anne.vanoost@formestructure.be')).fetchone()[0],
 'demo_users':db.execute("SELECT COUNT(*) FROM users WHERE org_id='novalis-demo'").fetchone()[0],
 'production_user_statuses':[[r[0],r[1],r[2]] for r in db.execute(
     "SELECT role,status,COUNT(*) FROM users WHERE org_id='novalis' GROUP BY role,status")],
 'notable_journal':interesting[-13:]}
db.close()
print(json.dumps(report))
