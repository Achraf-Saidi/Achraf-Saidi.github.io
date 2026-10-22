"""Atomic copy-only Novalis homepage slogan publication; no service restarts."""
import hashlib,json,os,re,shutil,tempfile,urllib.request
from pathlib import Path
BASE=Path('/var/www/novalis-ai')
CURRENT=BASE/'current'
RELEASES=BASE/'releases'
NEW_CSS='5649423ab1'
TITLE={
'fr':(('Tout se parle.','Vous avancez.'),('Votre entreprise ne ressemble à aucune autre.','Pourquoi ses outils le devraient-ils ?')),
'en':(('Everything connects.','You move forward.'),('Your business is one of a kind.','Your software should be, too.')),
'nl':(('Alles verbonden.','U gaat vooruit.'),('Uw onderneming is uniek.','Waarom zouden uw tools dat niet zijn?')),
'de':(('Alles verbunden.','Sie kommen voran.'),('Ihr Unternehmen ist einzigartig.','Warum sollten es Ihre Werkzeuge nicht sein?'))}
def change(s,old,new):
 if s.count(old)!=1:raise RuntimeError('Unexpected homepage source, refusing to publish')
 return s.replace(old,new,1)
def patch(path,old,new):
 s=path.read_text()
 s=change(s,'<h1 id="hero-title">'+old[0]+'<br><em>'+old[1]+'</em></h1>','<h1 id="hero-title" class="brand-promise">'+new[0]+'<br><em>'+new[1]+'</em></h1>')
 s=change(s,'&quot;title&quot;: [&quot;'+old[0]+'&quot;, &quot;'+old[1]+'&quot;]','&quot;title&quot;: [&quot;'+new[0]+'&quot;, &quot;'+new[1]+'&quot;]')
 links=re.findall(r'launch[.]css[?]v=[a-z0-9-]+',s)
 if len(links)!=1 or 'class="launch-theatre"' not in s:raise RuntimeError('Missing expected interactive hero')
 s=change(s,links[0],'launch.css?v='+NEW_CSS)
 path.write_text(s)
def main():
 os.umask(0o077)
 if not CURRENT.is_symlink() or not RELEASES.is_dir():raise RuntimeError('Unexpected publication layout')
 previous=os.readlink(CURRENT)
 source=CURRENT.resolve(strict=True)
 if not source.is_relative_to(RELEASES.resolve()):raise RuntimeError('Unrecognized release directory')
 dst=Path(tempfile.mkdtemp(prefix='slogan-20261023-',dir=RELEASES))
 swapped=False
 try:
  shutil.rmtree(dst)
  shutil.copytree(source,dst)
  origin_count=len(list(source.rglob('*.html')))
  if len(list(dst.rglob('*.html')))!=origin_count:raise RuntimeError('Missing copied pages')
  u='https://raw.githubusercontent.com/Achraf-Saidi/Achraf-Saidi.github.io/5d7d5bc54efe28f60c30b5fab038e4fb649192d7/novalisai/assets/launch.css'
  with urllib.request.urlopen(u,timeout=25) as response:css=response.read(100000)
  if hashlib.sha256(css).hexdigest()[:10]!=NEW_CSS:raise RuntimeError('CSS integrity check failed')
  (dst/'assets/launch.css').write_bytes(css)
  for lang,(old,new) in TITLE.items():patch(dst/lang/'index.html',old,new)
  home=dst/'index.html'
  if '<h1 id="hero-title">Tout se parle.' in home.read_text():patch(home,*TITLE['fr'])
  for p in [dst,*dst.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
  if os.readlink(CURRENT)!=previous:raise RuntimeError('Concurrent release update')
  link=BASE/('.next-slogan-'+dst.name)
  link.symlink_to(dst)
  os.replace(link,CURRENT)
  swapped=True
  if TITLE['fr'][1][0] not in (CURRENT/'fr/index.html').read_text():raise RuntimeError('Publication not reflected')
  print(json.dumps({'published':True,'localized_pages':4,'home_patched':TITLE['fr'][1][0] in home.read_text(),'animation_preserved':True}))
 except:
  if swapped:
   undo=BASE/('.undo-slogan-'+dst.name)
   undo.symlink_to(previous)
   os.replace(undo,CURRENT)
  shutil.rmtree(dst,ignore_errors=True)
  raise
if __name__=='__main__':main()
