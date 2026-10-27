"""Project coordination, development, client requests and delivery."""
from datetime import date
from flask import Blueprint, g, jsonify, abort, request
from .db import get_db, row, rows, uid, now, transaction, audit, notify
from .security import required, project_access
from .validation import data, text, integer, choice, day

projects = Blueprint('projects', __name__)


def visible_projects():
    role = g.user['role']
    where, values = 'p.org_id=?', [g.user['org_id']]
    if role == 'account':
        where += ' AND p.account_id=?'
        values.append(g.user['id'])
    elif role == 'developer':
        where += ' AND EXISTS(SELECT 1 FROM project_members m WHERE m.project_id=p.id AND m.user_id=?)'
        values.append(g.user['id'])
    elif role == 'client':
        where += ' AND p.client_id=?'
        values.append(g.user['client_id'])
    elif role not in {'manager', 'finance'}:
        return []
    return rows('SELECT p.* FROM projects p WHERE '+where+' ORDER BY p.created_at DESC', values)


def progress(project_id):
    return row('''SELECT COALESCE(SUM(estimate_minutes),0) AS estimated,
        COALESCE(SUM(CASE WHEN status='approved' THEN estimate_minutes ELSE 0 END),0) AS approved
        FROM tasks WHERE project_id=?''', (project_id,))


def present(project):
    result = {k: project[k] for k in ['id', 'name', 'scope', 'due_date', 'status', 'account_id', 'client_id', 'version']}
    effort = progress(project['id'])
    result['progress'] = round(100*effort['approved']/effort['estimated']) if effort['estimated'] else 0
    person = row('SELECT name FROM users WHERE id=?', (project['account_id'],))
    result['account_name'] = person['name'] if person else ''
    if g.user['role'] in {'manager', 'finance'}:
        result['budget_cents'] = project['budget_cents']
    return result


def task_access(task_id, edit=False):
    task = row('SELECT * FROM tasks WHERE id=?', (task_id,))
    if not task:
        abort(404)
    project = project_access(task['project_id'])
    if g.user['role'] == 'client' and (edit or not task['client_visible']):
        abort(404)
    if edit and g.user['role'] == 'developer' and task['assignee_id'] != g.user['id']:
        abort(403, 'Cette tâche n’est pas affectée à votre compte.')
    return task, project


def sync_phase_task(task_id, milestone_id):
    phase=row('SELECT id FROM project_phases WHERE milestone_id=?',(milestone_id,))
    get_db().execute('DELETE FROM phase_tasks WHERE task_id=?',(task_id,))
    if phase:get_db().execute('INSERT INTO phase_tasks(task_id,phase_id) VALUES(?,?)',(task_id,phase['id']))


def create_task(d, project):
    assignee = text(d, 'assignee_id', 40)
    if not row("SELECT id FROM users WHERE id=? AND org_id=? AND status='active' AND role IN ('developer','account','manager')", (assignee, project['org_id'])):
        abort(400, 'Collaborateur invalide.')
    if not row('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?', (project['id'], assignee)) and assignee != project['account_id']:
        abort(400, 'Affectez d’abord ce collaborateur au projet.')
    milestone = d.get('milestone_id')
    if milestone and not row("SELECT id FROM milestones WHERE id=? AND project_id=? AND status IN ('planned','rejected')", (milestone, project['id'])):
        abort(400, 'Jalon invalide.')
    task_id = uid()
    estimate = integer(d, 'estimate_minutes', 1, 100000)
    get_db().execute('''INSERT INTO tasks(id,project_id,milestone_id,assignee_id,name,description,estimate_minutes,
        remaining_minutes,due_date,priority,client_visible,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)''',
        (task_id, project['id'], milestone, assignee, text(d, 'name'), text(d, 'description', 10000),
         estimate, estimate, day(d, 'due_date'), choice(d, 'priority', ['low','normal','high'], 'normal'),
         int(d.get('client_visible') is True), now()))
    sync_phase_task(task_id, milestone)
    notify(assignee, 'task', task_id, 'Une nouvelle tâche vous est affectée.')
    audit('task.created', task_id)
    return task_id


@projects.get('/api/projects')
@required()
def project_list():
    return jsonify(items=[present(p) for p in visible_projects()])


@projects.get('/api/collaborators')
@required('manager','account')
def collaborators():
    return jsonify(items=rows("SELECT id,name,role FROM users WHERE org_id=? AND status='active' AND role IN ('manager','account','developer') ORDER BY name",(g.user['org_id'],)))


@projects.get('/api/tasks')
@required('manager','account','developer')
def all_tasks():
    result=[]
    for project in visible_projects():
        result.extend([{**t,'project_name':project['name']} for t in rows('SELECT * FROM tasks WHERE project_id=?'+
                      (' AND assignee_id=?' if g.user['role']=='developer' else '')+' ORDER BY due_date',
                      (project['id'],g.user['id']) if g.user['role']=='developer' else (project['id'],))])
    return jsonify(items=result)


@projects.post('/api/projects')
@required('manager')
def project_create():
    d = data()
    with transaction() as db:
        client = row('SELECT id FROM clients WHERE id=? AND org_id=?', (text(d,'client_id',40),g.user['org_id']))
        account = row("SELECT id FROM users WHERE id=? AND org_id=? AND role IN ('account','manager') AND status='active'", (text(d,'account_id',40),g.user['org_id']))
        if not client or not account:
            abort(400, 'Client ou responsable invalide.')
        project_id = uid()
        db.execute('INSERT INTO projects(id,org_id,client_id,account_id,name,scope,budget_cents,due_date,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
                   (project_id,g.user['org_id'],client['id'],account['id'],text(d,'name'),text(d,'scope',10000),integer(d,'budget_cents'),day(d,'due_date'),now()))
        audit('project.created', project_id)
    return jsonify(id=project_id), 201


@projects.get('/api/projects/<project_id>')
@required()
def project_detail(project_id):
    project = project_access(project_id, finances=g.user['role'] == 'finance')
    task_sql = 'SELECT * FROM tasks WHERE project_id=?'
    if g.user['role'] == 'client':
        task_sql = 'SELECT id,project_id,name,due_date,status FROM tasks WHERE project_id=? AND client_visible=1'
    client = g.user['role'] == 'client'
    messages = rows('''SELECT m.id,m.channel,m.body,m.created_at,u.name AS author_name FROM messages m
        JOIN users u ON u.id=m.author_id WHERE m.project_id=?'''+(" AND m.channel='external'" if client else
        " AND m.channel='internal'" if g.user['role'] in {'developer','finance'} else '')+' ORDER BY m.created_at', (project_id,))
    documents = rows('''SELECT d.id,d.filename,d.mime,d.size,d.channel,d.created_at,
        COALESCE(v.root_id,d.id) AS root_id,COALESCE(v.number,1) AS version,
        NOT EXISTS(SELECT 1 FROM document_versions next WHERE next.previous_id=d.id) AS latest
        FROM documents d LEFT JOIN document_versions v ON v.document_id=d.id WHERE d.project_id=?'''+(" AND d.channel='external'" if client else
        " AND d.channel='internal'" if g.user['role'] in {'developer','finance'} else '')+' ORDER BY d.created_at DESC,v.number DESC', (project_id,))
    requests = [] if g.user['role'] in {'developer','finance'} else rows('SELECT * FROM requests WHERE project_id=? ORDER BY created_at DESC', (project_id,))
    team = [] if client or g.user['role'] == 'finance' else rows('''SELECT u.id,u.name,u.role FROM users u JOIN project_members m ON m.user_id=u.id
        WHERE m.project_id=? UNION SELECT id,name,role FROM users WHERE id=?''', (project_id,project['account_id']))
    if g.user['role'] == 'finance':
        messages, documents = [], []
    return jsonify(project=present(project),tasks=rows(task_sql+' ORDER BY due_date', (project_id,)) if g.user['role']!='finance' else [],
                   milestones=rows('SELECT * FROM milestones WHERE project_id=? ORDER BY due_date', (project_id,)),
                   messages=messages,documents=documents,requests=requests,team=team)


@projects.post('/api/projects/<project_id>/members')
@required('manager','account')
def member(project_id):
    d = data()
    with transaction() as db:
        project = project_access(project_id, staff=True)
        user = row("SELECT id FROM users WHERE id=? AND org_id=? AND role IN ('developer','account','manager') AND status='active'", (text(d,'user_id',40),project['org_id']))
        if not user:
            abort(400, 'Collaborateur invalide.')
        db.execute('INSERT OR IGNORE INTO project_members VALUES(?,?)', (project_id,user['id']))
        audit('project.member_added',project_id,{'user_id':user['id']})
    return jsonify(ok=True)


@projects.post('/api/projects/<project_id>/milestones')
@required('manager','account')
def milestone_create(project_id):
    d = data()
    with transaction() as db:
        project_access(project_id,staff=True)
        milestone_id = uid()
        db.execute('INSERT INTO milestones(id,project_id,name,due_date,description) VALUES(?,?,?,?,?)',
                   (milestone_id,project_id,text(d,'name'),day(d,'due_date'),text(d,'description',10000,0,'')))
        audit('milestone.created',milestone_id)
    return jsonify(id=milestone_id),201


@projects.post('/api/milestones/<milestone_id>/review')
@required('manager','account')
def milestone_review(milestone_id):
    d = data()
    with transaction() as db:
        milestone = row('SELECT * FROM milestones WHERE id=?',(milestone_id,))
        if not milestone:
            abort(404)
        project = project_access(milestone['project_id'],staff=True)
        if row("SELECT id FROM tasks WHERE milestone_id=? AND status!='approved'",(milestone_id,)):
            abort(409,'Validez les tâches du jalon avant de le présenter au client.')
        changed = db.execute("UPDATE milestones SET status='awaiting_client',version=version+1 WHERE id=? AND version=? AND status IN ('planned','rejected')",
                             (milestone_id,integer(d,'version',1))).rowcount
        if not changed:
            abort(409,'Ce jalon a changé ou attend déjà une validation.')
        for u in rows("SELECT id FROM users WHERE client_id=? AND status='active'",(project['client_id'],)):
            notify(u['id'],'milestone',milestone_id,'Un livrable attend votre validation.')
        audit('milestone.client_review_requested',milestone_id)
    return jsonify(ok=True)


@projects.post('/api/milestones/<milestone_id>/approve')
@required('client')
def milestone_approve(milestone_id):
    d = data()
    with transaction() as db:
        milestone = row('SELECT * FROM milestones WHERE id=?',(milestone_id,))
        if not milestone:
            abort(404)
        project = project_access(milestone['project_id'])
        status = choice(d,'status',['approved','rejected'])
        changed = db.execute("UPDATE milestones SET status=?,version=version+1 WHERE id=? AND version=? AND status='awaiting_client'",
                             (status,milestone_id,integer(d,'version',1))).rowcount
        if not changed:
            abort(409,'Ce livrable ne peut plus être validé dans cet état.')
        audit('milestone.client_decision',milestone_id,{'status':status})
        notify(project['account_id'],'milestone_decision',milestone_id,'Le client a répondu à une demande de validation.')
    return jsonify(ok=True)


@projects.post('/api/projects/<project_id>/tasks')
@required('manager','account')
def task_create(project_id):
    with transaction():
        project = project_access(project_id,staff=True)
        if project['status'] not in {'active','maintenance'}:
            abort(409,'Ce projet n’est pas ouvert à la réalisation.')
        task_id = create_task(data(),project)
    return jsonify(id=task_id),201


@projects.patch('/api/tasks/<task_id>')
@required('manager','account','developer')
def task_update(task_id):
    d = data()
    with transaction() as db:
        task,project = task_access(task_id,edit=True)
        status = choice(d,'status',['todo','in_progress','blocked','review','approved'])
        transitions = {'todo':{'in_progress','blocked'},'in_progress':{'blocked','review'},'blocked':{'in_progress','review'},'review':{'in_progress','approved'},'approved':set()}
        if project['status'] not in {'active','maintenance'} or status not in transitions[task['status']]:
            abort(409,'Cette transition de tâche n’est pas autorisée.')
        if status=='approved' and g.user['role']=='developer':
            abort(403,'La validation revient au responsable du projet.')
        remaining = integer(d,'remaining_minutes',0,100000,0 if status=='approved' else task['remaining_minutes'])
        changed = db.execute('UPDATE tasks SET status=?,remaining_minutes=?,version=version+1 WHERE id=? AND version=?',
                             (status,remaining,task_id,integer(d,'version',1))).rowcount
        if not changed:
            abort(409,'Cette tâche a été modifiée. Rechargez-la.')
        audit('task.transition',task_id,{'from':task['status'],'to':status})
        if status in {'review','blocked'}:
            notify(project['account_id'],status,task_id,'Une tâche attend une revue.' if status=='review' else 'Une tâche est bloquée.')
    return jsonify(ok=True)


@projects.get('/api/time')
@required('manager','account','developer')
def time_list():
    sql = '''SELECT e.*,t.name AS task_name,t.project_id,u.name AS user_name FROM time_entries e
        JOIN tasks t ON t.id=e.task_id JOIN projects p ON p.id=t.project_id JOIN users u ON u.id=e.user_id WHERE p.org_id=?'''
    values = [g.user['org_id']]
    if g.user['role']=='account':
        sql+=' AND p.account_id=?'
        values.append(g.user['id'])
    elif g.user['role']=='developer':
        sql+=' AND e.user_id=?'
        values.append(g.user['id'])
    return jsonify(items=rows(sql+' ORDER BY e.work_date DESC',values))


@projects.post('/api/tasks/<task_id>/time')
@required('manager','account','developer')
def time_create(task_id):
    d = data()
    with transaction() as db:
        task,p = task_access(task_id,edit=True)
        if p['status'] not in {'active','maintenance'}:abort(409,'Ce projet est fermé à la saisie des temps.')
        if task['assignee_id']!=g.user['id']:
            abort(403,'Enregistrez uniquement votre propre temps.')
        date_value = day(d,'work_date')
        minutes = integer(d,'minutes',1,1440)
        total = row('SELECT COALESCE(SUM(minutes),0) AS minutes FROM time_entries WHERE user_id=? AND work_date=? AND status!=?',
                    (g.user['id'],date_value,'rejected'))['minutes']
        if total+minutes>1440 or date_value>date.today().isoformat():
            abort(400,'La durée ou la date de cette saisie est invalide.')
        entry_id = uid()
        db.execute('INSERT INTO time_entries(id,task_id,user_id,work_date,minutes,billable,note,created_at) VALUES(?,?,?,?,?,?,?,?)',
                   (entry_id,task_id,g.user['id'],date_value,minutes,int(d.get('billable') is True),text(d,'note',1000),now()))
        audit('time.submitted',entry_id)
    return jsonify(id=entry_id),201


@projects.post('/api/time/<entry_id>/review')
@required('manager','account')
def time_review(entry_id):
    d = data()
    with transaction() as db:
        entry = row('SELECT * FROM time_entries WHERE id=?',(entry_id,))
        if not entry:
            abort(404)
        task,_ = task_access(entry['task_id'])
        project_access(task['project_id'],staff=True)
        status = choice(d,'status',['approved','rejected'])
        if not db.execute("UPDATE time_entries SET status=? WHERE id=? AND status='submitted'",(status,entry_id)).rowcount:
            abort(409,'Cette saisie a déjà été examinée.')
        audit('time.reviewed',entry_id,{'status':status})
    return jsonify(ok=True)


@projects.post('/api/projects/<project_id>/messages')
@required('manager','account','developer','client')
def message(project_id):
    d = data()
    with transaction() as db:
        project = project_access(project_id)
        channel = choice(d,'channel',['internal','external'])
        if (g.user['role']=='client' and channel!='external') or (g.user['role']=='developer' and channel!='internal'):
            abort(403,'Ce canal est réservé à votre interlocuteur habilité.')
        message_id = uid()
        db.execute('INSERT INTO messages VALUES(?,?,?,?,?,?)',(message_id,project_id,g.user['id'],channel,text(d,'body',10000),now()))
        if g.user['role']=='client':
            notify(project['account_id'],'client_message',message_id,'Votre client a envoyé un message.')
        elif channel=='external':
            for u in rows("SELECT id FROM users WHERE client_id=? AND status='active'",(project['client_id'],)):
                notify(u['id'],'message',message_id,'Votre interlocuteur a envoyé un message.')
        audit('message.created',message_id,{'channel':channel})
    return jsonify(id=message_id),201


@projects.post('/api/projects/<project_id>/requests')
@required('client')
def request_create(project_id):
    d = data()
    with transaction() as db:
        project = project_access(project_id)
        request_id = uid()
        db.execute('INSERT INTO requests(id,project_id,author_id,title,description,created_at) VALUES(?,?,?,?,?,?)',
                   (request_id,project_id,g.user['id'],text(d,'title'),text(d,'description',10000),now()))
        notify(project['account_id'],'client_request',request_id,'Une demande client attend votre qualification.')
        audit('request.received',request_id)
    return jsonify(id=request_id),201


@projects.post('/api/requests/<request_id>/qualify')
@required('manager','account')
def request_qualify(request_id):
    d = data()
    with transaction() as db:
        item = row('SELECT * FROM requests WHERE id=?',(request_id,))
        if not item:
            abort(404)
        project = project_access(item['project_id'],staff=True)
        if item['task_id'] or item['status'] not in {'received','analysing'} or project['status'] not in {'active','maintenance'} or item['version']!=integer(d,'version',1):
            abort(409,'Cette demande a déjà été planifiée ou le projet n’est pas actif.')
        if d.get('within_scope') is not True:
            abort(409,'Faites approuver une modification du périmètre avant de planifier ce travail.')
        task_id = create_task(d,project)
        db.execute("UPDATE requests SET status='planned',task_id=?,version=version+1 WHERE id=?",(task_id,request_id))
        audit('request.qualified',request_id,{'task_id':task_id})
    return jsonify(task_id=task_id),201


@projects.post('/api/projects/<project_id>/delivery')
@required('manager','account')
def deliver(project_id):
    d = data()
    with transaction() as db:
        project = project_access(project_id,staff=True)
        if project['status']!='active' or not row('SELECT id FROM tasks WHERE project_id=?',(project_id,)):
            abort(409,'Le projet doit contenir une réalisation validée.')
        if row("SELECT id FROM tasks WHERE project_id=? AND status!='approved'",(project_id,)) or row("SELECT id FROM milestones WHERE project_id=? AND status!='approved'",(project_id,)):
            abort(409,'Les tâches et les jalons doivent être validés avant la livraison finale.')
        if not db.execute("UPDATE projects SET status='awaiting_client',version=version+1 WHERE id=? AND version=?",(project_id,integer(d,'version',1))).rowcount:
            abort(409,'Le projet a été modifié.')
        audit('project.delivery_requested',project_id)
    return jsonify(ok=True)


@projects.post('/api/projects/<project_id>/accept-delivery')
@required('client')
def accept_delivery(project_id):
    d = data()
    with transaction() as db:
        project_access(project_id)
        if not db.execute("UPDATE projects SET status='delivered',version=version+1 WHERE id=? AND version=? AND status='awaiting_client'",
                          (project_id,integer(d,'version',1))).rowcount:
            abort(409,'Ce projet n’attend pas une approbation finale.')
        audit('project.delivery_accepted',project_id)
    return jsonify(ok=True)


@projects.post('/api/projects/<project_id>/archive')
@required('manager')
def archive(project_id):
    d = data()
    with transaction() as db:
        project = project_access(project_id)
        if project['status'] not in {'delivered','maintenance'}:
            abort(409,'La livraison doit être acceptée avant archivage.')
        status = choice(d,'status',['maintenance','archived'])
        if status=='archived' and (row("SELECT id FROM tasks WHERE project_id=? AND status!='approved'",(project_id,)) or row("SELECT id FROM requests WHERE project_id=? AND status IN ('received','analysing','planned')",(project_id,))):
            abort(409,'Clôturez les tâches et demandes ouvertes avant archivage.')
        if not db.execute('UPDATE projects SET status=?,version=version+1 WHERE id=? AND version=?',(status,project_id,integer(d,'version',1))).rowcount:
            abort(409,'Le projet a été modifié.')
        audit('project.archived',project_id,{'status':status})
    return jsonify(ok=True)


@projects.get('/api/dashboard')
@required()
def dashboard():
    selected = visible_projects()
    today = date.today().isoformat()
    alerts = []
    for project in selected:
        if g.user['role']!='client':
            for task in rows("SELECT id,name,due_date,status,assignee_id FROM tasks WHERE project_id=? AND status!='approved' AND (due_date<? OR status='blocked')",
                             (project['id'],today)):
                if g.user['role']!='developer' or task['assignee_id']==g.user['id']:
                    alerts.append({'kind':'task','project_id':project['id'],**task})
    stats = {'active_projects':sum(p['status'] in {'active','awaiting_client'} for p in selected)}
    if g.user['role']=='manager':
        stats['leads'] = row("SELECT COUNT(*) AS n FROM leads WHERE org_id=? AND status NOT IN ('won','lost')",(g.user['org_id'],))['n']
    if g.user['role']=='developer':
        stats['my_tasks'] = row("SELECT COUNT(*) AS n FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.assignee_id=? AND p.org_id=? AND t.status!='approved'",(g.user['id'],g.user['org_id']))['n']
        stats['submitted_minutes'] = row("SELECT COALESCE(SUM(minutes),0) AS n FROM time_entries WHERE user_id=? AND status='submitted'",(g.user['id'],))['n']
    return jsonify(stats=stats,projects=[present(p) for p in selected],alerts=alerts,
                   notifications=rows('SELECT id,kind,entity_id,title,created_at,seen FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',(g.user['id'],)))


@projects.post('/api/notifications/<notification_id>/read')
@required()
def read_notification(notification_id):
    get_db().execute('UPDATE notifications SET seen=1 WHERE id=? AND user_id=?',(notification_id,g.user['id']))
    return jsonify(ok=True)

@projects.patch('/api/projects/<project_id>')
@required('manager','account')
def project_edit(project_id):
    d=data()
    with transaction() as db:
        p=project_access(project_id,staff=True)
        if p['status']=='archived':abort(409,'Un projet archivé ne peut pas être modifié.')
        account_id=text(d,'account_id',40,1,p['account_id'])
        if account_id!=p['account_id'] and g.user['role']!='manager':abort(403,'Seule la direction réaffecte le responsable.')
        if not row("SELECT id FROM users WHERE id=? AND org_id=? AND status='active' AND role IN ('manager','account')",(account_id,p['org_id'])):abort(400,'Responsable invalide.')
        budget=integer(d,'budget_cents',0,100000000,p['budget_cents'])
        if budget!=p['budget_cents'] and g.user['role']!='manager':abort(403,'Seule la direction modifie le budget contractuel.')
        if not db.execute('UPDATE projects SET name=?,scope=?,account_id=?,due_date=?,budget_cents=?,version=version+1 WHERE id=? AND version=?',(text(d,'name'),text(d,'scope',10000),account_id,day(d,'due_date'),budget,project_id,integer(d,'version',1))).rowcount:abort(409,'Projet modifié : rechargez les données.')
        audit('project.edited',project_id)
    return jsonify(ok=True)

@projects.delete('/api/projects/<project_id>/members/<user_id>')
@required('manager','account')
def member_remove(project_id,user_id):
    with transaction() as db:
        p=project_access(project_id,staff=True)
        if user_id==p['account_id'] or row("SELECT id FROM tasks WHERE project_id=? AND assignee_id=? AND status!='approved'",(project_id,user_id)):abort(409,'Réaffectez le responsable et ses tâches ouvertes avant de retirer cet accès.')
        if not db.execute('DELETE FROM project_members WHERE project_id=? AND user_id=?',(project_id,user_id)).rowcount:abort(404)
        audit('project.member_removed',project_id,{'user_id':user_id})
    return jsonify(ok=True)

@projects.patch('/api/tasks/<task_id>/details')
@required('manager','account')
def task_edit(task_id):
    d=data()
    with transaction() as db:
        task,p=task_access(task_id);project_access(p['id'],staff=True)
        if p['status'] not in {'active','maintenance'} or task['status']=='approved':abort(409,'Réouvrez la tâche avant de modifier une réalisation validée.')
        assignee=text(d,'assignee_id',40)
        if not row("SELECT id FROM users WHERE id=? AND org_id=? AND status='active' AND role IN ('manager','account','developer')",(assignee,p['org_id'])) or (assignee!=p['account_id'] and not row('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?',(p['id'],assignee))):abort(400,'Collaborateur non affecté au projet.')
        milestone=d.get('milestone_id') or None
        previous=row('SELECT status FROM milestones WHERE id=?',(task['milestone_id'],))
        if previous and previous['status'] in {'awaiting_client','approved'}:abort(409,'Réouvrez le jalon avant de modifier ses tâches.')
        if milestone and not row("SELECT id FROM milestones WHERE id=? AND project_id=? AND status IN ('planned','rejected')",(milestone,p['id'])):abort(400,'Choisissez un jalon ouvert appartenant au projet.')
        estimate=integer(d,'estimate_minutes',1,100000)
        if not db.execute('UPDATE tasks SET name=?,description=?,assignee_id=?,milestone_id=?,due_date=?,estimate_minutes=?,remaining_minutes=?,priority=?,client_visible=?,version=version+1 WHERE id=? AND version=?',(text(d,'name'),text(d,'description',10000),assignee,milestone,day(d,'due_date'),estimate,integer(d,'remaining_minutes',0,100000,task['remaining_minutes']),choice(d,'priority',['low','normal','high'],'normal'),int(d.get('client_visible') is True),task_id,integer(d,'version',1))).rowcount:abort(409,'Tâche modifiée : rechargez les données.')
        sync_phase_task(task_id,milestone)
        audit('task.edited',task_id);notify(assignee,'task_updated',task_id,'Une tâche a été mise à jour.')
    return jsonify(ok=True)

@projects.post('/api/tasks/<task_id>/reopen')
@required('manager','account')
def task_reopen(task_id):
    d=data()
    with transaction() as db:
        task,p=task_access(task_id);project_access(p['id'],staff=True)
        if p['status'] not in {'active','maintenance'}:abort(409,'La livraison en cours de validation ne peut pas être modifiée.')
        reason=text(d,'reason',1000)
        if not db.execute("UPDATE tasks SET status='in_progress',remaining_minutes=?,version=version+1 WHERE id=? AND version=? AND status='approved'",(integer(d,'remaining_minutes',1,100000),task_id,integer(d,'version',1))).rowcount:abort(409,'La tâche a changé ou n’est pas validée.')
        if task['milestone_id']:db.execute("UPDATE milestones SET status='planned',version=version+1 WHERE id=?",(task['milestone_id'],))
        db.execute("UPDATE requests SET status='planned',version=version+1 WHERE task_id=? AND status='resolved'",(task_id,))
        audit('task.reopened',task_id,{'reason':reason});notify(task['assignee_id'],'task_reopened',task_id,'Une réalisation a été réouverte avec un motif.')
    return jsonify(ok=True)

@projects.patch('/api/requests/<request_id>')
@required('manager','account')
def request_decision(request_id):
    d=data()
    with transaction() as db:
        item=row('SELECT * FROM requests WHERE id=?',(request_id,))
        if not item:abort(404)
        p=project_access(item['project_id'],staff=True);status=choice(d,'status',['analysing','resolved','declined']);reason=text(d,'reason',2000)
        allowed={'received':{'analysing','declined'},'analysing':{'declined'},'planned':{'resolved'}}
        if status not in allowed.get(item['status'],set()):abort(409,'Cette décision n’est pas autorisée dans l’état de la demande.')
        if status=='resolved' and not row("SELECT id FROM tasks WHERE id=? AND status='approved'",(item['task_id'],)):abort(409,'Validez la tâche associée avant de résoudre la demande.')
        if not db.execute('UPDATE requests SET status=?,version=version+1 WHERE id=? AND version=?',(status,request_id,integer(d,'version',1))).rowcount:abort(409,'Demande modifiée : rechargez les données.')
        db.execute('INSERT INTO messages VALUES(?,?,?,?,?,?)',(uid(),p['id'],g.user['id'],'external',item['title']+' — '+status+'\n'+reason,now()))
        notify(item['author_id'],'request_decision',request_id,'Votre demande a été examinée.');audit('request.decision',request_id,{'status':status,'reason':reason})
    return jsonify(ok=True)
