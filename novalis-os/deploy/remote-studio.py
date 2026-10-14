"""Publish a verified public UI release with an atomic pointer and rollback."""
import hashlib,http.client,json,os,secrets,shutil,socket,ssl,subprocess,tempfile,urllib.request
from pathlib import Path
RELEASE="bc78ee4e44342804e27d4635cfdc716a467e7892"
MANIFEST={"novalisai/build.py":"ed34ffeed129051406fb3d138d9c61edb6ec6b730256f7f0f6d42fd6ac38eeed","novalisai/template.html":"528ca4d9926d80bb9a0dfa297d62cbf340383efcb1440552fb1f16673174af25","novalisai/content.json":"6cc3320959984442d16b0c4d8c3542cb6815cdf1517f80f9714382ee5beda3fd","novalisai/extension.json":"c57e9fa9f0a78e1a7a103b9ef39613c87241114e54053a6efeedf7c14475bafa","novalisai/studio.py":"c756a03843039578b3e6abd57287c2c3b4bdd7d0bc3feff4ea5479d359e1c49f","novalisai/studio.json":"bcced4595819f4c422f765907e807eaa1d3b346e21cb400f02e2a0ea9dca5719","novalisai/assets/studio.css":"5cf641b61b4511ec2cdd10a21ff897db8dcb24584ac9bbf8599692c71f0a373d","novalisai/assets/studio.js":"5e07452eb007838a16b51b8a92bfccba609a3a99612f5d16d15c452646a9810b","novalisai/assets/v2.js":"d2616ea61697db506bb4f579911b5fb03b2d539550618070a80a7bff765db6b8","novalis-os/deploy/prepare-public.py":"a6d4918a471bcbc412e5276d5179ccb406804d1407ee05cd89a393ca8c609ad1"}
CORE=Path('/opt/novalis-os/current')
PUBLIC=Path('/var/www/novalis-ai')
SERVICES=['nginx','pm2-root','postgresql@17-main','novalis-os','novalis-worker']
def request(host,path='/'):
    context=ssl.create_default_context()
    connection=http.client.HTTPSConnection('127.0.0.1',timeout=20,context=context)
    connection.sock=context.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=20),server_hostname=host)
    connection.request('GET',path,headers={'Host':host,'Cache-Control':'no-cache'})
    response=connection.getresponse();body=response.read(500000);status=response.status;connection.close()
    return status,body
def pids():
    return {s:subprocess.check_output(['systemctl','show',s,'--property=MainPID','--value'],text=True).strip() for s in SERVICES}
def state():
    status,body=request('pointagevdc.cloud')
    if status!=200:raise RuntimeError('Pointage not healthy before deployment')
    return {'pointage_sha256':hashlib.sha256(body).hexdigest(),'pointage_config':hashlib.sha256(Path('/etc/nginx/sites-enabled/pointagevdc').read_bytes()).hexdigest(),'pids':pids()}
def point_to(target):
    link=PUBLIC/('.studio-next-'+secrets.token_hex(6));link.symlink_to(target);os.replace(link,PUBLIC/'current')
def main():
    os.umask(0o077);os.nice(10)
    before=state()
    if request('app.novalisai.com','/healthz')[0]!=200:raise RuntimeError('ERP not healthy')
    previous=(PUBLIC/'current').resolve(strict=True)
    temp=Path(tempfile.mkdtemp(prefix='novalis-studio-build-'))
    output=PUBLIC/'releases'/(RELEASE+'-studio-'+secrets.token_hex(4));switched=False
    try:
        shutil.copytree(CORE/'novalisai',temp/'novalisai')
        for name,digest in MANIFEST.items():
            path=temp/name;path.parent.mkdir(parents=True,exist_ok=True)
            url='https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/'+RELEASE+'/'+name
            with urllib.request.urlopen(url,timeout=30) as response:body=response.read(1000000)
            if hashlib.sha256(body).hexdigest()!=digest:raise RuntimeError('Source checksum mismatch: '+name)
            path.write_bytes(body)
        built=subprocess.run([str(CORE/'.venv/bin/python'),str(temp/'novalis-os/deploy/prepare-public.py'),'--output',str(output),'--site-url','https://www.novalisai.com','--api-origin','https://app.novalisai.com','--portal-url','https://app.novalisai.com/os/'],capture_output=True,text=True,timeout=90)
        if built.returncode:raise RuntimeError('Build failed: '+built.stderr[-2000:])
        if len(list(output.rglob('*.html')))!=57:raise RuntimeError('Unexpected page count')
        if json.loads((output/'runtime-config.json').read_text())!={'api_origin':'https://app.novalisai.com','portal_url':'https://app.novalisai.com/os'}:raise RuntimeError('Wrong backend binding')
        if any(p.suffix in {'.py','.sqlite3','.env'} for p in output.rglob('*')):raise RuntimeError('Nonpublic content in package')
        for path in [output,*output.rglob('*')]:path.chmod(0o755 if path.is_dir() else 0o644)
        point_to(output);switched=True
        paths=['/']+['/'+lang+'/' for lang in ['fr','en','nl','de']]+['/assets/studio.js','/assets/studio.css','/runtime-config.json']
        for path in paths:
            status,body=request('www.novalisai.com',path)
            file=output/path.lstrip('/')
            if path.endswith('/'):file=file/'index.html'
            if status!=200 or hashlib.sha256(body).digest()!=hashlib.sha256(file.read_bytes()).digest():raise RuntimeError('Published content mismatch: '+path)
        for lang in ['fr','en','nl','de']:
            for slug in ['espace-client','confidentialite']:
                if request('www.novalisai.com','/'+lang+'/'+slug+'/')[0]!=200:raise RuntimeError('Detail page unhealthy')
        if request('app.novalisai.com','/healthz')[0]!=200 or request('app.novalisai.com','/os/')[0]!=200:raise RuntimeError('ERP not healthy after deployment')
        if state()!=before:raise RuntimeError('Existing process or Pointage changed')
        report={'stage':'useful-vitrine-studio','release':RELEASE,'public_pages':57,'verified_paths':len(paths),'pointage_unchanged':True,'all_service_pids_unchanged':True,'erp_healthy':True,'previous_public_release':str(previous),'current_public_release':str(output),'source_checksums_verified':len(MANIFEST)}
        report_file=Path('/etc/novalis-os/deployment-studio.json');report_file.write_text(json.dumps(report,indent=2));report_file.chmod(0o600)
        print(json.dumps(report))
    except Exception:
        if switched:point_to(previous)
        raise
    finally:shutil.rmtree(temp)
main()
