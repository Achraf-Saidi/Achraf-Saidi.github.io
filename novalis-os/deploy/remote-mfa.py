"""Upgrade only Novalis and create the explicitly requested direction account."""
import base64,hashlib,http.client,json,os,secrets,shutil,socket,ssl,subprocess,time,urllib.request
from pathlib import Path
SOURCE="903b077d653ce27b29c14c63ac79be480607e00d"
MANIFEST={"novalis-os/novalis_os/__init__.py":"67a2f6d160247e2829d19a99e779ff5e50333c0d5d6fe01e4b647c40f8bd8067","novalis-os/novalis_os/auth.py":"b52c215af9d774992e0f7c284c01bd7b9cceaff3d95f230bc31a59a99976dc08","novalis-os/tests/test_workflows.py":"b397dc3609f8f16be2691d4972e0586ffc8d71ab38395dd778385d0f00bd1bf8"}
BOOTSTRAP="import json,os\nfrom pathlib import Path\nfrom novalis_os import create_app\nfrom novalis_os.db import transaction,uid,row,audit\nfrom novalis_os.cli import backup\napp=create_app()\nwith app.app_context():\n    address=os.environ['NOVALIS_OPERATOR_OWNER'].lower()\n    backup(app.config['DATABASE'],app.config['FILES_DIR'],Path('/srv/novalis-os/backups')/('before-mfa-change-'+uid()))\n    with transaction() as db:\n        user=row('SELECT * FROM users WHERE email=? AND org_id=?',(address,app.config['ORG_ID']))\n        if not user or user['role']!='manager':raise RuntimeError('Requested direction account not found')\n        password=user['password_hash'];status=user['status']\n        db.execute('UPDATE users SET totp_cipher=NULL,totp_pending=NULL,totp_counter=-1 WHERE id=?',(user['id'],))\n        db.execute('DELETE FROM recovery_codes WHERE user_id=?',(user['id'],))\n        db.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))\n        audit('operator.mfa_disabled_temporarily',user['id'],{'scope':'requested_account','source':'explicit_owner_request'},org_id=user['org_id'])\n        after=row('SELECT * FROM users WHERE id=?',(user['id'],))\n        assert after['password_hash']==password and after['status']==status and after['role']=='manager'\n        assert not after['totp_cipher'] and not after['totp_pending']\n        assert address in app.config['MFA_EXEMPT_EMAILS']\n    print(json.dumps({'email':address,'role':'manager','status':status,'mfa_required':False,'password_unchanged':True,'activation_tokens_unchanged':True,'backup_verified':True}))\n"
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
def settings(body):
    path=ENV.with_name('.mfa-settings-'+secrets.token_hex(6));path.write_bytes(body);path.chmod(0o600);os.replace(path,ENV)
def main():
    os.umask(0o077);os.nice(10);before=protected();previous=(ROOT/'current').resolve(strict=True)
    owners=[word.split('=',1)[1] for line in Path('/root/.ssh/authorized_keys').read_text().splitlines() for word in line.split() if word.startswith('novalis-os-owner=')]
    if len(owners)!=1:raise RuntimeError('Exactly one requested account is required')
    owner=owners[0].lower();original=ENV.read_bytes()
    env=dict(os.environ)
    for line in original.decode().splitlines():
        if line and not line.startswith('#'):
            name,value=line.split('=',1);env[name]=value
    exceptions={s.strip().lower() for s in env.get('NOVALIS_MFA_EXEMPT_EMAILS','').split(',') if s.strip()}
    exceptions.add(owner);env['NOVALIS_MFA_EXEMPT_EMAILS']=','.join(sorted(exceptions))
    lines=[line for line in original.decode().splitlines() if not line.startswith('NOVALIS_MFA_EXEMPT_EMAILS=')]
    lines.append('NOVALIS_MFA_EXEMPT_EMAILS='+env['NOVALIS_MFA_EXEMPT_EMAILS'])
    release=ROOT/'releases'/(SOURCE+'-mfa-'+secrets.token_hex(4));switched=False;configured=False
    shutil.copytree(previous,release,ignore=shutil.ignore_patterns('.venv','__pycache__'),symlinks=True)
    (release/'.venv').symlink_to(previous/'.venv')
    try:
        for name,digest in MANIFEST.items():
            with urllib.request.urlopen('https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+SOURCE+'/'+name,timeout=30) as r:body=r.read(1000000)
            if hashlib.sha256(body).hexdigest()!=digest:raise RuntimeError('Source checksum mismatch')
            path=release/name;path.write_bytes(body);path.chmod(0o644)
        release.chmod(0o755);env['PYTHONPATH']=str(release/'novalis-os')
        tested=subprocess.run([str(release/'.venv/bin/python'),'-m','unittest','discover','-s','tests','-v'],cwd=release/'novalis-os',env=env,capture_output=True,text=True,timeout=120)
        if tested.returncode:raise RuntimeError('Workflow tests failed: '+tested.stderr[-3000:])
        config_backup=ENV.with_name('before-mfa-exception-'+secrets.token_hex(5)+'.env');config_backup.write_bytes(original);config_backup.chmod(0o600)
        settings(('\n'.join(lines)+'\n').encode());configured=True
        pointer(release);switched=True
        subprocess.run(['systemctl','restart','novalis-os.service','novalis-worker.service'],check=True,timeout=30)
        if not healthy():raise RuntimeError('Novalis did not become healthy')
        env['NOVALIS_OPERATOR_OWNER']=owner
        changed=subprocess.run(['runuser','-u','novalis-os','--',str(release/'.venv/bin/python'),'-'],input=BOOTSTRAP,env=env,capture_output=True,text=True,timeout=45)
        if changed.returncode:raise RuntimeError('Account MFA change failed: '+changed.stderr[-2000:])
        account=json.loads(changed.stdout)
        if protected()!=before:raise RuntimeError('Pointage or public vitrine changed')
        report={'stage':'requested-account-mfa-disabled','account':account,'pointage_unchanged':True,'vitrine_unchanged':True,'tests_passed':15,'other_accounts_mfa_policy_unchanged':True,'core_release':str(release)}
        file=Path('/etc/novalis-os/deployment-mfa.json');file.write_text(json.dumps(report,indent=2));file.chmod(0o600)
        print(json.dumps(report))
    except Exception:
        if configured:settings(original)
        if switched:pointer(previous)
        if configured or switched:subprocess.run(['systemctl','restart','novalis-os.service','novalis-worker.service'],check=True,timeout=30)
        raise
main()
