"""Ephemeral GitHub SSH transport. Private keys and plain results stay off logs."""
import base64
import ipaddress
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def main():
    request = json.loads(Path(sys.argv[1]).read_text())
    host = str(ipaddress.ip_address(request['host']))
    if request['user'] != 'root' or request['port'] != 22:
        raise ValueError('Unexpected target')
    recipient = X25519PublicKey.from_public_bytes(base64.b64decode(request['response_public_key'], validate=True))
    identity = Path(os.environ['RUNNER_TEMP']) / 'novalis-relay-key'
    pub = identity.with_suffix('.pub').read_text().strip()
    known = Path(os.environ['RUNNER_TEMP']) / 'novalis-relay-known-hosts'
    ssh = ['ssh', '-T', '-p', '22', '-i', str(identity),
           '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
           '-o', 'PasswordAuthentication=no', '-o', 'KbdInteractiveAuthentication=no',
           '-o', 'ConnectTimeout=8', '-o', 'ConnectionAttempts=1',
           '-o', 'StrictHostKeyChecking=accept-new', '-o', 'UpdateHostKeys=no',
           '-o', f'UserKnownHostsFile={known}', f'root@{host}']
    deadline = time.monotonic() + 600
    result = {'target': host, 'task': request['task'], 'authenticated': False}
    try:
        # The controller publishes this branch only after the VPS API confirms
        # key installation. Do not make failed SSH logins while awaiting approval.
        gate = f"https://api.github.com/repos/{os.environ['GITHUB_REPOSITORY']}/git/ref/heads/novalis-ssh-ready-{os.environ['GITHUB_RUN_ID']}"
        authorized = False
        while time.monotonic() < deadline:
            query = urllib.request.Request(gate, headers={
                'Accept': 'application/vnd.github+json',
                'Authorization': 'Bearer ' + os.environ['GITHUB_TOKEN'],
                'User-Agent': 'Novalis authorized VPS operation'})
            try:
                with urllib.request.urlopen(query, timeout=10) as response:
                    authorized = json.load(response).get('object', {}).get('sha') == os.environ['GITHUB_SHA']
            except urllib.error.HTTPError as error:
                if error.code != 404:
                    raise
            if authorized:
                break
            time.sleep(10)
        if authorized:
            time.sleep(15)
            ready = subprocess.run(ssh + ['true'], capture_output=True, timeout=20)
            result['authenticated'] = ready.returncode == 0
            if not result['authenticated']:
                result['ssh_returncode'] = ready.returncode
                result['ssh_error'] = ready.stderr[:10000].decode('utf-8', 'replace')
        if not result['authenticated']:
            result['returncode'] = 1
            result['error'] = 'SSH did not authenticate after the authorized key was installed.' if authorized else 'Authorization gate timed out.'
        else:
            script = Path(request['script']).read_bytes()
            execution = subprocess.run(ssh + ['python3', '-'], input=script,
                                       capture_output=True, timeout=min(int(request.get('timeout', 180)), 1200))
            result.update(returncode=execution.returncode,
                          stdout=execution.stdout[:250000].decode('utf-8', 'replace'),
                          stderr=execution.stderr[:25000].decode('utf-8', 'replace'))
            result['host_identity'] = known.read_text() if known.exists() else None
    except Exception as error:
        result['returncode'] = 1
        result['error'] = type(error).__name__
    finally:
        if result['authenticated']:
            # Revoke this job's key only; preserve all other entries and permissions.
            cleanup = '''import os, pathlib, stat, tempfile
p=pathlib.Path('/root/.ssh/authorized_keys')
keys=KEY_VALUES
if p.is_file():
    original=p.read_text()
    lines=original.splitlines(keepends=True)
    kept=[line for line in lines if not any(key in line.split() for key in keys)]
    if len(kept)!=len(lines):
        info=p.stat()
        fd,name=tempfile.mkstemp(prefix='.novalis-key-',dir=p.parent)
        os.fchmod(fd,stat.S_IMODE(info.st_mode))
        os.fchown(fd,info.st_uid,info.st_gid)
        with os.fdopen(fd,'w') as f:
            f.write(''.join(kept));f.flush();os.fsync(f.fileno())
        os.replace(name,p)
        print('revoked')
'''.replace('KEY_VALUES', repr([pub.split()[1]] + [k.split()[1] for k in request.get('revoke_public_keys', [])]))
            try:
                revoked = subprocess.run(ssh + ['python3', '-'], input=cleanup.encode(),
                                         capture_output=True, timeout=30)
                result['key_revoked'] = revoked.returncode == 0 and b'revoked' in revoked.stdout
            except Exception:
                result['key_revoked'] = False
        identity.unlink(missing_ok=True)
        identity.with_suffix('.pub').unlink(missing_ok=True)
    ephemeral = X25519PrivateKey.generate()
    shared = ephemeral.exchange(recipient)
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
               info=b'novalis-hostinger-relay-v1').derive(shared)
    nonce = os.urandom(12)
    payload = AESGCM(key).encrypt(nonce, json.dumps(result).encode(), None)
    public = ephemeral.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    encrypted = {k: base64.b64encode(v).decode() for k, v in
                 [('ephemeral_public_key', public), ('nonce', nonce), ('ciphertext', payload)]}
    print('NOVALIS_RELAY_RESULT ' + json.dumps(encrypted, separators=(',', ':')))
    print('SSH task finished; results encrypted and temporary private identity removed.')
    if result.get('returncode', 1):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
