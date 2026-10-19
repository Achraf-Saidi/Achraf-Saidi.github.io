import {VERSION,DEFAULTS,PRESETS,METHODS,LABELS,normalize,simulate,mean,aggregate,calibrationBins,uniformBand,prefixSummary,csv,hasAlternative} from './engine.mjs';
import {COLORS,number,lineChart,timeline,download,exportSVG,exportPNG} from './charts.mjs';

const $=id=>document.getElementById(id);
const pct=v=>Number.isFinite(v)?(100*v).toLocaleString('fr-BE',{maximumFractionDigits:1})+' %':'—';
const fmt=v=>number(v);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='achraf-calibration-lab-v1';
const state={sim:null,config:{...DEFAULTS},calendar:0,tab:'monitor',visible:new Set(METHODS),
  worker:null,mcWorker:null,mc:null,charts:{},saved:[],playing:false,timer:null,dirty:false};
const GROUPS=[
  {title:'01 · Cohorte & arrivées',open:true,description:'L’horloge calendaire et le temps écoulé depuis l’arrivée sont distincts.',fields:[
    ['n','Patients à simuler','N',100,20000,100,'Nombre total de prédictions émises.'],
    ['tau','Horizon de prédiction','τ · mois',.1,120,.5,'Même délai avant évaluation pour chaque patient.'],
    ['arrivalRate','Arrivées par mois','λ',.1,1000,1,'Cadence moyenne ; elle modifie le délai calendaire, pas l’ordre des scores.'],
    ['arrival','Processus d’arrivée','',{'regular':'Arrivées régulières','poisson':'Processus de Poisson'}],
    ['seed','Graine aléatoire','seed',0,4294967295,1,'Même graine et mêmes réglages : mêmes données.'],
  ]},
  {title:'02 · Modèle & profils',description:'Une règle logistique fixe produit p=P(T>τ|X). La Weibull fournit les temps d’événement.',fields:[
    ['baseSurvival','Survie de référence','p₀',.05,.95,.05,'Probabilité prédite pour x=0, groupe=0.'],
    ['riskSpread','Effet de x sur logit(p)','β',0,2,.05,'Dispersion des probabilités prédites.'],
    ['groupEffect','Effet du groupe sur logit(p)','γ',-2,2,.05,'Le modèle tient compte du groupe.'],
    ['groupPrevalence','Proportion du groupe 1','P(z=1)',.05,.95,.05],
    ['shape','Forme Weibull des événements','k',.4,3,.05,'Change la distribution de T en conservant S*(τ).'],
    ['initialShift','Erreur prédictive dès le départ','δ₀',-2,2,.1,'Zéro pour démarrer avec un modèle parfaitement calibré.'],
  ]},
  {title:'03 · Changement au fil du temps',description:'La règle de prédiction reste fixe. On modifie le générateur ou la population.',fields:[
    ['change','Début du changement','fraction de N',.05,.95,.05,'0,5 : changement après la moitié des arrivées.'],
    ['ramp','Durée de transition','fraction de N',0,.8,.05,'Zéro : rupture brutale. Sinon changement progressif.'],
    ['eventShift','Décalage de survie réelle','δ',-3,3,.1,'Négatif : moins de survie que prédit après le changement.'],
    ['slopeShift','Changement de pente','κ',-2,2,.1,'Erreur de calibration dépendant du niveau de p.'],
    ['groupShift','Dérive propre au groupe 1','η',-2,2,.1],
    ['xShift','Déplacement de la moyenne de x','Δx',-3,3,.1,'Un shift de population n’implique pas à lui seul une décalibration.'],
    ['prevalenceShift','Variation de proportion du groupe','ΔP',-.8,.8,.05],
  ]},
  {title:'04 · Mécanisme de censure',open:true,description:'G est la probabilité d’être encore non censuré à τ ; le taux de réponses inconnues dépend aussi de T.',fields:[
    ['censoring','Activer la censure','toggle'],
    ['censorRate','Censure potentielle de référence','q',.01,.9,.05,'P(C≤τ) pour x=0, groupe=0 avant dérive.'],
    ['censorX','Effet de x sur le log-risque de C','b',-2,2,.1],
    ['censorGroup','Effet du groupe sur la censure','c',-2,2,.1],
    ['censorShift','Dérive du log-risque de C','ΔC',-3,3,.1,'Positif : davantage de censure après le changement.'],
    ['gMin','Borne du vrai G','gmin',.01,.5,.01,'Imposée au générateur pour garantir la positivité.'],
    ['censorRho','Dépendance T–C : stress-test','ρ',-.9,.9,.1,'ρ≠0 viole l’indépendance conditionnelle ; la garantie oracle ne s’applique plus.'],
  ]},
  {title:'05 · Apprentissage de G',description:'Seulement les données observées de patients déjà évalués. Aucune variable latente dans l’estimateur.',fields:[
    ['estimator','Estimateur de censure','',{'km':'Kaplan–Meier marginal inversé','stratified':'KM stratifié (groupe × p)','exponential':'Exponentiel conditionnel (x + groupe)'}],
    ['trainN','Patients historiques indépendants','n₀',0,5000,100,'Leur suivi à τ est terminé avant l’instant zéro.'],
    ['learning','Actualisation','',{'frozen':'Figé sur l’historique','expanding':'Échantillon croissant','sliding':'Fenêtre récente'}],
    ['window','Taille de la fenêtre d’apprentissage','wG',50,5000,50],
    ['refitEvery','Réajuster tous les…','patients',1,500,10],
    ['initialG','Valeur de repli sans historique','G initial',.05,.99,.05],
    ['gBias','Perturbation volontaire du logit de Ĝ','biais',-2,2,.1,'Positif : surestimer Ĝ. Zéro : estimation apprise sans perturbation.'],
    ['clip','Seuil inférieur appliqué à Ĝ','ε',.01,.8,.01,'Réduit les poids extrêmes mais peut introduire un biais.'],
  ]},
  {title:'06 · Surveillance & graphiques',description:'Le seuil est valable séparément pour chaque procédure qui remplit ses hypothèses.',fields:[
    ['alpha','Niveau de fausses alertes','α',.001,.2,.005],
    ['restart','Mélange avec départs différés','toggle'],
    ['bins','Classes des courbes de calibration','B',3,12,1,'Les classes des graphiques n’altèrent pas les quatre classes fixes du moniteur.'],
    ['rolling','Fenêtre des diagnostics récents','w',25,3000,25],
  ]},
];

function makeControls(){
  for(const group of GROUPS){
    const details=document.createElement('details');details.open=!!group.open;
    const summary=document.createElement('summary');summary.textContent=group.title;details.append(summary);
    const desc=document.createElement('p');desc.className='group-description';desc.textContent=group.description;details.append(desc);
    for(const field of group.fields){
      const [key,label,symbol,min,max,step,help]=field;
      const wrap=document.createElement('div');wrap.className=symbol==='toggle'?'field-toggle':'field';
      const lab=document.createElement('label');lab.htmlFor='c-'+key;lab.textContent=label;
      if(symbol&&symbol!=='toggle'){const sym=document.createElement('span');sym.className='symbol';sym.textContent=symbol;lab.append(sym);}
      let input;
      if(min&&typeof min==='object'){
        input=document.createElement('select');for(const [value,text] of Object.entries(min)){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}
      }else{
        input=document.createElement('input');input.type=symbol==='toggle'?'checkbox':'number';
        if(input.type==='number'){input.min=min;input.max=max;input.step=['n','seed','trainN','window','refitEvery','bins','rolling'].includes(key)?1:'any';input.required=true;}
      }
      input.id='c-'+key;input.name=key;
      wrap.append(lab,input);
      if(help){const hint=document.createElement('small');hint.id='help-'+key;hint.textContent=help;input.setAttribute('aria-describedby',hint.id);wrap.append(hint);}
      details.append(wrap);
    }
    $('control-groups').append(details);
  }
  for(const k of METHODS){
    const label=document.createElement('label');label.style.setProperty('--method-color',COLORS[k]);
    const input=document.createElement('input');input.type='checkbox';input.checked=true;input.value=k;
    input.addEventListener('change',()=>{input.checked?state.visible.add(k):state.visible.delete(k);render();});
    label.append(input,document.createTextNode(LABELS[k]));$('method-switches').append(label);
  }
  const custom=document.createElement('option');custom.value='custom';custom.textContent='Protocole personnalisé';$('preset').append(custom);
  for(const preset of PRESETS){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.title;$('preset').append(option);}
}
function setControls(config){
  const c=normalize(config);
  for(const group of GROUPS)for(const [key] of group.fields){
    const input=$('c-'+key);if(input.type==='checkbox')input.checked=c[key];else input.value=c[key];
  }
  state.dirty=false;$('dirty-note').classList.remove('dirty');
}
function readControls(){
  const c={};
  for(const group of GROUPS)for(const [key] of group.fields){
    const input=$('c-'+key);c[key]=input.type==='checkbox'?input.checked:input.type==='number'?input.valueAsNumber:input.value;
  }
  return normalize(c);
}
function toast(text){
  $('toast').textContent=text;$('toast').hidden=false;clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>$('toast').hidden=true,4500);
}
function persist(){
  try{localStorage.setItem(STORAGE,JSON.stringify({config:state.config,saved:state.saved}));}catch{/* optional persistence */}
}
function metadata(){
  const c=state.sim?.config??state.config;
  return 'Calibration Lab '+VERSION+' | seed='+c.seed+' | N='+c.n+' | τ='+c.tau+' | α='+c.alpha+' | évalués='+matured()+' | '+METHODS.filter(k=>state.visible.has(k)).map(k=>LABELS[k]).join(' / ');
}
function expName(part){return 'calibration-'+part+'-seed'+(state.sim?.config.seed??state.config.seed);}
function upTo(rows,key,value){
  let lo=0,hi=rows.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid][key]<=value+1e-9)lo=mid+1;else hi=mid;}
  return lo;
}
function matured(){return state.sim?upTo(state.sim.patients,'evalTime',state.calendar):0;}
function stopPlayback(){
  state.playing=false;clearInterval(state.timer);state.timer=null;$('play').textContent='▶';$('play').setAttribute('aria-label','Lire le suivi');
}
function setCalendar(t){
  if(!state.sim)return;
  state.calendar=Math.max(0,Math.min(Number(t),state.sim.patients.at(-1).evalTime));
  $('clock').value=state.calendar;render();
}
function run(config=readControls()){
  stopPlayback();if(state.worker)state.worker.terminate();
  state.config=normalize(config);setControls(state.config);
  $('run').disabled=true;$('run-status').textContent='Génération des patients et calcul des scores…';
  const start=performance.now();
  function finish(result){
    state.sim=result;state.calendar=result.patients.at(-1).evalTime;
    $('clock').max=state.calendar;$('clock').step=Math.max(.001,state.calendar/1600);$('clock').value=state.calendar;
    $('run-status').textContent='Expérience calculée · '+Math.round(performance.now()-start)+' ms · quatre méthodes appariées';
    $('experiment-id').textContent='SEED '+result.config.seed+' / N '+result.config.n;
    $('run').disabled=false;state.dirty=false;
    $('dirty-note').textContent='Même cohorte et mêmes prédictions pour les quatre méthodes.';
    state.charts={};persist();render();renderSaved();
  }
  function fail(message){
    $('run').disabled=false;$('run-status').textContent='Le calcul a échoué : '+message;toast(message);
  }
  try{
    const worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});state.worker=worker;
    worker.onmessage=event=>{
      if(worker!==state.worker)return;
      if(event.data.type==='simulation'){finish(event.data.result);worker.terminate();state.worker=null;}
      if(event.data.type==='error'){fail(event.data.message);worker.terminate();state.worker=null;}
    };
    worker.onerror=()=>{
      // Same pure engine as fallback for environments without module workers.
      worker.terminate();state.worker=null;
      setTimeout(()=>{try{finish(simulate(state.config));}catch(e){fail(e.message);}},0);
    };
    worker.postMessage({type:'simulate',config:state.config});
  }catch{
    setTimeout(()=>{try{finish(simulate(state.config));}catch(e){fail(e.message);}},0);
  }
}
function selectTab(tab){
  state.tab=tab;
  for(const button of document.querySelectorAll('[data-tab]')){
    const selected=button.dataset.tab===tab;
    button.setAttribute('aria-selected',selected);button.tabIndex=selected?0:-1;
    $('panel-'+button.dataset.tab).hidden=!selected;
  }
  render();
}
function visibleSeries(data,key='average',divisor=1){
  return METHODS.filter(k=>state.visible.has(k)).map(k=>({key:k,label:LABELS[k],data:data.map(r=>[r.i,r[key][k]/divisor])}));
}
function putChart(key,options){
  const target=$('chart-'+key);if(!target)return;
  state.charts[key]={svg:lineChart(target,{...options,metadata:metadata()}),title:options.title};
}
function changeRefs(c,n,calendar=false){
  const cp=Math.floor(c.change*c.n),row=state.sim.patients[cp];
  return cp<=n?[{x:calendar?row.evalTime:cp+.5,label:'Changement',color:'#a0acbd'}]:[];
}
function render(){
  if(!state.sim)return;
  const c=state.sim.config,n=matured(),rows=state.sim.patients.slice(0,n),arrived=upTo(state.sim.patients,'arrival',state.calendar);
  $('clock-stats').innerHTML='<span>Temps <strong>'+fmt(state.calendar)+'</strong> mois</span><span><strong>'+arrived+'</strong> arrivés</span><span><strong>'+n+'</strong> évalués</span><span><strong>'+(arrived-n)+'</strong> en attente de τ</span><span>Horizon <strong>'+fmt(c.tau)+'</strong> mois</span>';
  const warning=[];
  if(c.censoring&&c.censorRho!==0)warning.push('ρ ≠ 0 : T et C sont dépendants conditionnellement à X. La garantie oracle et la décomposition S*G* ne s’appliquent pas.');
  if(c.trainN===0)warning.push('Aucun historique : les premières valeurs de Ĝ reposent sur le repli initial.');
  if(c.clip>c.gMin&&c.censoring)warning.push('Le seuil de troncature de Ĝ dépasse la borne du vrai G ; certains poids peuvent être biaisés.');
  if(state.dirty)warning.push('Des paramètres ont changé. Les résultats affichés correspondent encore à la dernière expérience calculée.');
  $('global-alert').hidden=!warning.length;$('global-alert').textContent=warning.join(' ');
  if(state.tab==='monitor')renderMonitor(rows,n,c);
  if(state.tab==='diagnostics')renderDiagnostics(rows,n,c);
  if(state.tab==='patients')renderPatients(rows,n,c);
}
function renderMonitor(rows,n,c){
  const m=aggregate(rows,c);
  const cards=[
    ['Patients évalués',String(n),'/ '+c.n+' patients générés',COLORS.full],
    ['Réponses inconnues à τ',m?pct(m.unknown):'—','C < min(T,τ) · taux réalisé',COLORS.secondary],
    ['Biais réel du modèle',m?fmt(m.predictive):'—','Moyenne synthétique S* − p',COLORS.oracle],
    ['Erreur d’estimation de G',m?fmt(m.gRMSE):'—','RMSE(Ĝ,G*) à τ',COLORS.plugin],
  ];
  $('metrics').innerHTML=cards.map(([label,value,foot,color])=>'<div class="metric" style="--metric-color:'+color+'"><span class="metric-label">'+label+'</span><strong class="metric-value">'+value+'</strong><span class="metric-foot">'+foot+'</span></div>').join('');
  const history=state.sim.history.filter(r=>r.i<=n);
  // Keep the exact endpoint even when the stored display trajectory is thinned.
  const point=n?{i:n,logE:rows.at(-1).logE,average:Object.fromEntries(METHODS.map(k=>[k,m.average[k]]))}:null;
  if(point&&history.at(-1)?.i!==n)history.push(point);
  putChart('evidence',{title:'Évidence séquentielle par méthode',description:'Log base 10 du mélange de martingales de paris sur les scores, seuil 1/alpha.',
    series:visibleSeries(history,'logE',Math.LN10),yLabel:'log₁₀ Eₙ',xDomain:[0,c.n],height:330,
    reference:[{y:Math.log10(1/c.alpha),label:'Seuil 1/α = '+fmt(1/c.alpha),color:COLORS.rust},...changeRefs(c,n)]});
  $('alarm-summary').innerHTML=METHODS.map(k=>{
    const at=state.sim.summary.alarms[k],triggered=at!==null&&at<=n;
    return '<span class="alarm-chip '+(triggered?'alerted':'')+'">'+LABELS[k]+' · '+(triggered?'alerte au patient '+at:'aucune alerte')+'</span>';
  }).join('');
  putChart('scores',{title:'Moyennes cumulées des scores de calibration',
    series:visibleSeries(history),yLabel:'Moyenne ψ',xDomain:[0,c.n],reference:[{y:0},...changeRefs(c,n)]});
  const dec=[];let pred=0,nuis=0,actual=0;const stride=Math.max(1,Math.floor(n/200));
  for(let j=0;j<n;j++){
    pred+=rows[j].expectedPredictive;nuis+=rows[j].expectedNuisance??0;actual+=rows[j].scores.plugin;
    if((j+1)%stride===0||j===n-1)dec.push({i:j+1,pred:pred/(j+1),nuis:nuis/(j+1),total:(pred+nuis)/(j+1),actual:actual/(j+1)});
  }
  const independent=!c.censoring||c.censorRho===0;
  const decomposition=[
    {label:'S* − p · prédiction',color:COLORS.oracle,data:dec.map(r=>[r.i,r.pred])},
    ...(independent?[
      {label:'S*(G*/Ĝ − 1) · ajustement',color:COLORS.plugin,data:dec.map(r=>[r.i,r.nuis])},
      {label:'Espérance totale du score',color:COLORS.truth,dash:'5 4',data:dec.map(r=>[r.i,r.total])},
    ]:[]),
    {label:'Score plug-in réalisé',color:'#acbacb',width:1,data:dec.map(r=>[r.i,r.actual])},
  ];
  putChart('decomposition',{title:independent?'Décomposition du signal plug-in':'Indépendance violée : décomposition désactivée',
    series:decomposition,yLabel:'Moyenne cumulée',xDomain:[0,c.n],reference:[{y:0},...changeRefs(c,n)]});
  const bandData=history.map(r=>{
    const b=uniformBand(r.i,c.alpha,1+1/(c.censoring?c.gMin:1));return [r.i,r.average.oracle-b,r.average.oracle+b];
  });
  putChart('band',{title:independent?'Bande simultanée conservatrice du score oracle':'Bande désactivée : indépendance violée',series:independent?[{key:'oracle',label:'Moyenne oracle',data:history.map(r=>[r.i,r.average.oracle])}]:[],
    xDomain:[0,c.n],yLabel:'Moyenne ± borne de Hoeffding',shade:independent?[{data:bandData,color:COLORS.oracle}]:[],reference:[{y:0}],
    yDomain:bandData.length?[Math.min(...bandData.slice(Math.floor(bandData.length/5)).map(p=>p[1]),-.1),Math.max(...bandData.slice(Math.floor(bandData.length/5)).map(p=>p[2]),.1)]:[-1,1]});
  const texts=[];
  if(!n)texts.push('Les patients commencent à arriver. Les scores restent inchangés tant qu’aucun patient n’a atteint son horizon de suivi.');
  else{
    texts.push('À cet instant, '+n+' patients sont évalués. '+pct(m.unknown)+' ont une réponse Y inconnue à τ ; les événements observés avant τ restent des réponses connues.');
    if(!hasAlternative(c))texts.push('Le générateur impose S*=p : le modèle prédictif est calibré. Un signal dû à la censure ou à Ĝ ne constitue donc pas une dégradation réelle de ce modèle.');
    else texts.push('Le générateur modifie la survie réelle par rapport aux prédictions. L’écart moyen S*−p vaut '+fmt(m.predictive)+'. Une erreur qui change de signe selon le risque peut être peu visible dans cette moyenne.');
    if(c.censoring&&independent)texts.push('Sous indépendance, l’effet moyen de l’ajustement par Ĝ vaut '+fmt(m.nuisance)+'. La moyenne réalisée du score plug-in vaut '+fmt(m.average.plugin)+' ; elle fluctue autour de la somme des deux composantes théoriques.');
    if(c.censoring&&!independent)texts.push('L’indépendance conditionnelle est violée : connaître G* seul ne justifie plus le centrage IPCW. La décomposition habituelle n’est pas affichée comme une vérité.');
    if(m.clipped)texts.push(pct(m.clipped)+' des valeurs Ĝ ont été tronquées au seuil ε. Le CSV conserve les valeurs avant et après troncature.');
    texts.push('Une trajectoire n’établit pas un taux de fausses alertes. L’onglet Monte-Carlo répète cette expérience et distingue le bras H₀ du scénario actuel.');
  }
  $('interpretation').innerHTML=texts.map(t=>'<p>'+esc(t)+'</p>').join('');
}
function scopedRows(rows,c){
  const choice=$('diagnostic-scope').value,change=Math.floor(c.change*c.n);
  if(choice==='recent')return rows.slice(-c.rolling);
  if(choice==='before')return rows.filter(r=>r.i<=change);
  if(choice==='after')return rows.filter(r=>r.i>change);
  return rows;
}
function blockRows(rows,size){
  const blocks=[];for(let i=0;i<rows.length;i+=size)blocks.push(rows.slice(i,i+size));return blocks;
}
function renderDiagnostics(all,n,c){
  const rows=scopedRows(all,c),m=aggregate(rows,c),bins=calibrationBins(rows,c.bins);
  $('scope-count').textContent=rows.length+' patients dans cette période · fenêtre récente '+c.rolling;
  const series=METHODS.filter(k=>state.visible.has(k)).map(k=>({key:k,label:LABELS[k],points:true,data:bins.map(b=>[b.p,b[k],'n='+b.n])}));
  series.push({label:'S* · vérité du générateur',color:COLORS.truth,dash:'5 4',points:true,data:bins.map(b=>[b.p,b.S])});
  series.push({label:'Calibration parfaite',color:'#aab6c6',dash:'3 5',data:[[0,0],[1,1]]});
  putChart('calibration',{title:'Calibration à horizon fixe par classes de probabilité',series,xDomain:[0,1],xLabel:'Probabilité de survie prédite p',yLabel:'Survie moyenne / estimateur pondéré',height:330});
  const blocks=blockRows(rows,Math.max(15,Math.ceil(rows.length/65)));
  const trend=blocks.map(b=>({i:mean(b.map(r=>r.i)),G:mean(b.map(r=>r.G)),gHat:mean(b.map(r=>r.gHat)),raw:mean(b.map(r=>r.gRaw))}));
  putChart('g',{title:'Probabilités de non-censure vraies et estimées',series:[
    {key:'oracle',label:'G* vrai',data:trend.map(t=>[t.i,t.G])},
    {key:'plugin',label:'Ĝ utilisé',data:trend.map(t=>[t.i,t.gHat])},
    {label:'Ĝ appris avant perturbation',color:'#b5a1c6',dash:'4 4',data:trend.map(t=>[t.i,t.raw])},
  ],xDomain:[0,c.n],yDomain:[0,1.05],yLabel:'P(C > τ | X, passé)',reference:changeRefs(c,n)});
  const rolling=[],stride=Math.max(10,Math.floor(rows.length/120));
  for(let j=0;j<rows.length;j++){
    if((j+1)%stride!==0&&j!==rows.length-1)continue;
    const block=rows.slice(Math.max(0,j+1-c.rolling),j+1);
    const a=aggregate(block,c);rolling.push({i:rows[j].i,...a});
  }
  putChart('g-error',{title:'Erreur de G et biais de centrage dans une fenêtre récente',series:[
    {label:'RMSE de Ĝ',color:COLORS.plugin,data:rolling.map(r=>[r.i,r.gRMSE])},
    ...(!c.censoring||c.censorRho===0?[{label:'Biais S*(G*/Ĝ − 1)',color:COLORS.secondary,data:rolling.map(r=>[r.i,r.nuisance])}]:[]),
  ],xDomain:[0,c.n],yLabel:'Erreur / biais',reference:[{y:0},...changeRefs(c,n)]});
  putChart('ess',{title:'Effectif effectif relatif des contributions de survie',series:[
    {key:'oracle',label:'ESS/n · G*',data:rolling.map(r=>[r.i,r.ess.oracle/r.n])},
    {key:'plugin',label:'ESS/n · Ĝ',data:rolling.map(r=>[r.i,r.ess.plugin/r.n])},
  ],xDomain:[0,c.n],yDomain:[0,1.05],yLabel:'ESS / taille de fenêtre',reference:changeRefs(c,n)});
  if(!m){$('stat-table').innerHTML='<p class="empty-note">Aucun patient évaluable dans cette période.</p>';return;}
  $('stat-table').innerHTML='<table><thead><tr><th>Méthode</th><th>Score moyen</th><th>ECE par classes</th><th>Brier</th><th>ESS survie</th></tr></thead><tbody>'+
    METHODS.map(k=>'<tr><td><span class="method-label" style="--method-color:'+COLORS[k]+'"><i></i>'+LABELS[k]+'</span></td><td>'+fmt(m.average[k])+'</td><td>'+fmt(m.ece[k])+'</td><td>'+fmt(m.brier[k])+'</td><td>'+fmt(m.ess[k])+'</td></tr>').join('')+
    '</tbody></table><p class="small muted">G* moyen : '+fmt(m.G)+' · Ĝ moyen : '+fmt(m.gHat)+' · poids maximal 1/Ĝ : '+fmt(m.maxWeight)+' · RMSE de Ĝ : '+fmt(m.gRMSE)+' · valeurs tronquées : '+pct(m.clipped)+'.</p>';
}
function renderPatients(all,n,c){
  const svg=timeline($('chart-timeline'),state.sim.patients,state.calendar,c.tau,metadata());
  state.charts.timeline={svg,title:'Suivi individuel depuis l’arrivée'};
  const filter=$('patient-filter').value,search=Number($('patient-search').value),truth=$('show-truth').checked;
  let rows=all.filter(r=>!search||r.i===search);
  if(filter==='censored')rows=rows.filter(r=>r.dc);
  if(filter==='event')rows=rows.filter(r=>r.de);
  if(filter==='survived')rows=rows.filter(r=>r.R);
  if(filter==='clipped')rows=rows.filter(r=>r.clipped);
  $('patient-count').textContent=rows.length+' lignes · '+Math.min(rows.length,100)+' affichées';
  const headers=['Patient','Arrivée','Évaluation','p','Statut à τ','R','Ĝ','Dernier i appris','n apprent.','Score plug-in'];
  if(truth)headers.push('T*','C*','Y*','S*','G*');
  $('patient-table').innerHTML='<table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+
    rows.slice(-100).map(r=>{
      const values=[r.i,fmt(r.arrival),fmt(r.evalTime),fmt(r.p),r.dc?'Censuré · Y inconnu':r.de?'Événement · Y=0':'Survie · Y=1',r.R,fmt(r.gHat),r.fitThrough,r.fitN,fmt(r.scores.plugin)];
      if(truth)values.push(fmt(r.T),Number.isFinite(r.C)?fmt(r.C):'∞',r.Y,fmt(r.S),fmt(r.G));
      return '<tr>'+values.map((v,i)=>'<td'+(i>=10?' class="truth-cell"':'')+'>'+esc(v)+'</td>').join('')+'</tr>';
    }).join('')+'</tbody></table>';
}
function startMC(){
  if(!state.sim){toast('Génère d’abord une expérience.');return;}
  if(state.dirty){toast('Applique les paramètres avec « Générer & analyser » avant Monte-Carlo.');return;}
  if(state.mcWorker)state.mcWorker.terminate();
  const config={...state.sim.config},reps=Number($('mc-reps').value),arm=$('mc-arm').value;
  let worker;
  try{worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});}catch{toast('Monte-Carlo nécessite un navigateur acceptant les Web Workers sur HTTPS.');return;}
  state.mcWorker=worker;
  $('run-mc').disabled=true;$('stop-mc').hidden=false;$('mc-progress').hidden=false;
  $('mc-progress-bar').value=0;$('mc-progress-text').textContent='Préparation des répétitions…';
  $('mc-output').innerHTML='';
  worker.onmessage=({data})=>{
    if(data.type==='progress'){
      $('mc-progress-bar').max=data.total;$('mc-progress-bar').value=data.completed;
      $('mc-progress-text').textContent=data.completed+' / '+data.total+' répétitions terminées · '+(data.arm==='null'?'bras H₀':'scénario actuel');
    }
    if(data.type==='mc'){
      state.mc=data.result;renderMC();finishMC();
      $('mc-progress-text').textContent='Simulation Monte-Carlo terminée · graine de base '+config.seed;
    }
    if(data.type==='error'){finishMC();toast(data.message);}
  };
  worker.onerror=event=>{finishMC();toast('Erreur Monte-Carlo : '+event.message);};
  worker.postMessage({type:'mc',config,reps,arm});
}
function finishMC(){
  state.mcWorker?.terminate();state.mcWorker=null;$('run-mc').disabled=false;$('stop-mc').hidden=true;
}
function renderMC(){
  if(!state.mc)return;
  const r=state.mc,c=r.config;
  const blocks=r.results.map(arm=>{
    const title=arm.arm==='null'?'H₀ · modèle calibré, indépendance conditionnelle':'Scénario actuel · '+(arm.isAlternative?'alternative prédictive':'modèle prédictif calibré');
    return '<article class="card"><p class="eyebrow">'+r.reps+' RÉPÉTITIONS · N='+c.n+' · SEED='+c.seed+'</p><h2>'+title+'</h2>'+
      '<div class="table-scroll"><table><thead><tr><th>Procédure</th><th>Au moins une alerte</th><th>IC Wilson 95 %</th><th>Alerte ≤ début erreur</th><th>1re alerte après</th><th>Délai médian*</th></tr></thead><tbody>'+
      METHODS.map(k=>{
        const a=arm.methods[k];
        return '<tr><td><span class="method-label" style="--method-color:'+COLORS[k]+'"><i></i>'+LABELS[k]+'</span></td><td>'+pct(a.rate)+' ('+a.hits+'/'+r.reps+')</td><td>['+pct(a.ci[0])+' ; '+pct(a.ci[1])+']</td><td>'+a.preChange+'</td><td>'+a.postHits+'</td><td>'+(a.medianDelay===null?'—':fmt(a.medianDelay)+' patients')+'</td></tr>';
      }).join('')+'</tbody></table></div><p class="chart-note">Niveau de référence α='+pct(c.alpha)+'. *Délai conditionnel aux premières alertes après le changement, mesuré depuis le début de la transition (ou depuis zéro si δ₀≠0). Pour le bras H₀, le changement est uniquement un repère temporel. Les IC concernent chaque fréquence séparément. '+(arm.rho?'L’indépendance conditionnelle est violée dans ce bras.':'')+'</p></article>';
  }).join('');
  $('mc-output').innerHTML=blocks+'<p class="small muted">Protocole Monte-Carlo figé au lancement : '+esc(c.estimator)+' · apprentissage '+esc(c.learning)+' · q='+c.censorRate+' · biais logit Ĝ='+c.gBias+'. Ces résultats conservent ces réglages même si une nouvelle expérience est lancée.</p><div class="mc-controls"><button class="secondary" id="mc-csv" type="button">Répétitions · CSV</button><button class="secondary" id="mc-json" type="button">Résultats complets · JSON</button></div>';
  $('mc-csv').onclick=()=>download(csv(r.raw,[{key:'arm'},{key:'replicate'},{key:'seed'},...METHODS.map(k=>({key:k,label:'first_alarm_'+k}))]),'calibration-monte-carlo-seed'+c.seed+'.csv','text/csv;charset=utf-8');
  $('mc-json').onclick=()=>download(JSON.stringify(r,null,2),'calibration-monte-carlo-seed'+c.seed+'.json','application/json');
}
async function loadReferenceValidation(){
  try{
    const response=await fetch(new URL('./tests/validation.json',import.meta.url));
    if(!response.ok)throw Error('Validation unavailable');
    const data=await response.json();
    const names={'null-homogeneous':'H₀ · censure homogène','null-biased-G':'H₀ · Ĝ volontairement surestimé','predictive-drift':'Dérive prédictive réelle'};
    $('reference-validation').innerHTML='<p class="small muted">'+data.replicates+' répétitions par scénario · N='+data.n+' · α='+pct(data.alpha)+' · seed de base '+data.baseSeed+'. Taux d’au moins une alerte pendant le suivi :</p><div class="table-scroll"><table><thead><tr><th>Scénario</th>'+METHODS.map(k=>'<th>'+LABELS[k]+'</th>').join('')+'</tr></thead><tbody>'+data.arms.map(a=>'<tr><td>'+esc(names[a.name]??a.name)+'</td>'+METHODS.map(k=>'<td>'+pct(a.methods[k].alarmRate)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="small muted">Vérification empirique du moteur, sans garantie générale pour Ĝ. Les paramètres complets, IC et graines sont disponibles dans <a href="./tests/validation.json" target="_blank" rel="noopener">validation.json</a> et le script de reproduction dans <a href="./tests/validate.mjs">validate.mjs</a>.</p>';
  }catch{$('reference-validation').innerHTML='<p class="small muted">Les résultats de référence ne sont pas disponibles. Les simulations interactives restent utilisables.</p>';}
}
function renderSaved(){
  if(!state.saved.length){$('saved-experiments').innerHTML='<p class="small muted">Aucune expérience mémorisée.</p>';return;}
  $('saved-experiments').innerHTML='<div class="table-scroll"><table><thead><tr><th>Expérience</th><th>δ après</th><th>Censure q</th><th>Score plug-in</th><th>1re alerte oracle</th><th>1re alerte plug-in</th><th>Reprendre</th></tr></thead><tbody>'+
    state.saved.map((r,i)=>'<tr><td>Seed '+r.config.seed+' · N='+r.config.n+'</td><td>'+fmt(r.config.eventShift)+'</td><td>'+pct(r.config.censorRate)+'</td><td>'+fmt(r.summary.average.plugin)+'</td><td>'+(r.summary.alarms.oracle??'—')+'</td><td>'+(r.summary.alarms.plugin??'—')+'</td><td><button data-saved="'+i+'">Charger</button><button data-saved-export="'+i+'">JSON</button><button data-saved-delete="'+i+'" aria-label="Supprimer l’expérience '+(i+1)+'">×</button></td></tr>').join('')+'</tbody></table></div>';
  for(const b of document.querySelectorAll('[data-saved]'))b.onclick=()=>{const r=state.saved[+b.dataset.saved];setControls(r.config);$('preset').value='custom';run(r.config);};
  for(const b of document.querySelectorAll('[data-saved-export]'))b.onclick=()=>{const r=state.saved[+b.dataset.savedExport];download(JSON.stringify(r,null,2),'calibration-protocole-seed'+r.config.seed+'.json','application/json');};
  for(const b of document.querySelectorAll('[data-saved-delete]'))b.onclick=()=>{state.saved.splice(+b.dataset.savedDelete,1);persist();renderSaved();};
}
const PATIENT_COLUMNS=[
  ['i','patient_id'],['arrival','arrival_month'],['evalTime','evaluation_month'],
  ['x','x'],['group','group'],['p','predicted_survival'],['S','true_survival'],
  ['T','latent_event_time'],['C','latent_censor_time'],['U','observed_followup'],
  ['delta','latent_event_before_censor_indicator'],['de','event_observed_by_tau'],['dc','censor_observed_by_tau'],
  ['known','Y_known_at_tau'],['Y','latent_Y'],['R','R_observed_survival'],
  ['G','true_G_tau'],['GatU','true_G_at_observed_time'],
  ['gRaw','G_estimated_before_perturbation'],['gBiased','G_after_perturbation_before_clipping'],
  ['gHat','G_used_tau'],['gHatAtU','G_used_at_observed_time'],['clipped','G_clipped'],
  ['fitThrough','trained_through_monitoring_index'],['fitN','fit_sample_size'],
  ['expectedPredictive','expected_predictive_error'],['expectedNuisance','expected_G_error_under_independence'],
  ['expectedPlugin','expected_plugin_under_independence'],
].map(([key,label])=>({key,label}));
for(const k of METHODS){
  PATIENT_COLUMNS.push({label:'score_'+k,get:r=>r.scores[k]},
    {label:'log_e_'+k,get:r=>r.logE[k]},{label:'max_log_e_'+k,get:r=>r.maxLogE[k]},
    {label:'brier_'+k,get:r=>r.brier[k]});
}
function exportPatients(){
  if(!state.sim)return;
  download(csv(state.sim.patients,PATIENT_COLUMNS),expName('patients')+'.csv','text/csv;charset=utf-8');
  toast('CSV exporté : cohorte complète, y compris la vérité synthétique.');
}
function exportTrajectory(){
  if(!state.sim)return;
  const columns=[{key:'i'},{key:'evalTime',label:'evaluation_month'}];
  for(const k of METHODS)columns.push({label:'log_e_'+k,get:r=>r.logE[k]},
    {label:'anytime_p_'+k,get:r=>Math.exp(-r.maxLogE[k])},{label:'score_'+k,get:r=>r.scores[k]});
  download(csv(state.sim.patients,columns),expName('trajectoires')+'.csv','text/csv;charset=utf-8');
}
function exportConfig(){
  if(!state.sim)return;
  const out={version:VERSION,createdAt:new Date().toISOString(),config:state.sim.config,summary:state.sim.summary,
    scope:'Full generated cohort; chart clock does not truncate exported patients.',
    assumptions:'Fixed horizon, maturity-ordered evaluation; oracle guarantee requires calibration, conditional independent censoring, positivity. Plug-in is experimental.'};
  download(JSON.stringify(out,null,2),expName('protocole')+'.json','application/json');
}
async function exportChart(button){
  const k=button.dataset.export;
  if(!state.charts[k]){toast('Ce graphique n’est pas encore disponible.');return;}
  const {svg,title}=state.charts[k];
  if(button.dataset.format==='svg')download(exportSVG(svg,title,metadata()),expName(k)+'.svg','image/svg+xml');
  else{
    button.disabled=true;
    try{await exportPNG(svg,title,metadata(),expName(k)+'.png');}catch{toast('Échec PNG. L’export SVG reste disponible.');}finally{button.disabled=false;}
  }
}
function exportReport(){
  if(!state.sim)return;
  const currentTab=state.tab,c=state.sim.config,n=matured();
  // Render all graphical views at the current clock before serializing.
  const rows=state.sim.patients.slice(0,n);
  renderMonitor(rows,n,c);renderDiagnostics(rows,n,c);renderPatients(rows,n,c);
  const images=Object.entries(state.charts).map(([k,item])=>'<figure><h2>'+esc(item.title)+'</h2>'+exportSVG(item.svg,item.title,metadata())+'</figure>').join('');
  const m=prefixSummary(state.sim,n);
  const report='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calibration Lab · rapport seed '+c.seed+'</title><style>body{font:14px/1.7 system-ui;color:#243b58;max-width:1050px;margin:40px auto;padding:0 25px}h1{font:38px Georgia}h2{font-size:19px}svg{width:100%;height:auto}pre{white-space:pre-wrap;font:11px/1.6 monospace;background:#f3f6fa;padding:20px}figure{margin:35px 0;break-inside:avoid}p{color:#64738a}.notice{background:#fff5e2;padding:15px;border-radius:8px}@media print{button{display:none}body{margin:0}figure{page-break-inside:avoid}}</style><h1>Survival Calibration Lab</h1><p>Achraf Saidi · ISBA / LIDAM · UCLouvain · moteur '+VERSION+'</p><p>'+esc(metadata())+' · Temps calendaire='+fmt(state.calendar)+' mois</p><p class="notice">Données entièrement synthétiques. Les méthodes sans censure et oracle ont un contrôle séparé sous leurs hypothèses. Le plug-in G estimé reste expérimental. Une expérience ne mesure pas le taux de fausses alertes et ne prouve pas un résultat doctoral.</p><button onclick="window.print()">Imprimer / enregistrer en PDF</button><h2>Lecture statistique</h2>'+$('interpretation').innerHTML+'<h2>Indicateurs de la période affichée</h2><pre>'+esc(JSON.stringify(m,null,2))+'</pre>'+images+'<h2>Protocole reproductible</h2><pre>'+esc(JSON.stringify(c,null,2))+'</pre><h2>Méthode et hypothèses</h2>'+$('panel-method').innerHTML+
    (state.mc?'<h2>Résultats Monte-Carlo (leur propre protocole est conservé)</h2><pre>'+esc(JSON.stringify({...state.mc,raw:undefined},null,2))+'</pre>':'')+'</html>';
  download(report,expName('rapport')+'.html','text/html;charset=utf-8');
  selectTab(currentTab);
}
function bind(){
  $('config-form').addEventListener('submit',event=>{event.preventDefault();if($('config-form').reportValidity())run();$('settings').classList.remove('open');});
  $('config-form').addEventListener('input',()=>{
    state.dirty=true;$('preset').value='custom';$('dirty-note').textContent='Paramètres modifiés : clique sur « Générer & analyser ».';$('dirty-note').classList.add('dirty');render();
  });
  $('preset').onchange=()=>{
    const preset=PRESETS.find(p=>p.id===$('preset').value);if(!preset)return;
    const current=readControls(),c={...DEFAULTS,n:current.n,seed:current.seed,tau:current.tau,arrivalRate:current.arrivalRate,...preset.config};
    $('preset-description').textContent=preset.description;setControls(c);run(c);
  };
  $('reset').onclick=()=>{setControls(DEFAULTS);$('preset').value='custom';run(DEFAULTS);};
  $('random-seed').onclick=()=>{
    const values=new Uint32Array(1);crypto.getRandomValues(values);$('c-seed').value=values[0];
    state.dirty=true;run(readControls());
  };
  $('open-settings').onclick=()=>$('settings').classList.add('open');
  $('close-settings').onclick=()=>$('settings').classList.remove('open');
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('settings').classList.remove('open');});
  for(const b of document.querySelectorAll('[data-tab]')){
    b.onclick=()=>selectTab(b.dataset.tab);
    b.onkeydown=e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],i=tabs.indexOf(b);
        const next=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();selectTab(next.dataset.tab);
      }
    };
  }
  for(const b of document.querySelectorAll('[data-tab-go]'))b.onclick=()=>{selectTab(b.dataset.tabGo);$('tab-'+b.dataset.tabGo).focus();};
  $('clock').oninput=()=>{stopPlayback();setCalendar($('clock').value);};
  $('rewind').onclick=()=>{stopPlayback();setCalendar(0);};
  $('end').onclick=()=>{stopPlayback();if(state.sim)setCalendar(state.sim.patients.at(-1).evalTime);};
  $('play').onclick=()=>{
    if(!state.sim)return;
    if(state.playing){stopPlayback();return;}
    const end=state.sim.patients.at(-1).evalTime;
    if(state.calendar>=end)setCalendar(0);
    state.playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Mettre le suivi en pause');
    state.timer=setInterval(()=>{
      setCalendar(state.calendar+end/320*Number($('speed').value));
      if(state.calendar>=end)stopPlayback();
    },140);
  };
  for(const id of ['diagnostic-scope','patient-filter','show-truth'])$(id).onchange=render;
  $('patient-search').oninput=render;
  $('run-mc').onclick=startMC;
  $('stop-mc').onclick=()=>{finishMC();$('mc-progress-text').textContent='Arrêt demandé : aucune estimation partielle n’est présentée comme un résultat final.';};
  $('save-experiment').onclick=()=>{
    if(!state.sim)return;
    if(state.saved.length>=6)state.saved.shift();
    state.saved.push({version:VERSION,createdAt:new Date().toISOString(),config:state.sim.config,summary:state.sim.summary});
    persist();renderSaved();toast('Expérience mémorisée dans ce navigateur.');
  };
  $('export-patients').onclick=exportPatients;$('export-trajectory').onclick=exportTrajectory;$('export-config').onclick=exportConfig;
  $('export-report').onclick=exportReport;
  for(const b of document.querySelectorAll('[data-export]'))b.onclick=()=>exportChart(b);
  $('import-config').onclick=()=>$('config-file').click();
  $('config-file').onchange=async()=>{
    const file=$('config-file').files[0];if(!file)return;
    try{
      if(file.size>1000000)throw Error('Le fichier JSON dépasse 1 Mo.');
      const data=JSON.parse(await file.text()),c=normalize(data.config??data);
      setControls(c);$('preset').value='custom';run(c);toast('Protocole importé et recalculé.');
    }catch(error){toast('Import impossible : '+error.message);}
    $('config-file').value='';
  };
  $('share').onclick=async()=>{
    if(!state.sim)return;
    const url=location.href.split('#')[0]+'#config='+encodeURIComponent(JSON.stringify(state.sim.config));
    try{await navigator.clipboard.writeText(url);toast('Lien reproductible copié.');}
    catch{location.hash='config='+encodeURIComponent(JSON.stringify(state.sim.config));toast('Le lien reproductible est maintenant dans la barre d’adresse.');}
  };
}
function init(){
  makeControls();
  let config={...DEFAULTS};
  try{
    const old=JSON.parse(localStorage.getItem(STORAGE)||'null');
    if(old?.config)config=normalize(old.config);
    if(Array.isArray(old?.saved))state.saved=old.saved.slice(-6).filter(r=>r.config&&r.summary).map(r=>({...r,config:normalize(r.config)}));
  }catch{/* defaults if storage is unavailable or incompatible */}
  try{
    const encoded=new URLSearchParams(location.hash.slice(1)).get('config');
    if(encoded)config=normalize(JSON.parse(encoded));
  }catch{toast('Lien de protocole invalide : utilisation des réglages locaux.');}
  setControls(config);bind();renderSaved();run(config);loadReferenceValidation();
}
init();

