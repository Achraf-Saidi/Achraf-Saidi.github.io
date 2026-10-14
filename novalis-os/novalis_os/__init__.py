import base64
import os
import secrets
import sqlite3
from pathlib import Path
from flask import Flask, request, jsonify, g, send_from_directory, abort
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix
from .db import close_db, get_db, migrate, row, rows
from .security import load_session, check_request, required


def create_app(overrides=None):
    app = Flask(__name__)
    mode = os.environ.get('NOVALIS_MODE','production')
    data_dir = Path(os.environ.get('NOVALIS_DATA_DIR','/var/lib/novalis-os'))
    key = os.environ.get('NOVALIS_ENCRYPTION_KEY','')
    app.config.update(
        MODE=mode, ORG_ID=os.environ.get('NOVALIS_ORG_ID','novalis'), DATABASE=str(data_dir/'novalis.sqlite3'),
        FILES_DIR=str(data_dir/'documents'), APP_ORIGIN=os.environ.get('NOVALIS_APP_ORIGIN','https://app.novalisai.com'),
        PUBLIC_ORIGINS=os.environ.get('NOVALIS_PUBLIC_ORIGINS','https://www.novalisai.com,https://novalisai.com,https://achraf-saidi.github.io').split(','),
        ENCRYPTION_KEY=base64.urlsafe_b64decode(key) if key else None,
        SECURE_COOKIES=mode!='development', COOKIE_NAME='__Host-novalis_session' if mode!='development' else 'novalis_session',
        MAX_CONTENT_LENGTH=7*1024*1024, SMTP_HOST=os.environ.get('NOVALIS_SMTP_HOST',''),
        SMTP_PORT=int(os.environ.get('NOVALIS_SMTP_PORT','587')), SMTP_FROM=os.environ.get('NOVALIS_SMTP_FROM','contact@novalisai.com'),
        SMTP_USER=os.environ.get('NOVALIS_SMTP_USER',''), SMTP_PASSWORD=os.environ.get('NOVALIS_SMTP_PASSWORD',''),
        MAIL_ENABLED=os.environ.get('NOVALIS_MAIL_ENABLED')=='true', JSON_SORT_KEYS=False,
        TRUST_PROXY=os.environ.get('NOVALIS_TRUST_PROXY')=='true',
    )
    if overrides:
        app.config.update(overrides)
    if app.config.get('TESTING'):
        app.config['ENCRYPTION_KEY'] = app.config['ENCRYPTION_KEY'] or secrets.token_bytes(32)
        migrate(app.config['DATABASE'])
    if not app.config['ENCRYPTION_KEY'] or len(app.config['ENCRYPTION_KEY'])!=32:
        raise RuntimeError('NOVALIS_ENCRYPTION_KEY must be a securely generated 32-byte base64 key.')
    if app.config['MODE']=='production' and (not app.config['APP_ORIGIN'].startswith('https://') or not app.config['SECURE_COOKIES']):
        raise RuntimeError('Production requires HTTPS and secure host-only cookies.')
    app.config['DUMMY_HASH'] = generate_password_hash(secrets.token_urlsafe(20),method='scrypt:32768:8:1')
    if app.config['TRUST_PROXY']:
        # Enable only with exactly one trusted reverse proxy and an unexposed backend port.
        app.wsgi_app = ProxyFix(app.wsgi_app,x_for=1,x_proto=1,x_host=0,x_port=0,x_prefix=0)
    app.teardown_appcontext(close_db)

    @app.before_request
    def protect():
        load_session()
        check_request()
        if request.path.startswith('/api/') and request.is_json and request.content_length and request.content_length>32768:
            abort(413,'La demande dépasse la taille autorisée.')

    @app.after_request
    def headers(response):
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['Referrer-Policy']='same-origin'
        response.headers['X-Frame-Options']='DENY'
        response.headers['Permissions-Policy']='camera=(), microphone=(), geolocation=()'
        response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
        response.headers['X-Robots-Tag']='noindex, nofollow'
        if app.config['MODE']=='production':
            response.headers['Strict-Transport-Security']='max-age=31536000'
        if request.path.startswith('/api/') or request.path.startswith('/os/'):
            response.headers['Cache-Control']='no-store'
        origin=request.headers.get('Origin')
        if request.path.startswith('/api/public/') and origin in app.config['PUBLIC_ORIGINS']:
            response.headers['Access-Control-Allow-Origin']=origin
            response.headers['Vary']='Origin'
            response.headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS'
            response.headers['Access-Control-Allow-Headers']='Content-Type'
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(error=error.description),error.code

    @app.errorhandler(sqlite3.IntegrityError)
    def conflict(_error):
        return jsonify(error='Cette opération entre en conflit avec une donnée existante.'),409

    @app.errorhandler(Exception)
    def failure(error):
        if app.config.get('TESTING'):
            raise error
        app.logger.error('Unhandled application error: %s',type(error).__name__)
        return jsonify(error='Une erreur est survenue. Réessayez ou contactez votre interlocuteur.'),500

    @app.get('/healthz')
    def health():
        try:
            get_db().execute('SELECT 1')
            configured=bool(row('SELECT id FROM organisations WHERE id=?',(app.config['ORG_ID'],)))
            return jsonify(status='ok' if configured else 'not_configured'),200 if configured else 503
        except sqlite3.Error:
            return jsonify(status='unavailable'),503

    @app.get('/')
    @app.get('/os/')
    def index():
        return send_from_directory(Path(__file__).parent.parent/'web','index.html')

    @app.get('/os/<path:filename>')
    def web_asset(filename):
        if filename not in {'app.js','app.css'}:
            abort(404)
        return send_from_directory(Path(__file__).parent.parent/'web',filename)

    @app.get('/brand/<path:filename>')
    def brand(filename):
        if filename not in {'logo.webp','N_novalis.png','manrope-latin.woff2','instrument-serif-latin.woff2'}:
            abort(404)
        return send_from_directory(Path(__file__).parent.parent.parent/'novalisai/assets',filename)

    @app.get('/robots.txt')
    def robots():
        return 'User-agent: *\nDisallow: /\n',200,{'Content-Type':'text/plain'}

    @app.get('/api/audit')
    @required('manager')
    def audit_log():
        return jsonify(items=rows('SELECT id,actor_id,action,entity_id,detail,created_at FROM audit WHERE org_id=? ORDER BY id DESC LIMIT 200',(g.user['org_id'],)))

    @app.get('/api/integrations')
    @required('manager','sysadmin')
    def integrations():
        return jsonify(email='configured' if app.config['SMTP_HOST'] and app.config['MAIL_ENABLED'] else 'not_configured',
                       calendar='internal',online_payment='not_configured',peppol='external_registration_only',
                       outbox=rows('SELECT id,subject,status,attempts,created_at,last_error FROM outbox WHERE org_id=? ORDER BY created_at DESC LIMIT 100',(g.user['org_id'],)))

    from .auth import auth
    from .crm import crm
    from .projects import projects
    from .finance import finance
    from .documents import documents
    for blueprint in [auth,crm,projects,finance,documents]:
        app.register_blueprint(blueprint)
    return app
