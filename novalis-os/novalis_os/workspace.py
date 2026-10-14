"""Scoped search over records already visible to the authenticated role."""
from flask import Blueprint,g,request,jsonify,abort
from .security import required
from .db import rows
from .projects import visible_projects
workspace=Blueprint('workspace',__name__)

@workspace.get('/api/search')
@required()
def search():
    query=request.args.get('q','').strip().lower()
    if not 2<=len(query)<=100:abort(400,'Saisissez de 2 à 100 caractères.')
    result=[]
    for p in visible_projects():
        if query in (p['name']+' '+p['scope']).lower():result.append(dict(kind='project',id=p['id'],project_id=p['id'],title=p['name'],subtitle=p['status']))
        if g.user['role'] in {'manager','account','developer'}:
            suffix=' AND assignee_id=?' if g.user['role']=='developer' else ''
            params=(p['id'],query,g.user['id']) if suffix else (p['id'],query)
            for t in rows('SELECT id,name,status FROM tasks WHERE project_id=? AND instr(lower(name||\' \'||description),?)>0'+suffix+' LIMIT 10',params):result.append(dict(kind='task',id=t['id'],project_id=p['id'],title=t['name'],subtitle=p['name']+' · '+t['status']))
        if g.user['role'] in {'manager','finance','client'}:
            suffix=" AND status!='draft'" if g.user['role']=='client' else ''
            for i in rows("SELECT id,external_number,status FROM invoices WHERE project_id=? AND instr(lower(COALESCE(external_number,'brouillon')),?)>0"+suffix+' LIMIT 10',(p['id'],query)):result.append(dict(kind='invoice',id=i['id'],project_id=p['id'],title=i['external_number'] or 'Brouillon',subtitle=p['name']))
        if len(result)>=30:break
    return jsonify(items=result[:30])
