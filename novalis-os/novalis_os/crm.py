import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, g, current_app, jsonify, abort, request
from .db import get_db, row, rows, uid, now, transaction, audit, notify
from .security import required, digest, rate_limit
from .validation import data, text, email, choice, integer, instant, day
from .outbox import queue_email

crm = Blueprint('crm', __name__)
STAGES = ['new', 'qualified', 'discovery', 'scoping', 'proposal', 'negotiation', 'won', 'lost']


def create_lead(d, org_id):
    values = [uid(), org_id, text(d, 'name', 100), email(d), text(d, 'company', 200, 0, ''),
              text(d, 'category', 200), text(d, 'description', 4000, 10), text(d, 'budget', 200, 0, ''),
              text(d, 'horizon', 200, 0, ''), now()]
    get_db().execute('INSERT INTO leads(id,org_id,name,email,company,category,description,budget,horizon,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)', values)
    for user in rows("SELECT id FROM users WHERE org_id=? AND role='manager' AND status='active'", (org_id,)):
        notify(user['id'], 'lead', values[0], 'Une nouvelle demande de projet est arrivée.')
    audit('lead.created', values[0], org_id=org_id)
    return values[0]


def lead_access(lead_id):
    lead = row('SELECT * FROM leads WHERE id=? AND org_id=?', (lead_id, g.user['org_id']))
    if not lead or (g.user['role'] == 'account' and lead['owner_id'] != g.user['id']):
        abort(404, 'Demande introuvable.')
    return lead


@crm.post('/api/public/contact')
def contact():
    d = data()
    rate_limit('contact', 5, 3600)
    if d.get('website') or d.get('consent') is not True:
        abort(400, 'Vérifiez les informations du formulaire.')
    with transaction():
        lead_id = create_lead(d, current_app.config['ORG_ID'])
        queue_email(email(d), 'Novalis AI — votre demande est enregistrée',
                    'Bonjour,\n\nVotre demande a bien été enregistrée par Novalis AI. Nous reviendrons vers vous pour organiser notre premier échange d’une heure, offert et sans engagement.\n\nNovalis AI',org_id=current_app.config['ORG_ID'])
    return jsonify(id=lead_id, received=True, email_status='queued'), 201


@crm.get('/api/public/slots')
def public_slots():
    rate_limit('slots', 120, 3600)
    return jsonify(items=rows('''SELECT s.id,s.starts_at,s.ends_at FROM slots s WHERE s.org_id=?
        AND s.active=1 AND s.starts_at>? AND NOT EXISTS(SELECT 1 FROM meetings m WHERE m.slot_id=s.id AND m.status='reserved')
        ORDER BY s.starts_at LIMIT 60''', (current_app.config['ORG_ID'], now())), timezone='Europe/Brussels')


@crm.post('/api/public/bookings')
def booking():
    d = data()
    rate_limit('bookings', 5, 3600)
    if d.get('consent') is not True or d.get('website'):
        abort(400, 'Vérifiez les informations du formulaire.')
    with transaction() as db:
        slot = row('SELECT * FROM slots WHERE id=? AND org_id=? AND active=1 AND starts_at>?',
                   (text(d, 'slot_id', 40), current_app.config['ORG_ID'], now()))
        if not slot or row("SELECT id FROM meetings WHERE slot_id=? AND status='reserved'", (slot['id'],)):
            abort(409, 'Ce créneau vient d’être réservé. Choisissez-en un autre.')
        lead_id = create_lead(d, slot['org_id'])
        db.execute("UPDATE leads SET owner_id=?,status='discovery' WHERE id=?", (slot['owner_id'], lead_id))
        meeting_id, token = uid(), secrets.token_urlsafe(32)
        db.execute('INSERT INTO meetings(id,org_id,lead_id,slot_id,cancel_hash,created_at) VALUES(?,?,?,?,?,?)',
                   (meeting_id, slot['org_id'], lead_id, slot['id'], digest(token), now()))
        link = current_app.config['APP_ORIGIN'] + '/os/#booking=' + token
        queue_email(email(d), 'Novalis AI — rendez-vous d’une heure réservé',
                    f"Bonjour,\n\nVotre rendez-vous est réservé le {slot['starts_at']} (UTC).\n"
                    f"Pour annuler ou reporter : {link}\n\nVotre interlocuteur vous transmettra les informations de connexion.\nNovalis AI",org_id=slot['org_id'])
        notify(slot['owner_id'], 'meeting', meeting_id, 'Un rendez-vous de découverte a été réservé.')
        audit('meeting.booked', meeting_id, org_id=slot['org_id'])
    # Cancellation links are delivered only through the encrypted email outbox.
    return jsonify(id=meeting_id, starts_at=slot['starts_at'], ends_at=slot['ends_at'], email_status='queued'), 201


@crm.post('/api/public/bookings/cancel')
def cancel_booking():
    d = data()
    rate_limit('cancel', 20, 3600)
    with transaction() as db:
        meeting = row("SELECT * FROM meetings WHERE cancel_hash=? AND status='reserved'", (digest(text(d, 'token', 100)),))
        if not meeting:
            abort(400, 'Ce lien est expiré ou le rendez-vous a déjà été annulé.')
        db.execute("UPDATE meetings SET status='cancelled' WHERE id=?", (meeting['id'],))
        audit('meeting.cancelled', meeting['id'], org_id=meeting['org_id'])
    return jsonify(ok=True)


@crm.post('/api/public/bookings/reschedule')
def reschedule_booking():
    d = data()
    rate_limit('reschedule', 10, 3600)
    with transaction() as db:
        meeting = row("SELECT * FROM meetings WHERE cancel_hash=? AND status='reserved'", (digest(text(d, 'token', 100)),))
        slot = row('SELECT * FROM slots WHERE id=? AND org_id=? AND active=1 AND starts_at>?',
                   (text(d, 'slot_id', 40), current_app.config['ORG_ID'], now()))
        if not meeting or not slot or meeting['org_id'] != slot['org_id']:
            abort(400, 'Rendez-vous ou créneau invalide.')
        if row("SELECT id FROM meetings WHERE slot_id=? AND status='reserved'", (slot['id'],)):
            abort(409, 'Ce créneau n’est plus disponible.')
        db.execute('UPDATE meetings SET slot_id=? WHERE id=?', (slot['id'], meeting['id']))
        db.execute('UPDATE leads SET owner_id=? WHERE id=?', (slot['owner_id'], meeting['lead_id']))
        lead = row('SELECT email FROM leads WHERE id=?', (meeting['lead_id'],))
        queue_email(lead['email'], 'Novalis AI — rendez-vous déplacé', f"Votre nouvel horaire : {slot['starts_at']} (UTC).\nNovalis AI",org_id=slot['org_id'])
        notify(slot['owner_id'], 'rescheduled', meeting['id'], 'Un rendez-vous a été reporté.')
        audit('meeting.rescheduled', meeting['id'], org_id=slot['org_id'])
    return jsonify(ok=True, starts_at=slot['starts_at'])


@crm.get('/api/leads')
@required('manager', 'account')
def leads():
    sql = 'SELECT * FROM leads WHERE org_id=?'
    values = [g.user['org_id']]
    if g.user['role'] == 'account':
        sql += ' AND owner_id=?'
        values.append(g.user['id'])
    return jsonify(items=rows(sql+' ORDER BY created_at DESC', values), stages=STAGES)


@crm.post('/api/leads')
@required('manager')
def new_lead():
    with transaction():
        lead_id = create_lead(data(), g.user['org_id'])
    return jsonify(id=lead_id), 201


@crm.patch('/api/leads/<lead_id>')
@required('manager', 'account')
def edit_lead(lead_id):
    d = data()
    with transaction() as db:
        lead = lead_access(lead_id)
        stage = choice(d, 'status', STAGES, lead['status'])
        if lead['status'] == 'won' or stage == 'won':
            abort(409, 'Utilisez la conversion en projet pour gagner cette opportunité.')
        owner = d.get('owner_id', lead['owner_id'])
        if owner != lead['owner_id']:
            if g.user['role'] != 'manager':
                abort(403)
            if not row("SELECT id FROM users WHERE id=? AND org_id=? AND role IN ('manager','account') AND status='active'", (owner, g.user['org_id'])):
                abort(400, 'Responsable invalide.')
        version = integer(d, 'version', 1)
        changed = db.execute('UPDATE leads SET status=?,scoping_note=?,loss_reason=?,owner_id=?,version=version+1 WHERE id=? AND version=?',
                             (stage, text(d, 'scoping_note', 10000, 0, lead['scoping_note']),
                              text(d, 'loss_reason', 1000, 0, lead['loss_reason']), owner, lead_id, version)).rowcount
        if not changed:
            abort(409, 'Cette fiche a été modifiée. Rechargez-la.')
        audit('lead.updated', lead_id, {'status': stage})
    return jsonify(ok=True, version=version+1)


@crm.post('/api/leads/<lead_id>/send-note')
@required('manager', 'account')
def send_note(lead_id):
    with transaction():
        lead = lead_access(lead_id)
        if not lead['scoping_note']:
            abort(400, 'Rédigez une note de cadrage avant de l’envoyer.')
        queue_email(lead['email'], 'Novalis AI — première note de cadrage', lead['scoping_note'])
        audit('lead.note_queued', lead_id)
    return jsonify(email_status='queued'), 202


@crm.get('/api/clients')
@required('manager', 'finance', 'account')
def clients():
    sql = 'SELECT * FROM clients WHERE org_id=?'
    values = [g.user['org_id']]
    if g.user['role'] == 'account':
        sql += ' AND id IN (SELECT client_id FROM projects WHERE account_id=?)'
        values.append(g.user['id'])
    return jsonify(items=rows(sql+' ORDER BY name', values))


@crm.post('/api/clients')
@required('manager')
def new_client():
    d = data()
    client_id = uid()
    with transaction() as db:
        db.execute('INSERT INTO clients VALUES(?,?,?,?,?,?)',
                   (client_id, g.user['org_id'], text(d, 'name'), email(d), text(d, 'company_number', 40, 0, ''), now()))
        audit('client.created', client_id)
    return jsonify(id=client_id), 201


@crm.post('/api/leads/<lead_id>/convert')
@required('manager')
def convert(lead_id):
    d = data()
    with transaction() as db:
        lead = lead_access(lead_id)
        if lead['status'] not in {'proposal', 'negotiation'} or lead['version'] != integer(d, 'version', 1):
            abort(409, 'La proposition doit être acceptée et la fiche à jour avant conversion.')
        if d.get('accepted') is not True:
            abort(400, 'Confirmez l’accord commercial obtenu.')
        client_id, project_id = uid(), uid()
        db.execute('INSERT INTO clients VALUES(?,?,?,?,?,?)',
                   (client_id, g.user['org_id'], lead['company'] or lead['name'], lead['email'], text(d, 'company_number', 40, 0, ''), now()))
        account_id = text(d, 'account_id', 40)
        if not row("SELECT id FROM users WHERE id=? AND org_id=? AND role IN ('manager','account') AND status='active'", (account_id, g.user['org_id'])):
            abort(400, 'Responsable invalide.')
        db.execute('INSERT INTO projects(id,org_id,client_id,lead_id,account_id,name,scope,budget_cents,due_date,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
                   (project_id, g.user['org_id'], client_id, lead_id, account_id, text(d, 'name'),
                    text(d, 'scope', 10000), integer(d, 'budget_cents'), day(d, 'due_date'), now()))
        db.execute("UPDATE leads SET status='won',version=version+1 WHERE id=?", (lead_id,))
        notify(account_id, 'project', project_id, 'Un nouveau projet vous est confié.')
        audit('lead.converted', lead_id, {'project_id': project_id})
    return jsonify(id=project_id, client_id=client_id), 201


@crm.get('/api/calendar')
@required('manager', 'account')
def calendar():
    values = [g.user['org_id']]
    suffix = ''
    if g.user['role'] == 'account':
        suffix = ' AND s.owner_id=?'
        values.append(g.user['id'])
    return jsonify(items=rows('''SELECT s.id,s.starts_at,s.ends_at,s.owner_id,m.id AS meeting_id,m.status,l.name,l.company
        FROM slots s LEFT JOIN meetings m ON m.slot_id=s.id AND m.status='reserved'
        LEFT JOIN leads l ON l.id=m.lead_id WHERE s.org_id=?'''+suffix+' ORDER BY s.starts_at', values))


@crm.post('/api/calendar/slots')
@required('manager', 'account')
def slots():
    d = data()
    start = instant(d, 'starts_at')
    end = (datetime.fromisoformat(start)+timedelta(hours=1)).isoformat(timespec='seconds')
    owner = d.get('owner_id', g.user['id'])
    if g.user['role'] != 'manager' and owner != g.user['id']:
        abort(403)
    if start <= now() or not row("SELECT id FROM users WHERE id=? AND org_id=? AND role IN ('manager','account') AND status='active'", (owner, g.user['org_id'])):
        abort(400, 'Horaire ou responsable invalide.')
    with transaction() as db:
        if row('SELECT id FROM slots WHERE owner_id=? AND active=1 AND starts_at<? AND ends_at>?', (owner, end, start)):
            abort(409, 'Un créneau existe déjà sur cette période.')
        slot_id = uid()
        db.execute('INSERT INTO slots VALUES(?,?,?,?,?,1)', (slot_id, g.user['org_id'], owner, start, end))
        audit('slot.created', slot_id)
    return jsonify(id=slot_id), 201
