"""Read-only diagnosis; no application changes."""
import json, os, sqlite3, subprocess, urllib.request, urllib.error
from pathlib import Path

def cmd(*args):
    p=subprocess.run(args,capture_output=True,text=True,timeout=25)
    return {'code':p.returncode,'output':p.stdout[-17000:],'error':p.stderr[-1000:]}
def mode(p):
    s=p.stat()
    return {'path':str(p),'mode':oct(s.st_mode & 0o777),'uid':s.st_uid,'gid':s.st_gid}
root=Path('/opt/novalis-os');active=root/'current';dbfile=Path('/srv/novalis-os/data/novalis.sqlite3')
r={'current':str(active.resolve()),'public':str(Path('/var/www/novalis-ai/current').resolve())}
for key,url in [('internal','http://127.0.0.1:18080/healthz'),('external','https://app.novalisai.com/healthz')]:
    try:
        with urllib.request.urlopen(url,timeout=10) as response:r[key]={'code':response.status,'body':response.read(500).decode()}
    except Exception as e:r[key]={'error':str(e)}
r['services']={s:cmd('systemctl','show',s,'-p','ActiveState','-p','SubState','-p','User','-p','Group','-p','WorkingDirectory','-p','ExecStart','-p','MainPID') for s in ['novalis-os.service','novalis-worker.service']}
r['journals']={s:cmd('journalctl','-u',s,'--since','2026-10-22 23:00:00','--no-pager','-n','100') for s in ['novalis-os.service','novalis-worker.service']}
r['releases']=[]
for p in sorted((root/'releases').glob('demo-*')):
    r['releases'].append({'root':mode(p),'files':[mode(p/f) for f in ['novalis-os/novalis_os/intelligence.py','novalis-os/novalis_os/demo_seed.py','novalis-os/novalis_os/stakeholders-schema.sql'] if (p/f).exists()]})
r['data_files']=[mode(p) for p in dbfile.parent.glob('novalis.sqlite3*')]
with sqlite3.connect('file:'+str(dbfile)+'?mode=ro',uri=True) as db:
    db.row_factory=sqlite3.Row
    r['integrity']=db.execute('PRAGMA quick_check').fetchone()[0]
    r['migration']=db.execute('SELECT MAX(version) FROM migrations').fetchone()[0]
    r['demo_users']=[dict(x) for x in db.execute("SELECT email,role,status,totp_cipher IS NOT NULL AS has_mfa FROM users WHERE org_id='novalis-demo'")]
    r['demo_projects']=db.execute("SELECT COUNT(*) FROM projects WHERE org_id='novalis-demo'").fetchone()[0]
    r['demo_invoices']=[dict(x) for x in db.execute("SELECT test_mode,COUNT(*) n FROM billing_documents WHERE org_id='novalis-demo' GROUP BY test_mode")]
print(json.dumps(r))
