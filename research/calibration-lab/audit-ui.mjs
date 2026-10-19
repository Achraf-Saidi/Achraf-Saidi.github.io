import {SCENARIOS,SOLUTIONS} from './audit.mjs';
import {csv} from './engine.mjs';
import {lineChart,download,exportSVG,exportPNG,number} from './charts.mjs';
const $=id=>document.getElementById(id),pct=v=>Number.isFinite(v)?(100*v).toLocaleString('fr-BE',{maximumFractionDigits:1})+' %':'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#315ca8','#bd5844','#25816e','#9c7650','#778ca7','#7658a5','#c58542','#5f89a6','#3c827c','#9a5e8f','#68864e','#4c687c','#252e49'];
const short={full:'Sans censure',naive:'Censure ignorée',oracle:'G vrai',km_small:'KM 50',km_large:'KM 2000',
 km_online:'KM croissant',km_window:'KM récent',strat_online:'KM stratifié',exp_online:'G conditionnel',
 km_clip:'KM tronqué',dr_pooled:'AIPCW marginal',dr_cond:'AIPCW conditionnel',guard_exp:'G encadré'};
let published=null,active=null,worker=null,plot=null,plotTitle='',rawCache=null;
function meta(){return 'Audit '+active.auditVersion+' | N='+active.baseConfig.n+' | répétitions='+active.reps+' | α='+active.baseConfig.alpha+' | seed='+active.baseSeed+' | '+$('audit-scenario').value;}
function scenarioResult(){return active?.results.find(r=>r.scenario.id===$('audit-scenario').value);}
function chooseScenario(id){$('audit-scenario').value=id;renderDetail();}
function render(){
  if(!active)return;
  const total=active.reps*active.results.length;
  $('audit-kpis').innerHTML=[['13','solutions testées'],[String(active.results.length),'scénarios'],[total.toLocaleString('fr-BE'),'cohortes simulées'],['0','biais artificiel sur Ĝ']].map(([v,l])=>'<div><strong>'+v+'</strong><span>'+l+'</span></div>').join('');
  const selected=$('audit-scenario').value;
  $('audit-scenario').replaceChildren();
  for(const r of active.results){
    const option=document.createElement('option');option.value=r.scenario.id;option.textContent=r.scenario.label;$('audit-scenario').append(option);
  }
  if(active.results.some(r=>r.scenario.id===selected))$('audit-scenario').value=selected;
  const methods=active.solutions??SOLUTIONS;
  $('audit-matrix').innerHTML='<table class="audit-matrix"><thead><tr><th>Scénario</th>'+methods.map(m=>'<th>'+esc(short[m.id]??m.label)+'</th>').join('')+'</tr></thead><tbody>'+
    active.results.map(r=>'<tr><td><button type="button" class="text-button" data-audit-scenario="'+esc(r.scenario.id)+'">'+esc(r.scenario.label)+'</button></td>'+
      methods.map(m=>{
        const v=r.methods[m.id],shade=Math.round(97-v.rate*55),title='IC 95 % ['+pct(v.ci[0])+' ; '+pct(v.ci[1])+'] · '+v.hits+'/'+v.total;
        const cls=v.inflationDetected?' inflated':'';
        return '<td class="audit-rate'+cls+'" style="background:hsl(218 40% '+shade+'%);color:'+(v.rate>.55?'#fff':'#334e70')+'" title="'+esc(title)+'">'+pct(v.rate)+(v.inflationDetected?' *':'')+(m.id==='guard_exp'&&!r.scenario.guardValid?' †':'')+'</td>';
      }).join('')+'</tr>').join('')+'</tbody></table>';
  for(const b of document.querySelectorAll('[data-audit-scenario]'))b.onclick=()=>chooseScenario(b.dataset.auditScenario);
  renderDetail();renderInterpretation();
}
function renderDetail(){
  const r=scenarioResult();if(!r)return;
  $('audit-scenario-note').textContent=r.scenario.description;
  const series=(active.solutions??SOLUTIONS).map((m,i)=>{
    const v=r.methods[m.id];return {label:short[m.id]??m.label,color:colors[i%colors.length],points:true,noLine:true,radius:4,
      data:[[i+1,v.rate,'IC 95 % '+pct(v.ci[0])+' à '+pct(v.ci[1])]]};
  });
  plotTitle='Fréquence de première alerte · '+r.scenario.label;
  plot=lineChart($('audit-chart'),{title:plotTitle,series,xDomain:[.5,13.5],xTicks:Array.from({length:13},(_,i)=>i+1),yDomain:[-.03,1.06],height:330,
    xLabel:'Méthodes 1–13 dans l’ordre du tableau',yLabel:'Fréquence de première alerte',
    metadata:meta(),reference:r.scenario.null?[{y:active.baseConfig.alpha,label:'Niveau nominal α',color:'#bd5844'}]:[]});
  const NS='http://www.w3.org/2000/svg',left=68,top=25,width=768,height=249;
  (active.solutions??SOLUTIONS).forEach((m,i)=>{
    const v=r.methods[m.id],x=left+((i+1)-.5)/13*width;
    const Y=y=>top+(1.06-y)/1.09*height;
    const line=document.createElementNS(NS,'line');
    for(const [k,val] of Object.entries({x1:x,x2:x,y1:Y(v.ci[0]),y2:Y(v.ci[1]),stroke:colors[i%colors.length],'stroke-width':1.4,'pointer-events':'none'}))line.setAttribute(k,val);
    plot.append(line);
  });
  $('audit-detail').innerHTML='<table><thead><tr><th>Procédure</th><th>Alerte</th><th>IC Wilson 95 %</th><th>Alertes précoces</th><th>Après changement</th><th>Sans alerte</th><th>Délai médian*</th><th>Score moyen</th><th>Troncature</th><th>Inflation Holm</th></tr></thead><tbody>'+
    (active.solutions??SOLUTIONS).map((m,i)=>{
      const v=r.methods[m.id];
      return '<tr><td>'+String(i+1)+'. '+esc(m.label)+(m.id==='guard_exp'&&!r.scenario.guardValid?' †':'')+'</td><td>'+pct(v.rate)+' ('+v.hits+'/'+v.total+')</td><td>['+pct(v.ci[0])+' ; '+pct(v.ci[1])+']</td><td>'+v.early+'</td><td>'+v.post+'</td><td>'+v.nonDetection+'</td><td>'+(v.medianDelay===null?'—':number(v.medianDelay))+'</td><td>'+number(v.meanScore)+'</td><td>'+(m.kind==='dr'?'non mesurée':pct(v.meanClipFraction))+'</td><td>'+(r.scenario.null?(v.inflationDetected?'détectée':'non détectée'):'sans objet')+'</td></tr>';
    }).join('')+'</tbody></table><p class="chart-note">*Patients depuis N/2, conditionnellement à une première alerte après le changement. Une absence d’inflation détectée ne démontre pas le contrôle. Le score de « G encadré » est le milieu descriptif de ses deux enveloppes, pas un score centré unique. '+(r.scenario.guardValid?'La loi génératrice satisfait l’hypothèse de censure exponentielle homogène de cette méthode.':'† La garantie paramétrique de « G encadré » ne s’applique pas dans ce scénario.')+'</p>';
}
function renderInterpretation(){
  const lookup=id=>active.results.find(r=>r.scenario.id===id),paragraphs=[];
  const homogeneous=lookup('homogeneous'),conditional=lookup('conditional'),drift=lookup('censor-drift'),nonlinear=lookup('nonlinear-censor'),mild=lookup('mild-drift');
  if(homogeneous)paragraphs.push('Sans biais artificiel, un KM figé appris sur 50 historiques produit '+pct(homogeneous.methods.km_small.rate)+' d’alertes sous H₀, contre '+pct(homogeneous.methods.km_large.rate)+' avec 2 000 historiques. Cette comparaison isole une erreur d’estimation ordinaire, sans ajouter de décalage à Ĝ.');
  if(conditional)paragraphs.push('Lorsque G dépend de X : KM croissant '+pct(conditional.methods.km_online.rate)+' ; modèle conditionnel de G '+pct(conditional.methods.exp_online.rate)+' ; AIPCW conditionnel '+pct(conditional.methods.dr_cond.rate)+'. Une meilleure spécification peut résoudre certains scénarios simples.');
  if(drift)paragraphs.push('Quand seule la censure change, le modèle prédictif reste calibré. Fréquence d’alerte : KM récent '+pct(drift.methods.km_window.rate)+' ; AIPCW conditionnel '+pct(drift.methods.dr_cond.rate)+'. Une fenêtre mobile doit être jugée sur ses transitoires, pas seulement après stabilisation.');
  if(nonlinear)paragraphs.push('Dans le stress-test non linéaire : G exponentiel conditionnel '+pct(nonlinear.methods.exp_online.rate)+' ; AIPCW conditionnel '+pct(nonlinear.methods.dr_cond.rate)+'. Le succès ou l’échec concerne ces modèles de travail et cette taille d’échantillon.');
  if(mild)paragraphs.push('Sous dégradation modérée : première alerte après changement dans '+pct(mild.methods.guard_exp.post/mild.methods.guard_exp.total)+' des répétitions pour « G encadré », contre '+pct(mild.methods.oracle.post/mild.methods.oracle.total)+' pour G vrai. Réduire les fausses alertes peut coûter de la sensibilité ; il faut conserver les non-détections dans l’analyse.');
  paragraphs.push('Le cas homogène dispose d’une construction simple avec un argument de contrôle explicite, sous hypothèses restrictives. Il ne faut donc pas présenter « G inconnu » comme un problème entièrement sans solution. L’originalité doctorale éventuelle doit porter sur une extension, une meilleure garantie ou un meilleur compromis validité–puissance.');
  paragraphs.push('Ces essais ne déterminent pas si une méthode a déjà été publiée et ne prouvent pas qu’aucune autre solution simple ne fonctionne. La double robustesse d’un score ne fournit pas automatiquement un e-processus exact lorsque les deux fonctions auxiliaires sont apprises.');
  $('audit-interpretation').innerHTML=paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('');
}
function summaryRows(){
  const unmeasured=new Set((active.solutions??SOLUTIONS).filter(m=>m.kind==='dr').map(m=>m.id));
  return active.results.flatMap(r=>Object.entries(r.methods).map(([id,m])=>({scenario:r.scenario.id,H0:r.scenario.null,method:id,...m,
    meanClipFraction:unmeasured.has(id)?null:m.meanClipFraction})));
}
function exportSummary(){
  const cols=['scenario','H0','method','hits','total','rate','early','post','nonDetection','medianDelay','meanScore','meanGRMSE','meanClipFraction','inflationP','inflationPHolm','inflationDetected','guardModelValid'];
  download(csv(summaryRows(),[...cols.map(key=>({key})),{label:'ci95_lower',get:r=>r.ci[0]},{label:'ci95_upper',get:r=>r.ci[1]}]),'calibration-audit-summary.csv','text/csv;charset=utf-8');
}
async function exportRaw(){
  try{
    let raw=active.raw;
    if(!raw&&active===published){
      if(!rawCache){
        const r=await fetch(new URL('./audit-results/confirm-replicates.json.gz',import.meta.url));
        if(!r.ok)throw Error('Fichier indisponible');
        if(typeof DecompressionStream==='undefined')throw Error('Ce navigateur ne décompresse pas gzip. Le fichier confirm-replicates.json.gz reste téléchargeable depuis GitHub.');
        const packed=JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text());
        rawCache=packed.raw.map(row=>({scenario:packed.scenarios[row[0]],replicate:row[1],seed:row[2],
          methods:Object.fromEntries(packed.methods.map((id,j)=>{
            const alarm=row[j+3],cp=Math.floor(packed.n/2);
            return [id,{alarm,early:alarm!==null&&alarm<=cp,post:alarm!==null&&alarm>cp,
              delay:alarm!==null&&alarm>cp?alarm-cp:null}];
          }))}));
      }
      raw=rawCache;
    }
    if(!raw)throw Error('Aucune répétition disponible');
    const rows=raw.flatMap(r=>Object.entries(r.methods).map(([method,m])=>({scenario:r.scenario,replicate:r.replicate,seed:r.seed,method,...m})));
    download(csv(rows,['scenario','replicate','seed','method','alarm','early','post','delay'].map(key=>({key}))),'calibration-audit-replicates.csv','text/csv;charset=utf-8');
  }catch(e){$('audit-run-status').textContent=e.message;}
}
function exportReport(){
  if(!active)return;
  const current=scenarioResult();
  const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Audit des solutions simples · Calibration Lab</title><style>body{font:13px/1.7 system-ui;color:#253c58;max-width:1400px;margin:35px auto;padding:20px}h1{font:36px Georgia}table{border-collapse:collapse;font-size:10px;width:100%}td,th{border:1px solid #dce3ec;padding:7px;text-align:right}td:first-child,th:first-child{text-align:left}button{border:0;background:none;color:#315ca8;font:inherit}svg{width:100%}pre{white-space:pre-wrap;font:10px monospace;background:#f3f6fa;padding:20px}section{margin:30px 0;break-inside:avoid}@media print{button{display:none}body{margin:0;padding:0}}</style><h1>Audit des solutions simples</h1><p>'+esc(meta())+'</p><p>13 méthodes appariées. Aucun biais artificiel sur G estimé. Résultats empiriques ; absence d’alerte et absence d’inflation détectée ne démontrent ni validité générale ni nouveauté.</p><button onclick="window.print()">Imprimer / PDF</button><section><h2>Matrice de confirmation</h2>'+$('audit-matrix').innerHTML+'</section><section><h2>'+esc(current.scenario.label)+'</h2>'+exportSVG(plot,plotTitle,meta())+$('audit-detail').innerHTML+'</section><section><h2>Interprétation</h2>'+$('audit-interpretation').innerHTML+'</section><section><h2>Protocole, sources et résultats</h2><pre>'+esc(JSON.stringify({...active,raw:undefined},null,2))+'</pre></section><p><a href="https://achraf-saidi.github.io/research/calibration-lab/AUDIT_METHODS.md">Justification mathématique et limites</a></p></html>';
  download(html,'calibration-audit-report.html','text/html;charset=utf-8');
}
function run(){
  if(worker)worker.terminate();
  const id=$('audit-scenario').value,n=Number($('audit-n').value),reps=Number($('audit-reps').value),seed=Number($('audit-seed').value);
  if(!Number.isInteger(seed)||seed<0||seed>4294967295){$('audit-run-status').textContent='La graine doit être un entier entre 0 et 4 294 967 295.';return;}
  worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
  $('audit-run').disabled=true;$('audit-stop').hidden=false;$('audit-progress').hidden=false;
  $('audit-progress-bar').value=0;$('audit-progress-bar').max=reps;
  $('audit-run-status').textContent='Calcul de 13 méthodes appariées sur '+reps+' cohortes…';
  worker.onmessage=({data})=>{
    if(data.type==='audit-progress'){$('audit-progress-bar').value=data.completed;$('audit-progress-text').textContent=data.completed+' / '+data.total;}
    if(data.type==='audit'){active=data.result;render();stop();$('audit-run-status').textContent='Résultat interactif · N='+n+' · répétitions='+reps+' · seed='+seed+'. Les résultats publiés restent accessibles par le bouton dédié.';}
    if(data.type==='error'){stop();$('audit-run-status').textContent='Erreur : '+data.message;}
  };
  worker.onerror=e=>{stop();$('audit-run-status').textContent='Erreur Worker : '+e.message;};
  worker.postMessage({type:'audit',options:{reps,baseSeed:seed,scenarios:[id],settings:{n}}});
}
function stop(){worker?.terminate();worker=null;$('audit-run').disabled=false;$('audit-stop').hidden=true;}
export async function initAuditUI(){
  $('audit-scenario').onchange=renderDetail;
  $('audit-run').onclick=run;
  $('audit-stop').onclick=()=>{stop();$('audit-run-status').textContent='Calcul arrêté. Aucun résultat partiel n’est présenté comme final.';};
  $('audit-restore').onclick=()=>{if(published){active=published;render();$('audit-run-status').textContent='Affichage de la confirmation publiée.';}};
  $('audit-download-summary').onclick=()=>active&&exportSummary();
  $('audit-download-raw').onclick=()=>active&&exportRaw();
  $('audit-download-json').onclick=()=>active&&download(JSON.stringify(active,null,2),'calibration-audit-results.json','application/json');
  $('audit-download-report').onclick=()=>active&&exportReport();
  $('audit-chart-svg').onclick=()=>plot&&download(exportSVG(plot,plotTitle,meta()),'calibration-audit.svg','image/svg+xml');
  $('audit-chart-png').onclick=async()=>{if(plot)try{await exportPNG(plot,plotTitle,meta(),'calibration-audit.png');}catch{$('audit-run-status').textContent='Échec PNG ; l’export SVG reste disponible.';}};
  try{
    const response=await fetch(new URL('./audit-results/confirm.json',import.meta.url));
    if(!response.ok)throw Error('Confirmation indisponible');
    published=await response.json();active=published;render();
    $('audit-run-status').textContent='Confirmation publiée · N='+active.baseConfig.n+' · '+active.reps+' répétitions par scénario · protocole figé avant confirmation.';
  }catch{
    $('audit-matrix').innerHTML='<p class="small muted">Les résultats publiés ne sont pas disponibles. Tu peux lancer une expérience interactive ci-dessous.</p>';
    for(const s of SCENARIOS){const option=document.createElement('option');option.value=s.id;option.textContent=s.label;$('audit-scenario').append(option);}
  }
}

