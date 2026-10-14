"""Request-scoped SQLite connections and versioned initial migration."""
import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from flask import current_app, g


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def uid():
    return uuid.uuid4().hex


def connect(path):
    connection = sqlite3.connect(path, timeout=10, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    connection.execute('PRAGMA busy_timeout=10000')
    return connection


def get_db():
    if 'db' not in g:
        g.db = connect(current_app.config['DATABASE'])
    return g.db


def close_db(_error=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def migrate(path):
    target=Path(path)
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    target.touch(mode=0o600, exist_ok=True)
    target.chmod(0o600)
    db = connect(path)
    try:
        db.execute('PRAGMA journal_mode=WAL')
        schema = Path(__file__).with_name('schema.sql').read_text()
        schema += '\n'+Path(__file__).with_name('payment-schema.sql').read_text()
        schema += '\n'+Path(__file__).with_name('workspace-schema.sql').read_text()
        db.executescript('BEGIN IMMEDIATE;\n' + schema + '\nCOMMIT;')
        db.execute('INSERT OR IGNORE INTO migrations VALUES(1,?)', (now(),))
        db.execute('INSERT OR IGNORE INTO migrations VALUES(2,?)', (now(),))
        db.execute('INSERT OR IGNORE INTO migrations VALUES(3,?)', (now(),))
    finally:
        db.close()


@contextmanager
def transaction():
    db = get_db()
    db.execute('BEGIN IMMEDIATE')
    try:
        yield db
        db.execute('COMMIT')
    except Exception:
        db.execute('ROLLBACK')
        raise


def row(sql, values=()):
    result = get_db().execute(sql, values).fetchone()
    return dict(result) if result is not None else None


def rows(sql, values=()):
    return [dict(r) for r in get_db().execute(sql, values).fetchall()]


def audit(action, entity_id, detail=None, org_id=None):
    user = getattr(g, 'user', None)
    org = org_id or (user['org_id'] if user else current_app.config['ORG_ID'])
    get_db().execute('INSERT INTO audit(org_id,actor_id,action,entity_id,detail,created_at) VALUES(?,?,?,?,?,?)',
                     (org, user['id'] if user else None, action, entity_id, json.dumps(detail or {}), now()))


def notify(user_id, kind, entity, title):
    get_db().execute('INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,0,?)',
                     (uid(), user_id, kind, entity, title, now()))
