"""Local operator commands. Passwords are entered using getpass, never argv."""
import argparse
import getpass
import hashlib
import json
import os
import sqlite3
import tempfile
import shutil
from pathlib import Path
from datetime import date
from . import create_app
from .db import migrate, connect, get_db, transaction, now, uid, rows, notify
from .security import hash_password
from .outbox import send_pending


def backup(database, files, destination):
    target=Path(destination)
    target.mkdir(parents=True,exist_ok=False)
    target.chmod(0o700)
    source=connect(database)
    copy=sqlite3.connect(target/'novalis.sqlite3')
    source.backup(copy)
    copy.close()
    source.close()
    shutil.copytree(files,target/'documents') if Path(files).exists() else (target/'documents').mkdir()
    manifest={str(p.relative_to(target)):hashlib.sha256(p.read_bytes()).hexdigest() for p in target.rglob('*') if p.is_file()}
    (target/'manifest.json').write_text(json.dumps(manifest,indent=2))
    verify_backup(target)
    return target


def verify_backup(directory):
    target=Path(directory)
    manifest=json.loads((target/'manifest.json').read_text())
    for filename,checksum in manifest.items():
        path=(target/filename).resolve()
        if not path.is_relative_to(target.resolve()) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=checksum:
            raise RuntimeError('Backup integrity check failed')
    db=connect(target/'novalis.sqlite3')
    try:
        if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or db.execute('PRAGMA foreign_key_check').fetchone():
            raise RuntimeError('Database consistency check failed')
        for document in db.execute('SELECT id,sha256 FROM documents'):
            file=target/'documents'/document['id']
            if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest()!=document['sha256']:
                raise RuntimeError('Document backup is incomplete')
    finally:
        db.close()


def restore(directory,destination):
    verify_backup(directory)
    target=Path(destination)
    if target.exists():
        raise RuntimeError('Restore requires a new, empty destination; production is never overwritten')
    shutil.copytree(directory,target)
    target.chmod(0o700)
    for path in target.rglob('*'):
        path.chmod(0o700 if path.is_dir() else 0o600)
    return target


def maintenance():
    db=get_db()
    with transaction():
        for task in rows("SELECT t.*,p.account_id FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.status!='approved' AND t.due_date<?",(date.today().isoformat(),)):
            notify(task['account_id'],'overdue_task',task['id'],'Une tâche a dépassé son échéance.')
        db.execute('DELETE FROM sessions WHERE expires_at<?',(now(),))
        db.execute('DELETE FROM tokens WHERE expires_at<?',(now(),))
        db.execute('DELETE FROM rate_limits WHERE resets_at<CAST(strftime(\'%s\',\'now\') AS INTEGER)')


def main():
    parser=argparse.ArgumentParser(description='Novalis OS operator tools')
    sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('migrate')
    bootstrap=sub.add_parser('bootstrap')
    bootstrap.add_argument('--email',required=True)
    bootstrap.add_argument('--name',default='Achraf Saidi')
    sub.add_parser('outbox-send')
    sub.add_parser('maintenance')
    b=sub.add_parser('backup');b.add_argument('--destination',required=True)
    r=sub.add_parser('restore');r.add_argument('--source',required=True);r.add_argument('--destination',required=True)
    sub.add_parser('check-backup').add_argument('--source',required=True)
    args=parser.parse_args()
    if args.command=='restore':
        restore(args.source,args.destination);print('Restore verified in the new destination.');return
    if args.command=='check-backup':
        verify_backup(args.source);print('Backup database and document integrity verified.');return
    app=create_app()
    with app.app_context():
        if args.command=='migrate':
            migrate(app.config['DATABASE']);print('Schema migrated.');return
        if args.command=='bootstrap':
            from .validation import email
            address=email({'email':args.email})
            password=getpass.getpass('Initial manager password (12+ characters): ')
            if getpass.getpass('Repeat password: ')!=password:
                raise RuntimeError('Passwords do not match')
            with transaction() as db:
                if db.execute("SELECT id FROM users WHERE role='manager'").fetchone():
                    raise RuntimeError('A manager already exists; use account invitations')
                db.execute('INSERT OR IGNORE INTO organisations VALUES(?,?)',(app.config['ORG_ID'],'Novalis AI'))
                db.execute("INSERT INTO users(id,org_id,name,email,role,status,password_hash,verified_at,created_at) VALUES(?,?,?,?,'manager','active',?,?,?)",
                           (uid(),app.config['ORG_ID'],args.name,address,hash_password(password),now(),now()))
            print('Manager created. MFA enrollment is required on first login.');return
        if args.command=='outbox-send':
            print(json.dumps(send_pending()));return
        if args.command=='maintenance':
            maintenance();print('Maintenance completed.');return
        if args.command=='backup':
            backup(app.config['DATABASE'],app.config['FILES_DIR'],args.destination)
            print('Database and documents backed up; integrity verified.')


if __name__=='__main__':
    main()
