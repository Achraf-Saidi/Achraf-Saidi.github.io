"""Create only the explicitly requested test Direction account; no application deploy."""
import hashlib,json,os,subprocess
from pathlib import Path
PRIVATE=__ENCRYPTED_PRIVATE_INPUT__
ROOT=Path('/opt/novalis-os/current').resolve(strict=True)
ENV=Path('/etc/novalis-os/production.env')
def baseline():
    services=['nginx','pm2-root','postgresql@17-main','novalis-os','novalis-worker']
    return {'pids':{s:subprocess.check_output(['systemctl','show',s,'--property=MainPID','--value'],text=True).strip() for s in services},'core':str(Path('/opt/novalis-os/current').resolve()),'public':str(Path('/var/www/novalis-ai/current').resolve()),'env_sha':hashlib.sha256(ENV.read_bytes()).hexdigest()}
before=baseline()
env=dict(os.environ)
for line in ENV.read_text().splitlines():
    if line and not line.startswith('#'):
        key,value=line.split('=',1);env[key]=value
env['PYTHONPATH']=str(ROOT/'novalis-os')
child=r'''
import json,sys
from flask import g
from werkzeug.security import generate_password_hash
from novalis_os import create_app
from novalis_os.db import transaction,uid,now,row,rows,audit
from novalis_os.security import password_matches
private=json.loads(sys.stdin.read())
address=private['email']
assert address=='saidi@novalisiai.com'
app=create_app()
with app.app_context():
    org=app.config['ORG_ID']
    assert row('SELECT id FROM organisations WHERE id=?',(org,)), 'Organisation missing'
    with transaction() as db:
        other_before=rows('SELECT * FROM users WHERE email!=? ORDER BY id',(address,))
        existing=row('SELECT * FROM users WHERE email=?',(address,))
        if existing:
            assert existing['org_id']==org and existing['role']=='manager' and existing['status']=='active' and password_matches(existing['password_hash'],private['password']), 'Account already exists with different settings; no overwrite performed'
            user_id=existing['id'];created=False
        else:
            user_id=uid()
            stored=generate_password_hash(private['password'],method='scrypt:32768:8:1')
            assert password_matches(stored,private['password'])
            db.execute("INSERT INTO users(id,org_id,name,email,role,status,password_hash,verified_at,created_at) VALUES(?,?,?,?,'manager','active',?,?,?)",(user_id,org,'Achraf Saidi — test',address,stored,now(),now()))
            db.execute('INSERT INTO user_profiles VALUES(?,?,?,?)',(user_id,'Direction — compte de test','employee',now()))
            audit('operator.test_direction_created',user_id,{'role':'manager','source':'explicit_user_request'},org_id=org)
            created=True
        assert rows('SELECT * FROM users WHERE email!=? ORDER BY id',(address,))==other_before, 'Other accounts changed'
    user=row('SELECT * FROM users WHERE id=?',(user_id,))
    assert user['role']=='manager' and user['status']=='active' and password_matches(user['password_hash'],private['password'])
    origin=app.config['APP_ORIGIN']
    client=app.test_client()
    login=client.post('/api/auth/login',base_url=origin,headers={'Origin':origin},json={'email':address,'password':private['password']})
    assert login.status_code==200, 'Login verification failed'
    details=login.get_json()
    assert details['user']['email']==address and details['user']['role']=='manager'
    logout=client.post('/api/auth/logout',base_url=origin,headers={'Origin':origin,'X-CSRF-Token':details['csrf']},json={})
    assert logout.status_code==200, 'Verification session cleanup failed'
    assert rows('SELECT * FROM users WHERE email!=? ORDER BY id',(address,))==other_before, 'Other accounts changed'
    print(json.dumps({'completed':True,'created':created,'email':address,'role':'Direction','status':'active','login_verified':True,'mfa_enrollment_required':details['mfa_required'],'other_accounts_unchanged':True}))
'''
payload=child.replace("private=json.loads(sys.stdin.read())","private="+repr(PRIVATE))
result=subprocess.run(['runuser','-u','novalis-os','--',str(ROOT/'.venv/bin/python'),'-'],input=payload,env=env,cwd=ROOT/'novalis-os',capture_output=True,text=True,timeout=60)
if result.returncode:
    raise RuntimeError('Account operation failed: '+result.stderr[-1800:])
assert baseline()==before, 'Service or environment changed'
print(result.stdout.strip())

# Temporary VPS access explicitly approved by the owner on 2026-10-18.
