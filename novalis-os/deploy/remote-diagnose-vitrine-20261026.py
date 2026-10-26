"""Read-only diagnostics of live NovalisAI content on both names."""
import hashlib,http.client,json,os,pathlib,socket,ssl
P=pathlib.Path('/var/www/novalis-ai')
reports={'git_revision_expected':'31cc81bbc84c303aa8341afb145473fe3e1b883a'}
def probe(name,path):
 try:
  context=ssl.create_default_context()
  c=http.client.HTTPSConnection('127.0.0.1',timeout=10,context=context)
  c.sock=context.wrap_socket(socket.create_connection(('127.0.0.1',443),timeout=10),server_hostname=name)
  c.request('GET',path,headers={'Host':name,'Cache-Control':'no-cache','Pragma':'no-cache'})
  r=c.getresponse();data=r.read(2000000);hdr=dict(r.getheaders());c.close()
  body=data.decode('utf-8','replace')
  return {'status':r.status,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
          'afrique':body.count('Afrique'),'africa':body.count('Africa'),'afrika':body.count('Afrika'),
          'new_os':body.count('Notre outil de travail.'),'old_os':body.count('Votre bureau d’études.'),
          'world':body.count('à travers le monde'),'location':hdr.get('Location'),'etag':hdr.get('ETag'),
          'cache_control':hdr.get('Cache-Control'),'age':hdr.get('Age'),'server':hdr.get('Server')}
 except Exception as e:return {'error':type(e).__name__+':'+str(e)[:120]}
reports['current_symlink']=str((P/'current').resolve())
reports['dns']={}
for name in ['www.novalisai.com','novalisai.com']:
 try:reports['dns'][name]=sorted(set(x[4][0] for x in socket.getaddrinfo(name,443,type=socket.SOCK_STREAM)))
 except Exception as e:reports['dns'][name]=type(e).__name__
reports['files']={}
for lang in ['fr','en','nl','de']:
 f=P/'current'/lang/'index.html'
 if f.exists():
  data=f.read_text()
  reports['files'][lang]={'bytes':len(data),'afrique':data.count('Afrique'),'africa':data.count('Africa'),
            'afrika':data.count('Afrika'),'new_os':data.count('Notre outil de travail.'),
            'world':data.count('à travers le monde')}
for domain in ['www.novalisai.com','novalisai.com']:
 reports[domain]={path:probe(domain,path) for path in ['/','/fr/','/fr/entreprise/','/fr/realisations/novalis-os/']}
root=P/'current'
bad=[]
for item in root.rglob('*.html'):
 data=item.read_text(errors='replace')
 if any(s in data for s in ['Afrique','Africa','Afrika']):
  bad.append({'page':str(item.relative_to(root)),'afrique':data.count('Afrique'),'africa':data.count('Africa'),'afrika':data.count('Afrika')})
reports['remaining_africa_pages']=bad[:55]
reports['total_remaining_africa_pages']=len(bad)
reports['html_count']=len(list(root.rglob('*.html')))
print(json.dumps(reports,ensure_ascii=False))
