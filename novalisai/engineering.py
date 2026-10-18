"""Code-native product demonstrations and the four retained commercial pillars."""
import html
def e(v):return html.escape(str(v),quote=True)
from workflow import dashboard,hero,icon
def expertise(t,lang,prefix):
 s=t['engineering'];icons=['code','flow','chart','screen'];slugs=['sur-mesure','automatisation','data-ia','sites-web']
 cards=''.join(f'<a class="expertise-pillar" href="{prefix}{lang}/{slugs[i]}/"><div><span aria-hidden="true">{icon(icons[i])}</span><b>0{i+1} ↗</b></div><h3>{e(v[0])}</h3><p>{e(v[1])}</p><span class="expertise-stack">{e(v[2])}</span></a>' for i,v in enumerate(s['pillars']))
 return f'<section id="expertises" class="section shell expertise-section"><div class="section-heading"><div><p class="eyebrow">01 / EXPERTISES</p><h2>{e(s["expertise_title"])}</h2></div><p>{e(s["expertise_copy"])}</p></div><div class="expertise-grid">{cards}</div></section>'
def data_section(t,detail=False):
 s=t['engineering'];items=''.join(f'<article><span>0{i+1}</span><h3>{e(v[0])}</h3><p>{e(v[1])}</p></article>' for i,v in enumerate(s['data_items']))
 return f'''<section id="data-science" class="data-section section"><div class="shell"><div class="section-heading"><div><p class="eyebrow">DATA SCIENCE / OPTIMIZATION</p><h2>{e(s['data_title'])}</h2></div><p>{e(s['data_copy'])}</p></div><div class="data-steps">{items}</div><div class="model-explanation"><div><span class="eyebrow">NOVALIS OPTIMIZE</span><h3>{e(s['model_title'])}</h3><p>{e(s['model_copy'])}</p><a class="text-link" href="#hero-title">{e(s['model_try'])} ↑</a></div><div class="optimization-principles">{''.join('<p>'+icon(name)+'<span>'+e(copy)+'</span></p>' for name,copy in zip(['chart','shield','check'],t['workflow']['optimization_steps']))}</div></div></div></section>'''

def write_pages(P,url):
 """Override selected existing URLs with the engineering presentation; retain all others."""
 from pathlib import Path
 from premium import shell,showroom,ai
 from extensions import E
 root=Path(__file__).parent;urls=[]
 web={
 'fr':['Votre site est souvent votre première rencontre avec un client. Soignez l’impression.','Nous concevons des sites vitrines, boutiques et parcours de réservation autour de votre marque et de vos clients. La qualité visuelle se prolonge dans les pages produit, les formulaires, le mobile et les outils de gestion.',['Parcours client et architecture de l’information','Direction artistique et interfaces responsive','Catalogue, panier, réservation et paiement via un prestataire adapté','SEO technique, accessibilité et suivi des demandes']],
 'en':['Your website is often your first meeting with a customer. Make it count.','We design websites, shops and booking journeys around your brand and customers. Visual quality carries through product pages, forms, mobile use and the business tools behind the experience.',['Customer journeys and information architecture','Art direction and responsive interfaces','Catalogues, carts, booking and payments through a suitable provider','Technical SEO, accessibility and enquiry tracking']],
 'nl':['Uw website is vaak de eerste ontmoeting met een klant. Zorg voor de juiste indruk.','We ontwerpen websites, webwinkels en reserveringstrajecten rond uw merk en klanten. De visuele kwaliteit loopt door in productpagina’s, formulieren, mobiel gebruik en de achterliggende bedrijfstools.',['Klanttrajecten en informatiearchitectuur','Art direction en responsive interfaces','Catalogus, winkelmand, reservering en betaling via een passende aanbieder','Technische SEO, toegankelijkheid en opvolging van aanvragen']],
 'de':['Ihre Website ist oft die erste Begegnung mit einem Kunden. Machen Sie etwas daraus.','Wir gestalten Websites, Shops und Buchungsabläufe rund um Ihre Marke und Ihre Kunden. Die visuelle Qualität setzt sich in Produktseiten, Formularen, mobiler Nutzung und den betrieblichen Werkzeugen dahinter fort.',['Kundenwege und Informationsarchitektur','Art Direction und responsive Oberflächen','Katalog, Warenkorb, Buchung und Zahlung über einen passenden Anbieter','Technische SEO, Barrierefreiheit und Nachverfolgung von Anfragen']]}
 for lang,t in P.items():
  s=t['engineering'];prefix='../../';entries={x[0]:x for x in E[lang]['pages']};slugs=['sur-mesure','automatisation','data-ia','sites-web'];special=[]
  for i,slug in enumerate(slugs):
   title=s['pillars'][i][0]
   if slug=='sites-web':heading,description,bullets=web[lang]
   else:_,_,heading,description,bullets=entries[slug]
   if slug=='data-ia':heading=s['data_title'];description=s['data_copy'];bullets=[v[0]+' — '+v[1] for v in s['data_items']]
   if slug=='automatisation':heading=' '.join(t['ai_title']);description=t['ai_copy']
   if slug=='sur-mesure':description=s['pillars'][0][1]+' '+s['services_copy']
   special.append((slug,title,heading,description,bullets))
  special.append(tuple(entries['saas']))
  for slug,title,heading,description,bullets in special:
   listing=''.join('<li>'+e(v)+'</li>' for v in bullets)
   related=''.join(f'<a class="text-link" href="../{other}/">{e(s["pillars"][j][0])} ↗</a>' for j,other in enumerate(slugs) if other!=slug)
   body=f'<section class="service-hero shell"><p class="eyebrow">NOVALIS / {e(title)}</p><h1 id="hero-title">{e(heading)}</h1><p>{e(description)}</p><a class="button" href="../#contact">{e(t["cta"])} ↗</a></section><section class="service-body shell"><div><h2>{e(s["service_title"])}</h2><ul>{listing}</ul><nav class="service-related">{related}</nav></div><aside><h2>{e(s["approach_title"])}</h2><p>{e(s["services_copy"])}</p><h3>{e(s["validation_title"])}</h3><p>{e(t["method_steps"][4][1])}</p><a class="text-link" href="../methode/">{e(t["nav"][1])} ↗</a></aside></section>'
   if slug=='data-ia':body+='<div class="demo-detail shell">'+dashboard(t,'data')+'</div>'+data_section(t)
   elif slug=='automatisation':body+=ai(t).replace('href="#contact"',f'href="../../{lang}/#contact"')
   elif slug=='sites-web':
    body+='<div class="shell web-examples">'+''.join(f'<a href="../solutions/{c["slug"]}/"><img src="../../assets/concept-{c["asset"]}.webp" alt="{e(c["category"])}" loading="lazy" width="1586" height="992"><h3>{e(c["category"])}</h3><p>{e(c["value"])}</p><span>{e(t["concept"])} ↗</span></a>' for c in [c for c in t['cases'] if c['group']=='web'])+'</div>'
   canonical=f'{url}/{lang}/{slug}/';folder=root/lang/slug;folder.mkdir(exist_ok=True);(folder/'index.html').write_text(shell(lang,canonical,title,body,prefix,url,description=description));urls.append(canonical)
  body=f'<section class="service-hero shell"><p class="eyebrow">NOVALIS / EXPERTISES</p><h1>{e(s["expertise_title"])}</h1><p>{e(s["expertise_copy"])}</p></section>'+expertise(t,lang,prefix)+f'<div class="shell service-related"><a class="text-link" href="../saas/">SaaS ↗</a><a class="text-link" href="../#contact">{e(t["cta"])} ↗</a></div>'
  canonical=f'{url}/{lang}/expertise/';(root/lang/'expertise/index.html').write_text(shell(lang,canonical,t['nav'][0],body,prefix,url,description=s['expertise_copy']))
  body=f'<section class="service-hero shell"><p class="eyebrow">NOVALIS / SHOWROOM</p><h1>{e(" ".join(t["show_title"]))}</h1><p>{e(t["show_copy"])}</p><a class="text-link" href="../solutions/optimisation/">Novalis Optimize ↗</a></section>'
  gallery=showroom(t,lang,prefix,full=True)
  canonical=f'{url}/{lang}/realisations/';(root/lang/'realisations/index.html').write_text(shell(lang,canonical,'Showroom',body+gallery,prefix,url))
  for slug,name,heading in [('aide-decision','Novalis Intelligence',s['dashboard_title']),('optimisation','Novalis Optimize',s['model_title'])]:
   prefix='../../../';body=f'<section class="service-hero shell"><p class="eyebrow">{e(t["concept"])} / {name.upper()}</p><h1 id="hero-title">{e(heading)}</h1><p>{e(s["data_copy"] if slug=="aide-decision" else s["model_copy"])}</p></section><div class="demo-detail shell">'+dashboard(t,slug)+'</div>'+data_section(t)+f'<div class="shell service-related"><a class="button" href="../../#contact">{e(t["case_cta"])} ↗</a></div>'
   canonical=f'{url}/{lang}/solutions/{slug}/';folder=root/lang/'solutions'/slug;folder.mkdir(exist_ok=True);(folder/'index.html').write_text(shell(lang,canonical,name,body,prefix,url));urls.append(canonical)
  canonical=f'{url}/{lang}/lab/';body=f'<section class="service-hero shell"><p class="eyebrow">{e(t["concept"])}</p><h1 id="hero-title">Novalis Intelligence</h1><p>{e(s["model_copy"])}</p></section><div class="demo-detail shell">'+dashboard(t,'lab')+'</div>'+data_section(t)
  (root/lang/'lab/index.html').write_text(shell(lang,canonical,'Novalis Intelligence',body,'../../',url))
 return urls

