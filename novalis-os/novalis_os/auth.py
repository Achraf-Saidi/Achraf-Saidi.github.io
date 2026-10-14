import base64
import secrets
from urllib.parse import quote
from flask import Blueprint, current_app, g, jsonify, abort
from .db import get_db, row, rows, now, uid, transaction, audit
from .security import (digest, encrypt, decrypt, hash_password, password_matches, expires,
                       required, user_public, verify_mfa, totp, rate_limit, SENSITIVE)
from .validation import data, text, email, choice
from .outbox import queue_email

auth = Blueprint('auth', __name__)


def token_for(user, purpose):
    token = secrets.token_urlsafe(32)
    get_db().execute('INSERT INTO tokens VALUES(?,?,?,?,NULL,?)',
                     (digest(token), user['id'], purpose, expires(24 if purpose == 'invite' else 1), now()))
    link = current_app.config['APP_ORIGIN'] + '/os/#activate=' + token
    queue_email(user['email'], 'Novalis OS — activez votre accès' if purpose == 'invite' else 'Novalis OS — réinitialisation',
                f"Bonjour {user['name']},\n\nDéfinissez votre mot de passe personnel avec ce lien à usage unique :\n{link}\n\n"
                'Si vous n’avez pas demandé cet accès, ignorez ce message.\nNovalis AI',org_id=user.get('org_id'))


@auth.post('/api/auth/login')
def login():
    d = data()
    address = email(d)
    rate_limit('login-ip', 40)
    rate_limit('login-user', 8, identity=address)
    password = text(d, 'password', 256)
    with transaction() as db:
        user = row('SELECT * FROM users WHERE email=? AND status=?', (address, 'active'))
        stored = user['password_hash'] if user else current_app.config['DUMMY_HASH']
        if not password_matches(stored, password):
            abort(401, 'Identifiants ou code de vérification incorrects.')
        if user['totp_cipher'] and not verify_mfa(user, d.get('code', '')):
            abort(401, 'Identifiants ou code de vérification incorrects.')
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        limited = user['role'] in SENSITIVE and not user['totp_cipher']
        db.execute('INSERT INTO sessions VALUES(?,?,?,?,?,?)',
                   (digest(token), user['id'], digest(csrf), int(limited), expires(8), now()))
        audit('auth.login', user['id'])
    result = jsonify(user=user_public(user), csrf=csrf, mfa_required=bool(limited))
    result.set_cookie(current_app.config['COOKIE_NAME'], token, max_age=28800, httponly=True,
                      secure=current_app.config['SECURE_COOKIES'], samesite='Strict', path='/')
    return result


@auth.get('/api/session')
@required(limited=True)
def session():
    csrf = secrets.token_urlsafe(32)
    get_db().execute('UPDATE sessions SET csrf_hash=? WHERE token_hash=?', (digest(csrf), g.session['token_hash']))
    return jsonify(user=user_public(g.user), csrf=csrf, mfa_required=bool(g.session['limited']))


@auth.post('/api/auth/logout')
@required(limited=True)
def logout():
    get_db().execute('DELETE FROM sessions WHERE token_hash=?', (g.session['token_hash'],))
    result = jsonify(ok=True)
    result.delete_cookie(current_app.config['COOKIE_NAME'], path='/', secure=current_app.config['SECURE_COOKIES'], samesite='Strict')
    return result


@auth.get('/api/auth/sessions')
@required(limited=True)
def sessions():
    return jsonify(items=rows('SELECT created_at,expires_at,token_hash FROM sessions WHERE user_id=?', (g.user['id'],)))


@auth.post('/api/auth/revoke-sessions')
@required(limited=True)
def revoke_sessions():
    with transaction() as db:
        db.execute('DELETE FROM sessions WHERE user_id=? AND token_hash!=?', (g.user['id'], g.session['token_hash']))
        audit('auth.sessions_revoked', g.user['id'])
    return jsonify(ok=True)


@auth.post('/api/auth/mfa/setup')
@required(limited=True)
def mfa_setup():
    d = data()
    if not password_matches(g.user['password_hash'], d.get('password')):
        abort(401, 'Mot de passe incorrect.')
    if g.user['totp_cipher']:
        abort(409, 'La double authentification est déjà active.')
    secret = base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')
    get_db().execute('UPDATE users SET totp_pending=? WHERE id=?', (encrypt(secret), g.user['id']))
    return jsonify(secret=secret, uri=f"otpauth://totp/Novalis%20OS:{quote(g.user['email'])}?secret={secret}&issuer=Novalis%20OS")


@auth.post('/api/auth/mfa/confirm')
@required(limited=True)
def mfa_confirm():
    d = data()
    rate_limit('mfa-setup', 8)
    with transaction() as db:
        user = row('SELECT * FROM users WHERE id=?', (g.user['id'],))
        if not user['totp_pending'] or user['totp_cipher']:
            abort(409, 'Commencez par configurer la double authentification.')
        secret = decrypt(user['totp_pending'])
        counter = int(__import__('time').time()) // 30
        valid_counter = next((c for c in (counter-1, counter, counter+1) if
                              secrets.compare_digest(totp(secret, c), str(d.get('code', '')))), None)
        if valid_counter is None:
            abort(400, 'Code de vérification incorrect.')
        recovery = [secrets.token_hex(8) for _ in range(8)]
        db.execute('UPDATE users SET totp_cipher=totp_pending,totp_pending=NULL,totp_counter=? WHERE id=?',
                   (valid_counter, user['id']))
        db.executemany('INSERT INTO recovery_codes VALUES(?,?)', [(digest(c), user['id']) for c in recovery])
        db.execute('DELETE FROM sessions WHERE user_id=? AND token_hash!=?', (user['id'], g.session['token_hash']))
        db.execute('UPDATE sessions SET limited=0 WHERE token_hash=?', (g.session['token_hash'],))
        audit('auth.mfa_enabled', user['id'])
    return jsonify(ok=True, recovery_codes=recovery)


@auth.post('/api/auth/activate')
def activate():
    d = data()
    rate_limit('activate', 15)
    hashed = hash_password(d.get('password'))
    with transaction() as db:
        token = row('SELECT * FROM tokens WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?',
                    (digest(text(d, 'token', 100)), now()))
        if not token:
            abort(400, 'Ce lien est expiré ou a déjà été utilisé.')
        user = row('SELECT * FROM users WHERE id=?', (token['user_id'],))
        if user['status'] == 'suspended':
            abort(403, 'Ce compte est suspendu.')
        db.execute('UPDATE users SET password_hash=?,status=?,verified_at=? WHERE id=?',
                   (hashed, 'active', now(), user['id']))
        db.execute('UPDATE tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL', (now(), user['id']))
        db.execute('DELETE FROM sessions WHERE user_id=?', (user['id'],))
        audit('auth.password_set', user['id'], org_id=user['org_id'])
    return jsonify(ok=True)


@auth.post('/api/auth/reset')
def reset():
    d = data()
    address = email(d)
    rate_limit('reset', 5, identity=address)
    with transaction():
        user = row('SELECT * FROM users WHERE email=? AND status=?', (address, 'active'))
        if user:
            token_for(user, 'reset')
    return jsonify(message='Si cette adresse possède un accès actif, un e-mail sera préparé.'), 202


@auth.get('/api/users')
@required('manager', 'sysadmin')
def users():
    return jsonify(items=rows('SELECT id,name,email,role,status,client_id FROM users WHERE org_id=? ORDER BY name', (g.user['org_id'],)))


@auth.post('/api/users')
@required('manager', 'sysadmin')
def invite():
    d = data()
    role = choice(d, 'role', ['manager', 'account', 'developer', 'client', 'finance', 'sysadmin'])
    if g.user['role'] == 'sysadmin' and role in SENSITIVE:
        abort(403, 'Seule la direction attribue les rôles sensibles.')
    client_id = text(d, 'client_id', 40) if role == 'client' else None
    if client_id and not row('SELECT id FROM clients WHERE id=? AND org_id=?', (client_id, g.user['org_id'])):
        abort(400, 'Client invalide.')
    user = {'id': uid(), 'name': text(d, 'name'), 'email': email(d)}
    with transaction() as db:
        if row('SELECT id FROM users WHERE email=?', (user['email'],)):
            abort(409, 'Cette adresse possède déjà un compte.')
        db.execute('INSERT INTO users(id,org_id,client_id,name,email,role,created_at) VALUES(?,?,?,?,?,?,?)',
                   (user['id'], g.user['org_id'], client_id, user['name'], user['email'], role, now()))
        token_for(user, 'invite')
        audit('user.invited', user['id'], {'role': role})
    return jsonify(id=user['id'], invitation_status='queued'), 201


@auth.post('/api/users/<user_id>/status')
@required('manager', 'sysadmin')
def user_status(user_id):
    d = data()
    with transaction() as db:
        user = row('SELECT * FROM users WHERE id=? AND org_id=?', (user_id, g.user['org_id']))
        if not user:
            abort(404)
        if user_id == g.user['id'] or (g.user['role'] == 'sysadmin' and user['role'] in SENSITIVE):
            abort(403, 'Cette modification nécessite un autre gestionnaire habilité.')
        status = choice(d, 'status', ['active', 'suspended'])
        if status == 'active' and not user['password_hash']:
            abort(409, 'Le compte doit d’abord être activé par invitation.')
        db.execute('UPDATE users SET status=? WHERE id=?', (status, user_id))
        db.execute('DELETE FROM sessions WHERE user_id=?', (user_id,))
        audit('user.status', user_id, {'status': status})
    return jsonify(ok=True)
