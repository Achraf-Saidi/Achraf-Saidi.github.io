"""Private prospect tracking. Public responses never expose the original lead or staff notes."""
import base64
import hashlib
import hmac
import json
import re
import secrets
from datetime import datetime,timedelta,timezone
from flask import Blueprint,current_app,jsonify,abort,g
from .db import row,rows,now,transaction,uid,notify,audit
from .security import digest,rate_limit
from .security import required
from .validation import data,text,email
from .outbox import queue_email

intake=Blueprint('intake',__name__)
PUBLIC_STAGES={'new':'received','qualified':'reviewing','discovery':'contact','scoping':'reviewing',
               'proposal':'proposal','negotiation':'proposal','won':'project','lost':'closed'}

@intake.get('/api/leads/<lead_id>/tracking')
@required('manager','account')
def internal_tracking(lead_id):
    from .crm import lead_access
    lead_access(lead_id)
    item=row('SELECT reference,expires_at FROM lead_intake WHERE lead_id=?',(lead_id,))
    return jsonify(
        tracking=item,
        events=rows('SELECT status,created_at FROM lead_public_events WHERE lead_id=? ORDER BY id',(lead_id,)) if item else [],
        messages=rows('SELECT id,author_type,body,created_at FROM lead_public_messages WHERE lead_id=? ORDER BY id',(lead_id,)) if item else [],
    )

def track_transition(lead_id,stage):
    if not row('SELECT lead_id FROM lead_intake WHERE lead_id=?',(lead_id,)):return
    state=PUBLIC_STAGES[stage]
    previous=row('SELECT status FROM lead_public_events WHERE lead_id=? ORDER BY id DESC LIMIT 1',(lead_id,))
    if not previous or previous['status']!=state:
        from .db import get_db
        get_db().execute('INSERT INTO lead_public_events(lead_id,status,created_at) VALUES(?,?,?)',(lead_id,state,now()))

def access_token(lead_id,key):
    raw=hmac.new(current_app.config['ENCRYPTION_KEY'],('novalis-intake-v1:'+lead_id+':'+key).encode(),hashlib.sha256).digest()
    return base64.urlsafe_b64encode(raw).decode().rstrip('=')

def accept_contact(d):
    # Validate before hashing. The browser's durable request key makes a network retry safe.
    key=d.get('request_id') or secrets.token_hex(16)
    if not isinstance(key,str) or not re.fullmatch(r'[A-Za-z0-9_-]{16,64}',key):abort(400,'Identifiant de demande invalide.')
    clean=dict(name=text(d,'name',100),email=email(d),company=text(d,'company',200,0,''),category=text(d,'category',200),
               description=text(d,'description',4000,10),budget=text(d,'budget',200,0,''),horizon=text(d,'horizon',200,0,''))
    slot_id=text(d,'slot_id',40,0,'')
    clean['slot_id']=slot_id
    payload=digest(json.dumps(clean,sort_keys=True,ensure_ascii=False));request_hash=digest(key)
    with transaction() as db:
        existing=row('SELECT * FROM lead_intake WHERE request_key_hash=?',(request_hash,))
        if existing:
            if not hmac.compare_digest(existing['payload_hash'],payload):abort(409,'Cette demande a déjà été envoyée avec un autre contenu.')
            if existing['expires_at']<=now():abort(409,'Cette ancienne demande existe déjà. Contactez votre interlocuteur.')
            lead_id=existing['lead_id'];token=access_token(lead_id,key)
            if not hmac.compare_digest(digest(token),existing['access_hash']):abort(409,'Utilisez le lien personnel déjà reçu pour cette demande.')
            meeting=row('SELECT m.id,m.status,s.starts_at,s.ends_at FROM meetings m JOIN slots s ON s.id=m.slot_id WHERE m.lead_id=?',(lead_id,))
            return dict(id=lead_id,received=True,reference=existing['reference'],tracking_token=token,tracking_expires_at=existing['expires_at'],email_status='queued',booking=meeting),200
        slot=None
        if slot_id:
            slot=row('SELECT * FROM slots WHERE id=? AND org_id=? AND active=1 AND starts_at>?',(slot_id,current_app.config['ORG_ID'],now()))
            if not slot or row("SELECT id FROM meetings WHERE slot_id=? AND status='reserved'",(slot_id,)):
                abort(409,'Ce créneau n’est plus disponible. Choisissez un autre horaire.')
            if datetime.fromisoformat(slot['ends_at'])-datetime.fromisoformat(slot['starts_at'])!=timedelta(hours=1):
                abort(409,'Ce créneau ne correspond pas à un échange d’une heure.')
        from .crm import create_lead
        lead_id=create_lead(clean,current_app.config['ORG_ID']);token=access_token(lead_id,key)
        reference='NV-'+datetime.now(timezone.utc).strftime('%y')+'-'+secrets.token_hex(4).upper()
        while row('SELECT lead_id FROM lead_intake WHERE reference=?',(reference,)):
            reference='NV-'+datetime.now(timezone.utc).strftime('%y')+'-'+secrets.token_hex(4).upper()
        expiry=(datetime.now(timezone.utc)+timedelta(days=90)).isoformat(timespec='seconds')
        db.execute('INSERT INTO lead_intake VALUES(?,?,?,?,?,?,?)',(lead_id,reference,digest(token),request_hash,payload,now(),expiry))
        track_transition(lead_id,'new')
        meeting=None
        if slot:
            meeting_id,cancel=uid(),secrets.token_urlsafe(32)
            db.execute('INSERT INTO meetings(id,org_id,lead_id,slot_id,cancel_hash,created_at) VALUES(?,?,?,?,?,?)',(meeting_id,slot['org_id'],lead_id,slot_id,digest(cancel),now()))
            db.execute("UPDATE leads SET owner_id=?,status='discovery' WHERE id=?",(slot['owner_id'],lead_id))
            track_transition(lead_id,'discovery')
            queue_email(clean['email'],'Novalis AI — échange d’une heure réservé',
                        'Votre échange est réservé le '+slot['starts_at']+' (UTC). Annuler ou reporter : '+current_app.config['APP_ORIGIN']+'/os/#booking='+cancel,org_id=slot['org_id'])
            notify(slot['owner_id'],'meeting',meeting_id,'Un échange d’une heure a été réservé depuis la vitrine.')
            meeting=dict(id=meeting_id,status='reserved',starts_at=slot['starts_at'],ends_at=slot['ends_at'])
        # The token is returned only over HTTPS. Do not place it in logs or an unencrypted outbox.
        queue_email(clean['email'],'Novalis AI — demande '+reference,
                    'Bonjour,\n\nVotre demande '+reference+' est enregistrée. Notre équipe vous recontactera pour organiser un premier échange d’une heure, offert et sans engagement. Conservez le lien privé affiché après votre envoi pour consulter son statut.\n\nNovalis AI',org_id=current_app.config['ORG_ID'])
    return dict(id=lead_id,received=True,reference=reference,tracking_token=token,tracking_expires_at=expiry,email_status='queued',booking=meeting),201

@intake.post('/api/public/request-status')
def request_status():
    rate_limit('request-status',30,300)
    token=text(data(),'token',100,1)
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}',token):abort(404,'Lien de suivi introuvable ou expiré.')
    item=row('SELECT i.* FROM lead_intake i JOIN leads l ON l.id=i.lead_id WHERE i.access_hash=? AND i.expires_at>? AND l.org_id=?',
             (digest(token),now(),current_app.config['ORG_ID']))
    if not item:abort(404,'Lien de suivi introuvable ou expiré.')
    events=rows('SELECT status,created_at FROM lead_public_events WHERE lead_id=? ORDER BY id',(item['lead_id'],))
    messages=rows('SELECT id,author_type,body,created_at FROM lead_public_messages WHERE lead_id=? ORDER BY id',(item['lead_id'],))
    result=jsonify(reference=item['reference'],status=events[-1]['status'],events=events,messages=messages,expires_at=item['expires_at'],
                   portal_url=current_app.config['APP_ORIGIN']+'/os/' if events[-1]['status']=='project' else None)
    result.headers['Cache-Control']='no-store, private'
    return result

@intake.post('/api/public/request-lookup')
def request_lookup():
    """Reference plus contact address reveals only a coarse, read-only stage.

    This is deliberately not recovery of the bearer token or account access.
    The full history, dates, project identifiers and all lead content stay private.
    Existing references work without a database change or an email provider.
    """
    rate_limit('request-lookup',8,900)
    d=data()
    reference=text(d,'reference',24).upper()
    address=email(d)
    if not re.fullmatch(r'NV-\d{2}-[A-F0-9]{8}',reference):
        abort(404,'Demande introuvable. Vérifiez la référence et l’adresse e-mail.')
    item=row('''SELECT i.reference,e.status FROM lead_intake i
        JOIN leads l ON l.id=i.lead_id
        JOIN lead_public_events e ON e.id=(SELECT MAX(id) FROM lead_public_events WHERE lead_id=i.lead_id)
        WHERE i.reference=? AND l.email=? AND l.org_id=?''',
        (reference,address,current_app.config['ORG_ID']))
    if not item:abort(404,'Demande introuvable. Vérifiez la référence et l’adresse e-mail.')
    result=jsonify(reference=item['reference'],status=item['status'])
    result.headers['Cache-Control']='no-store, private'
    return result


@intake.post('/api/leads/<lead_id>/tracking/messages')
@required('manager','account')
def publish_message(lead_id):
    """Deliberately public message; scoping notes, estimates and offers stay private."""
    from .crm import lead_access
    lead=lead_access(lead_id)
    if not row('SELECT lead_id FROM lead_intake WHERE lead_id=?',(lead_id,)):
        abort(404,'Cette demande ne possède pas de suivi public.')
    body=text(data(),'body',4000,1)
    rate_limit('tracking-staff-message',40,3600,identity=lead_id)
    with transaction() as db:
        item=db.execute(
            "INSERT INTO lead_public_messages(lead_id,author_type,author_id,body,created_at) VALUES(?,'staff',?,?,?)",
            (lead_id,g.user['id'],body,now()))
        audit('lead.public_message_sent',lead_id,{'message_id':item.lastrowid})
        # Never email the bearer token or confidential text.
        queue_email(lead['email'],'Novalis AI — nouveau message pour votre demande',
                    'Bonjour,\n\nNotre équipe a publié un message sur le suivi de votre demande. '
                    'Consultez le lien privé reçu lors de votre prise de contact.\n\nNovalis AI',
                    org_id=lead['org_id'])
    return jsonify(id=item.lastrowid,notification_status='queued'),201


@intake.post('/api/public/request-message')
def public_message():
    """The secret link grants reply access; reference + email alone never does."""
    d=data()
    token=text(d,'token',100,1)
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}',token):
        abort(404,'Lien de suivi introuvable ou expiré.')
    item=row('''SELECT i.lead_id,l.org_id,l.owner_id
        FROM lead_intake i JOIN leads l ON l.id=i.lead_id
        WHERE i.access_hash=? AND i.expires_at>? AND l.org_id=?''',
        (digest(token),now(),current_app.config['ORG_ID']))
    if not item:
        abort(404,'Lien de suivi introuvable ou expiré.')
    body=text(d,'body',4000,1)
    rate_limit('tracking-prospect-message',8,3600,identity=item['lead_id'])
    with transaction() as db:
        message=db.execute(
            "INSERT INTO lead_public_messages(lead_id,author_type,author_id,body,created_at) VALUES(?,'prospect',NULL,?,?)",
            (item['lead_id'],body,now()))
        recipients=rows("SELECT id FROM users WHERE org_id=? AND role='manager' AND status='active'",(item['org_id'],))
        if item['owner_id'] and item['owner_id'] not in {u['id'] for u in recipients}:
            assigned=row("SELECT id FROM users WHERE id=? AND org_id=? AND status='active'",(item['owner_id'],item['org_id']))
            if assigned:recipients.append(assigned)
        for person in recipients:
            notify(person['id'],'lead_message',item['lead_id'],'Nouveau message dans le suivi d’une demande.')
        audit('lead.public_message_received',item['lead_id'],{'message_id':message.lastrowid},org_id=item['org_id'])
    result=jsonify(id=message.lastrowid,received=True)
    result.headers['Cache-Control']='no-store, private'
    return result,201
