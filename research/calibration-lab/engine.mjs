/**
 * Calibration Lab — fixed-horizon survival calibration, v1.0.0.
 * Pure, dependency-free, deterministic engine. See METHODS.md for assumptions.
 * Latent quantities are simulation benchmarks, never estimator inputs.
 */
export const VERSION = '1.0.0';
export const METHODS = ['full', 'naive', 'oracle', 'plugin'];
export const LABELS = {
  full: 'Sans censure · référence',
  naive: 'Censure ignorée',
  oracle: 'IPCW · G vrai',
  plugin: 'IPCW · G estimé',
};
export const DEFAULTS = Object.freeze({
  seed: 20261019, n: 3000, tau: 12, arrivalRate: 30, arrival: 'regular',
  baseSurvival: .75, riskSpread: .85, groupEffect: -.35, groupPrevalence: .4,
  shape: 1.25, change: .5, ramp: 0, eventShift: 0, slopeShift: 0,
  initialShift: 0, groupShift: 0, xShift: 0, prevalenceShift: 0,
  censoring: true, censorRate: .3, censorX: 0, censorGroup: 0,
  censorShift: 0, censorRho: 0, gMin: .05,
  estimator: 'km', trainN: 500, learning: 'expanding', window: 600,
  refitEvery: 50, initialG: .7, gBias: 0, clip: .05,
  alpha: .05, bins: 6, rolling: 300, restart: true,
});
export const PRESETS = [
  {id:'baseline', title:'01 · Sans censure', description:'Vérifier le contrôle sous H₀ avant toute complication.',
    config:{censoring:false, eventShift:0, censorShift:0, censorX:0, censorGroup:0}},
  {id:'oracle', title:'02 · Censure indépendante', description:'Même modèle calibré. Comparer le biais naïf, G* et G estimé.',
    config:{censoring:true, censorRate:.4, eventShift:0, censorShift:0, estimator:'km'}},
  {id:'gbias', title:'03 · Erreur sur G', description:'Prédictions calibrées ; décaler volontairement le logit de G estimé.',
    config:{censoring:true, censorRate:.4, eventShift:0, gBias:.85, estimator:'km'}},
  {id:'event-drift', title:'04 · Dérive prédictive', description:'Le modèle se dégrade après le changement. Chercher le délai de détection.',
    config:{censoring:true, censorRate:.3, eventShift:-1.1, estimator:'km'}},
  {id:'censor-drift', title:'05 · Dérive de censure', description:'Le modèle reste calibré ; la censure change, un G figé devient obsolète.',
    config:{censoring:true, censorRate:.2, censorShift:1.5, eventShift:0, learning:'frozen'}},
  {id:'conditional', title:'06 · G dépend de X', description:'Un KM marginal peut être inadéquat. Comparer avec le modèle conditionnel.',
    config:{censoring:true, censorRate:.3, censorX:.85, censorGroup:.5, eventShift:0, estimator:'km'}},
  {id:'population', title:'07 · Population différente', description:'Changer X en gardant S*(τ|X)=p : le shift seul ne force pas la décalibration.',
    config:{censoring:true, xShift:1, prevalenceShift:.3, eventShift:0, censorX:0, estimator:'km'}},
  {id:'local', title:'08 · Dérive selon le risque', description:'Altérer la pente de calibration ; les scores par tranche de p complètent la moyenne.',
    config:{censoring:true, slopeShift:-.8, eventShift:0, estimator:'km'}},
  {id:'dependent', title:'09 · Hypothèse violée', description:'Corréler T et C conditionnellement à X. Le vrai G marginal ne suffit plus.',
    config:{censoring:true, censorRho:.7, eventShift:0, estimator:'km'}},
];
export const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export const logistic = x => x >= 0 ? 1/(1+Math.exp(-x)) : Math.exp(x)/(1+Math.exp(x));
export const logit = p => Math.log(p/(1-p));
export const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : NaN;
export function normalize(input={}) {
  const c={...DEFAULTS,...input};
  const range={
    seed:[0,4294967295],n:[100,20000],tau:[.1,120],arrivalRate:[.1,1000],
    baseSurvival:[.05,.95],riskSpread:[0,2],groupEffect:[-2,2],groupPrevalence:[.05,.95],
    shape:[.4,3],change:[.05,.95],ramp:[0,.8],eventShift:[-3,3],slopeShift:[-2,2],
    initialShift:[-2,2],groupShift:[-2,2],xShift:[-3,3],prevalenceShift:[-.8,.8],
    censorRate:[.01,.9],censorX:[-2,2],censorGroup:[-2,2],censorShift:[-3,3],
    censorRho:[-.9,.9],gMin:[.01,.5],trainN:[0,5000],window:[50,5000],
    refitEvery:[1,500],initialG:[.05,.99],gBias:[-2,2],clip:[.01,.8],
    alpha:[.001,.2],bins:[3,12],rolling:[25,3000],
  };
  for(const [k,[a,b]] of Object.entries(range)){
    if(!Number.isFinite(Number(c[k])))throw Error('Paramètre non numérique : '+k);
    c[k]=clamp(Number(c[k]),a,b);
  }
  for(const k of ['seed','n','trainN','window','refitEvery','bins','rolling'])c[k]=Math.round(c[k]);
  if(!['regular','poisson'].includes(c.arrival))throw Error('Type d’arrivée invalide');
  if(!['km','stratified','exponential'].includes(c.estimator))throw Error('Estimateur inconnu');
  if(!['frozen','expanding','sliding'].includes(c.learning))throw Error('Apprentissage inconnu');
  c.censoring=Boolean(c.censoring);c.restart=Boolean(c.restart);
  return c;
}
export function rng(seed) {
  let a=seed>>>0;
  return ()=>{
    a=(a+0x6D2B79F5)>>>0;let t=a;
    t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function normal(random){
  return Math.sqrt(-2*Math.log(Math.max(1e-12,random())))*Math.cos(2*Math.PI*random());
}
function phi(x){
  const sign=x<0?-1:1,z=Math.abs(x)/Math.SQRT2,t=1/(1+.3275911*z);
  const erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z);
  return .5*(1+sign*erf);
}
export function driftFraction(i,c){
  const start=c.change*c.n;
  if(i<=start)return 0;
  return c.ramp>0?clamp((i-start)/(c.ramp*c.n),0,1):1;
}
function makePatient(i,c,random,historical=false,arrival=0){
  // Fixed RNG draw count preserves the latent cohort across censoring toggles.
  const zX=normal(random),uGroup=random(),zT=normal(random),zC=normal(random);
  const d=historical?0:driftFraction(i,c);
  const group=+(uGroup<clamp(c.groupPrevalence+d*c.prevalenceShift,.01,.99));
  const x=clamp(zX+d*c.xShift,-4,4);
  const lp=logit(c.baseSurvival)+c.riskSpread*x+c.groupEffect*group;
  const p=logistic(lp);
  const S=logistic(lp+c.initialShift+d*(c.eventShift+c.slopeShift*(lp-logit(c.baseSurvival))+c.groupShift*group));
  const uT=clamp(phi(zT),1e-12,1-1e-12);
  const uC=clamp(phi(c.censorRho*zT+Math.sqrt(1-c.censorRho**2)*zC),1e-12,1-1e-12);
  const T=c.tau*Math.pow(-Math.log(uT)/(-Math.log(S)),1/c.shape);
  const hazard=c.censoring?-Math.log(1-c.censorRate)*Math.exp(c.censorX*x+c.censorGroup*group+d*c.censorShift):0;
  const G=c.censoring?Math.max(c.gMin,Math.exp(-hazard)):1;
  const C=c.censoring?c.tau*(-Math.log(uC))/(-Math.log(G)):Infinity;
  const U=Math.min(T,C,c.tau);
  const dc=+(C<T&&C<c.tau),de=+(T<=C&&T<=c.tau);
  const R=+(T>c.tau&&C>c.tau),Y=+(T>c.tau);
  return {i,arrival,evalTime:arrival+c.tau,x,group,p,S,T,C,U,delta:+(T<=C),
    dc,de,R,Y,G,GatU:Math.pow(G,U/c.tau),d,known:+!dc};
}
export function generate(input={}){
  const c=normalize(input),patients=[],training=[];
  const random=rng(c.seed),arrivalRandom=rng((c.seed^0xA73E5219)>>>0);
  // Independent historical sample, all horizon-mature at calendar time zero.
  const trainRandom=rng((c.seed^0xC912A61B)>>>0);
  for(let j=0;j<c.trainN;j++){
    const row=makePatient(-j-1,c,trainRandom,true,-c.tau-(c.trainN-j)/c.arrivalRate);
    training.push(observed(row));
  }
  let arrival=0;
  for(let i=1;i<=c.n;i++){
    arrival+=c.arrival==='poisson'?-Math.log(Math.max(1e-12,arrivalRandom()))/c.arrivalRate:1/c.arrivalRate;
    patients.push(makePatient(i,c,random,false,arrival));
  }
  return {config:c,patients,training};
}
export function observed(row){
  // Deliberately disallow T, C, G, S and Y in nuisance estimation.
  return {i:row.i,x:row.x,group:row.group,p:row.p,U:row.U,dc:row.dc};
}
export function fitKM(rows,tau,initialG=.7){
  if(!rows.length)return {n:0,at:t=>Math.pow(initialG,t/tau),steps:[]};
  const ordered=[...rows].sort((a,b)=>a.U-b.U);
  let atRisk=ordered.length,surv=1,j=0;const steps=[];
  while(j<ordered.length){
    const time=ordered[j].U;let total=0,events=0;
    while(j<ordered.length&&Math.abs(ordered[j].U-time)<1e-12){total++;events+=ordered[j].dc;j++;}
    if(events){surv*=1-events/atRisk;steps.push([time,surv]);}
    atRisk-=total;
  }
  return {n:rows.length,steps,at(t){
    let lo=0,hi=steps.length;
    // G(t-) for IPCW event terms; continuous DGP has no ties with event times.
    while(lo<hi){const mid=(lo+hi)>>1;if(steps[mid][0]<t)lo=mid+1;else hi=mid;}
    return lo?steps[lo-1][1]:1;
  }};
}
function solve3(A,b){
  const m=A.map((r,i)=>[...r,b[i]]);
  for(let k=0;k<3;k++){
    let pivot=k;
    for(let j=k+1;j<3;j++)if(Math.abs(m[j][k])>Math.abs(m[pivot][k]))pivot=j;
    if(Math.abs(m[pivot][k])<1e-12)return [0,0,0];
    [m[k],m[pivot]]=[m[pivot],m[k]];
    const den=m[k][k];for(let j=k;j<4;j++)m[k][j]/=den;
    for(let i=0;i<3;i++)if(i!==k){const f=m[i][k];for(let j=k;j<4;j++)m[i][j]-=f*m[k][j];}
  }
  return m.map(r=>r[3]);
}
export function fitExponential(rows,tau,initialG=.7){
  if(!rows.length)return {n:0,theta:[Math.log(-Math.log(initialG)),0,0],at:(r,t)=>Math.pow(initialG,t/tau)};
  const events=rows.reduce((s,r)=>s+r.dc,0),exposure=rows.reduce((s,r)=>s+r.U/tau,0);
  let theta=[Math.log((events+.05)/(exposure+.1)),0,0];
  const ridge=.05;
  function objective(th){
    return rows.reduce((s,r)=>{
      const eta=clamp(th[0]+th[1]*r.x+th[2]*r.group,-15,12);
      return s+r.dc*eta-Math.exp(eta)*r.U/tau;
    },-ridge*(th[1]**2+th[2]**2)/2);
  }
  for(let iter=0;iter<25;iter++){
    const score=[0,-ridge*theta[1],-ridge*theta[2]],info=[[1e-8,0,0],[0,ridge,0],[0,0,ridge]];
    for(const r of rows){
      const z=[1,r.x,r.group],mu=Math.exp(clamp(theta[0]+theta[1]*r.x+theta[2]*r.group,-15,12))*r.U/tau;
      for(let a=0;a<3;a++){score[a]+=z[a]*(r.dc-mu);for(let b=0;b<3;b++)info[a][b]+=mu*z[a]*z[b];}
    }
    const step=solve3(info,score),old=objective(theta);let factor=1,next=theta;
    for(let j=0;j<12;j++){
      next=theta.map((v,k)=>clamp(v+factor*step[k],-12,8));
      if(objective(next)>=old-1e-8)break;factor/=2;
    }
    theta=next;if(Math.max(...step.map(Math.abs))*factor<1e-6)break;
  }
  return {n:rows.length,theta,at:(r,t)=>Math.exp(-Math.exp(clamp(theta[0]+theta[1]*r.x+theta[2]*r.group,-15,12))*t/tau)};
}
function stratum(row){return row.group*3+Math.min(2,Math.floor(row.p*3));}
export function fitG(rows,c){
  if(c.estimator==='exponential')return fitExponential(rows,c.tau,c.initialG);
  const pooled=fitKM(rows,c.tau,c.initialG);
  if(c.estimator==='km')return {n:rows.length,at:(r,t)=>pooled.at(t),description:'KM marginal'};
  const strata=Array.from({length:6},(_,g)=>fitKM(rows.filter(r=>stratum(r)===g),c.tau,c.initialG));
  return {n:rows.length,at:(r,t)=>strata[stratum(r)].n>=10?strata[stratum(r)].at(t):pooled.at(t),
    description:'KM stratifié (groupe × trois intervalles fixes de p)'};
}
const BETS=[.002,.006,.02,.06,.15,.35,.65,.9];
export class EMonitor{
  constructor(n,floor=1,restart=true){
    this.starts=restart?[0,Math.floor(n/4),Math.floor(n/2),Math.floor(3*n/4)]:[0];
    this.bets=[...BETS,...BETS.map(v=>-v*floor)];
    this.logs=new Float64Array(this.starts.length*5*this.bets.length);
    this.n=0;this.logE=0;this.maxLogE=0;this.firstAlarm=null;
  }
  update(score,p,alpha=.05){
    this.n++;
    const channels=[0,1+Math.min(3,Math.floor(p*4))];
    const L=this.bets.length;
    for(let s=0;s<this.starts.length;s++)if(this.n>this.starts[s]){
      for(const h of channels){
        const offset=(s*5+h)*L;
        for(let k=0;k<L;k++){
          const factor=1+this.bets[k]*score;
          if(factor<=0||!Number.isFinite(factor))throw Error('Facteur de pari hors domaine');
          this.logs[offset+k]+=Math.log1p(this.bets[k]*score);
        }
      }
    }
    let max=-Infinity;for(const v of this.logs)if(v>max)max=v;
    let sum=0;for(const v of this.logs)sum+=Math.exp(v-max);
    this.logE=max+Math.log(sum/this.logs.length);
    this.maxLogE=Math.max(this.maxLogE,this.logE);
    if(this.firstAlarm===null&&this.logE>=Math.log(1/alpha))this.firstAlarm=this.n;
    return this.logE;
  }
}
export function simulate(input={},options={}){
  const {config:c,patients,training}=generate(input);
  const floor=Math.min(c.gMin,c.clip);
  const monitors=Object.fromEntries(METHODS.map(k=>[k,new EMonitor(c.n,k==='full'||k==='naive'||!c.censoring?1:floor,c.restart)]));
  const bank=[...training],history=[];
  let model,fitThrough=0,fitN=0,clipped=0;
  const sums=Object.fromEntries(METHODS.map(k=>[k,0]));
  const brierSums=Object.fromEntries(METHODS.map(k=>[k,0]));
  const stride=options.compact?c.n:Math.max(1,Math.floor(c.n/550));
  for(let j=0;j<patients.length;j++){
    const row=patients[j],i=j+1;
    if(!model||(c.learning!=='frozen'&&j%c.refitEvery===0)){
      const use=c.learning==='sliding'?bank.slice(-c.window):bank;
      model=fitG(use,c);fitThrough=j;fitN=use.length;
    }
    const raw=c.censoring?model.at(row,c.tau):1;
    const rawU=c.censoring?model.at(row,row.U):1;
    const biasAt=(g,t)=>c.gBias===0?g:logistic(logit(clamp(g,1e-9,1-1e-9))+c.gBias*t/c.tau);
    row.gRaw=raw;row.gBiased=c.censoring?biasAt(raw,c.tau):1;
    row.gHat=c.censoring?clamp(row.gBiased,c.clip,1):1;
    row.gHatAtU=c.censoring?clamp(biasAt(rawU,row.U),c.clip,1):1;
    row.clipped=+(row.gBiased<c.clip);clipped+=row.clipped;
    row.fitThrough=fitThrough;row.fitN=fitN;
    row.scores={full:row.Y-row.p,naive:row.R-row.p,
      oracle:row.R/row.G-row.p,plugin:row.R/row.gHat-row.p};
    row.expectedPredictive=row.S-row.p;
    const independent=!c.censoring||c.censorRho===0;
    row.expectedNuisance=independent?row.S*(row.G/row.gHat-1):null;
    row.expectedPlugin=independent?row.expectedPredictive+row.expectedNuisance:null;
    row.brier={
      full:(row.Y-row.p)**2,naive:(row.R-row.p)**2,
      oracle:row.de*row.p**2/row.GatU+row.R*(1-row.p)**2/row.G,
      plugin:row.de*row.p**2/row.gHatAtU+row.R*(1-row.p)**2/row.gHat,
    };
    row.logE={};row.maxLogE={};
    for(const key of METHODS){
      sums[key]+=row.scores[key];brierSums[key]+=row.brier[key];
      row.logE[key]=monitors[key].update(row.scores[key],row.p,c.alpha);
      row.maxLogE[key]=monitors[key].maxLogE;
    }
    // The current patient enters training ONLY after its score has been issued.
    bank.push(observed(row));
    if(!options.compact&&(i%stride===0||i===1||i===c.n)){
      history.push({i,evalTime:row.evalTime,logE:{...row.logE},
        average:Object.fromEntries(METHODS.map(k=>[k,sums[k]/i])),
        brier:Object.fromEntries(METHODS.map(k=>[k,brierSums[k]/i]))});
    }
  }
  return {version:VERSION,config:c,patients:options.compact?[]:patients,trainingN:training.length,
    history,summary:{
      n:c.n,clipped,
      alarms:Object.fromEntries(METHODS.map(k=>[k,monitors[k].firstAlarm])),
      maxLogE:Object.fromEntries(METHODS.map(k=>[k,monitors[k].maxLogE])),
      average:Object.fromEntries(METHODS.map(k=>[k,sums[k]/c.n])),
      brier:Object.fromEntries(METHODS.map(k=>[k,brierSums[k]/c.n])),
    }};
}
export function wilson(successes,total,z=1.95996398454){
  if(!total)return [NaN,NaN];
  const p=successes/total,d=1+z*z/total,center=(p+z*z/(2*total))/d;
  const h=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
  return [Math.max(0,center-h),Math.min(1,center+h)];
}
export function quantile(values,q){
  if(!values.length)return null;
  const a=[...values].sort((x,y)=>x-y),p=(a.length-1)*q,lo=Math.floor(p);
  return a[lo]+(a[Math.min(a.length-1,lo+1)]-a[lo])*(p-lo);
}
export function aggregate(rows,c){
  if(!rows.length)return null;
  const n=rows.length,avg=k=>mean(rows.map(k));
  const metrics={n,p:avg(r=>r.p),S:avg(r=>r.S),Y:avg(r=>r.Y),
    unknown:avg(r=>r.dc),R:avg(r=>r.R),G:avg(r=>r.G),gHat:avg(r=>r.gHat),
    gRMSE:Math.sqrt(avg(r=>(r.G-r.gHat)**2)),clipped:avg(r=>r.clipped),
    predictive:avg(r=>r.expectedPredictive),nuisance:(!c.censoring||c.censorRho===0)?avg(r=>r.expectedNuisance):NaN,
    maxWeight:Math.max(...rows.map(r=>1/r.gHat)),average:{},brier:{},ess:{},ece:{}};
  for(const k of METHODS){
    metrics.average[k]=avg(r=>r.scores[k]);metrics.brier[k]=avg(r=>r.brier[k]);
    const weights=rows.map(r=>k==='plugin'?r.R/r.gHat:k==='oracle'?r.R/r.G:1);
    const sum=weights.reduce((s,w)=>s+w,0),sq=weights.reduce((s,w)=>s+w*w,0);
    metrics.ess[k]=sq?sum*sum/sq:0;
  }
  const bins=calibrationBins(rows,c.bins);
  for(const k of METHODS)metrics.ece[k]=bins.reduce((s,b)=>s+b.n/n*Math.abs(b[k]-b.p),0);
  return metrics;
}
export function calibrationBins(rows,count=6){
  const bins=Array.from({length:count},(_,j)=>({lo:j/count,hi:(j+1)/count,rows:[]}));
  for(const r of rows)bins[Math.min(count-1,Math.floor(r.p*count))].rows.push(r);
  return bins.filter(b=>b.rows.length).map(b=>{
    const rr=b.rows,n=rr.length,avg=f=>mean(rr.map(f));
    return {lo:b.lo,hi:b.hi,n,p:avg(r=>r.p),S:avg(r=>r.S),full:avg(r=>r.Y),
      naive:avg(r=>r.R),oracle:avg(r=>r.R/r.G),plugin:avg(r=>r.R/r.gHat),
      fullCI:wilson(rr.reduce((s,r)=>s+r.Y,0),n)};
  });
}
export function uniformBand(n,alpha,range){
  // Union of conditional Hoeffding bounds: sum_n 6*alpha/(pi^2*n^2)=alpha.
  const alphaN=6*alpha/(Math.PI**2*n*n);
  return range*Math.sqrt(Math.log(2/alphaN)/(2*n));
}
export function hasAlternative(c){
  return Math.abs(c.initialShift)+Math.abs(c.eventShift)+Math.abs(c.slopeShift)+Math.abs(c.groupShift)>1e-12;
}
export function csv(rows,columns){
  const escape=v=>{
    if(v===null||v===undefined||!Number.isFinite(v)&&typeof v==='number')return '';
    const s=typeof v==='object'?JSON.stringify(v):String(v);
    return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
  };
  return '\uFEFF'+columns.map(c=>escape(c.label??c.key)).join(',')+'\r\n'+
    rows.map(r=>columns.map(c=>escape(c.get?c.get(r):r[c.key])).join(',')).join('\r\n');
}
export function prefixSummary(sim,n){
  const rows=sim.patients.slice(0,n),metrics=aggregate(rows,sim.config);
  if(!metrics)return null;
  metrics.alarms=Object.fromEntries(METHODS.map(k=>[k,sim.summary.alarms[k]&&sim.summary.alarms[k]<=n?sim.summary.alarms[k]:null]));
  metrics.e=Object.fromEntries(METHODS.map(k=>[k,Math.exp(Math.min(700,rows.at(-1).logE[k]))]));
  metrics.anytimeP=Object.fromEntries(METHODS.map(k=>[k,Math.exp(-rows.at(-1).maxLogE[k])]));
  return metrics;
}

