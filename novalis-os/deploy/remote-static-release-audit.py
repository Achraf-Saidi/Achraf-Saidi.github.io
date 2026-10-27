"""Read-only static output differential after automatic release rollback."""
import json,sqlite3
from pathlib import Path
root=Path('/var/www/novalis-ai')
live=(root/'current').resolve(strict=True)
candidates=sorted((p for p in (root/'releases').glob('*-tracking-*') if p.is_dir()),
                  key=lambda p:p.stat().st_mtime,reverse=True)
if not candidates:raise RuntimeError('No trial static release found')
new=candidates[0]
oldpaths={str(p.relative_to(live)) for p in live.rglob('*.html')}
newpaths={str(p.relative_to(new)) for p in new.rglob('*.html')}
for name in ('fr','en','nl','de'):
    if not (new/name/'suivi/index.html').is_file():
        raise RuntimeError('Tracking page missing for language '+name)
env={}
for line in Path('/etc/novalis-os/production.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1)
        if k.startswith('NOVALIS_'):env[k]=v.strip().strip('"').strip("'")
db=sqlite3.connect('file:'+str((Path(env.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3').resolve())+'?mode=ro',uri=True)
accounts=list(db.execute("""SELECT email,role,status,CASE WHEN totp_cipher IS NULL THEN 0 ELSE 1 END AS mfa,
CASE WHEN password_hash IS NULL THEN 0 ELSE 1 END AS password
FROM users WHERE org_id='novalis' AND email IN ('achraf@novalisai.com','saidi@novalisai.com') ORDER BY email"""))
report={'live_pages':len(oldpaths),'trial_pages':len(newpaths),
 'missing_in_trial':sorted(oldpaths-newpaths)[:30],'new_in_trial':sorted(newpaths-oldpaths)[:30],
 'required_tracking_present':True,'assets':{name:(new/'assets'/name).is_file()
     for name in ('intake.js','engineering.css')},
 'code_rolled_back':'tracking-' not in str(Path('/opt/novalis-os/current').resolve()),
 'public_rolled_back':'tracking-' not in str(live),
 'direction_accounts':[{'email':r[0],'role':r[1],'status':r[2],'has_totp':bool(r[3]),'password_set':bool(r[4])} for r in accounts],
 'demo_users':db.execute("SELECT COUNT(*) FROM users WHERE org_id='novalis-demo'").fetchone()[0]}
db.close()
print(json.dumps(report))
