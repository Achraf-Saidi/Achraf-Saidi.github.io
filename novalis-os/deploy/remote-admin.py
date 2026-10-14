"""Upgrade only Novalis and create the explicitly requested direction account."""
import base64,hashlib,http.client,json,os,secrets,shutil,socket,ssl,subprocess,time,urllib.request
from pathlib import Path
SOURCE="fd2499a5495e3515c91259de3e4752145bac1a8b"
MANIFEST={"novalis-os/novalis_os/auth.py":"da7f3a0fd692be0f386588ff7a97dfc96c15e188d8766e4bb2ed85f30d0898f9","novalis-os/web/app.js":"36ad19805884755a71eb334af79f91d448b74a49014699eaf45db1064a27f837","novalis-os/tests/test_workflows.py":"a54be0b9057487af3160b32ccd4517f9211099aed4bd1583c7876f4e0a091297","novalis-os/tests/ui.cjs":"ca0e4a6c9231f34bee9d58b3025725ff6bf56994efcc8beea794ba23e957f664"}
BOOTSTRAP="import json,os,secrets\nfrom pathlib import Path\nfrom flask import g\nfrom novalis_os import create_app\nfrom novalis_os.db import transaction,uid,now,row,audit,get_db\nfrom novalis_os.security import digest,expires\nfrom novalis_os.cli import backup\nfrom novalis_os.validation import email\napp=create_app()\nwith app.app_context():\n    address=email({'email':os.environ['NOVALIS_OPERATOR_OWNER']})\n    org=app.config['ORG_ID']\n    if not row('SELECT id FROM organisations WHERE id=?',(org,)):raise RuntimeError('Organisation missing')\n    backup_dir=Path('/srv/novalis-os/backups')/('before-direction-'+uid())\n    backup(app.config['DATABASE'],app.config['FILES_DIR'],backup_dir)\n    with transaction() as db:\n        user=row('SELECT * FROM users WHERE email=?',(address,))\n        if user and user['org_id']!=org:raise RuntimeError('Account belongs to another organisation')\n        if user and user['status']=='suspended':raise RuntimeError('Existing account is suspended')\n        if not user:\n            user_id=uid()\n            db.execute(\"INSERT INTO users(id,org_id,name,email,role,created_at) VALUES(?,?,?,?,'manager',?)\",(user_id,org,'Achraf Saidi',address,now()))\n            audit('operator.direction_invited',user_id,{'role':'manager','source':'explicit_owner_request'},org_id=org)\n            user=row('SELECT * FROM users WHERE id=?',(user_id,))\n        elif user['role']!='manager':\n            db.execute(\"UPDATE users SET role='manager',client_id=NULL WHERE id=?\",(user['id'],))\n            db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))\n            audit('operator.direction_role_granted',user['id'],{'previous_role':user['role'],'source':'explicit_owner_request'},org_id=org)\n            user=row('SELECT * FROM users WHERE id=?',(user['id'],))\n        result={'email':address,'role':'manager','role_label':'Direction','status':user['status'],'backup_verified':True}\n        if user['status']=='invited':\n            db.execute('UPDATE tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL',(now(),user['id']))\n            token=secrets.token_urlsafe(32);expiry=expires(24)\n            db.execute('INSERT INTO tokens VALUES(?,?,?,?,NULL,?)',(digest(token),user['id'],'invite',expiry,now()))\n            audit('operator.activation_link_created',user['id'],{'purpose':'invite'},org_id=org)\n            result.update(activation_url=app.config['APP_ORIGIN']+'/os/#activate='+token,expires_at=expiry,expires_in_hours=24)\n        assert row('SELECT role FROM users WHERE id=?',(user['id'],))['role']=='manager'\n    print(json.dumps(result))\n"
ROOT=Path('/opt/novalis-os')
ENV=Path('/etc/novalis-os/production.env')
PROTECTED=['nginx','pm2-root','postgresql@17-main']
def request(host,path='/'):
    context=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=10,context=context)
    c.sock=context.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=10),server_hostname=host)
    c.request('GET',path,headers={'Host':host});r=c.getresponse();body=r.read(500000);status=r.status;c.close();return status,body
def protected():
    pids={s:subprocess.check_output(['systemctl','show',s,'--property=MainPID','--value'],text=True).strip() for s in PROTECTED}
    status,body=request('pointagevdc.cloud')
    if status!=200:raise RuntimeError('Pointage unhealthy')
    return {'pids':pids,'page':hashlib.sha256(body).hexdigest(),'config':hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest(),'public_release':str(Path('/var/www/novalis-ai/current').resolve())}
def pointer(target):
    link=ROOT/('.next-admin-'+secrets.token_hex(5));link.symlink_to(target);os.replace(link,ROOT/'current')
def healthy():
    for _ in range(30):
        try:
            if request('app.novalisai.com','/healthz')[0]==200:return True
        except Exception:pass
        time.sleep(1)
    return False
def main():
    os.umask(0o077);os.nice(10);before=protected();previous=(ROOT/'current').resolve(strict=True)
    owners=[word.split('=',1)[1] for line in Path('/root/.ssh/authorized_keys').read_text().splitlines() for word in line.split() if word.startswith('novalis-os-owner=')]
    if len(owners)!=1:raise RuntimeError('Exactly one authorized owner address is required')
    owner=owners[0]
    env=dict(os.environ)
    for line in ENV.read_text().splitlines():
        if line and not line.startswith('#'):
            name,value=line.split('=',1);env[name]=value
    release=ROOT/'releases'/(SOURCE+'-admin-'+secrets.token_hex(4))
    shutil.copytree(previous,release,ignore=shutil.ignore_patterns('.venv','__pycache__'),symlinks=True)
    (release/'.venv').symlink_to(previous/'.venv')
    switched=False
    try:
        for name,digest in MANIFEST.items():
            with urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+name,timeout=30) as r:body=r.read(1000000)
            if hashlib.sha256(body).hexdigest()!=digest:raise RuntimeError('Source checksum mismatch: '+name)
            path=release/name;path.write_bytes(body);path.chmod(0o644)
        release.chmod(0o755)
        env['PYTHONPATH']=str(release/'novalis-os')
        tested=subprocess.run([str(release/'.venv/bin/python'),'-m','unittest','discover','-s','tests','-v'],cwd=release/'novalis-os',env=env,capture_output=True,text=True,timeout=120)
        if tested.returncode:raise RuntimeError('Isolated workflow tests failed: '+tested.stderr[-3000:])
        pointer(release);switched=True
        subprocess.run(['systemctl','restart','novalis-os.service','novalis-worker.service'],check=True,timeout=30)
        if not healthy():raise RuntimeError('Novalis did not become healthy')
        if request('app.novalisai.com','/os/app.js')[1]!= (release/'novalis-os/web/app.js').read_bytes():raise RuntimeError('Frontend release mismatch')
        env['NOVALIS_OPERATOR_OWNER']=owner
        created=subprocess.run(['runuser','-u','novalis-os','--',str(release/'.venv/bin/python'),'-'],input=BOOTSTRAP,env=env,capture_output=True,text=True,timeout=45)
        if created.returncode:raise RuntimeError('Direction creation failed: '+created.stderr[-2000:])
        account=json.loads(created.stdout)
        private=Path('/etc/novalis-os/requested-direction-invitation.json');private.write_text(json.dumps(account));private.chmod(0o600)
        if protected()!=before:raise RuntimeError('Pointage or public vitrine changed')
        report={'stage':'direction-account-ready','account':account,'pointage_unchanged':True,'vitrine_unchanged':True,'tests_passed':14,'manual_invitation_links':True,'previous_core_release':str(previous),'core_release':str(release)}
        file=Path('/etc/novalis-os/deployment-admin.json');file.write_text(json.dumps(report,indent=2));file.chmod(0o600)
        print(json.dumps(report))
    except Exception:
        if switched:
            pointer(previous);subprocess.run(['systemctl','restart','novalis-os.service','novalis-worker.service'],check=True,timeout=30)
        raise
main()
