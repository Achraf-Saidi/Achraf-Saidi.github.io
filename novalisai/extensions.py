"""Editorial pages and interactive demonstrations, without changing the retained stack."""
import hashlib
import html
import json
from pathlib import Path
from ultimate import D
from showcase import S, SLUGS
from premium import P

ROOT=Path(__file__).parent
E=json.loads((ROOT/'extension.json').read_text())
def esc(value):return html.escape(str(value),quote=True)


def enrich(lang,prefix,out,client):
    e=E[lang]
    link_prefix=prefix+lang+'/'
    out['v2_pages']='<nav class="editorial-links shell" aria-label="'+esc(e['navigation'])+'"><span class="eyebrow">'+esc(e['navigation'])+'</span><div>'+''.join(
        f'<a href="{link_prefix}{p[0]}/">{esc(p[1])}<span aria-hidden="true">↗</span></a>' for p in e['pages'])+f'<a href="{link_prefix}lab/">Interactive Lab ↗</a></div></nav>'
    out['v2_explore']=f'<a class="text-link hero-explore" href="#expertises">{esc(e["explore"])} <span aria-hidden="true">↓</span></a>'
    out['v2_consultation']=f'''<section class="consultation section shell" aria-labelledby="consultation-title"><div><p class="eyebrow">01 / 60 MIN</p><h2 id="consultation-title">{esc(e['consult_title'])}</h2><p class="section-copy">{esc(e['consult_copy'])}</p><a class="button" href="#contact">{esc(e['contact'])} ↗</a></div><div class="consultation-paper"><span class="paper-mark" aria-hidden="true">N / DISCOVERY</span><ol>'''+''.join(f'<li><span>0{i+1}</span>{esc(v)}</li>' for i,v in enumerate(e['consult_steps']))+f'''</ol><p>{esc(e['consult_note'])}</p></div></section>'''
    buttons=''.join(f'<button type="button" data-lab-role="{i}" aria-pressed="{str(i==0).lower()}">{esc(role)}</button>' for i,role in enumerate(e['roles']))
    items=''.join(f'<li><span aria-hidden="true">↗</span>{esc(v)}</li>' for v in e['role_items'][0])
    sliders=''.join(f'<label for="lab-{name}"><span>{esc(e[key])}</span><output id="lab-{name}-output">{value}</output><input id="lab-{name}" type="range" min="{minimum}" max="{maximum}" value="{value}"></label>' for name,key,minimum,maximum,value in [('volume','volume',10,300,100),('duration','manual',1,60,12),('share','automation',0,100,60)])
    out['v2_lab']=f'''<section id="laboratoire" class="v2-lab section shell" aria-labelledby="lab-title"><div class="section-heading"><div><p class="eyebrow">NOVALIS / LAB</p><h2 id="lab-title">{esc(e['lab_title'])}</h2></div><p class="section-copy">{esc(e['lab_copy'])}</p></div><div class="lab-tabs" role="tablist" aria-label="Novalis Lab"><button type="button" id="lab-tab-access" role="tab" aria-controls="lab-access" aria-selected="true">{esc(e['lab_tabs'][0])}</button><button type="button" id="lab-tab-calc" role="tab" aria-controls="lab-calc" aria-selected="false" tabindex="-1">{esc(e['lab_tabs'][1])}</button></div><div class="lab-surface" id="lab-access" role="tabpanel" aria-labelledby="lab-tab-access"><div class="lab-roles" role="group" aria-label="{esc(e['lab_tabs'][0])}">{buttons}</div><div class="lab-role-layout"><div class="lab-role-text"><span class="eyebrow">NOVALIS OS / DEMO</span><h3 id="lab-role-title">{esc(e['role_title'][0])}</h3><p id="lab-role-copy">{esc(e['role_copy'][0])}</p></div><div class="lab-preview"><div class="lab-preview-top"><span>N / OS</span><span id="lab-current-role">{esc(e['roles'][0])}</span></div><ul id="lab-role-items">{items}</ul><button class="button" type="button" id="lab-role-action">{esc(e['role_action'])} ↗</button><p id="lab-role-status" role="status" aria-live="polite"></p></div></div></div><div class="lab-surface" id="lab-calc" role="tabpanel" aria-labelledby="lab-tab-calc" hidden><div class="lab-calculator"><div class="lab-sliders">{sliders}</div><div class="lab-result"><span>{esc(e['result'])}</span><output id="lab-hours" for="lab-volume lab-duration lab-share">12,0</output><svg class="lab-gauge" viewBox="0 0 220 18" aria-hidden="true"><rect width="220" height="18" rx="9" fill="#e9dece"/><rect id="lab-gauge-value" width="132" height="18" rx="9" fill="#9a602d"/></svg><p>{esc(e['math_note'])}</p></div></div></div><p class="quiet-note">{esc(e['lab_note'])}</p></section>'''
    out['v2_team']='<div class="team-poles" role="group" aria-label="'+esc(e['scope'])+'">'+''.join(f'<button type="button" data-team-pole="{i}" aria-pressed="{str(i==0).lower()}">{esc(v)}</button>' for i,v in enumerate(e['team_poles']))+'</div><p class="team-pole-detail" id="team-pole-detail" role="status">'+esc(e['team_details'][0])+'</p>'
    out['v2_client']=f'<a class="text-link portal-link" data-portal-link href="{link_prefix}espace-client/">{esc(e["client"])} ↗</a>'
    for key,filename in [('v2_style_version','v2.css'),('v2_script_version','v2.js')]:
        out[key]=hashlib.sha256((ROOT/'assets'/filename).read_bytes()).hexdigest()[:10]
    client['v2']={k:e[k] for k in ['roles','role_title','role_copy','role_items','role_done','team_details','api_labels']}
    client['runtime_config']=prefix+'runtime-config.json'


def write_pages(content,site_url):
    urls=[]
    for lang,e in E.items():
        for slug,title,headline,description,bullets in e['pages']:
            if slug=='methode':
                t=P[lang]
                bullets=[phase[0]+' '+phase[1]+' '+t['deliverable']+' : '+phase[2] for phase in t['method_steps']]
                description=t['method_copy']
            root=ROOT/lang/slug
            root.mkdir(parents=True,exist_ok=True)
            url=f'{site_url}/{lang}/{slug}/'
            urls.append(url)
            alternates=''.join(f'<link rel="alternate" hreflang="{l}" href="{site_url}/{l}/{slug}/">' for l in E)
            languages=''.join(f'<a lang="{l}" hreflang="{l}" href="../../{l}/{slug}/"'+(' aria-current="page"' if l==lang else '')+f'>{l.upper()}</a>' for l in E)
            page_nav=''.join(f'<a href="../{p[0]}/"'+(' aria-current="page"' if p[0]==slug else '')+f'>{esc(p[1])}</a>' for p in e['pages'] if p[0] not in {'mentions-legales','cookies','confidentialite'})
            public_links=''
            if slug=='realisations':
                public_links='<p class="concept-note">'+esc(S[lang]['concept_note'])+'</p><div class="project-directory">'+''.join(f'<a href="../solutions/{path}/"><span>0{i+1}</span><strong>{esc(S[lang]["product_titles"][i])} · {esc(S[lang]["concept"])}</strong><b aria-hidden="true">↗</b></a>' for i,path in enumerate(SLUGS))+'</div>'

            if slug=='contact':
                public_links=f'<a class="button" href="../#contact">{esc(P[lang]["contact_schedule"])} ↗</a><p>{esc(P[lang]["contact_hour"])}</p>'
            access_link=f'<a class="text-link" data-portal-link href="../#contact">{esc(e["contact"])} ↗</a>' if slug=='espace-client' else ''
            related=''.join(f'<a href="../{p[0]}/">{esc(p[1])} ↗</a>' for p in e['pages'] if p[0] in {'sur-mesure','saas','automatisation','data-ia'} and p[0]!=slug)
            legal=slug in {'mentions-legales','confidentialite','cookies','espace-client'}
            secondary='' if legal else f'<section class="detail-method"><p class="eyebrow">NOVALIS / DELIVERY</p><h2>{esc(e["principle"])}</h2><p>{esc(e["principle_copy"])}</p><a class="text-link" href="../methode/">{esc(e["read"])} ↗</a></section>'
            output=f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{esc(description)}"><meta name="theme-color" content="#fbf8f3"><title>{esc(title)} — Novalis AI</title><link rel="canonical" href="{url}">{alternates}<link rel="icon" href="../../assets/N_novalis.png"><link rel="stylesheet" href="../../assets/showcase.css"><script src="../../assets/pages.js" defer></script><meta property="og:title" content="{esc(title)} — Novalis AI"><meta property="og:image" content="{site_url}/assets/novalis_og.png"><meta property="og:url" content="{url}"></head><body class="detail-page"><a class="skip-link" href="#main">{esc(content[lang]['skip'])}</a><header class="site-header"><div class="header-inner shell"><a class="brand" href="../"><img src="../../assets/logo.webp" alt="Novalis AI" width="1200" height="269"></a><nav class="detail-header-links" aria-label="{esc(e['navigation'])}"><a href="../expertise/">{esc(e['pages'][0][1])}</a><a href="../entreprise/">{esc(e['pages'][6][1])}</a><a class="button small" href="../#contact">{esc(content[lang]['book'])} ↗</a></nav></div></header><main id="main" class="shell"><div class="detail-breadcrumb"><a href="../">{esc(e['home'])}</a><span>/</span><span>{esc(title)}</span></div><section class="detail-hero"><p class="eyebrow">NOVALIS / {esc(title)}</p><h1>{esc(headline)}</h1><p class="detail-lead">{esc(description)}</p><a class="button" href="../#contact">{esc(content[lang]['talk'])} ↗</a></section><div class="detail-layout"><section class="detail-body"><h2>{esc(title if legal else e['scope'])}</h2><ol class="detail-capabilities">'''+''.join(f'<li><span>0{i+1}</span><p>{esc(b)}</p></li>' for i,b in enumerate(bullets))+f'''</ol>{public_links}{access_link}{secondary}<nav class="detail-related" aria-label="{esc(e['navigation'])}">{related}</nav></section><aside class="detail-aside"><span class="eyebrow">NOVALIS / EXPLORE</span><nav aria-label="{esc(e['navigation'])}">{page_nav}</nav></aside></div></main><footer class="detail-footer shell"><a href="../">{esc(e['back'])} ←</a><a href="mailto:contact@novalisai.com">contact@novalisai.com</a><nav aria-label="{esc(content[lang]['language'])}">{languages}</nav><p>© 2026 Novalis AI</p></footer></body></html>'''
            (root/'index.html').write_text(output)
    return urls
