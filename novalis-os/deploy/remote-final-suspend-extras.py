"""Production-only, reversible suspension of four audited spare accounts.

Requires successful prospect release, consistent backup and exact live inventory.
Never deletes users, changes passwords, or alters demo/business rows.
"""
import hashlib,json,os,secrets,sqlite3,subprocess,tempfile,time
from pathlib import Path
from datetime import datetime,timezone
ENV=Path('/etc/novalis-os/production.env')
CORE=Path('/opt/novalis-os/current').resolve(strict=True)
KEEP=('achraf@novalisai.com','saidi@novalisai.com')
def invoke(command,timeout=90):
    p=subprocess.run(command,capture_output=True,text=True,timeout=timeout)
    if p.returncode:raise RuntimeError('Required command failed: '+p.stderr[-500:])
    return p.stdout
def healthy():
    for i in range(40):
        q=subprocess.run(['curl','-fsS','--max-time','7',
          'https://app.novalisai.com/healthz'],capture_output=True,text=True)
        if q.returncode==0 and '"ok"' in q.stdout:return True
        time.sleep(1)
    return False
def content_digest(db):
    tables=('leads','lead_intake','lead_public_events','lead_public_messages','clients','projects',
            'proposals','invoices','invoice_lines','payments','documents','outbox')
    h=hashlib.sha256()
    for table in tables:
        for entry in db.execute('SELECT * FROM '+table+' ORDER BY 1'):
            h.update(repr((table,tuple(entry))).encode())
    for table in ('users','leads','clients','projects'):
        for entry in db.execute("SELECT * FROM "+table+" WHERE org_id='novalis-demo' ORDER BY 1"):
            h.update(repr(('demo',table,tuple(entry))).encode())
    return h.hexdigest()
def verify(db):
    if db.execute('PRAGMA quick_check').fetchone()[0]!='ok' or db.execute('PRAGMA foreign_key_check').fetchone():
        raise RuntimeError('Database integrity failure')
    if db.execute("""SELECT COUNT(*) FROM lead_intake i JOIN leads l ON l.id=i.lead_id
          WHERE i.reference='NV-26-46DAC03F' AND lower(l.email)='anne.vanoost@formestructure.be'
            AND l.org_id='novalis'""").fetchone()[0]!=1:
        raise RuntimeError('Protected real request no longer matches')
    if db.execute("SELECT COUNT(*) FROM users WHERE org_id='novalis-demo'").fetchone()[0]!=6:
        raise RuntimeError('Demonstration users differ')
    users=[dict(r) for r in db.execute("SELECT * FROM users WHERE org_id='novalis'")]
    if len(users)!=6 or len([x for x in users if x['email'].lower() not in KEEP])!=4:
        raise RuntimeError('Audited production user count diverged')
    for email in KEEP:
        matches=[x for x in users if x['email'].lower()==email]
        if len(matches)!=1 or matches[0]['role']!='manager' or matches[0]['status']!='active' or not matches[0]['password_hash']:
            raise RuntimeError('Expected Direction account differs from inventory')
    return users
def replace_config(blob):
    fd,name=tempfile.mkstemp(prefix='.novalis-settings-',dir=ENV.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'wb') as f:
            f.write(blob);f.flush();os.fsync(f.fileno())
        os.replace(name,ENV)
    finally:
        if os.path.exists(name):os.unlink(name)
def main():
    os.umask(0o077)
    if '-tracking-' not in str(CORE):
        raise RuntimeError('Prospect messaging release not live: no account cleanup permitted')
    if not healthy():raise RuntimeError('Novalis production unhealthy, stop')
    original=ENV.read_bytes()
    settings={}
    for line in original.decode().splitlines():
        if '=' in line and not line.startswith('#'):
            k,v=line.split('=',1)
            if k.startswith('NOVALIS_'):settings[k]=v.strip().strip('"').strip("'")
    if settings.get('NOVALIS_ORG_ID','novalis')!='novalis' or settings.get('NOVALIS_MODE','production')!='production':
        raise RuntimeError('Wrong tenant or mode')
    path=Path(settings.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))/'novalis.sqlite3'
    db=sqlite3.connect(str(path),timeout=30,isolation_level=None);db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    verify(db)
    name='/srv/novalis-os/backups/pre-final-accounts-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+secrets.token_hex(4)
    env={**os.environ,**settings,'PYTHONPATH':str(CORE/'novalis-os')}
    check=subprocess.run([str(CORE/'.venv/bin/python'),'-m','novalis_os.cli','backup','--destination',name],
        cwd=CORE/'novalis-os',env=env,text=True,capture_output=True,timeout=200)
    if check.returncode:raise RuntimeError('Verified backup failed: '+check.stderr[-250:])
    exceptions={s.strip().lower() for s in settings.get('NOVALIS_MFA_EXEMPT_EMAILS','').split(',') if s.strip()}
    exceptions.add(KEEP[0])
    newlines=[x for x in original.decode().splitlines() if not x.startswith('NOVALIS_MFA_EXEMPT_EMAILS=')]
    newlines.append('NOVALIS_MFA_EXEMPT_EMAILS='+','.join(sorted(exceptions)))
    desired=(chr(10).join(newlines)+chr(10)).encode()
    if desired!=original:
        replace_config(desired)
        try:
            invoke(['systemctl','restart','novalis-os.service','novalis-worker.service'])
            if not healthy():raise RuntimeError('Novalis unhealthy after private settings update')
        except Exception:
            replace_config(original)
            invoke(['systemctl','restart','novalis-os.service','novalis-worker.service'])
            raise
    try:
        db.execute('BEGIN IMMEDIATE')
        users=verify(db)
        before=content_digest(db)
        to_suspend=[r for r in users if r['email'].lower() not in KEEP]
        for u in to_suspend:
            db.execute("UPDATE users SET status='suspended' WHERE id=? AND org_id='novalis'",(u['id'],))
            db.execute("DELETE FROM sessions WHERE user_id=?",(u['id'],))
        db.execute("""INSERT INTO audit(org_id,actor_id,action,entity_id,detail,created_at)
          VALUES('novalis',NULL,'operator.extra_accounts_suspended','novalis',?,?)""",
          (json.dumps({'suspended':4,'preserved_managers':2,'deleted':0,'demo_untouched':True}),
           datetime.now(timezone.utc).isoformat()))
        if content_digest(db)!=before or db.execute('PRAGMA foreign_key_check').fetchone():
            raise RuntimeError('Commercial or demonstration data changed, rolling back')
        db.execute('COMMIT')
    except Exception:
        if db.in_transaction:db.execute('ROLLBACK')
        raise
    final=verify(db)
    assert all(u['status']=='suspended' for u in final if u['email'].lower() not in KEEP)
    assert all(u['status']=='active' for u in final if u['email'].lower() in KEEP)
    db.close()
    if not healthy():raise RuntimeError('Production accounts changed but application unhealthy')
    print(json.dumps({'completed':True,'direction_accounts_active':2,
        'other_production_accounts_suspended':4,'users_deleted':0,'passwords_unchanged':True,
        'demo_unchanged':True,'protected_request_unchanged':True,'business_data_unchanged':True,
        'backup_verified':True,'named_owner_mfa_exception':True,'application_healthy':True}))
if __name__=='__main__':main()
