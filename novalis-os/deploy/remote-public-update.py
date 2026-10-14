"""Publish the verified portal/privacy wording without restarting either app."""
import hashlib
import http.client
import json
import os
import secrets
import shutil
import socket
import ssl
import subprocess
import tempfile
import urllib.request
from pathlib import Path

CONTENT_RELEASE = 'a4392e5855faa96822ec139dbb8116847c0c5908'
CORE = Path('/opt/novalis-os/current')
PUBLIC = Path('/var/www/novalis-ai')
REPORT = {'stage': 'public-content-update', 'content_release': CONTENT_RELEASE}


def pointage():
    with urllib.request.urlopen('https://pointagevdc.cloud/', timeout=15) as response:
        return response.status, hashlib.sha256(response.read(300000)).hexdigest()


def main():
    os.umask(0o077)
    os.nice(10)
    before = pointage()
    before_proxy = Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()
    temp = Path(tempfile.mkdtemp(prefix='novalis-public-build-'))
    output = PUBLIC / 'releases' / (CONTENT_RELEASE + '-' + secrets.token_hex(4))
    try:
        site = temp / 'novalisai'
        shutil.copytree(CORE / 'novalisai', site)
        url = f'https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/{CONTENT_RELEASE}/novalisai/extension.json'
        with urllib.request.urlopen(url, timeout=30) as response:
            content = response.read(200000)
        data = json.loads(content)
        if set(data) != {'fr', 'en', 'nl', 'de'}:
            raise RuntimeError('Unexpected locale package.')
        (site / 'extension.json').write_bytes(content)
        deploy = temp / 'novalis-os/deploy'
        deploy.mkdir(parents=True)
        script = deploy / 'prepare-public.py'
        shutil.copy2(CORE / 'novalis-os/deploy/prepare-public.py', script)
        result = subprocess.run([str(CORE / '.venv/bin/python'), str(script), '--output', str(output),
                                 '--site-url', 'https://www.novalisai.com',
                                 '--api-origin', 'https://app.novalisai.com',
                                 '--portal-url', 'https://app.novalisai.com/os/'],
                                capture_output=True, text=True, timeout=60)
        if result.returncode:
            raise RuntimeError('Public package failed: ' + result.stderr[-2000:])
        if len(list(output.rglob('*.html'))) != 57:
            raise RuntimeError('Public page count changed unexpectedly.')
        if json.loads((output / 'runtime-config.json').read_text())['api_origin'] != 'https://app.novalisai.com':
            raise RuntimeError('Unexpected backend binding.')
        for path in [output, *output.rglob('*')]:
            path.chmod(0o755 if path.is_dir() else 0o644)
        link = PUBLIC / ('.next-' + secrets.token_hex(6))
        link.symlink_to(output)
        os.replace(link, PUBLIC / 'current')
        if pointage() != before or Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes() != before_proxy:
            raise RuntimeError('Pointage preservation check failed.')
        REPORT.update(public_pages=57, pointage_unchanged=True)
        for language in ['fr', 'en', 'nl', 'de']:
            for page in ['espace-client', 'confidentialite']:
                context = ssl.create_default_context()
                connection = http.client.HTTPSConnection('127.0.0.1', timeout=15, context=context)
                connection.sock = context.wrap_socket(socket.create_connection(('127.0.0.1', 443), timeout=15), server_hostname='www.novalisai.com')
                connection.request('GET', f'/{language}/{page}/', headers={'Host': 'www.novalisai.com'})
                response = connection.getresponse()
                body = response.read(200000)
                connection.close()
                if response.status != 200 or hashlib.sha256(body).hexdigest() != hashlib.sha256((output / language / page / 'index.html').read_bytes()).hexdigest():
                    raise RuntimeError('Published page does not match its release.')
        path = Path('/etc/novalis-os/deployment-public.json')
        path.write_text(json.dumps(REPORT, indent=2));path.chmod(0o600)
        print(json.dumps(REPORT))
    finally:
        shutil.rmtree(temp)


try:
    main()
except Exception as error:
    print(json.dumps(dict(REPORT, error=str(error), completed=False)))
    raise
