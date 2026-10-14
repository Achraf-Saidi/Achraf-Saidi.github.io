"""Prepare Novalis on the qualified VPS; preserve the existing pointage stack."""
import base64
import hashlib
import json
import os
import pwd
import secrets
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import urllib.request
import venv
from datetime import datetime, timezone
from pathlib import Path

RELEASE = '4bebb5f4bf6ca6dfb30efc526eb65a0886a7bba6'
ROOT = Path('/opt/novalis-os')
SOURCE = ROOT / 'releases' / RELEASE
BACKUP = Path('/var/backups') / ('novalis-predeploy-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
REPORT = {'stage': 'prepare', 'release': RELEASE}


def run(args, timeout=180, stdout=None, env=None, cwd=None):
    result = subprocess.run(args, stdout=stdout or subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=timeout, env=env, cwd=cwd)
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed: ' + result.stderr.decode('utf-8', 'replace')[-4000:])
    return result.stdout.decode('utf-8', 'replace') if stdout is None else ''


def checksum(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1048576), b''):
            h.update(block)
    return h.hexdigest()


def probe(url):
    with urllib.request.urlopen(url, timeout=15) as response:
        return {'status': response.status, 'sha256': hashlib.sha256(response.read(300000)).hexdigest()}


def private_write(path, content, mode=0o600):
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, mode)
    with os.fdopen(fd, 'w') as stream:
        stream.write(content)


def main():
    os.umask(0o077)
    os.nice(10)
    if not Path('/var/www/time-tracking').is_dir() or not Path('/etc/nginx/sites-enabled/pointagevdc').exists():
        raise RuntimeError('Qualified pointage layout changed; preparation stopped.')
    run(['/usr/sbin/nginx', '-t'])
    before = probe('https://pointagevdc.cloud/')
    proxy_original = Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()
    pids = {unit: run(['systemctl', 'show', unit, '--property=MainPID', '--value']).strip()
            for unit in ['nginx.service', 'pm2-root.service', 'postgresql@17-main.service']}
    with socket.socket() as check:
        check.bind(('127.0.0.1', 18080))
    BACKUP.mkdir(mode=0o700)
    REPORT['backup'] = str(BACKUP)
    run(['tar', '-czf', str(BACKUP / 'nginx.tar.gz'), '-C', '/etc', 'nginx'])
    run(['nice', '-n', '15', 'tar', '--exclude=node_modules', '--exclude=.git', '--exclude=*.log',
         '-czf', str(BACKUP / 'pointage-source.tar.gz'), '-C', '/var/www', 'time-tracking'], timeout=300)
    if Path('/root/.pm2/dump.pm2').is_file():
        shutil.copy2('/root/.pm2/dump.pm2', BACKUP / 'pm2-dump.json')
    if Path('/etc/systemd/system/pm2-root.service').exists():
        shutil.copy2('/etc/systemd/system/pm2-root.service', BACKUP / 'pm2-root.service')
    databases = run(['runuser', '-u', 'postgres', '--', 'psql', '-At', '-c',
                     "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres' ORDER BY datname;"]).splitlines()
    with (BACKUP / 'postgres-globals.sql').open('wb') as stream:
        run(['runuser', '-u', 'postgres', '--', 'pg_dumpall', '--globals-only'], stdout=stream)
    verified = []
    for name in databases:
        dump = BACKUP / ('database-' + hashlib.sha256(name.encode()).hexdigest()[:12] + '.dump')
        with dump.open('wb') as stream:
            run(['runuser', '-u', 'postgres', '--', 'pg_dump', '--format=custom', '--dbname', name], stdout=stream, timeout=300)
        dump.chmod(0o600)
        run(['pg_restore', '--list', str(dump)])
        # The test database is newly created, uniquely named and unrelated to the live app.
        temporary = 'novalis_restore_check_' + secrets.token_hex(6)
        run(['runuser', '-u', 'postgres', '--', 'createdb', '--template=template0', temporary])
        try:
            # Send the private dump over stdin: postgres cannot traverse the root-only backup directory.
            with dump.open('rb') as stream:
                result = subprocess.run(['runuser', '-u', 'postgres', '--', 'pg_restore', '--exit-on-error',
                                         '--no-owner', '--no-privileges', '--dbname', temporary],
                                        stdin=stream, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
            if result.returncode:
                raise RuntimeError('Isolated PostgreSQL restore failed: ' + result.stderr.decode()[-2000:])
            verified.append({'database': name, 'archive': dump.name, 'size': dump.stat().st_size, 'restore_verified': True})
        finally:
            run(['runuser', '-u', 'postgres', '--', 'dropdb', '--if-exists', temporary])
    manifest = {p.name: checksum(p) for p in BACKUP.iterdir() if p.is_file()}
    private_write(BACKUP / 'manifest.json', json.dumps({'files': manifest, 'databases': verified,
                  'pointage_before': before, 'service_pids': pids}, indent=2))
    REPORT['backup_verified'] = True
    REPORT['database_count'] = len(verified)

    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    if SOURCE.exists():
        raise RuntimeError('Release destination already exists; review it before retrying.')
    SOURCE.mkdir()
    archive = BACKUP / 'novalis-source.tar.gz'
    url = f'https://codeload.github.com/Achraf-Saidi/Achraf-Saidi.github.io/tar.gz/{RELEASE}'
    with urllib.request.urlopen(url, timeout=60) as response, archive.open('wb') as output:
        total = 0
        while block := response.read(1048576):
            total += len(block)
            if total > 300 * 1048576:
                raise RuntimeError('Source archive exceeds the qualified size budget.')
            output.write(block)
    with tarfile.open(archive) as package:
        for member in package:
            bits = Path(member.name).parts
            if len(bits) < 2 or bits[1] not in {'novalis-os', 'novalisai'}:
                continue
            relative = Path(*bits[1:])
            destination = (SOURCE / relative).resolve()
            if not destination.is_relative_to(SOURCE.resolve()) or '..' in relative.parts:
                raise RuntimeError('Unsafe source archive path.')
            if member.isdir():
                destination.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                destination.parent.mkdir(parents=True, exist_ok=True)
                with package.extractfile(member) as stream, destination.open('wb') as output:
                    shutil.copyfileobj(stream, output)
                destination.chmod(0o644)
            else:
                raise RuntimeError('Unexpected archive entry type.')
    venv.EnvBuilder(with_pip=False).create(SOURCE / '.venv')
    python = SOURCE / '.venv/bin/python'
    with urllib.request.urlopen('https://pypi.org/pypi/pip/json', timeout=30) as response:
        pip_info = json.load(response)
    wheel = next(f for f in pip_info['urls'] if f['filename'].endswith('.whl'))
    wheel_path = BACKUP / wheel['filename']
    with urllib.request.urlopen(wheel['url'], timeout=30) as response, wheel_path.open('wb') as output:
        shutil.copyfileobj(response, output)
    if checksum(wheel_path) != wheel['digests']['sha256']:
        raise RuntimeError('Pip bootstrap integrity failed.')
    env = dict(os.environ, PYTHONPATH=str(wheel_path))
    run([str(python), '-m', 'pip', '--isolated', 'install', '--no-index', str(wheel_path)], env=env)
    run([str(python), '-m', 'pip', '--isolated', 'install', '--index-url', 'https://pypi.org/simple',
         '--only-binary=:all:', '--no-cache-dir', '--disable-pip-version-check',
         '-r', str(SOURCE / 'novalis-os/requirements.txt')], timeout=300)
    run([str(python), '-m', 'unittest', 'discover', '-s', 'tests', '-v'],
        cwd=SOURCE / 'novalis-os', timeout=120)
    REPORT['backend_tests'] = 'passed'

    try:
        account = pwd.getpwnam('novalis-os')
        if account.pw_uid == 0:
            raise RuntimeError('Unsafe application account.')
    except KeyError:
        run(['useradd', '--system', '--user-group', '--home-dir', '/srv/novalis-os', '--shell', '/usr/sbin/nologin', 'novalis-os'])
        account = pwd.getpwnam('novalis-os')
    for path in [Path('/srv/novalis-os'), Path('/srv/novalis-os/data'), Path('/srv/novalis-os/backups')]:
        path.mkdir(exist_ok=True, parents=True)
        path.chmod(0o700)
        os.chown(path, account.pw_uid, account.pw_gid)
    config = Path('/etc/novalis-os')
    config.mkdir(mode=0o700, exist_ok=True)
    key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
    values = {
        'PYTHONUNBUFFERED': '1', 'PYTHONDONTWRITEBYTECODE': '1',
        'NOVALIS_MODE': 'production', 'NOVALIS_APP_ORIGIN': 'https://app.novalisai.com',
        'NOVALIS_PUBLIC_ORIGINS': 'https://www.novalisai.com,https://novalisai.com',
        'NOVALIS_ORG_ID': 'novalis', 'NOVALIS_DATA_DIR': '/srv/novalis-os/data',
        'NOVALIS_BACKUP_DIR': '/srv/novalis-os/backups', 'NOVALIS_TRUST_PROXY': 'true',
        'NOVALIS_ENCRYPTION_KEY': key, 'NOVALIS_MAIL_ENABLED': 'false',
        'NOVALIS_SMTP_FROM': 'contact@novalisai.com'}
    private_write(config / 'production.env', ''.join(f'{k}={v}\n' for k, v in values.items()))
    # Source code is public and read-only to the service; only ERP data is writable.
    for path in [ROOT, ROOT / 'releases', SOURCE]:
        path.chmod(0o755)
    for path in SOURCE.rglob('*'):
        if path.is_symlink():
            continue
        if path.is_dir():
            path.chmod(0o755)
        elif path.is_file():
            path.chmod(0o755 if path.stat().st_mode & 0o111 else 0o644)
    current = ROOT / 'current'
    if current.exists() or current.is_symlink():
        raise RuntimeError('Existing Novalis release requires an explicit upgrade procedure.')
    current.symlink_to(SOURCE)
    operator_env = dict(os.environ, **values, PYTHONPATH=str(SOURCE / 'novalis-os'))
    run(['runuser', '-u', 'novalis-os', '--', str(python), '-m', 'novalis_os.cli', 'migrate'], env=operator_env)
    bootstrap = '''import json,secrets
from novalis_os import create_app
from novalis_os.db import transaction,uid,now
from novalis_os.security import digest,expires
app=create_app()
with app.app_context(),transaction() as db:
    if db.execute("SELECT id FROM users WHERE role='manager'").fetchone():
        raise RuntimeError('Manager already exists')
    db.execute('INSERT INTO organisations VALUES(?,?)',('novalis','Novalis AI'))
    user_id=uid();token=secrets.token_urlsafe(32)
    db.execute("INSERT INTO users(id,org_id,name,email,role,created_at) VALUES(?,?,?,?,'manager',?)",(user_id,'novalis','Achraf Saidi','achraf@novalisai.com',now()))
    db.execute('INSERT INTO tokens VALUES(?,?,?,?,NULL,?)',(digest(token),user_id,'invite',expires(24),now()))
    print(json.dumps({'email':'achraf@novalisai.com','activation_url':app.config['APP_ORIGIN']+'/os/#activate='+token,'expires_in_hours':24}))
'''
    result = subprocess.run(['runuser', '-u', 'novalis-os', '--', str(python), '-'], input=bootstrap.encode(),
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=operator_env, timeout=20)
    if result.returncode:
        raise RuntimeError('Owner bootstrap failed: ' + result.stderr.decode()[-2000:])
    invitation = json.loads(result.stdout)
    private_write(config / 'owner-invitation.json', json.dumps(invitation))
    REPORT['owner_invitation'] = invitation

    public = Path('/var/www/novalis-ai/releases') / RELEASE
    public.parent.mkdir(parents=True, exist_ok=True)
    run([str(python), str(SOURCE / 'novalis-os/deploy/prepare-public.py'), '--output', str(public),
         '--site-url', 'https://www.novalisai.com', '--api-origin', 'https://app.novalisai.com',
         '--portal-url', 'https://app.novalisai.com/os/'])
    for path in [Path('/var/www/novalis-ai'), public.parent, public]:
        path.chmod(0o755)
    for path in public.rglob('*'):
        path.chmod(0o755 if path.is_dir() else 0o644)
    (Path('/var/www/novalis-ai') / 'current').symlink_to(public)
    acme = Path('/var/www/novalis-ai/acme')
    acme.mkdir(mode=0o755)
    acme.chmod(0o755)
    REPORT['public_pages'] = len(list(public.rglob('*.html')))
    base_unit = '''[Unit]
Description=Novalis OS
After=network.target
[Service]
Type=simple
User=novalis-os
Group=novalis-os
WorkingDirectory=/opt/novalis-os/current/novalis-os
EnvironmentFile=/etc/novalis-os/production.env
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
CapabilityBoundingSet=
ReadWritePaths=/srv/novalis-os/data /srv/novalis-os/backups
TasksMax=64
Nice=10
IOSchedulingClass=idle
MemoryMax=__MEMORY_LIMIT__
CPUQuota=__CPU_LIMIT__
ExecStart=__EXEC_START__
[Install]
WantedBy=multi-user.target
'''
    units = {
        'novalis-os.service': ('512M', '50%', '/opt/novalis-os/current/.venv/bin/gunicorn --bind 127.0.0.1:18080 --workers 1 --threads 2 --timeout 30 novalis_os:create_app()'),
        'novalis-worker.service': ('256M', '15%', '/opt/novalis-os/current/.venv/bin/python -m novalis_os.worker')}
    for name, (memory, cpu, command) in units.items():
        text = base_unit.replace('__MEMORY_LIMIT__', memory).replace('__CPU_LIMIT__', cpu).replace('__EXEC_START__', command)
        private_write(Path('/etc/systemd/system') / name, text, mode=0o644)
    run(['systemd-analyze', 'verify'] + [str(Path('/etc/systemd/system') / name) for name in units])
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'enable', '--now', 'novalis-os.service', 'novalis-worker.service'])
    for _ in range(20):
        try:
            REPORT['backend_health'] = probe('http://127.0.0.1:18080/healthz')
            break
        except Exception:
            time.sleep(1)
    if 'backend_health' not in REPORT:
        raise RuntimeError('Backend did not become healthy.')

    http = '''server {
    listen 80;
    listen [::]:80;
    server_name novalisai.com www.novalisai.com app.novalisai.com;
    location ^~ /.well-known/acme-challenge/ { root /var/www/novalis-ai/acme; }
    location / { return 301 https://$host$request_uri; }
}
'''
    available = Path('/etc/nginx/sites-available/novalisai')
    enabled = Path('/etc/nginx/sites-enabled/novalisai')
    private_write(available, http, mode=0o644)
    enabled.symlink_to(available)
    try:
        run(['/usr/sbin/nginx', '-t'])
        run(['systemctl', 'reload', 'nginx'])
    except Exception:
        enabled.unlink(missing_ok=True)
        raise
    if Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes() != proxy_original:
        raise RuntimeError('Pointage proxy file changed unexpectedly.')
    after = probe('https://pointagevdc.cloud/')
    after_pids = {unit: run(['systemctl', 'show', unit, '--property=MainPID', '--value']).strip() for unit in pids}
    if before != after or pids != after_pids:
        raise RuntimeError('Pointage baseline changed unexpectedly.')
    REPORT.update(pointage_unchanged=True, service_pids_unchanged=True,
                  services={name: run(['systemctl', 'is-active', name]).strip() for name in units},
                  ssl_status='pending', dns_status='unchanged')
    private_write(config / 'deployment-prepare.json', json.dumps(REPORT, indent=2))


try:
    main()
    print(json.dumps(REPORT))
except Exception as error:
    REPORT.update(error=str(error), completed=False)
    print(json.dumps(REPORT))
    raise
