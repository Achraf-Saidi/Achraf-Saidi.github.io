"""Publish NovalisAI copy without changing ERP, nginx or other applications."""
import fcntl, hashlib, http.client, json, os, secrets, shutil, socket, ssl, subprocess, tarfile, tempfile, urllib.request
from pathlib import Path

REVISION="31cc81bbc84c303aa8341afb145473fe3e1b883a"
PUBLIC=Path("/var/www/novalis-ai")
CORE=Path("/opt/novalis-os/current")
SERVICES=["nginx","pm2-root","postgresql@17-main","novalis-os","novalis-worker"]
REQUIRED={
    "fr":("Notre outil de travail.","à travers le monde"),
    "en":("Our own workspace.","around the world"),
    "nl":("Onze eigen werkomgeving.","over de hele wereld"),
    "de":("Unser eigener Workspace.","auf der ganzen Welt")
}

def local(host,path="/"):
    context=ssl.create_default_context()
    connection=http.client.HTTPSConnection("127.0.0.1",timeout=12,context=context)
    connection.sock=context.wrap_socket(socket.create_connection(("127.0.0.1",443),timeout=12),server_hostname=host)
    connection.request("GET",path,headers={"Host":host,"Cache-Control":"no-cache"})
    response=connection.getresponse()
    body=response.read(2000000)
    status=response.status
    connection.close()
    return status,body

def running():
    return {name:subprocess.check_output(["systemctl","show",name,"--property=MainPID","--value"],text=True).strip() for name in SERVICES}

def state():
    status,body=local("pointagevdc.cloud")
    if status!=200:raise RuntimeError("Pointage is not healthy")
    return (hashlib.sha256(body).hexdigest(),hashlib.sha256(Path("/etc/nginx/sites-enabled/pointagevdc").read_bytes()).hexdigest(),running())

def switch(dest):
    link=PUBLIC/(".copy-next-"+secrets.token_hex(6))
    link.symlink_to(dest)
    os.replace(link,PUBLIC/"current")

def main():
    os.umask(0o077)
    os.nice(10)
    if not CORE.is_dir():raise RuntimeError("Existing Novalis core is unavailable")
    with (PUBLIC/".copy-deploy.lock").open("w") as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        before=state()
        if local("app.novalisai.com","/healthz")[0]!=200:raise RuntimeError("Novalis OS health check failed")
        previous=(PUBLIC/"current").resolve(strict=True)
        temp=Path(tempfile.mkdtemp(prefix="novalis-copy-release-"))
        destination=PUBLIC/"releases"/("copy-"+REVISION[:12]+"-"+secrets.token_hex(4))
        switched=False
        try:
            archive=temp/"source.tar.gz"
            url="https://codeload.github.com/Achraf-Saidi/Achraf-Saidi.github.io/tar.gz/"+REVISION
            total=0
            with urllib.request.urlopen(url,timeout=100) as response,archive.open("wb") as sink:
                while True:
                    block=response.read(1048576)
                    if not block:break
                    total+=len(block)
                    if total>180*1048576:raise RuntimeError("Unexpected source archive size")
                    sink.write(block)
            root=temp/"build"
            root.mkdir()
            with tarfile.open(archive,"r:gz") as package:
                for member in package:
                    parts=Path(member.name).parts
                    if len(parts)<2:continue
                    relative=Path(*parts[1:])
                    if not (relative.parts[0]=="novalisai" or str(relative)=="novalis-os/deploy/prepare-public.py"):
                        continue
                    if ".." in relative.parts:raise RuntimeError("Invalid source path")
                    target=root/relative
                    if not target.resolve().is_relative_to(root.resolve()):
                        raise RuntimeError("Archive escaped the build directory")
                    if member.isdir():
                        target.mkdir(parents=True,exist_ok=True)
                    elif member.isfile():
                        target.parent.mkdir(parents=True,exist_ok=True)
                        with package.extractfile(member) as src,target.open("wb") as dst:
                            shutil.copyfileobj(src,dst)
                    else:
                        raise RuntimeError("Unsupported archive entry")
            source=root/"novalisai"
            for language,(title,world) in REQUIRED.items():
                premium=json.loads((source/"premium.json").read_text())[language]
                if premium["os_title"][0]!=title or world not in premium["partner_copy"]:
                    raise RuntimeError("Expected copy missing: "+language)
            built=subprocess.run([str(CORE/".venv/bin/python"),str(root/"novalis-os/deploy/prepare-public.py"),
                "--output",str(destination),"--site-url","https://www.novalisai.com",
                "--api-origin","https://app.novalisai.com","--portal-url","https://app.novalisai.com/os/"],
                capture_output=True,text=True,timeout=140)
            if built.returncode:
                raise RuntimeError("Public build failed: "+built.stderr[-1800:])
            all_pages=list(destination.rglob("*.html"))
            if not 105<=len(all_pages)<=140:raise RuntimeError("Unexpected public page count: "+str(len(all_pages)))
            for language,(title,world) in REQUIRED.items():
                for page in [destination/language/"index.html",destination/language/"entreprise/index.html",destination/language/"realisations/novalis-os/index.html"]:
                    text=page.read_text()
                    if page.name=="index.html" and "/entreprise/" not in str(page):
                        if title not in text:raise RuntimeError("Missing OS title in "+str(page))
                    if "/entreprise/" in str(page) and world not in text:
                        raise RuntimeError("Missing global partners in "+str(page))
            config=json.loads((destination/"runtime-config.json").read_text())
            if config!={"api_origin":"https://app.novalisai.com","portal_url":"https://app.novalisai.com/os"}:
                raise RuntimeError("Runtime configuration mismatch")
            for node in [destination,*destination.rglob("*")]:
                node.chmod(0o755 if node.is_dir() else 0o644)
            switch(destination)
            switched=True
            verify=["/","/runtime-config.json","/assets/premium.css","/assets/premium.js"]
            for language in REQUIRED:
                verify.extend("/"+language+"/"+x for x in ["","entreprise/","realisations/novalis-os/"])
            for path in verify:
                status,body=local("www.novalisai.com",path)
                local_file=destination/path.lstrip("/")
                if path.endswith("/"):local_file=local_file/"index.html"
                if status!=200 or hashlib.sha256(body).digest()!=hashlib.sha256(local_file.read_bytes()).digest():
                    raise RuntimeError("Deployed bytes mismatch: "+path)
            if local("app.novalisai.com","/healthz")[0]!=200 or state()!=before:
                raise RuntimeError("Existing services changed after release")
            result={"completed":True,"revision":REVISION,"release":str(destination),
                    "previous":str(previous),"pages":len(all_pages),"validated_urls":len(verify),
                    "pointage_unchanged":True,"service_pids_unchanged":True,"erp_healthy":True}
            print(json.dumps(result))
        except Exception:
            if switched:switch(previous)
            raise
        finally:
            shutil.rmtree(temp,ignore_errors=True)

if __name__=="__main__":
    main()
