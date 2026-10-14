"""Session, CSRF, password, encrypted token and TOTP primitives."""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import current_app, g, request, abort
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .db import get_db, now, row

SENSITIVE = {'manager', 'finance', 'sysadmin'}


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def encrypt(text):
    nonce = secrets.token_bytes(12)
    result = AESGCM(current_app.config['ENCRYPTION_KEY']).encrypt(nonce, text.encode(), b'novalis-os-v1')
    return base64.urlsafe_b64encode(nonce + result).decode()


def decrypt(cipher):
    value = base64.urlsafe_b64decode(cipher)
    return AESGCM(current_app.config['ENCRYPTION_KEY']).decrypt(value[:12], value[12:], b'novalis-os-v1').decode()


def hash_password(password):
    if not isinstance(password, str) or not 12 <= len(password) <= 256:
        abort(400, 'Choisissez un mot de passe de 12 à 256 caractères.')
    return generate_password_hash(password, method='scrypt:32768:8:1')


def password_matches(stored, candidate):
    return bool(stored) and isinstance(candidate, str) and len(candidate) <= 256 and check_password_hash(stored, candidate)


def expires(hours):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat(timespec='seconds')


def totp(secret, counter=None):
    counter = int(time.time()) // 30 if counter is None else counter
    key = base64.b32decode(secret + '=' * (-len(secret) % 8))
    value = hmac.new(key, struct.pack('>Q', counter), hashlib.sha1).digest()
    offset = value[-1] & 15
    number = (struct.unpack('>I', value[offset:offset+4])[0] & 0x7fffffff) % 1000000
    return str(number).zfill(6)


def verify_mfa(user, code):
    if not isinstance(code, str):
        return False
    if user['totp_cipher'] and len(code) == 6 and code.isdigit():
        secret = decrypt(user['totp_cipher'])
        step = int(time.time()) // 30
        for counter in [step-1, step, step+1]:
            if counter > user['totp_counter'] and hmac.compare_digest(totp(secret, counter), code):
                changed = get_db().execute('UPDATE users SET totp_counter=? WHERE id=? AND totp_counter<?',
                                          (counter, user['id'], counter)).rowcount
                return changed == 1
    used = get_db().execute('DELETE FROM recovery_codes WHERE user_id=? AND code_hash=?',
                           (user['id'], digest(code))).rowcount
    return used == 1


def rate_limit(name, maximum=8, seconds=900, identity=''):
    # The client cannot choose the bucket through an untrusted forwarding header.
    raw = f'{name}:{request.remote_addr}:{identity.lower()}'
    key = hmac.new(current_app.config['ENCRYPTION_KEY'], raw.encode(), hashlib.sha256).hexdigest()
    stamp = int(time.time())
    get_db().execute('''INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET
        count=CASE WHEN resets_at<=? THEN 1 ELSE count+1 END,
        resets_at=CASE WHEN resets_at<=? THEN excluded.resets_at ELSE resets_at END''',
                    (key, stamp+seconds, stamp, stamp))
    if row('SELECT count FROM rate_limits WHERE bucket=?', (key,))['count'] > maximum:
        abort(429, 'Trop de tentatives. Réessayez plus tard.')


def load_session():
    g.user = None
    g.session = None
    token = request.cookies.get(current_app.config['COOKIE_NAME'], '')
    if not token:
        return
    session = row('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?', (digest(token), now()))
    if not session:
        return
    user = row('SELECT * FROM users WHERE id=? AND status=?', (session['user_id'], 'active'))
    if user:
        g.user, g.session = user, session


def required(*roles, limited=False):
    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            if not g.user:
                abort(401, 'Connectez-vous pour continuer.')
            if g.session['limited'] and not limited:
                abort(403, 'Activez la double authentification pour accéder à cet espace.')
            if roles and g.user['role'] not in roles:
                abort(403, 'Vous ne disposez pas de cette autorisation.')
            return fn(*args, **kwargs)
        return wrapped
    return decorator


def check_request():
    if request.method not in {'POST', 'PUT', 'PATCH', 'DELETE'} or not request.path.startswith('/api/'):
        return
    origin = request.headers.get('Origin', '')
    allowed = set(current_app.config['PUBLIC_ORIGINS']) if request.path.startswith('/api/public/') else set()
    allowed.add(current_app.config['APP_ORIGIN'])
    if origin not in allowed:
        abort(403, 'Origine de la requête non autorisée.')
    if g.session and not request.path.startswith('/api/public/'):
        token = request.headers.get('X-CSRF-Token', '')
        if not token or not hmac.compare_digest(digest(token), g.session['csrf_hash']):
            abort(403, 'La session a expiré. Rechargez la page.')


def project_access(project_id, staff=False, finances=False):
    project = row('SELECT * FROM projects WHERE id=? AND org_id=?', (project_id, g.user['org_id']))
    if not project:
        abort(404, 'Projet introuvable.')
    role = g.user['role']
    allowed = role == 'manager' or (role == 'finance' and finances)
    allowed |= role == 'account' and project['account_id'] == g.user['id'] and not finances
    allowed |= role == 'developer' and not staff and not finances and bool(row(
        'SELECT 1 FROM project_members WHERE project_id=? AND user_id=?', (project_id, g.user['id'])))
    allowed |= role == 'client' and not staff and project['client_id'] == g.user['client_id']
    if not allowed:
        abort(404, 'Projet introuvable.')
    return project


def user_public(user):
    return {k: user[k] for k in ['id', 'name', 'email', 'role', 'status', 'client_id']}
