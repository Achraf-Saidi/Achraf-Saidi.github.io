"""READ ONLY: report the exact live lead and real/demo tenant boundaries.

Run on the VPS with the private production environment loaded. This command
never changes a table, sends email, creates users or deletes test fixtures.
"""
import hashlib
import json
import os
import sqlite3
from pathlib import Path

def main():
    if os.environ.get('NOVALIS_MODE','production') != 'production':
        raise SystemExit('Safety audit requires production mode')
    org=os.environ.get('NOVALIS_ORG_ID','novalis')
    if org!='novalis':
        raise SystemExit('Unexpected target organization; no inspection performed')
    reference=os.environ.get('NOVALIS_PROTECTED_REFERENCE','').strip().upper()
    address=os.environ.get('NOVALIS_PROTECTED_EMAIL','').strip().lower()
    if not reference or not address:
        raise SystemExit('Set NOVALIS_PROTECTED_REFERENCE and NOVALIS_PROTECTED_EMAIL privately')
    database=Path(os.environ.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3'
    if not database.is_file():
        raise SystemExit('Production database was not found; do not proceed with cleanup')
    connection=sqlite3.connect('file:'+str(database.resolve())+'?mode=ro',uri=True)
    connection.row_factory=sqlite3.Row
    connection.execute('PRAGMA query_only=ON')
    try:
        lead=connection.execute("""SELECT l.*,i.reference,i.created_at AS intake_created_at
            FROM lead_intake i JOIN leads l ON l.id=i.lead_id
            WHERE i.reference=? AND l.email=? AND l.org_id=?""",(reference,address,org)).fetchone()
        if not lead:
            raise SystemExit('PROTECTED LEAD MISSING OR MISMATCHED: do not clean production')
        snapshot=dict(lead)
        digest=hashlib.sha256(json.dumps(snapshot,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        users=[dict(u) for u in connection.execute(
            'SELECT name,email,role,status FROM users WHERE org_id=? ORDER BY email',(org,))]
        demos=[dict(r) for r in connection.execute(
            """SELECT 'users' AS entity,COUNT(*) AS n FROM users WHERE org_id='novalis-demo'
                UNION ALL SELECT 'leads',COUNT(*) FROM leads WHERE org_id='novalis-demo'
                UNION ALL SELECT 'projects',COUNT(*) FROM projects WHERE org_id='novalis-demo'""")]
        tables={r['name'] for r in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        history={kind:connection.execute('SELECT COUNT(*) FROM '+table+' WHERE lead_id=?',(lead['id'],)).fetchone()[0]
                 for kind,table in [('public_events','lead_public_events'),('messages','lead_public_messages')]
                 if table in tables}
        print(json.dumps({'result':'read_only_verified','reference':reference,
            'protected_lead_id':lead['id'],'lead_row_sha256':digest,
            'lead_status':lead['status'],'lead_history':history,
            'production_users':users,'demo_tenant_counts':demos,
            'production_database_file':str(database),'sqlite_integrity':connection.execute('PRAGMA quick_check').fetchone()[0],
            'action':'NO DATABASE CHANGES; run verified application backup before any account mutations'},
            ensure_ascii=False,indent=2))
    finally:connection.close()

if __name__=='__main__':
    main()
