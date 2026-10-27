"""Read-only production preflight: no customer data or credential mutations."""
import sqlite3,json,os,hashlib
from pathlib import Path
from datetime import datetime,timezone
environment={}
for line in Path('/etc/novalis-os/production.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key,value=line.split('=',1)
        if key.startswith('NOVALIS_'):
            environment[key]=value.strip().strip('"').strip("'")
if environment.get('NOVALIS_ORG_ID','novalis')!='novalis' or environment.get('NOVALIS_MODE','production')!='production':
    raise RuntimeError('Unexpected organisation or environment')
database=Path(environment.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3'
if not database.exists():raise RuntimeError("Expected production database missing")
db=sqlite3.connect("file:"+str(database.resolve())+"?mode=ro",uri=True)
db.row_factory=sqlite3.Row
db.execute("PRAGMA query_only=ON")
if db.execute("PRAGMA quick_check").fetchone()[0]!="ok" or db.execute("PRAGMA foreign_key_check").fetchone():
    raise RuntimeError("Database integrity invalid")
x=db.execute("""SELECT COUNT(*) FROM lead_intake i JOIN leads l ON l.id=i.lead_id
 WHERE i.reference=? AND l.email=? AND l.org_id='novalis'""",
 ("NV-26-46DAC03F","anne.vanoost@formestructure.be")).fetchone()[0]
if x!=1:raise RuntimeError("Protected lead mismatch, STOP")
live=[dict(r) for r in db.execute("""SELECT email,role,status FROM users WHERE org_id='novalis' ORDER BY email""")]
demo={t:db.execute(f"SELECT COUNT(*) FROM {t} WHERE org_id='novalis-demo'").fetchone()[0] for t in ("users","projects","leads")}
if not demo["users"] or not demo["projects"]:raise RuntimeError("Demo tenant unexpectedly absent")
backups=Path("/srv/novalis-os/backups")
existing=[p for p in backups.glob("protected-live-*") if (p/"manifest.json").is_file()]
if not existing:raise RuntimeError("No verified predecessor application backup found")
print(json.dumps({"checked_utc":datetime.now(timezone.utc).isoformat(),"production_users":live,
 "demo_counts":demo,"protected_lead_present":True,
 "app_backup_manifest_present":True,"no_data_changed":True}))
