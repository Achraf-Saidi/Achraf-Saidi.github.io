"""Correct only the requested test Direction account and its MFA exception."""
import hashlib,http.client,json,os,secrets,socket,ssl,stat,subprocess,tempfile
from pathlib import Path
PRIVATE=__ENCRYPTED_PRIVATE_INPUT__
assert PRIVATE['email']=='saidi@novalisai.com'
ROOT=Path('/opt/novalis-os/current').resolve(strict=True)
ENV=Path('/etc/novalis-os/production.env')
def preserved():
    services=['nginx','pm2-root','postgresql@17-main','novalis-worker']
    return {'pids':{s:subprocess.check_output(['systemctl','show',s,'--property=MainPID','--value'],text=True).strip() for s in services},'core':str(Path('/opt/novalis-os/current').resolve()),'public':str(Path('/var/www/novalis-ai/current').resolve())}
before=preserved()
original=ENV.read_bytes();info=ENV.stat();env=dict(os.environ)
for line in original.decode().splitlines():
    if line and not line.startswith('#'):
        key,value=line.split('=',1);env[key]=value
env['PYTHONPATH']=str(ROOT/'novalis-os')
exceptions={x.strip().lower() for x in env.get('NOVALIS_MFA_EXEMPT_EMAILS','').split(',') if x.strip()}
exceptions.add(PRIVATE['email'])
env['NOVALIS_MFA_EXEMPT_EMAILS']=','.join(sorted(exceptions))
child=r'''
import hashlib,json,sys
from werkzeug.security import generate_password_hash
from novalis_os import create_app
from novalis_os.db import transaction,uid,now,row,rows,audit
from novalis_os.security import password_matches
private=json.loads(sys.stdin.read());address=private['email'];old='saidi@novalisiai.com'
app=create_app()
with app.app_context():
    org=app.config['ORG_ID']
    with transaction() as db:
        existing=row('SELECT * FROM users WHERE email=?',(address,))
        previous=row('SELECT * FROM users WHERE email=?',(old,))
        assert not (existing and previous), 'Both addresses already exist; refusing to merge accounts'
        user=existing or previous
        assert user and user['org_id']==org and user['role']=='manager', 'Requested Direction account not found'
        if previous:
            assert row("SELECT 1 FROM audit WHERE action='operator.test_direction_created' AND entity_id=?",(user['id'],)), 'Previous account is not the test account created in this session'
        others=rows('SELECT * FROM users WHERE id!=? ORDER BY id',(user['id'],))
        stored=user['password_hash'] if password_matches(user['password_hash'],private['password']) else generate_password_hash(private['password'],method='scrypt:32768:8:1')
        db.execute("UPDATE users SET email=?,status='active',password_hash=?,verified_at=COALESCE(verified_at,?),totp_cipher=NULL,totp_pending=NULL,totp_counter=-1 WHERE id=?",(address,stored,now(),user['id']))
        db.execute('DELETE FROM recovery_codes WHERE user_id=?',(user['id'],))
        db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
        audit('operator.test_direction_corrected',user['id'],{'previous_email':user['email'],'email':address,'mfa_disabled':True,'source':'explicit_user_request'},org_id=org)
        assert rows('SELECT * FROM users WHERE id!=? ORDER BY id',(user['id'],))==others
        after=row('SELECT * FROM users WHERE id=?',(user['id'],))
        assert after['email']==address and after['status']=='active' and password_matches(after['password_hash'],private['password']) and not after['totp_cipher']
    print(json.dumps({'email':address,'role':'Direction','other_accounts_unchanged':True,'email_corrected':bool(previous)}))
'''
payload=child.replace('private=json.loads(sys.stdin.read())','private='+repr(PRIVATE))
r=subprocess.run(['runuser','-u','novalis-os','--',str(ROOT/'.venv/bin/python'),'-'],input=payload,env=env,cwd=ROOT/'novalis-os',capture_output=True,text=True,timeout=45)
if r.returncode:raise RuntimeError('Account correction failed: '+r.stderr[-1800:])
account=json.loads(r.stdout)
lines=[line for line in original.decode().splitlines() if not line.startswith('NOVALIS_MFA_EXEMPT_EMAILS=')]
lines.append('NOVALIS_MFA_EXEMPT_EMAILS='+env['NOVALIS_MFA_EXEMPT_EMAILS'])
updated=('\n'.join(lines)+'\n').encode()
assert {line for line in original.decode().splitlines() if line and not line.startswith('NOVALIS_MFA_EXEMPT_EMAILS=')}=={line for line in updated.decode().splitlines() if line and not line.startswith('NOVALIS_MFA_EXEMPT_EMAILS=')}
if original!=updated:
    fd,name=tempfile.mkstemp(prefix='.test-direction-',dir=ENV.parent)
    os.fchmod(fd,stat.S_IMODE(info.st_mode));os.fchown(fd,info.st_uid,info.st_gid)
    with os.fdopen(fd,'wb') as f:f.write(updated);f.flush();os.fsync(f.fileno())
    os.replace(name,ENV)
subprocess.run(['systemctl','restart','novalis-os.service'],check=True,timeout=30)
def request(method,path,data=None,cookie=None,csrf=None):
    ctx=ssl.create_default_context();c=http.client.HTTPSConnection('127.0.0.1',timeout=20,context=ctx)
    c.sock=ctx.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=20),server_hostname='app.novalisai.com')
    headers={'Host':'app.novalisai.com','Origin':'https://app.novalisai.com','Content-Type':'application/json'}
    if cookie:headers['Cookie']=cookie
    if csrf:headers['X-CSRF-Token']=csrf
    c.request(method,path,body=json.dumps(data) if data is not None else None,headers=headers)
    resp=c.getresponse();status=resp.status;body=resp.read();head=dict(resp.getheaders());c.close()
    return status,body,head
import time
for attempt in range(20):
    try:
        if request('GET','/healthz')[0]==200:break
    except (OSError,http.client.HTTPException):pass
    time.sleep(1)
else:raise RuntimeError('Novalis did not become healthy')
status,body,headers=request('POST','/api/auth/login',PRIVATE)
assert status==200,'Live login failed'
details=json.loads(body)
assert details['user']['email']==PRIVATE['email'] and details['user']['role']=='manager' and details['mfa_required'] is False, 'Direct login is not enabled'
cookie=next(v.split(';',1)[0] for k,v in headers.items() if k.lower()=='set-cookie')
try:
    users_status,users_body,_=request('GET','/api/users',cookie=cookie)
    assert users_status==200,'Direction access is still limited'
    assert any(u['email']==PRIVATE['email'] and u['role']=='manager' for u in json.loads(users_body)['items'])
finally:
    logout,_,_=request('POST','/api/auth/logout',{},cookie,details['csrf'])
    assert logout==200,'Verification session cleanup failed'
assert preserved()==before,'Unrelated service or deployment changed'
account.update(completed=True,live_login_verified=True,direction_access_verified=True,mfa_required=False,temporary_session_removed=True)
print(json.dumps(account))
