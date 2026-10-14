"""Issue a Novalis certificate and activate its separate Nginx virtual hosts."""
import hashlib
import http.client
import json
import os
import shutil
import ssl
import subprocess
import time
from pathlib import Path

REPORT = {'stage': 'https'}


def run(args, timeout=180):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed: ' + (result.stdout + result.stderr)[-6000:])
    return result.stdout


def local_https(domain, path='/'):
    # Verify the actual VPS with a trusted certificate and exact SNI, regardless
    # of a recursive resolver still caching the previous Vercel address.
    context = ssl.create_default_context()
    connection = http.client.HTTPSConnection('127.0.0.1', timeout=15, context=context)
    import socket
    connection.sock = context.wrap_socket(socket.create_connection(('127.0.0.1', 443), timeout=15), server_hostname=domain)
    connection.request('GET', path, headers={'Host': domain})
    response = connection.getresponse()
    body = response.read(300000)
    output = {'status': response.status, 'location': response.getheader('Location'),
              'sha256': hashlib.sha256(body).hexdigest(), 'server': response.getheader('Server')}
    connection.close()
    return output


def main():
    os.umask(0o022)
    os.nice(10)
    prepared = json.loads(Path('/etc/novalis-os/deployment-prepare.json').read_text())
    if not prepared.get('pointage_unchanged') or not prepared.get('backup_verified'):
        raise RuntimeError('Verified preparation is required.')
    pointage_config = Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()
    pointage_before = local_https('pointagevdc.cloud')
    pids = {unit: run(['systemctl', 'show', unit, '--property=MainPID', '--value']).strip()
            for unit in ['nginx.service', 'pm2-root.service', 'postgresql@17-main.service']}
    certbot = shutil.which('certbot')
    if not certbot:
        raise RuntimeError('Existing certificate tooling is unavailable; no packages changed.')
    command = [certbot, 'certonly', '--webroot', '--webroot-path', '/var/www/novalis-ai/acme',
               '--cert-name', 'novalisai.com', '--non-interactive', '--agree-tos',
               '-d', 'novalisai.com', '-d', 'www.novalisai.com', '-d', 'app.novalisai.com']
    accounts = list(Path('/etc/letsencrypt/accounts/acme-v02.api.letsencrypt.org/directory').glob('*/regr.json'))
    if len(accounts) == 1:
        command.extend(['--account', accounts[0].parent.name])
    elif not accounts:
        command.extend(['--email', 'contact@novalisai.com'])
    else:
        raise RuntimeError('Multiple certificate accounts require an explicit selection.')
    run(command, timeout=240)
    certificate = '/etc/letsencrypt/live/novalisai.com/'
    tls = f'''    ssl_certificate {certificate}fullchain.pem;
    ssl_certificate_key {certificate}privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
'''
    config = '''server {
    listen 80;
    listen [::]:80;
    server_name novalisai.com www.novalisai.com app.novalisai.com;
    location ^~ /.well-known/acme-challenge/ { root /var/www/novalis-ai/acme; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl;
    server_name novalisai.com;
__TLS__
    return 301 https://www.novalisai.com$request_uri;
}
server {
    listen 443 ssl;
    server_name www.novalisai.com;
__TLS__
    root /var/www/novalis-ai/current;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://app.novalisai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
    location ~ /\\. { return 404; }
    location ~* \\.(py|sql|sqlite|sqlite3|sh|ya?ml)$ { return 404; }
    location ~ ^/(qa|docs|deploy|novalis-os)/ { return 404; }
    location / { try_files $uri $uri/ =404; }
}
server {
    listen 443 ssl;
    server_name app.novalisai.com;
__TLS__
    client_max_body_size 8m;
    add_header X-Robots-Tag "noindex, nofollow" always;
    location / {
        proxy_pass http://127.0.0.1:18080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 35s;
    }
}
'''.replace('__TLS__', tls)
    available = Path('/etc/nginx/sites-available/zz-novalisai')
    enabled = Path('/etc/nginx/sites-enabled/zz-novalisai')
    http_link = Path('/etc/nginx/sites-enabled/novalisai')
    if available.exists() or enabled.exists():
        if not enabled.is_symlink() or enabled.resolve() != available or available.read_text() != config:
            raise RuntimeError('Existing TLS configuration differs from this qualified release.')
    else:
        available.write_text(config)
        available.chmod(0o644)
        enabled.symlink_to(available)
        http_link.unlink()
        try:
            run(['/usr/sbin/nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
        except Exception:
            enabled.unlink(missing_ok=True)
            http_link.symlink_to('/etc/nginx/sites-available/novalisai')
            raise
    # systemctl returns after signalling Nginx; wait for the new TLS workers.
    for attempt in range(20):
        try:
            local_https('novalisai.com')
            break
        except (ssl.SSLError, OSError):
            if attempt == 19:
                raise
            time.sleep(1)
    checks = {
        'root': local_https('novalisai.com'),
        'public': local_https('www.novalisai.com'),
        'fr': local_https('www.novalisai.com', '/fr/'),
        'en': local_https('www.novalisai.com', '/en/'),
        'nl': local_https('www.novalisai.com', '/nl/'),
        'de': local_https('www.novalisai.com', '/de/'),
        'erp': local_https('app.novalisai.com', '/os/'),
        'api': local_https('app.novalisai.com', '/healthz'),
        'private_route': local_https('app.novalisai.com', '/api/projects'),
        'source_blocked': local_https('www.novalisai.com', '/build.py')}
    if checks['root']['status'] != 301 or any(checks[k]['status'] != 200 for k in ['public', 'fr', 'en', 'nl', 'de', 'erp', 'api']):
        raise RuntimeError('HTTPS route verification failed.')
    if checks['private_route']['status'] != 401 or checks['source_blocked']['status'] != 404:
        raise RuntimeError('Private route verification failed.')
    pointage_after = local_https('pointagevdc.cloud')
    after_pids = {unit: run(['systemctl', 'show', unit, '--property=MainPID', '--value']).strip() for unit in pids}
    if pointage_before != pointage_after or pids != after_pids or Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes() != pointage_config:
        raise RuntimeError('Pointage preservation check failed.')
    # Register a deploy hook only for the new certificate; existing renewal
    # parameters and the pointage certificate remain as they were.
    hook = Path('/usr/local/sbin/novalis-renew-nginx')
    hook.write_text('#!/bin/sh\nset -eu\n/usr/sbin/nginx -t\n/bin/systemctl reload nginx\n')
    hook.chmod(0o750)
    renewal = Path('/etc/letsencrypt/renewal/novalisai.com.conf')
    contents = renewal.read_text()
    if '[renewalparams]' not in contents:
        raise RuntimeError('Unexpected certificate renewal configuration.')
    contents = '\n'.join(line for line in contents.splitlines() if not line.startswith('renew_hook =')) + '\n'
    contents = contents.replace('[renewalparams]', '[renewalparams]\nrenew_hook = /usr/local/sbin/novalis-renew-nginx', 1)
    renewal.write_text(contents)
    run([certbot, 'renew', '--dry-run', '--cert-name', 'novalisai.com', '--non-interactive'], timeout=240)
    timer = run(['systemctl', 'is-active', 'certbot.timer']).strip()
    REPORT.update(https='active', checks=checks, pointage_unchanged=True, service_pids_unchanged=True,
                  renewal_test='passed', certificate_timer=timer,
                  certificate=run(['openssl', 'x509', '-in', certificate + 'fullchain.pem', '-noout', '-enddate', '-ext', 'subjectAltName']))
    path = Path('/etc/novalis-os/deployment-https.json')
    path.write_text(json.dumps(REPORT, indent=2));path.chmod(0o600)
    print(json.dumps(REPORT))


try:
    main()
except Exception as error:
    print(json.dumps(dict(REPORT, error=str(error), completed=False)))
    raise
