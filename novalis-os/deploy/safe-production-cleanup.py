"""Explicit, backup-first Novalis production accounts tidy-up.

Never target the demonstration organisation, never delete users, and never change
any commercial lead, proposal, finance document, or project. Requires private
environment variables naming the protected real request and its contact.
Default is dry-run; --apply must be explicitly provided by an operator.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from novalis_os import create_app
from novalis_os.db import get_db, row, rows, transaction, uid, now, audit
from novalis_os.cli import backup, verify_backup
from novalis_os.auth import token_for

DIRECTION = {"saidi@novalisai.com": "Nacim Saidi",
             "achraf@novalisai.com": "Achraf Saidi"}


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def protected_snapshot(db, reference, address):
    candidates = [dict(x) for x in db.execute(
        """SELECT l.*,i.reference,i.access_hash,i.payload_hash,i.request_key_hash,
               i.created_at AS intake_at,i.expires_at
           FROM leads l JOIN lead_intake i ON i.lead_id=l.id
           WHERE i.reference=? AND l.email=? AND l.org_id='novalis'""",
        (reference, address))]
    if len(candidates) != 1:
        raise RuntimeError("Protected first real request not found exactly once; stop.")
    lead = candidates[0]
    projects = rows("SELECT * FROM projects WHERE lead_id=?", (lead['id'],))
    proposals = []
    for project in projects:
        proposals.extend(rows("SELECT * FROM proposals WHERE project_id=?", (project['id'],)))
    events = rows("SELECT * FROM lead_public_events WHERE lead_id=? ORDER BY id", (lead['id'],))
    return fingerprint({'lead': lead, 'projects': projects,
                        'proposals': proposals, 'events': events})


def demo_snapshot(db):
    # Important: demo and production may coexist in the SAME SQLite database.
    # Never mutate the shared demo tenant.
    result = {}
    for table in ('users', 'leads', 'clients', 'projects'):
        result[table] = rows("SELECT * FROM "+table+" WHERE org_id='novalis-demo' ORDER BY id")
    return fingerprint(result)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if os.environ.get('NOVALIS_ORG_ID','novalis') != 'novalis' or os.environ.get('NOVALIS_MODE','production') != 'production':
        raise RuntimeError('Operation restricted to live Novalis production only.')
    reference = os.environ.get('NOVALIS_PROTECTED_REFERENCE','').strip()
    address = os.environ.get('NOVALIS_PROTECTED_EMAIL','').strip().lower()
    if not reference or not address:
        raise RuntimeError('Protected reference and contact must be supplied privately.')
    app = create_app()
    with app.app_context():
        db = get_db()
        before = protected_snapshot(db,reference,address)
        demo_before = demo_snapshot(db)
        users = rows("SELECT id,name,email,role,status FROM users WHERE org_id='novalis' ORDER BY email")
        nacim = row("SELECT * FROM users WHERE org_id='novalis' AND email='saidi@novalisai.com'")
        if not nacim:
            raise RuntimeError('Existing Nacim direction identity missing. No accounts changed.')
        achraf = row("SELECT * FROM users WHERE org_id='novalis' AND email='achraf@novalisai.com'")
        other = [u['email'] for u in users if u['email'].lower() not in DIRECTION]
        result = {'protected_first_request_verified':True,'demo_untouched':True,
                  'direction_accounts_existing':[u['email'] for u in (nacim,achraf) if u],
                  'other_production_accounts_to_suspend':len(other),
                  'user_changes_applied':False, 'dry_run':not args.apply}
        if not args.apply:
            print(json.dumps(result,ensure_ascii=False))
            return
        destination = Path('/srv/novalis-os/backups')/('before-production-account-cleanup-'+uid())
        backup(app.config['DATABASE'],app.config['FILES_DIR'],destination)
        verify_backup(destination)
        result['backup_verified']=True
        with transaction() as conn:
            # Nacim's credentials, MFA secrets and membership are preserved.
            if nacim['client_id']:
                raise RuntimeError('Nacim unexpectedly belongs to a client organisation; stop.')
            conn.execute("UPDATE users SET name='Nacim Saidi',role='manager' WHERE id=?", (nacim['id'],))
            if not achraf:
                if row("SELECT id FROM users WHERE email='achraf@novalisai.com'"):
                    raise RuntimeError('Achraf address already belongs to another organisation.')
                identity=uid()
                conn.execute("""INSERT INTO users(id,org_id,name,email,role,status,created_at)
                    VALUES(?,'novalis','Achraf Saidi','achraf@novalisai.com','manager','invited',?)""",
                    (identity,now()))
                conn.execute("INSERT INTO user_profiles(user_id,job_title,engagement,updated_at) VALUES(?,?,?,?)",
                    (identity,'Direction','employee',now()))
                achraf=row('SELECT * FROM users WHERE id=?',(identity,))
            else:
                if achraf['client_id']:
                    raise RuntimeError('Achraf unexpectedly tied to a client; stop.')
                conn.execute("UPDATE users SET name='Achraf Saidi',role='manager' WHERE id=?", (achraf['id'],))
            if achraf['status']=='suspended':
                # Resume the named owner only; do not reactivate any other account.
                conn.execute("UPDATE users SET status=? WHERE id=?", ('active' if achraf['password_hash'] else 'invited',achraf['id']))
            # The existing credential is not replaced without a private channel.
            # An invitation link is generated only for accounts with no password.
            if not achraf['password_hash']:
                conn.execute("UPDATE users SET status='invited' WHERE id=?", (achraf['id'],))
                conn.execute("UPDATE tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL",(now(),achraf['id']))
                result['activation_url']=token_for(achraf,'invite')
            # The owner explicitly requested an MFA exemption for this one identity.
            conn.execute("UPDATE users SET totp_cipher=NULL,totp_pending=NULL,totp_counter=-1 WHERE id=?",(achraf['id'],))
            conn.execute("DELETE FROM recovery_codes WHERE user_id=?",(achraf['id'],))
            conn.execute("DELETE FROM sessions WHERE user_id=?",(achraf['id'],))
            # Suspend rather than delete old test/staff accounts in ONLY the live organisation.
            # Linked historical rows and foreign keys are untouched.
            for identity in users:
                if identity['email'].lower() in DIRECTION:
                    continue
                conn.execute("UPDATE users SET status='suspended' WHERE id=? AND org_id='novalis'",(identity['id'],))
                conn.execute("DELETE FROM sessions WHERE user_id=?",(identity['id'],))
            audit('operator.production_accounts_tidied','novalis',
                {'retained_direction':list(DIRECTION),
                 'suspended_count':len(other),'deleted_count':0,
                 'demo_organisation_untouched':True}, org_id='novalis')
            if protected_snapshot(conn,reference,address)!=before:
                raise RuntimeError('Commercial lead unexpectedly changed; rollback entire transaction')
            if demo_snapshot(conn)!=demo_before:
                raise RuntimeError('Demo tenant unexpectedly changed; rollback entire transaction')
        result.update({'user_changes_applied':True,'dry_run':False,
                       'suspended_count':len(other),'deleted_count':0,
                       'achraf_status':row("SELECT status FROM users WHERE id=?",(achraf['id'],))['status']})
        print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':
    main()
