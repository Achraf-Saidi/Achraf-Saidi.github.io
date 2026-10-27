"""Single-run, production READ + consistent application BACKUP. No data changes."""
import json, os, sqlite3, subprocess, hashlib
from datetime import datetime, timezone
from pathlib import Path

def main():
    envfile=Path('/etc/novalis-os/production.env')
    release=Path('/opt/novalis-os/current')
    if not envfile.is_file() or not release.exists():
        raise RuntimeError('Expected Novalis production installation unavailable')
    env=dict(os.environ)
    for line in envfile.read_text().splitlines():
        line=line.strip()
        if not line or line.startswith('#'): continue
        key,separator,value=line.partition('=')
        if separator and key.startswith('NOVALIS_'):env[key]=value.strip().strip('"').strip("'")
    if env.get('NOVALIS_ORG_ID','novalis')!='novalis' or env.get('NOVALIS_MODE','production')!='production':
        raise RuntimeError('Production organisation and mode guard failed')
    root=Path(env.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))
    dbfile=root/'novalis.sqlite3'
    if not dbfile.is_file():
        raise RuntimeError('Production database missing')
    db=sqlite3.connect('file:'+str(dbfile.resolve())+'?mode=ro',uri=True)
    db.row_factory=sqlite3.Row
    db.execute('PRAGMA query_only=ON')
    try:
        integrity=db.execute('PRAGMA quick_check').fetchone()[0]
        keys=db.execute('PRAGMA foreign_key_check').fetchall()
        if integrity!='ok' or keys:raise RuntimeError('Database integrity check failed')
        users=[dict(r) for r in db.execute("SELECT id,name,email,role,status,org_id,client_id FROM users ORDER BY org_id,email")]
        leads=[dict(r) for r in db.execute("""SELECT i.reference,l.id AS lead_id,l.name,l.email,l.company,l.status,l.org_id,
             l.description,l.scoping_note,l.version FROM lead_intake i JOIN leads l ON l.id=i.lead_id
             WHERE l.org_id='novalis' ORDER BY i.created_at""")]
        demos={}
        for name in ['users','leads','clients','projects']:
            demos[name]=db.execute('SELECT COUNT(*) FROM '+name+" WHERE org_id='novalis-demo'").fetchone()[0]
        protected=[x for x in leads if x['reference']=='NV-26-46DAC03F']
        if len(protected)!=1 or protected[0]['email'].lower()!='anne.vanoost@formestructure.be':
            raise RuntimeError('Protected original commercial request not found or mismatch; backup only after verified identity')
        lead=protected[0]
        digest=hashlib.sha256(json.dumps(lead,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        report={'result':'read_verified','created_utc':datetime.now(timezone.utc).isoformat(),
                'production_user_accounts':users,'real_public_intakes':leads,'demo_counts':demos,
                'protected_lead_hash':digest,'protected_lead_id':lead['lead_id'],
                'db_integrity':integrity,'foreign_keys_valid':True,'data_directory':str(root),
                'release':str(release.resolve())}
    finally:db.close()
    python=release/'.venv/bin/python'
    if not python.exists(): raise RuntimeError('Deployed Python environment missing; no changes')
    backups=Path('/srv/novalis-os/backups')
    backups.mkdir(parents=True,exist_ok=True,mode=0o700)
    destination=backups/('protected-live-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    env['PYTHONPATH']=str(release/'novalis-os')
    cmd=[str(python),'-m','novalis_os.cli','backup','--destination',str(destination)]
    result=subprocess.run(cmd,cwd=release/'novalis-os',env=env,text=True,capture_output=True,timeout=180)
    if result.returncode!=0:
        raise RuntimeError('Application backup command failed: '+result.stderr[-1200:])
    if not (destination/'manifest.json').exists():raise RuntimeError('Application backup manifest missing')
    report['backup']={'directory':str(destination),'size_bytes':sum(p.stat().st_size for p in destination.rglob('*') if p.is_file()),
                      'files':len([p for p in destination.rglob('*') if p.is_file()]),
                      'manifest_sha256':hashlib.sha256((destination/'manifest.json').read_bytes()).hexdigest(),
                      'application_verified':True}
    report['mutations']='NONE; no accounts or commercial records changed'
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
