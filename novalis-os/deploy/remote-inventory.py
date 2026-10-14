"""Read-only inventory. No package, service, firewall, DNS or data changes."""
import hashlib
import json
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path


def safe(text):
    return '\n'.join('[redacted sensitive configuration line]' if
                     re.search(r'password|authorization|api[_-]?key|secret|token\s*[=:]', line, re.I)
                     else line for line in text.splitlines())


def command(args, timeout=15):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return {'returncode': result.returncode, 'stdout': safe(result.stdout[:100000]),
                'stderr': safe(result.stderr[:10000])}
    except (OSError, subprocess.TimeoutExpired) as e:
        return {'error': type(e).__name__}


report = {
    'os': Path('/etc/os-release').read_text(),
    'memory': Path('/proc/meminfo').read_text(),
    'load': Path('/proc/loadavg').read_text(),
    'disk': command(['df', '-h']),
    'listeners': command(['ss', '-lntp']),
    'processes': command(['ps', '-eo', 'pid,ppid,comm,user,pcpu,pmem', '--sort=-pcpu']),
    'services': command(['systemctl', 'list-units', '--type=service', '--state=running', '--no-pager', '--no-legend']),
    'directories': {},
    'service_details': {},
}
for root in ['/srv', '/var/www', '/opt']:
    path = Path(root)
    report['directories'][root] = [str(p) for p in path.glob('*')][:100] if path.exists() else []
for line in report['services'].get('stdout', '').splitlines():
    unit = line.split()[0] if line.split() else ''
    if re.fullmatch(r'[A-Za-z0-9_.@:-]+\.service', unit):
        report['service_details'][unit] = command([
            'systemctl', 'show', unit, '--no-pager',
            '--property=Id,ActiveState,User,WorkingDirectory,ExecStart,FragmentPath,EnvironmentFiles'])
nginx = shutil.which('nginx') or ('/usr/sbin/nginx' if Path('/usr/sbin/nginx').exists() else None)
if nginx:
    report['nginx'] = command([nginx, '-T'])
if shutil.which('docker'):
    report['docker'] = command(['docker', 'ps', '--format', '{{.Names}} {{.Image}} {{.Ports}}'])
    report['docker_stats'] = command(['docker', 'stats', '--no-stream', '--format', '{{.Name}} {{.CPUPerc}} {{.MemUsage}}'])
for domain in ['pointagevdc.cloud', 'www.novalisai.com']:
    try:
        req = urllib.request.Request('https://' + domain + '/', headers={'User-Agent': 'Novalis deployment audit'})
        with urllib.request.urlopen(req, timeout=15) as response:
            body = response.read(300000)
            report[domain] = {'status': response.status, 'url': response.geturl(),
                              'server': response.headers.get('Server'),
                              'sha256': hashlib.sha256(body).hexdigest()}
    except Exception as e:
        report[domain] = {'error': type(e).__name__}
print(json.dumps(report))
