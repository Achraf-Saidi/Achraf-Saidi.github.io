"""Read-only diagnostics of Novalis service health, deployment paths and demo data."""
import json,sqlite3,subprocess,urllib.request,os
from pathlib import Path
def cmd(*args):
 p=subprocess.run(list(args),capture_output=True,text=True,timeout=15)
 return dict(returncode=p.returncode,output=p.stdout.strip()[-4000:],error=p.stderr.strip()[-2000:])
def health():
 try:
  with urllib.request.urlopen('http://127.0.0.1:18080/healthz',timeout=8) as r:
   return {'code':r.status,'body':r.read(1000).decode('utf-8','replace')}
 except Exception as e:return {'exception':type(e).__name__,'reason':str(e)[:240]}
def main():
 root=Path('/opt/novalis-os');active=root/'current';file=Path('/srv/novalis-os/data/novalis.sqlite3')
 status={'active_symlink':os.readlink(active) if active.is_symlink() else None,
    'active_resolved':str(active.resolve()),'health':health(),
    'services':{name:cmd('systemctl','show',name,'-p','ActiveState','-p','SubState','-p','ExecMainStatus')
               for name in ('novalis-os.service','novalis-worker.service')},
    'journal':{name:cmd('journalctl','-u',name,'--since','-15 minutes','--no-pager','-n','35')
               for name in ('novalis-os.service','novalis-worker.service')},
    'code_files':{p:(active/p).exists() for p in ['novalis-os/novalis_os/intelligence.py','novalis-os/novalis_os/demo_seed.py','novalis-os/web/planning.js']}}
 if file.exists():
  with sqlite3.connect(str(file)) as db:
   status['db_integrity']=db.execute('PRAGMA quick_check').fetchone()[0]
   status['demo_org']=db.execute("SELECT COUNT(*) FROM organisations WHERE id='novalis-demo'").fetchone()[0]
   status['demo_accounts']=db.execute("SELECT COUNT(*) FROM users WHERE org_id='novalis-demo'").fetchone()[0]
   status['demo_projects']=db.execute("SELECT COUNT(*) FROM projects WHERE org_id='novalis-demo'").fetchone()[0]
   status['demo_test_invoices']=db.execute("SELECT COUNT(*) FROM billing_documents WHERE org_id='novalis-demo' AND test_mode=1").fetchone()[0]
 print(json.dumps(status))
main()
