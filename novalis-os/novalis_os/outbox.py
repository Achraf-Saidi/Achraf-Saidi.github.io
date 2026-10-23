"""Transactional SMTP outbox. No SMTP configuration means nothing is sent."""
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from flask import current_app, g
from .db import get_db, uid, now, row, transaction
from .security import encrypt, decrypt


def queue_email(recipient, subject, body, org_id=None):
    user=getattr(g,'user',None)
    org_id=org_id or (user['org_id'] if user else current_app.config['ORG_ID'])
    # Synthetic demo tenant is never allowed to send real e-mail or invitations.
    if org_id == 'novalis-demo':
        return
    get_db().execute('INSERT INTO outbox(id,org_id,recipient,subject,body_cipher,created_at) VALUES(?,?,?,?,?,?)',
                     (uid(), org_id, recipient, subject, encrypt(body), now()))


def send_pending(limit=20):
    config = current_app.config
    if not config.get('SMTP_HOST') or not config.get('MAIL_ENABLED'):
        return {'sent': 0, 'enabled': False}
    stale = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(timespec='seconds')
    sent = 0
    for _ in range(limit):
        with transaction() as db:
            # A previous process may have died after its lease was acquired.
            db.execute("UPDATE outbox SET status='queued' WHERE status='sending' AND lease_at<?", (stale,))
            message = row("SELECT * FROM outbox WHERE status IN ('queued','failed') AND attempts<5 ORDER BY created_at LIMIT 1")
            if not message:
                break
            db.execute("UPDATE outbox SET status='sending',attempts=attempts+1,lease_at=? WHERE id=?", (now(), message['id']))
        mail = EmailMessage()
        mail['From'] = config['SMTP_FROM']
        mail['To'] = message['recipient']
        mail['Subject'] = message['subject']
        mail['Message-ID'] = f"<{message['id']}@novalisai.com>"
        mail.set_content(decrypt(message['body_cipher']))
        try:
            with smtplib.SMTP(config['SMTP_HOST'], config['SMTP_PORT'], timeout=20) as server:
                server.starttls(context=ssl.create_default_context())
                if config.get('SMTP_USER'):
                    server.login(config['SMTP_USER'], config['SMTP_PASSWORD'])
                server.send_message(mail)
            get_db().execute("UPDATE outbox SET status='sent',sent_at=?,body_cipher=?,last_error='' WHERE id=?",
                             (now(), encrypt('Message transmis.'), message['id']))
            sent += 1
        except Exception as exc:
            # Never log message bodies, invitation tokens or SMTP credentials.
            get_db().execute("UPDATE outbox SET status='failed',last_error=? WHERE id=?",
                             (type(exc).__name__, message['id']))
    return {'sent': sent, 'enabled': True}
