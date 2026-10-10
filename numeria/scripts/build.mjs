import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pageHTML, esc } from '../views.js';
import { t } from '../i18n.js';
import { previews } from '../previews.js';
import { loginHTML } from '../school-views.js';
import { copy } from '../catalog.js';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const modules=['catalog.js','i18n.js','previews.js','commerce.js','views.js','app.js','school-core.js','school-store.js','school-views.js','school-app.js','experiences.js'];
const sources=await Promise.all(modules.map(async file=>({file,content:(await fs.readFile(path.join(base,file),'utf8')).replace(/\.js\?v=[a-f0-9]+/g,'.js')})));
const css=await fs.readFile(path.join(base,'styles.css'),'utf8');
const schoolCSS=await fs.readFile(path.join(base,'school.css'),'utf8');
const version=crypto.createHash('sha256').update(sources.map(s=>s.content).join('\n')+css+schoolCSS).digest('hex').slice(0,10);
for(const source of sources) await fs.writeFile(path.join(base,source.file),source.content.replace(/(from\s+['"]\.\/[\w-]+\.js)(['"])/g,`$1?v=${version}$2`));
const titles={home:'pageHome',lycee:'pageSchool',tech:'pageTech',resources:'pageResources'};
const descriptions={home:'heroLead',lycee:'schoolHeroCopy',tech:'techHeroCopy',resources:'resourcesHeroCopy'};
const files={home:'index.html',lycee:'lycee.html',tech:'formations.html',resources:'ressources.html'};
for(const view of Object.keys(files)){
  const url=`https://achraf-saidi.github.io/numeria/${view==='home'?'':files[view]}`;
  const html=`<!doctype html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t(titles[view]))}</title><meta name="description" content="${esc(t(descriptions[view]))}">
<meta name="theme-color" content="#f7f7f2"><meta name="color-scheme" content="light"><meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="canonical" href="${url}"><link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<meta property="og:type" content="website"><meta property="og:site_name" content="NUMERIA"><meta property="og:title" content="${esc(t(titles[view]))}"><meta property="og:description" content="${esc(t(descriptions[view]))}"><meta property="og:url" content="${url}">
<link rel="stylesheet" href="styles.css?v=${version}"><link rel="stylesheet" href="school.css?v=${version}"><script type="module" src="app.js?v=${version}"></script>
</head>
<body data-view="${view}"><div id="app">${pageHTML(view,'fr')}</div><noscript><p style="padding:20px;text-align:center">Les parcours et les prix sont consultables sans JavaScript. Pour les programmes détaillés, le panier et les extraits, activez JavaScript ou écrivez à <a href="mailto:Achraf@numeria.dz">Achraf@numeria.dz</a>.</p></noscript></body>
</html>`;
  await fs.writeFile(path.join(base,files[view]),html);
}

await fs.writeFile(path.join(base,'ecole.html'),`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mon espace école · NUMERIA</title><meta name="description" content="Démonstration de l’espace école Numeria : étudiants, lycéens, parents, professeurs et administration."><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light"><meta name="theme-color" content="#f7f7f2"><link rel="icon" href="favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="styles.css?v=${version}"><link rel="stylesheet" href="school.css?v=${version}"><script type="module" src="school-app.js?v=${version}"></script></head><body class="school-page"><div id="school-app">${loginHTML()}</div><noscript><p style="padding:25px;text-align:center">Activez JavaScript pour tester les espaces école. Cet espace est une démonstration locale, sans compte ni paiement réel.</p></noscript></body></html>`);

await fs.writeFile(path.join(base,'favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6840d8"/><g fill="#dbfc7d" transform="translate(17 15) skewX(-16)"><rect y="8" width="8" height="27"/><rect x="12" width="8" height="35"/><rect x="24" y="15" width="8" height="20"/></g></svg>');
await fs.mkdir(path.join(base,'samples'),{recursive:true});
for(const [key,sample] of Object.entries(previews)){
  let content;
  if(sample.file.endsWith('.py')||sample.file.endsWith('.R')||key==='python'){
    content=`# NUMERIA — extrait pédagogique gratuit\n# ${copy(sample.title)}\n# Jeu pédagogique, pas une collection complète.\n# ${copy(sample.task).replace(/\n/g,'\n# ')}\n\n${sample.code}\n`;
    if(key==='python')content+='\nfor invalid in ([], [True], [21], [float("nan")]):\n    try:\n        moyenne(invalid)\n    except ValueError:\n        pass\n    else:\n        raise AssertionError("Une entrée invalide a été acceptée")\nprint("Extrait Python : vérifications réussies")\n';
  }else if(key==='web'){
    content=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUMERIA · formulaire accessible</title><style>body{font:16px/1.8 system-ui;background:#f7f7f2;color:#242326;max-width:600px;margin:50px auto;padding:25px}form{display:grid;gap:15px}input,button{font:inherit;padding:12px;border:1px solid #aaa;border-radius:6px}button{background:#6840d8;color:#fff}h1{line-height:1.2}</style><h1>Un formulaire compréhensible.</h1><p>Extrait gratuit NUMERIA. Démonstration locale : aucune donnée n’est envoyée ou enregistrée.</p><form id="demo"><label for="email">Adresse e-mail</label><input id="email" type="email" required aria-describedby="hint"><p id="hint">Exemple : nom@domaine.dz. Le test valide uniquement la forme.</p><button type="submit">Tester le formulaire</button></form><p id="status" role="status"></p><script>document.getElementById('demo').addEventListener('submit',e=>{e.preventDefault();document.getElementById('status').textContent='Format accepté. Aucune donnée envoyée.'})</script></html>`;
  }else if(sample.file.endsWith('.html')){
    content=`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUMERIA · ${esc(copy(sample.title))}</title><style>body{font:16px/1.8 system-ui;background:#f7f7f2;color:#242326;max-width:820px;margin:40px auto;padding:25px}h1,h2{line-height:1.4}pre{white-space:pre-wrap;font:18px/1.8 monospace;background:#eee8fc;padding:22px;border-radius:8px}.sample{border-top:1px solid #ccc;padding-top:25px;margin-top:40px}nav{display:flex;gap:20px}a{color:#6840d8}@media print{body{background:white;margin:0;font-size:12px}.sample{break-before:page}nav{display:none}}</style><nav><a href="#fr">Français</a><a href="#en">English</a><a href="#ar">العربية</a></nav>${['fr','en','ar'].map(lang=>`<article class="sample" id="${lang}" lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}"><p>NUMERIA / ${t('previewLabel',lang)}</p><h1>${esc(copy(sample.title,lang))}</h1><p>${esc(copy(sample.intro,lang))}</p><h2>${t('task',lang)}</h2><p>${esc(copy(sample.task,lang)).replace(/\n/g,'<br>')}</p><pre dir="ltr">${esc(sample.code)}</pre><h2>${t('solution',lang)}</h2><p>${esc(copy(sample.solution,lang))}</p><p>${t('previewNote',lang)}</p></article>`).join('')}</html>`;
  }else content=`NUMERIA — extrait gratuit\n\n${copy(sample.title)}\n\n${copy(sample.intro)}\n\n${copy(sample.task)}\n\n${sample.code}\n\n${copy(sample.solution)}\n`;
  await fs.writeFile(path.join(base,'samples',key==='python'?'python-extrait.py':sample.file),content);
}
const python=previews.python;
await fs.writeFile(path.join(base,'samples','python-extrait.ipynb'),JSON.stringify({
  nbformat:4,nbformat_minor:5,metadata:{kernelspec:{display_name:'Python 3',language:'python',name:'python3'},language_info:{name:'python'}},
  cells:[{cell_type:'markdown',id:'intro',metadata:{},source:[`# NUMERIA — ${copy(python.title)}\n`,`Extrait gratuit. ${copy(python.intro)}\n`,`\n${copy(python.task)}`]},
  {cell_type:'code',id:'exercise',execution_count:null,metadata:{},outputs:[],source:python.code.split('\n').map(line=>line+'\n')},
  {cell_type:'markdown',id:'solution',metadata:{},source:[`## Correction\n${copy(python.solution)}\n`,`\nÀ compléter : ajoutez vos tests pour la liste vide, les bornes 0 et 20 et les entrées invalides.`]}]
},null,2));
await fs.mkdir(path.join(base,'qa'),{recursive:true});
await fs.writeFile(path.join(base,'qa','responsive.html'),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUMERIA · aperçu téléphone</title><style>body{margin:0;padding:25px;background:#eeece4;font:14px system-ui;color:#242326}h1{font-size:20px}nav{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}a{color:#6840d8}section{display:flex;gap:30px;align-items:start;flex-wrap:wrap}iframe{height:810px;border:1px solid #cbc7d3;background:#f7f7f2;box-shadow:0 10px 30px #211c3610;border-radius:12px}.phone{width:390px}.narrow{width:320px}button{padding:9px;cursor:pointer}</style><h1>NUMERIA · contrôle responsive</h1><nav>${Object.entries({...files,ecole:'ecole.html'}).map(([view,file])=>`<button onclick="document.querySelectorAll('iframe').forEach(f=>f.src='../${file}?qa=${version}')">${view}</button>`).join('')}<button onclick="document.querySelectorAll('iframe').forEach(f=>f.src=f.src.replace(/([?&])lang=[^&]*/g,'')+'&lang=ar')">AR</button><button onclick="document.querySelectorAll('iframe').forEach(f=>f.src=f.src.replace(/([?&])lang=[^&]*/g,'')+'&lang=en')">EN</button><button onclick="document.querySelectorAll('iframe').forEach(f=>f.src=f.src.replace(/([?&])lang=[^&]*/g,'')+'&lang=fr')">FR</button></nav><section><div><p>390 px · mobile</p><iframe id="phone" class="phone" title="Mobile 390" src="../index.html?qa=${version}"></iframe></div><div><p>320 px · petit téléphone</p><iframe id="narrow" class="narrow" title="Mobile 320" src="../index.html?qa=${version}"></iframe></div></section></html>`);
console.log(`NUMERIA built: 4 public pages + school demo, 9 free samples + Python notebook, version ${version}`);

