"""Enable revalidation for public NovalisAI pages only; retain security headers."""
import hashlib, http.client, json, os, pathlib, socket, ssl, subprocess, tempfile, time

FILE=pathlib.Path('/etc/nginx/sites-available/zz-novalisai')
ENABLED=pathlib.Path('/etc/nginx/sites-enabled/zz-novalisai')
OLD='    location / { try_files $uri $uri/ =404; }'
NEW='    location / { expires -1; try_files $uri $uri/ =404; }'
SERVICES=['nginx','pm2-root','postgresql@17-main','novalis-os','novalis-worker']

def run(args):
    result=subprocess.run(args,capture_output=True,text=True,timeout=15)
    if result.returncode:
        raise RuntimeError(args[0]+' failed: '+result.stderr[-900:])

def probe(host,path='/'):
    c=http.client.HTTPSConnection('127.0.0.1',timeout=12,context=ssl.create_default_context())
    c.sock=c._context.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=12),server_hostname=host)
    c.request('GET',path,headers={'Host':host,'Cache-Control':'no-cache'})
    r=c.getresponse();body=r.read(250000);headers={k.lower():v for k,v in r.getheaders()}
    status=r.status;c.close()
    return status,headers,body

def processes():
    return {name:subprocess.check_output(['systemctl','show',name,'--property=MainPID','--value'],text=True).strip() for name in SERVICES}

def write_atomic(path,data):
    stat=path.stat()
    fd,temp=tempfile.mkstemp(prefix='.novalis-cache-',dir=str(path.parent))
    try:
        os.fchmod(fd,stat.st_mode & 0o777)
        os.fchown(fd,stat.st_uid,stat.st_gid)
        with os.fdopen(fd,'w') as stream:
            stream.write(data);stream.flush();os.fsync(stream.fileno())
        os.replace(temp,path)
    finally:
        if os.path.exists(temp):os.unlink(temp)

def main():
    if not FILE.is_file() or not ENABLED.is_symlink() or ENABLED.resolve()!=FILE:
        raise RuntimeError('Unexpected public Nginx config')
    before=processes()
    p1,_,pointage=probe('pointagevdc.cloud')
    e1,_,_=probe('app.novalisai.com','/healthz')
    if p1!=200 or e1!=200:raise RuntimeError('Other services unhealthy before update')
    pfile=pathlib.Path('/etc/nginx/sites-enabled/pointagevdc')
    signature=(hashlib.sha256(pointage).hexdigest(),hashlib.sha256(pfile.read_bytes()).hexdigest())
    original=FILE.read_text()
    if original.count(OLD)!=1 and original.count(NEW)!=1:
        raise RuntimeError('Unexpected public location structure')
    for required in ['server_name www.novalisai.com;', 'add_header X-Frame-Options DENY', 'add_header Content-Security-Policy', 'root /var/www/novalis-ai/current;']:
        if required not in original:raise RuntimeError('Security baseline mismatch: '+required)
    changed=original.count(OLD)==1
    try:
        if changed:
            write_atomic(FILE,original.replace(OLD,NEW))
            run(['/usr/sbin/nginx','-t'])
            run(['systemctl','reload','nginx'])
            time.sleep(1)
        status,headers,body=probe('www.novalisai.com','/fr/')
        html=body.decode('utf-8','replace')
        if status!=200 or 'no-cache' not in headers.get('cache-control',''):
            raise RuntimeError('Cache revalidation header not sent')
        if 'Notre outil de travail.' not in html or 'Afrique' in html:
            raise RuntimeError('Published copy did not match latest content')
        required_headers=['x-frame-options','content-security-policy','strict-transport-security','x-content-type-options']
        if not all(h in headers for h in required_headers):
            raise RuntimeError('Security headers changed')
        if probe('app.novalisai.com','/healthz')[0]!=200:
            raise RuntimeError('ERP unhealthy')
        p2,_,after_page=probe('pointagevdc.cloud')
        sig2=(hashlib.sha256(after_page).hexdigest(),hashlib.sha256(pfile.read_bytes()).hexdigest())
        if p2!=200 or sig2!=signature or processes()!=before:
            raise RuntimeError('Unrelated services changed')
        print(json.dumps({'completed':True,'modified':changed,'status':status,'new_title':True,
           'old_africa':False,'cache_control':headers.get('cache-control'),
           'security_headers_intact':True,'erp_healthy':True,
           'pointage_unchanged':True,'service_pids_unchanged':True}))
    except Exception:
        if changed:
            write_atomic(FILE,original)
            run(['/usr/sbin/nginx','-t'])
            run(['systemctl','reload','nginx'])
        raise

if __name__=='__main__':main()
