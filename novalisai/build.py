#!/usr/bin/env python3
"""Build four independent static language editions. Standard library only."""
import argparse, hashlib, html, json, re
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent
LANGUAGES={'fr':'Français','en':'English','nl':'Nederlands','de':'Deutsch'}
LOCALES={'fr':'fr_BE','en':'en_GB','nl':'nl_BE','de':'de_DE'}
ICONS={
 'layers':'<path d="m12 3 10 5-10 5L2 8Z M2 12l10 5 10-5 M2 16l10 5 10-5"/>',
 'apps':'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 'spark':'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
 'chart':'<path d="M4 3v17h17 M8 15l4-5 4 2 4-7"/>',
 'compass':'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
 'check':'<path d="m5 12 4 4 10-10"/>'}
def esc(v):return html.escape(str(v),quote=True)
def lines(v):return esc(v).replace('\n','<br>')
def icon(name):return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>'
def tags(v):return '<ul class="service-tags">'+''.join(f'<li>{esc(t)}</li>' for t in v)+'</ul>'
def chart(c):
 u=c['demo_ui']
 bars=''.join(f'<i style="--h:{h}%"></i>' for h in [30,44,38,57,49,66,56,76,70,91,84,100])
 return f'<div class="chart-card"><div class="mini-heading">{esc(u[10])}<span>{esc(u[11])}</span></div><div class="bar-chart" aria-hidden="true">{bars}</div><div class="chart-axis" aria-hidden="true"><span>01</span><span>06</span><span>12</span></div></div>'
def metrics(c):
 u=c['demo_ui'];result=[]
 for label,val,foot in [(u[4],'12 400 €',u[7]),(u[5],'128',u[8]),(u[6],'07',u[9])]:
  result.append(f'<div class="metric"><span>{esc(label)}</span><strong>{esc(val)}</strong><small>{esc(foot)}</small></div>')
 return '<div class="metrics">'+''.join(result)+'</div>'
def tasks(c,ops=False):
 u=c['demo_ui'];ids=[30,31,32] if ops else [13,14,15]
 return '<div class="task-card"><div class="mini-heading">'+esc(u[12])+'</div>'+''.join(f'<div class="task">{esc(u[i])}<span>{esc(u[33+j]) if ops else str([3,4,1][j]).zfill(2)}</span></div>' for j,i in enumerate(ids))+'</div>'
def report(c):
 u=c['demo_ui'];rules=''.join('<div class="report-line"></div>' for _ in range(5))
 return f'<div class="report-preview"><div class="report-sheet"><h4>{esc(u[18])}</h4><p>{esc(u[19])}</p>{rules}<span class="source-label">{esc(u[22])}</span></div><div class="report-summary"><strong>{esc(u[20])}</strong><p>{esc(u[21])}</p><div class="task">PDF · 01</div><div class="task">PDF · 02</div><div class="task">XLS · 03</div></div></div>'
def shop(c):
 u=c['demo_ui'];shapes=['<span class="vase"></span>','<span class="lamp"></span><span class="lamp-base"></span>','<span class="chair"></span>']
 return '<div class="shop-preview">'+''.join(f'<div class="shop-item"><div class="product-shape" aria-hidden="true">{shapes[i]}</div><strong>{esc(u[25+i])}</strong><span>{["45 €","89 €","249 €"][i]}</span></div>' for i in range(3))+'</div>'
def top(c,title,sub,badge=True):
 return f'<div class="demo-top"><div><h3>{esc(title)}</h3><p>{esc(sub)}</p></div>'+ (f'<span class="demo-badge">{esc(c["demo_ui"][2])}</span>' if badge else '')+'</div>'
def demo(c,i):
 u=c['demo_ui']
 if i==0:return top(c,u[0],u[1])+metrics(c)+'<div class="demo-bottom">'+chart(c)+tasks(c)+'</div>'
 if i==1:return top(c,u[16],u[17],False)+report(c)
 return top(c,u[23],u[24],False)+shop(c)
def mini(c,i):
 u=c['demo_ui'];head='<div class="mini-app-top"><strong>novalis / '+['commerce','workspace','insight'][i]+'</strong><span>✳</span></div>'
 if i==0:body=f'<h4>{esc(u[28])}</h4>'+shop(c)
 elif i==1:body=f'<h4>{esc(u[29])}</h4>'+metrics(c)+tasks(c,True)
 else:body=f'<h4>{esc(u[16])}</h4>'+report(c)
 return '<div class="mini-app">'+head+body+'</div>'
def render(content,lang,site_url,root_page=False):
 c=content[lang];prefix='' if root_page else '../';out={k:esc(v) for k,v in c.items() if isinstance(v,str)}
 for k in ['services_title','solutions_title','saas_title','ai_title','method_title','team_title','contact_title','team_map']:out[k]=lines(c[k])
 out.update(lang=lang,locale=LOCALES[lang],asset_path=prefix+'assets/',home_path='./' if root_page else '../',site_url=esc(site_url),canonical=esc(site_url+'/' if root_page else f'{site_url}/{lang}/'))
 for kind,file in [('style','styles.css'),('script','app.js')]:out[kind+'_version']=hashlib.sha256((ROOT/'assets'/file).read_bytes()).hexdigest()[:10]
 for i,v in enumerate(c['nav']):out[f'nav_{i}']=esc(v)
 for i,v in enumerate(c['hero_title']):out[f'hero_title_{i}']=esc(v)
 for i,v in enumerate(c['ai_chips']):out[f'ai_chip_{i}']=esc(v)
 out['strip']=''.join(f'<span>{icon("check")}{esc(v)}</span>' for v in c['strip'])
 out['demo_tabs']=''.join(f'<button type="button" role="tab" id="demo-tab-{i}" aria-controls="demo-panel-{i}" aria-selected="{str(i==0).lower()}" tabindex="{0 if i==0 else -1}">{esc(t)}</button>' for i,t in enumerate(c['demo_tabs']))
 # All panels remain accessible without JavaScript. With JS they become keyboard-controlled tabs.
 out['demo_panels']=''.join(f'<div class="demo-panel" id="demo-panel-{i}" role="tabpanel" aria-labelledby="demo-tab-{i}" tabindex="0">{demo(c,i)}</div>' for i in range(3))
 out['alternates']='\n'.join(f'<link rel="alternate" hreflang="{l}" href="{site_url}/{l}/">' for l in LANGUAGES)+f'<link rel="alternate" hreflang="x-default" href="{site_url}/">'
 out['language_options']=''.join(f'<option value="{l}" data-url="{prefix}{l}/" {"selected" if l==lang else ""}>{l.upper()}</option>' for l in LANGUAGES)
 out['language_links']=''.join(f'<a href="{prefix}{l}/" lang="{l}" hreflang="{l}" aria-label="{label}" '+('aria-current="page"' if l==lang else '')+f'>{l.upper()}</a>' for l,label in LANGUAGES.items())
 out['services']=''.join(f'<article class="service-card"><div class="service-top"><span class="service-number">0{i+1}</span><div class="service-icon">{icon(s["icon"])}</div></div><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p>{tags(s["tags"])}<a class="text-link" href="#contact" data-need="{i}">{esc(c["service_cta"])} ↗</a></article>' for i,s in enumerate(c['services']))
 out['showcases']=''.join(f'<article class="showcase-card"><div class="showcase-visual showcase-visual-{i}" aria-hidden="true">{mini(c,i)}</div><div class="showcase-content"><p class="eyebrow">{esc(s["sector"])}</p><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p><a class="text-link" href="#contact" data-need="{s["need"]}">{esc(s["cta"])} ↗</a></div></article>' for i,s in enumerate(c['showcases']))
 out['ai_points']=''.join(f'<li>{icon("check")}<span>{esc(v)}</span></li>' for v in c['ai_points'])
 out['steps']=''.join(f'<article class="step"><span class="step-number">0{i+1}</span><div class="step-body"><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p><div class="step-deliverable"><span>{esc(c["deliverable_label"])}</span><strong>{esc(s["deliverable"])}</strong></div></div></article>' for i,s in enumerate(c['steps']))
 out['team_principles']=''.join(f'<article class="team-principle"><h3>{esc(s["title"])}</h3><p>{esc(s["copy"])}</p></article>' for s in c['team_principles'])
 out['faqs']=''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in c['faqs'])
 for name in ['need','budget','timing']:out[name+'_options']=''.join(f'<option value="{esc(v)}">{esc(v)}</option>' for v in c[name+'_options'])
 schema={'@context':'https://schema.org','@type':'ProfessionalService','name':'Novalis AI','url':site_url,'logo':site_url+'/assets/logo.webp','email':'achraf@novalisai.com','identifier':'BE0878868302','address':{'@type':'PostalAddress','streetAddress':'Rue Barrière Moye 18','postalCode':'1300','addressLocality':'Wavre','addressCountry':'BE'},'availableLanguage':list(LANGUAGES),'description':c['description']}
 out['schema']=json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')
 client={k:c[k] for k in ['menu','close','mail_labels','mail_subject','mail_greeting','mail_extra','copied','copy_error']}
 client['policies']={k:{'title':c[k+'_title'],'text':c[k+'_text']} for k in ['privacy','legal']}
 out['client_data']=json.dumps(client,ensure_ascii=False).replace('<','\\u003c')
 result=re.sub(r'\{\{([a-z_0-9]+)\}\}',lambda m:out[m[1]],(ROOT/'template.html').read_text())
 if '{{' in result:raise ValueError('Unresolved template token')
 return result

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--site-url',default='https://achraf-saidi.github.io/novalisai');args=parser.parse_args();url=args.site_url.rstrip('/');parsed=urlparse(url)
 if parsed.scheme!='https' or not parsed.netloc or parsed.query or parsed.fragment:parser.error('Expected a public HTTPS URL without query or fragment')
 content=json.loads((ROOT/'content.json').read_text());keys=set(content['fr'])
 for lang in LANGUAGES:
  if set(content[lang])!=keys:raise ValueError(f'Translation keys differ: {lang}')
  (ROOT/lang).mkdir(exist_ok=True);(ROOT/lang/'index.html').write_text(render(content,lang,url))
 (ROOT/'index.html').write_text(render(content,'fr',url,True))
 urls='<url><loc>'+url+'/</loc></url>'+''.join(f'<url><loc>{url}/{l}/</loc></url>' for l in LANGUAGES)
 (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>\n')
 print('Generated FR, EN, NL, DE and French home page.')
if __name__=='__main__':main()
