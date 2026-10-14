"""Business-first showcase: conceptual imagery, local workflow and accountable arithmetic."""
import hashlib,html,json,shutil
from pathlib import Path
ROOT=Path(__file__).parent
S=json.loads((ROOT/'showcase.json').read_text())
SLUGS=['projets-industriels','gestion-stock','assistant-flux','aide-decision']
ASSETS=['projects','stock','copilot','insight']
DIMS=[(1586,992),(1672,941),(1672,941),(1536,1024)]
def esc(v):return html.escape(str(v),quote=True)
def lines(v):return esc(v).replace('\n','<br>')
def version(name):return hashlib.sha256((ROOT/'assets'/name).read_bytes()).hexdigest()[:10]
def picture(i,prefix,loading='lazy',hero=False,t=None):
 w,h=DIMS[i];name=ASSETS[i]
 small='hero-picture' if hero else 'solution-picture'
 return f'<img class="{small}" src="{prefix}assets/concept-{name}.webp" width="{w}" height="{h}" loading="{loading}"'+(' fetchpriority="high"' if hero else '')+f' alt="Novalis {name.upper()} · '+esc((t or S['fr'])['concept'])+'">'
def image_dialog(t):
 return f'<dialog id="interface-dialog" aria-labelledby="interface-title"><div class="image-dialog-top"><div><span class="eyebrow">{esc(t["concept"])}</span><h2 id="interface-title">NOVALIS</h2></div><div class="image-dialog-actions"><button type="button" id="image-zoom" aria-pressed="false">{esc(t["zoom"])} +</button><button class="image-close" type="button" aria-label="{esc(t["close_image"])}">×</button></div></div><div class="image-viewport"><img id="interface-image" alt="" width="1586" height="992"></div><p>{esc(t["concept_note"])}</p></dialog>'
def hero(t,lang,prefix):
 tabs=''.join(f'<button type="button" data-hero-product="{i}" aria-pressed="{str(i==0).lower()}">{esc(v)}</button>' for i,v in enumerate(t['hero_tabs']))
 images=''.join(f'<div data-hero-picture="{i}"'+(' hidden' if i else '')+'>'+picture(i,prefix,'eager' if i==0 else 'lazy',True,t)+'</div>' for i in range(4))
 return f'''<section class="hero shell" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">{esc(t['hero_kicker'])}</p><h1 id="hero-title"><span>{esc(t['hero_a'])}</span><em>{esc(t['hero_b'])}</em></h1><p class="hero-description">{esc(t['hero_copy'])}</p><div class="hero-actions"><a class="button" href="#contact">{esc(t['hero_cta'])} ↗</a><a class="text-link" href="#solutions">{esc(t['hero_second'])} ↓</a></div><p class="hero-note">{esc(t['hero_note'])}</p></div><div class="hero-product"><div class="hero-product-top"><span>NOVALIS / <strong id="hero-product-name">PROJECTS</strong></span><span class="concept-pill">{esc(t['concept'])}</span></div><div class="hero-picture-stack">{images}</div><div class="hero-product-tabs" role="group" aria-label="{esc(t['hero_second'])}">{tabs}</div><p id="hero-product-outcome" role="status">{esc(t['product_outcomes'][0])}</p><button type="button" class="text-link" id="hero-image-view" data-view-product="0">{esc(t['view_image'])} ↗</button></div></section>'''
def solutions(t,lang,prefix):
 cards=[]
 for i,name in enumerate(ASSETS):
  tags=''.join(f'<li>{esc(v)}</li>' for v in t['product_modules'][i])
  cards.append(f'''<article class="solution-card solution-{name}"><div class="solution-card-image"><button type="button" class="image-trigger" data-view-product="{i}" aria-label="{esc(t['view_image']+' · '+t['hero_tabs'][i])}">{picture(i,prefix,t=t)}<span class="image-zoom-marker" aria-hidden="true">↗</span></button><span class="concept-pill">{esc(t['concept'])}</span></div><div class="solution-card-copy"><p class="eyebrow">{esc(t['product_sectors'][i])}</p><h3>{esc(t['product_titles'][i])}</h3><p>{esc(t['product_problems'][i])}</p><p class="solution-outcome">{esc(t['product_outcomes'][i])}</p><ul class="solution-tags">{tags}</ul><a class="text-link" href="{prefix}{lang}/solutions/{SLUGS[i]}/">{esc(t['product_more'])} ↗</a></div></article>''')
 return f'<section id="solutions" class="solutions section shell" aria-labelledby="solutions-title"><div class="section-heading"><div><p class="eyebrow">NOVALIS / APPLICATIONS</p><h2 id="solutions-title">{lines(t["solutions_title"])}</h2></div><p>{esc(t["solutions_copy"])}</p></div><p class="concept-note">{esc(t["concept_note"])}</p><div class="solutions-grid">'+''.join(cards)+'</div></section>'
def workshop(t,h1=False):
 tag='h1' if h1 else 'h2'
 tabs=''.join(f'<button type="button" data-operation="{i}" aria-pressed="{str(i==0).lower()}"><span>0{i+1}</span>{esc(v)}</button>' for i,v in enumerate(t['lab_tabs']))
 stages=''.join(f'<li data-operation-stage="{i}"><span>0{i+1}</span><strong>{esc(v)}</strong><b aria-hidden="true">'+('✓' if i==0 else '·')+'</b></li>' for i,v in enumerate(t['lab_stages']))
 rules=''.join(f'<p data-operation-rule="{i}"'+(' hidden' if i else '')+'>'+esc(v)+'</p>' for i,v in enumerate(t['lab_rule_text']))
 return f'''<section id="lab" class="workshop section" aria-labelledby="operation-title"><div class="shell workshop-layout"><div class="workshop-story"><p class="eyebrow">NOVALIS / {esc(t['lab_badge'])}</p><{tag} id="operation-title">{lines(t['lab_title'])}</{tag}><p>{esc(t['lab_copy'])}</p><div class="operation-selector" role="group" aria-label="{esc(t['lab_badge'])}">{tabs}</div><p class="workshop-note">{esc(t['lab_note'])}</p><a class="text-link" href="#contact">{esc(t['lab_cta'])} ↗</a></div><div class="operation-console"><div class="console-top"><span>N / WORKSPACE</span><span id="operation-state" class="state-pill" role="status">{esc(t['lab_ready'])}</span></div><h3 id="operation-name">{esc(t['lab_names'][0])}</h3><p id="operation-story">{esc(t['lab_stories'][0])}</p><ol class="operation-flow" id="operation-flow" data-phase="ready">{stages}</ol><dl id="operation-metrics" class="operation-metrics"></dl><div id="operation-blockers" class="operation-blockers" role="status"><p>{esc(t['lab_unfixed'])}</p></div><div id="operation-corrections" class="operation-corrections"></div><div class="operation-actions"><button type="button" class="button" id="operation-run">{esc(t['lab_try'])} ↗</button><button type="button" class="text-link" id="operation-reset">{esc(t['lab_reset'])} ↺</button></div><details class="operation-rules"><summary>{esc(t['lab_rules'])}</summary>{rules}</details><div class="operation-log"><h4>{esc(t['lab_log_title'])}</h4><ol id="operation-log"><li>{esc(t['lab_logs'][0])}</li></ol></div></div></div></section>'''
def value(t):
 values=[100,12,2,40,3,20];limits=[(0,100000),(0,240),(0,240),(0,100),(0,240),(0,100000)]
 fields=''.join(f'<label for="value-{i}">{esc(label)}<input id="value-{i}" type="number" min="{limits[i][0]}" max="{limits[i][1]}" step="{1 if i in [0,3] else .5}" value="{values[i]}" inputmode="decimal"></label>' for i,label in enumerate(t['value_labels']))
 rows=''.join(f'<div><dt>{esc(label)}</dt><dd id="value-row-{i}">—</dd></div>' for i,label in enumerate(t['value_table']))
 return f'''<section id="valeur" class="value-section section shell" aria-labelledby="value-title"><div class="section-heading"><div><p class="eyebrow">NOVALIS / MESURE</p><h2 id="value-title">{lines(t['value_title'])}</h2></div><p>{esc(t['value_copy'])}</p></div><details class="value-details"><summary>{esc(t['value_open'])}<span aria-hidden="true">＋</span></summary><div class="value-grid"><div class="value-inputs">{fields}</div><div class="value-results"><span class="eyebrow">{esc(t['value_result'])}</span><div class="value-number"><output id="value-net">—</output><span>{esc(t['value_unit'])}</span></div><p id="value-status" role="status"></p><dl>{rows}</dl></div></div><p class="value-formula">{esc(t['value_formula'])}</p><p class="value-note">{esc(t['value_note'])}</p><a class="text-link" href="#contact">{esc(t['value_cta'])} ↗</a></details></section>'''
def brief(t):
 choices=''.join(f'<option value="{i}">{esc(v)}</option>' for i,v in enumerate(t['hero_tabs']))
 constraints=''.join(f'<label><input type="checkbox" data-brief-constraint="{i}">{esc(v)}</label>' for i,v in enumerate(t['brief_constraints']))
 return f'''<section id="studio" class="brief-section section shell" aria-labelledby="brief-title"><div><p class="eyebrow">NOVALIS / VOTRE POINT DE DÉPART</p><h2 id="brief-title">{lines(t['brief_title'])}</h2><p>{esc(t['brief_copy'])}</p><p class="brief-disclaimer">{esc(t['brief_disclaimer'])}</p></div><div class="brief-card"><label for="brief-path">{esc(t['brief_labels'][0])}<select id="brief-path">{choices}</select></label><label for="brief-tools">{esc(t['brief_labels'][1])}<input id="brief-tools" maxlength="180" placeholder="{esc(t['brief_placeholder'])}"></label><label for="brief-problem">{esc(t['brief_labels'][2])}<textarea id="brief-problem" rows="3" maxlength="1000" placeholder="{esc(t['brief_problem_placeholder'])}"></textarea></label><fieldset><legend>{esc(t['brief_labels'][3])}</legend>{constraints}</fieldset><div class="brief-actions"><button type="button" class="button" id="brief-transfer">{esc(t['brief_transfer'])} ↗</button><button type="button" class="text-link" id="brief-download">{esc(t['brief_download'])} ↓</button></div><p id="brief-status" role="status"></p></div></section>'''
def enrich_showcase(lang,prefix,out,client):
 t=S[lang]
 for i,v in enumerate(t['nav']):out[f'nav_{i}']=esc(v)
 for key in ['hero_cta','contact_cta','contact_form_note','footer_line','saas_heading','saas_copy','saas_link'] :out['show_'+key]=esc(t[key])
 for key in ['contact_title','contact_copy','contact_note']:out['show_'+key]=lines(t[key])
 out.update(show_hero=hero(t,lang,prefix),show_solutions=solutions(t,lang,prefix),show_workshop=workshop(t),show_value=value(t),show_brief=brief(t),show_dialog=image_dialog(t),showcase_style_version=version('showcase.css'),showcase_script_version=version('showcase.js'),operations_engine_version=version('operations-engine.js'))
 out['show_trust']='<section class="trust-band section shell"><h2>'+lines(t['trust_title'])+'</h2><div>'+''.join(f'<article><span>0{i+1}</span><h3>{esc(v[0])}</h3><p>{esc(v[1])}</p></article>' for i,v in enumerate(t['trust_items']))+'</div></section>'
 out['show_saas_url']=prefix+lang+'/realisations/novalis-os/'
 # No unused pricing ranges or scientific-playground payload is delivered.
 for k in list(client):
  if k.startswith('experience') or k in {'studio','ultimate','art_pause','art_resume'}:client.pop(k)
 from ultimate import D
 client['delivery']={key:D[lang][key] for key in ['method_phases','method_details','method_deliverables','method_decisions','crew_handoffs']}
 client['showcase']=t;client['asset_prefix']=prefix+'assets/'
 client['v2']['api_labels']['server_note']=t['contact_form_note']

def page_shell(lang,canonical,title,body,prefix,url):
 t=S[lang];data=json.dumps({'showcase':t,'asset_prefix':prefix+'assets/'},ensure_ascii=False).replace('<','\\u003c')
 alternate=''.join(f'<link rel="alternate" hreflang="{l}" href="{canonical.replace("/"+lang+"/","/"+l+"/",1)}">' for l in S)
 nav=''.join(f'<a lang="{l}" hreflang="{l}" href="{canonical.replace("/"+lang+"/","/"+l+"/",1)}">{l.upper()}</a>' for l in S)
 return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} — Novalis AI</title><meta name="description" content="{esc(title)} — {esc(t['concept_note'])}"><link rel="canonical" href="{canonical}">{alternate}<link rel="icon" href="{prefix}assets/N_novalis.png"><link rel="stylesheet" href="{prefix}assets/showcase.css?v={version('showcase.css')}"><script src="{prefix}assets/operations-engine.js?v={version('operations-engine.js')}" defer></script><script src="{prefix}assets/showcase.js?v={version('showcase.js')}" defer></script><meta property="og:title" content="{esc(title)} — Novalis AI"><meta property="og:url" content="{canonical}"><meta property="og:type" content="website"><meta property="og:image" content="{url}/assets/novalis_og.png"></head><body class="detail-page"><a class="skip-link" href="#main">↓</a><header class="site-header"><div class="shell header-inner"><a class="brand" href="{prefix}{lang}/"><img src="{prefix}assets/logo.webp" alt="Novalis AI" width="1200" height="269"></a><a class="text-link" href="{prefix}{lang}/">← Novalis AI</a><nav class="detail-language" aria-label="Language">{nav}</nav></div></header>{body}<footer class="detail-footer shell"><a href="mailto:contact@novalisai.com">contact@novalisai.com</a><a class="text-link" href="{prefix}{lang}/#contact">{esc(t['hero_cta'])} ↗</a></footer>{image_dialog(t)}<script id="site-data" type="application/json">{data}</script></body></html>'''
def write_showcase_pages(url):
 urls=[]
 for lang,t in S.items():
  folder=ROOT/lang/'lab';folder.mkdir(exist_ok=True)
  body='<main id="main">'+workshop(t,True).replace('href="#contact"',f'href="../#contact"')+'</main>'
  canonical=f'{url}/{lang}/lab/';(folder/'index.html').write_text(page_shell(lang,canonical,t['lab_title'].replace('\n',' '),body,'../../',url));urls.append(canonical)
  for i,slug in enumerate(SLUGS):
   folder=ROOT/lang/'solutions'/slug;folder.mkdir(parents=True,exist_ok=True);canonical=f'{url}/{lang}/solutions/{slug}/'
   modules=''.join(f'<li>{esc(v)}</li>' for v in t['product_modules'][i]);questions=''.join(f'<li>{esc(v)}</li>' for v in t['product_questions'][i]);flow=''.join(f'<li><span>0{n+1}</span>{esc(v)}</li>' for n,v in enumerate(t['case_flow']))
   body=f'''<main id="main" class="solution-detail shell"><p class="eyebrow">NOVALIS / {esc(t['product_sectors'][i])}</p><h1>{esc(t['product_titles'][i])}</h1><p class="detail-lead">{esc(t['product_outcomes'][i])}</p><p class="concept-note">{esc(t['concept_note'])}</p><figure class="detail-product-image"><button class="image-trigger" type="button" data-view-product="{i}" aria-label="{esc(t['view_image'])}">{picture(i,'../../../',t=t)}</button><figcaption>{esc(t['view_image'])} ↗ · {esc(t['concept'])}</figcaption></figure><div class="detail-business-grid"><section><h2>{esc(t['case_problem'])}</h2><p>{esc(t['product_problems'][i])}</p></section><section><h2>{esc(t['case_solution'])}</h2><ul>{modules}</ul></section><section><h2>{esc(t['case_questions'])}</h2><ul>{questions}</ul></section><section><h2>{esc(t['product_more'])}</h2><ol class="case-flow">{flow}</ol></section></div><p class="brief-disclaimer">{esc(t['brief_disclaimer'])}</p><a class="button" href="../../#contact">{esc(t['case_next'])} ↗</a></main>'''
   (folder/'index.html').write_text(page_shell(lang,canonical,t['product_titles'][i],body,'../../../',url));urls.append(canonical)
  for old,slug in [('biladi','gestion-stock'),('code32','assistant-flux')]:
   folder=ROOT/lang/'realisations'/old;folder.mkdir(parents=True,exist_ok=True)
   target=f'../../solutions/{slug}/'
   (folder/'index.html').write_text(f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url={target}"><title>Novalis AI</title></head><body><a href="{target}">Novalis AI →</a></body></html>')
 return urls
