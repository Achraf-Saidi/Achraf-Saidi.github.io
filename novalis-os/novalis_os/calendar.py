"""Role-scoped calendar and authenticated RFC 5545 export."""
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from flask import Blueprint, g, jsonify, abort, request, Response
from .db import row, rows, get_db, transaction, uid, now, audit, notify
from .security import required
from .validation import data, text, integer, choice, instant
from .projects import visible_projects
from .planning import access, team, phases

calendar=Blueprint('calendar_v2',__name__)
ROLES=('manager','account','developer','client','finance')
KINDS=['meeting','workshop','review','focus','absence']


def participants(p):
    if p:return team(p)
    return rows("SELECT id,name,role FROM users WHERE org_id=? AND status='active' AND role!='client' ORDER BY name",(g.user['org_id'],)) if g.user['role']=='manager' else [dict(id=g.user['id'],name=g.user['name'],role=g.user['role'])]


def event_visible(e,projects):
    if e['org_id']!=g.user['org_id']:return False
    member=bool(row('SELECT 1 FROM calendar_attendees WHERE event_id=? AND user_id=?',(e['id'],g.user['id'])))
    if e['visibility']=='private':return member or e['creator_id']==g.user['id']
    if e['project_id'] and e['project_id'] not in projects:return False
    if g.user['role']=='client':return e['visibility']=='shared' and (member or e['project_id'] in projects)
    return g.user['role']=='manager' or member or bool(e['project_id'] in projects)


def event_access(identifier,edit=False):
    e=row('SELECT * FROM calendar_events WHERE id=?',(identifier,))
    if not e or not event_visible(e,{p['id'] for p in visible_projects()}):abort(404)
    if edit and not (g.user['role']=='manager' or e['creator_id']==g.user['id'] or (g.user['role']=='account' and e['project_id'])):abort(403,'Seul l’organisateur ou le responsable peut modifier ce rendez-vous.')
    if edit and e['project_id']:access(e['project_id'])
    return e


def present_event(e):
    people=rows('SELECT u.id,u.name,u.role,a.response FROM calendar_attendees a JOIN users u ON u.id=a.user_id WHERE a.event_id=? ORDER BY u.name',(e['id'],))
    p=row('SELECT name,client_id FROM projects WHERE id=?',(e['project_id'],)) if e['project_id'] else None
    return {**e,'editable':g.user['role']=='manager' or e['creator_id']==g.user['id'] or (g.user['role']=='account' and bool(e['project_id'])),
            'attendees':people,'all_day':False,'project_name':p['name'] if p else 'Équipe Novalis','client_id':p['client_id'] if p else None,'source':'event'}


def interval():
    try:
        start=date.fromisoformat(request.args.get('start',date.today().replace(day=1).isoformat()))
        end=date.fromisoformat(request.args.get('end',(start+timedelta(days=42)).isoformat()))
    except ValueError:abort(400,'Période invalide.')
    if not 1<=(end-start).days<=370:abort(400,'Choisissez une période de 1 à 370 jours.')
    return start,end


def collect():
    start,end=interval();projects=visible_projects();visible={p['id'] for p in projects};result=[]
    for e in rows('SELECT * FROM calendar_events WHERE org_id=? AND starts_at<? AND ends_at>?',(g.user['org_id'],end.isoformat(),start.isoformat())):
        if event_visible(e,visible):result.append(present_event(e))
    def deadline(p,kind,item,person=None):
        due=item['due_date']
        if start.isoformat()<=due<end.isoformat():
            result.append(dict(id=kind+':'+item['id'],title=item['name'],starts_at=due,ends_at=(date.fromisoformat(due)+timedelta(days=1)).isoformat(),
                project_id=p['id'],project_name=p['name'],client_id=p['client_id'],kind=kind,all_day=True,source=kind,status=item.get('status','planned'),
                description=item.get('description',''),attendees=[dict(id=person)] if person else [],editable=False,version=item.get('version',1)))
    for p in projects:
        for ph in phases(p['id'],False):deadline(p,'phase',ph)
        phase_milestones={ph['milestone_id'] for ph in phases(p['id'],False)}
        for m in rows('SELECT * FROM milestones WHERE project_id=?',(p['id'],)):
            if m['id'] not in phase_milestones:deadline(p,'milestone',m)
        if g.user['role']!='finance':
            for t in rows('SELECT * FROM tasks WHERE project_id=?'+(' AND client_visible=1' if g.user['role']=='client' else ' AND assignee_id=?' if g.user['role']=='developer' else ''),
                          (p['id'],g.user['id']) if g.user['role']=='developer' else (p['id'],)):deadline(p,'task',t,t['assignee_id'])
        if g.user['role'] in {'manager','finance','client'}:
            for i in rows('''SELECT i.id,i.due_date,i.status,COALESCE(i.external_number,b.title) name FROM invoices i JOIN billing_documents b ON b.invoice_id=i.id
                WHERE i.project_id=? AND b.published_at IS NOT NULL AND b.canceled_at IS NULL''',(p['id'],)):deadline(p,'invoice',i)
    if g.user['role'] in {'manager','account'}:
        for s in rows('''SELECT s.*,m.id meeting_id,m.status,l.name,l.company FROM slots s LEFT JOIN meetings m ON m.slot_id=s.id AND m.status='reserved'
            LEFT JOIN leads l ON l.id=m.lead_id WHERE s.org_id=? AND s.active=1 AND s.starts_at>=? AND s.starts_at<?'''+(' AND s.owner_id=?' if g.user['role']=='account' else ''),
            (g.user['org_id'],start.isoformat(),end.isoformat(),g.user['id']) if g.user['role']=='account' else (g.user['org_id'],start.isoformat(),end.isoformat())):
            result.append(dict(id='booking:'+s['id'],title=('Découverte · '+(s['company'] or s['name'] or 'Prospect')) if s['meeting_id'] else 'Créneau disponible',starts_at=s['starts_at'],ends_at=s['ends_at'],
                source='booking',kind='booking',all_day=False,status=s['status'] or 'available',project_id=None,project_name='Commercial',client_id=None,attendees=[dict(id=s['owner_id'])],editable=False,version=1))
    for key in ['project_id','client_id','kind']:
        value=request.args.get(key)
        if value:result=[e for e in result if e.get(key)==value]
    person=request.args.get('person')
    if person:result=[e for e in result if person in [u['id'] for u in e['attendees']]]
    if request.args.get('id'):result=[e for e in result if e['id']==request.args['id']]
    return sorted(result,key=lambda e:(e['starts_at'],e['title'])),projects


@calendar.get('/api/planner/calendar')
@required(*ROLES)
def calendar_get():
    events,projects=collect()
    people={g.user['id']:dict(id=g.user['id'],name=g.user['name'],role=g.user['role'])}
    for p in projects:
        for u in team(p):people[u['id']]=u
    if g.user['role']=='manager':people.update({u['id']:u for u in participants(None)})
    clients=[]
    for p in projects:
        if p['client_id'] not in [c['id'] for c in clients]:clients.append(row('SELECT id,name FROM clients WHERE id=?',(p['client_id'],)))
    return jsonify(items=events,projects=[{k:p[k] for k in ['id','name','client_id']} for p in projects],people=list(people.values()),clients=clients)


@calendar.get('/api/planner/people')
@required(*ROLES)
def people_get():
    project_id=request.args.get('project_id')
    return jsonify(items=participants(access(project_id) if project_id else None))


def clean_event(d,old=None):
    project_id=d.get('project_id') or None
    if old and project_id!=old['project_id']:abort(400,'Le projet d’un rendez-vous existant ne peut être modifié.')
    p=access(project_id) if project_id else None
    if not p and g.user['role']!='manager':abort(403,'Choisissez un projet auquel vous participez.')
    start,end=instant(d,'starts_at'),instant(d,'ends_at')
    if not timedelta(minutes=5)<=datetime.fromisoformat(end)-datetime.fromisoformat(start)<=timedelta(days=31):abort(400,'La durée doit être comprise entre 5 minutes et 31 jours.')
    visibility=choice(d,'visibility',['private','team','shared'],'team')
    if g.user['role']=='client' and visibility!='shared':abort(403,'Les rendez-vous client sont partagés avec leur projet.')
    if g.user['role']=='developer' and visibility=='shared':abort(403,'La coordination organise les rendez-vous partagés avec le client.')
    ids=d.get('attendee_ids',[])
    if not isinstance(ids,list) or len(ids)>60 or any(not isinstance(x,str) for x in ids):abort(400,'Participants invalides.')
    ids=set(ids)|{g.user['id']}
    allowed=participants(p);valid={u['id']:u for u in allowed}
    # A direction member can organize without being assigned to the project.
    valid[g.user['id']]=g.user
    if any(i not in valid for i in ids):abort(400,'Choisissez des participants de ce projet.')
    if visibility!='shared' and any(valid[i]['role']=='client' for i in ids):abort(400,'Un rendez-vous avec un client doit être partagé.')
    url=text(d,'meeting_url',1500,0,'')
    if url and (urlparse(url).scheme!='https' or not urlparse(url).hostname or urlparse(url).username or '\n' in url or '\r' in url):abort(400,'Le lien de visioconférence doit être une adresse HTTPS.')
    return dict(project_id=project_id,title=text(d,'title',200),description=text(d,'description',6000,0,''),starts_at=start,ends_at=end,
                location=text(d,'location',500,0,''),meeting_url=url,kind=choice(d,'kind',KINDS,'meeting'),visibility=visibility,attendee_ids=sorted(ids))


def check_conflicts(v,excluded=None):
    for person in v['attendee_ids']:
        conflict=row('''SELECT e.id FROM calendar_events e JOIN calendar_attendees a ON a.event_id=e.id
            WHERE a.user_id=? AND a.response!='declined' AND e.status='confirmed' AND e.starts_at<? AND e.ends_at>? AND e.id!=?''',
            (person,v['ends_at'],v['starts_at'],excluded or ''))
        slot=row('''SELECT s.id FROM slots s JOIN meetings m ON m.slot_id=s.id AND m.status='reserved'
            WHERE s.owner_id=? AND s.starts_at<? AND s.ends_at>?''',(person,v['ends_at'],v['starts_at']))
        if conflict or slot:abort(409,'Un participant est déjà occupé sur cette période. Choisissez un autre horaire ou confirmez le chevauchement.')


@calendar.post('/api/planner/events')
@required('manager','account','developer','client')
def create_event():
    d=data()
    with transaction() as db:
        v=clean_event(d);count=integer(d,'repeat_count',1,26,1);series=uid() if count>1 else None
        try:tz=ZoneInfo(d.get('timezone','Europe/Brussels'))
        except (ZoneInfoNotFoundError,TypeError):abort(400,'Fuseau horaire invalide.')
        start=datetime.fromisoformat(v['starts_at']).astimezone(tz);end=datetime.fromisoformat(v['ends_at']).astimezone(tz);identifiers=[]
        for n in range(count):
            occurrence={**v,'starts_at':(start+timedelta(weeks=n)).astimezone(timezone.utc).isoformat(timespec='seconds'),
                        'ends_at':(end+timedelta(weeks=n)).astimezone(timezone.utc).isoformat(timespec='seconds')}
            if d.get('allow_conflict') is not True:check_conflicts(occurrence)
            identifier=uid();identifiers.append(identifier)
            db.execute('''INSERT INTO calendar_events(id,org_id,project_id,title,description,starts_at,ends_at,location,meeting_url,kind,visibility,creator_id,series_id,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',(identifier,g.user['org_id'],occurrence['project_id'],occurrence['title'],occurrence['description'],occurrence['starts_at'],occurrence['ends_at'],occurrence['location'],occurrence['meeting_url'],occurrence['kind'],occurrence['visibility'],g.user['id'],series,now()))
            for person in v['attendee_ids']:
                db.execute('INSERT INTO calendar_attendees VALUES(?,?,?)',(identifier,person,'accepted' if person==g.user['id'] else 'pending'))
                if person!=g.user['id']:notify(person,'calendar',identifier,'Un rendez-vous vous concerne : '+v['title'])
            audit('calendar.created',identifier)
    return jsonify(id=identifiers[0],ids=identifiers),201


@calendar.patch('/api/planner/events/<identifier>')
@required('manager','account','developer','client')
def edit_event(identifier):
    d=data()
    with transaction() as db:
        old=event_access(identifier,True)
        if old['status']=='cancelled' or d.get('version')!=old['version']:abort(409,'Ce rendez-vous a changé. Rechargez le calendrier.')
        v=clean_event(d,old)
        if d.get('allow_conflict') is not True:check_conflicts(v,identifier)
        db.execute('UPDATE calendar_events SET title=?,description=?,starts_at=?,ends_at=?,location=?,meeting_url=?,kind=?,visibility=?,version=version+1 WHERE id=?',
                   (v['title'],v['description'],v['starts_at'],v['ends_at'],v['location'],v['meeting_url'],v['kind'],v['visibility'],identifier))
        previous={x['user_id'] for x in rows('SELECT user_id FROM calendar_attendees WHERE event_id=?',(identifier,))}
        db.execute('DELETE FROM calendar_attendees WHERE event_id=?',(identifier,))
        for person in v['attendee_ids']:db.execute('INSERT INTO calendar_attendees VALUES(?,?,?)',(identifier,person,'accepted' if person==g.user['id'] else 'pending'))
        for person in previous|set(v['attendee_ids']):notify(person,'calendar_update',identifier+':'+str(old['version']+1),'Un rendez-vous a été modifié : '+v['title'])
        audit('calendar.updated',identifier)
    return jsonify(ok=True)


@calendar.post('/api/planner/events/<identifier>/cancel')
@required('manager','account','developer','client')
def cancel_event(identifier):
    d=data()
    with transaction() as db:
        e=event_access(identifier,True)
        if d.get('version')!=e['version'] or e['status']=='cancelled':abort(409,'Ce rendez-vous a changé.')
        db.execute("UPDATE calendar_events SET status='cancelled',version=version+1 WHERE id=?",(identifier,))
        for a in rows('SELECT user_id FROM calendar_attendees WHERE event_id=?',(identifier,)):notify(a['user_id'],'calendar_cancelled',identifier,'Rendez-vous annulé : '+e['title'])
        audit('calendar.cancelled',identifier)
    return jsonify(ok=True)


@calendar.post('/api/planner/events/<identifier>/rsvp')
@required(*ROLES)
def rsvp(identifier):
    d=data()
    with transaction() as db:
        e=event_access(identifier)
        if e['status']=='cancelled':abort(409,'Ce rendez-vous est annulé.')
        if not db.execute('UPDATE calendar_attendees SET response=? WHERE event_id=? AND user_id=?',(choice(d,'response',['accepted','declined','tentative']),identifier,g.user['id'])).rowcount:abort(403,'Vous ne figurez pas parmi les participants.')
        audit('calendar.rsvp',identifier)
    return jsonify(ok=True)


def escape_ics(value):return str(value or '').replace('\\','\\\\').replace('\r','').replace('\n','\\n').replace(';','\\;').replace(',','\\,')
def fold_ics(line):
    lines=[];part=''
    for char in line:
        if len((part+char).encode('utf-8'))>75:lines.append(part);part=' '
        part+=char
    return '\r\n'.join(lines+[part])
def ics(events):
    lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Novalis AI//Project calendar//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH']
    for e in events:
        lines+=['BEGIN:VEVENT','UID:'+e['id']+'@novalisai.com','DTSTAMP:'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'),'SEQUENCE:'+str(e.get('version',1))]
        for prop,key in [('DTSTART','starts_at'),('DTEND','ends_at')]:
            value=e[key]
            lines.append(prop+(';VALUE=DATE:'+value.replace('-','') if e['all_day'] else ':'+datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')))
        lines+=['SUMMARY:'+escape_ics(e['title']),'DESCRIPTION:'+escape_ics(e.get('description','')+'\n'+e.get('project_name','')+'\n'+e.get('meeting_url','')),'LOCATION:'+escape_ics(e.get('location','')),
                'STATUS:'+('CANCELLED' if e['status']=='cancelled' else 'CONFIRMED'),'CLASS:PRIVATE','END:VEVENT']
    return '\r\n'.join(fold_ics(l) for l in lines+['END:VCALENDAR'])+'\r\n'


@calendar.get('/api/planner/calendar.ics')
@required(*ROLES)
def export_calendar():
    events,_=collect()
    return Response(ics(events),mimetype='text/calendar',headers={'Content-Disposition':'attachment; filename="Novalis-calendrier.ics"'})
