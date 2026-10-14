import hashlib
from pathlib import Path
from flask import Blueprint, g, current_app, request, jsonify, abort, send_file
from werkzeug.utils import secure_filename
from .db import row, uid, transaction, now, audit
from .security import required, project_access

documents = Blueprint('documents', __name__)
MIMES = {'.pdf':'application/pdf','.txt':'text/plain','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}


def check_channel(channel):
    if channel not in {'internal','external'}:
        abort(400,'Canal invalide.')
    if (g.user['role']=='client' and channel!='external') or (g.user['role']=='developer' and channel!='internal'):
        abort(403,'Ce canal n’est pas autorisé.')


@documents.post('/api/projects/<project_id>/documents')
@required('manager','account','developer','client')
def upload(project_id):
    project_access(project_id)
    channel = request.form.get('channel','internal')
    check_channel(channel)
    file = request.files.get('file')
    if not file:
        abort(400,'Choisissez un fichier.')
    filename = secure_filename(file.filename or '')[:180]
    ext = Path(filename).suffix.lower()
    if not filename or ext not in MIMES:
        abort(400,'Formats acceptés : PDF, texte et images PNG, JPEG ou WebP.')
    value = file.read(6*1024*1024+1)
    if not value or len(value)>6*1024*1024:
        abort(400,'Le fichier doit peser au maximum 6 Mo.')
    valid = (ext=='.pdf' and value.startswith(b'%PDF-')) or (ext=='.png' and value.startswith(b'\x89PNG\r\n\x1a\n')) or \
            (ext in {'.jpg','.jpeg'} and value.startswith(b'\xff\xd8\xff')) or \
            (ext=='.webp' and value[:4]==b'RIFF' and value[8:12]==b'WEBP')
    if ext=='.txt':
        try:
            value.decode('utf-8')
            valid = b'\x00' not in value
        except UnicodeDecodeError:
            valid = False
    if not valid:
        abort(400,'Le contenu ne correspond pas au format annoncé.')
    document_id = uid()
    destination = Path(current_app.config['FILES_DIR'])/document_id
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_bytes(value)
    destination.chmod(0o600)
    try:
        with transaction() as db:
            project_access(project_id)
            db.execute('INSERT INTO documents VALUES(?,?,?,?,?,?,?,?,?)',
                       (document_id,project_id,g.user['id'],channel,filename,MIMES[ext],len(value),hashlib.sha256(value).hexdigest(),now()))
            audit('document.uploaded',document_id,{'channel':channel})
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return jsonify(id=document_id),201


@documents.get('/api/documents/<document_id>')
@required('manager','account','developer','client')
def download(document_id):
    item = row('SELECT * FROM documents WHERE id=?',(document_id,))
    if not item:
        abort(404)
    project_access(item['project_id'])
    try:
        check_channel(item['channel'])
    except Exception:
        abort(404)
    path = Path(current_app.config['FILES_DIR'])/document_id
    if not path.is_file():
        abort(404)
    audit('document.downloaded',document_id)
    return send_file(path,mimetype=item['mime'],as_attachment=True,download_name=item['filename'])
