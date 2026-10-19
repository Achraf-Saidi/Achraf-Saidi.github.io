/**
 * Simple-remedy audit, version 1.0.0. No deliberate perturbation of G.
 * Paired cohorts, fixed settings, fixed looks, independent development/confirmation seeds.
 * Empirical results do not establish novelty or distribution-free validity.
 */
import {VERSION as ENGINE_VERSION,normalize,generate,observed,fitG,fitExponential,clamp,mean,wilson,quantile} from './engine.mjs';
export const AUDIT_VERSION='1.0.0';
export const BETS=[.002,.006,.02,.06,.15,.35,.65,.9];
export const SOLUTIONS=[
 {id:'full',label:'Sans censure · référence',kind:'full',train:0},
 {id:'naive',label:'Censure ignorée',kind:'naive',train:0},
 {id:'oracle',label:'IPCW · G vrai',kind:'oracle',train:0},
 {id:'km_small',label:'KM figé · 50 historiques',kind:'ipcw',estimator:'km',learning:'frozen',train:50},
 {id:'km_large',label:'KM figé · 2 000 historiques',kind:'ipcw',estimator:'km',learning:'frozen',train:2000},
 {id:'km_online',label:'KM croissant · 200 historiques',kind:'ipcw',estimator:'km',learning:'expanding',train:200},
 {id:'km_window',label:'KM récent · fenêtre 500',kind:'ipcw',estimator:'km',learning:'sliding',train:200,window:500},
 {id:'strat_online',label:'KM stratifié croissant',kind:'ipcw',estimator:'stratified',learning:'expanding',train:200},
 {id:'exp_online',label:'G exponentiel conditionnel',kind:'ipcw',estimator:'exponential',learning:'expanding',train:200},
 {id:'km_clip',label:'KM croissant · troncature 0,40',kind:'ipcw',estimator:'km',learning:'expanding',train:200,clip:.4,reuse:'km_online'},
 {id:'dr_pooled',label:'AIPCW · G marginal + survie conditionnelle',kind:'dr',conditionalG:false,train:200},
 {id:'dr_cond',label:'AIPCW · deux modèles conditionnels',kind:'dr',conditionalG:true,train:200},
 {id:'guard_exp',label:'G encadré · exponentiel homogène',kind:'guard',train:200},
];
export const SCENARIOS=[
 {id:'no-censor',label:'H₀ · sans censure',null:true,guardValid:true,
  description:'Contrôle de base : mêmes réponses sans censure.',
  config:{censoring:false}},
 {id:'homogeneous',label:'H₀ · censure homogène stable',null:true,guardValid:true,
  description:'G inconnu, appris sur de vraies observations censurées ; aucun biais ajouté.',
  config:{censorRate:.35,censorX:0,censorGroup:0,censorShift:0}},
 {id:'conditional',label:'H₀ · G dépend de X',null:true,guardValid:false,
  description:'Le KM marginal omet la dépendance à X ; comparer avec les modèles conditionnels.',
  config:{censorRate:.3,censorX:.4,censorGroup:.4,shape:1}},
 {id:'censor-drift',label:'H₀ · seule la censure change',null:true,guardValid:false,
  description:'S*=p à tout instant ; le risque de censure augmente après N/2.',
  config:{censorRate:.2,censorShift:1.35,shape:1}},
 {id:'population',label:'H₀ · population différente',null:true,guardValid:false,
  description:'G(X) reste stable ; la distribution de X change et le modèle reste calibré.',
  config:{censorRate:.3,censorX:.4,censorGroup:.4,xShift:1.1,prevalenceShift:.25,shape:1}},
 {id:'double-misspec',label:'H₀ · deux modèles de travail imparfaits',null:true,guardValid:false,
  description:'G dépend de X et les événements sont Weibull de forme 2,3 ; AIPCW travaille avec des exponentielles.',
  config:{censorRate:.3,censorX:.4,censorGroup:.4,shape:2.3}},
 {id:'weak-calibration',label:'H₀ · calibration selon p seulement',null:true,guardValid:false,weak:true,
  description:'p=0,6 ; S*(X) vaut 0,4 ou 0,8 selon un groupe équiprobable. E[Y|p,passé]=p, mais S*(X)≠p.',
  config:{baseSurvival:.6,riskSpread:0,groupEffect:0,groupPrevalence:.5,censorRate:.3,censorGroup:1,shape:1}},
 {id:'shape-and-censor-drift',label:'H₀ · forme des événements et censure changent',null:true,guardValid:false,shapeDrift:2.5,
  description:'Après N/2, la forme Weibull passe de 1 à 2,5 et la censure augmente. P(T>τ|X)=p reste inchangé.',
  config:{censorRate:.2,censorShift:1.35,shape:1}},
 {id:'nonlinear-censor',label:'H₀ · censure non linéaire et survie Weibull',null:true,guardValid:false,nonlinearC:true,
  description:'G dépend de x² ; les modèles exponentiels linéaires de G et de T sont tous deux mal spécifiés.',
  config:{censorRate:.3,censorGroup:.4,shape:2.3}},
 {id:'mild-drift',label:'H₁ · dégradation modérée',null:false,guardValid:true,
  description:'Décalage logit −0,45 après N/2 ; mesurer les détections et les absences d’alerte.',
  config:{censorRate:.35,eventShift:-.45,shape:1}},
 {id:'strong-drift',label:'H₁ · dégradation forte',null:false,guardValid:true,
  description:'Décalage logit −1,2 après N/2 avec censure homogène stable.',
  config:{censorRate:.35,eventShift:-1.2,shape:1}},
];
export const BASE=Object.freeze({...normalize({n:2500,trainN:2000,censorRate:.35,shape:1,refitEvery:100,
  initialShift:0,eventShift:0,slopeShift:0,groupShift:0,censorRho:0,gBias:0,gMin:.05,clip:.05}),
  lookEvery:10,delta:.01,priorShape:1,priorRate:1});
export function logGamma(z){
  const co=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,
    12.507343278686905,-.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z-=1;let x=.99999999999980993;
  for(let i=0;i<co.length;i++)x+=co[i]/(z+i+1);
  const t=z+co.length-.5;
  return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
export function censorLogMixture(D,V,lambda,a=1,b=1){
  if(!(lambda>=0))return Infinity;
  if(lambda===0)return D===0?a*Math.log(b)-(D+a)*Math.log(V+b):Infinity;
  return logGamma(D+a)-logGamma(a)+a*Math.log(b)-(D+a)*Math.log(V+b)+lambda*V-D*Math.log(lambda);
}
export function censorCS(D,V,delta=.01,gMin=.05){
  // Gamma-mixture likelihood-ratio CS for a constant exponential censoring hazard.
  // V is observed person-time divided by tau, D is observed censoring count.
  if(V<=0)return {lo:gMin,hi:1,empty:false};
  const target=Math.log(1/delta),hat=D/V;
  const f=lambda=>censorLogMixture(D,V,lambda);
  let low=0,high=hat;
  if(D>0)for(let j=0;j<55;j++){const mid=(low+high)/2;if(f(mid)>target)low=mid;else high=mid;}
  const lambdaLo=D?high:0;
  low=hat;high=Math.max(1,hat*2+1);
  while(f(high)<target)high*=2;
  for(let j=0;j<55;j++){const mid=(low+high)/2;if(f(mid)>target)high=mid;else low=mid;}
  const lambdaHi=high,lambdaMax=-Math.log(gMin);
  const empty=lambdaLo>lambdaMax;
  // An empty intersection signals an assumption conflict; return the vacuous class
  // rather than silently inverting or clipping interval endpoints.
  return empty?{lo:gMin,hi:1,empty:true}:{lo:Math.max(gMin,Math.exp(-lambdaHi)),hi:Math.exp(-lambdaLo),empty:false};
}
export class AuditMonitor{
  constructor(n,floor=1,{lookEvery=10,dr=false,restart=true,alpha=.05}={}){
    this.starts=restart?[0,Math.floor(n/4),Math.floor(n/2),Math.floor(3*n/4)]:[0];
    this.bets=[...BETS.map(v=>v*(dr?floor/(1+floor):1)),...BETS.map(v=>-v*floor)];
    this.logs=new Float64Array(this.starts.length*5*this.bets.length);
    this.n=0;this.firstAlarm=null;this.logE=0;this.maxLogE=0;this.lookEvery=lookEvery;this.alpha=alpha;this.dr=dr;
  }
  update(lower,upper,p,final=false,currentFloor=null){
    this.n++;
    if(this.firstAlarm!==null)return;
    if(currentFloor!==null&&currentFloor!==this.lastFloor)for(let k=0;k<BETS.length;k++){
      this.bets[k]=BETS[k]*(this.dr?currentFloor/(1+currentFloor):1);
      this.bets[k+BETS.length]=-BETS[k]*currentFloor;
    }
    this.lastFloor=currentFloor;
    const channels=[0,1+Math.min(3,Math.floor(p*4))],L=this.bets.length;
    for(let s=0;s<this.starts.length;s++)if(this.n>this.starts[s]){
      for(const h of channels){
        const offset=(s*5+h)*L;
        for(let k=0;k<L;k++){
          const bet=this.bets[k],score=bet>=0?lower:upper,factor=1+bet*score;
          if(!(factor>0)||!Number.isFinite(factor))throw Error('Audit betting bound violated');
          this.logs[offset+k]+=Math.log1p(bet*score);
        }
      }
    }
    if(!final&&this.n%this.lookEvery)return;
    let max=-Infinity;for(const v of this.logs)if(v>max)max=v;
    let sum=0;for(const v of this.logs)sum+=Math.exp(v-max);
    this.logE=max+Math.log(sum/this.logs.length);this.maxLogE=Math.max(this.maxLogE,this.logE);
    if(this.logE>=Math.log(1/this.alpha))this.firstAlarm=this.n;
  }
}
export function aipcw(row,eventHazard,censorHazard){
  // Analytic continuous-time AIPCW for exponential working S and G.
  // r.U/tau is supplied as row.u. de=1 only for observed events before tau.
  const a=eventHazard,b=censorHazard,k=a+b,S=Math.exp(-a),e=Math.exp(k*row.u);
  const integral=k>1e-12?a*Math.expm1(k*row.u)/k:a*row.u;
  return S*(1+integral-row.de*e);
}
function transformRow(row,c,scenario,historical=false){
  const oldS=row.S,next=scenario.weak?(row.group?.8:.4):row.S;
  const negLogU=-Math.log(oldS)*Math.pow(row.T/c.tau,c.shape);
  const shape=scenario.shapeDrift?c.shape+(historical?0:row.d)*(scenario.shapeDrift-c.shape):c.shape;
  row.S=next;row.T=c.tau*Math.pow(negLogU/(-Math.log(next)),1/shape);
  if(scenario.nonlinearC){
    const negLogV=-Math.log(row.G)*row.C/c.tau;
    const hazard=-Math.log(1-c.censorRate)*Math.exp(.9*(row.x**2-1)+.4*row.group);
    row.G=Math.max(c.gMin,Math.exp(-hazard));
    row.C=c.tau*negLogV/(-Math.log(row.G));
  }
  row.Y=+(row.T>c.tau);row.U=Math.min(row.T,row.C,c.tau);
  row.dc=+(row.C<row.T&&row.C<c.tau);row.de=+(row.T<=row.C&&row.T<=c.tau);
  row.R=+(row.T>c.tau&&row.C>c.tau);row.known=1-row.dc;
  return row;
}
function makeCohort(c,scenario){
  const out=generate(c);
  if(!scenario.weak&&!scenario.shapeDrift&&!scenario.nonlinearC)return out;
  out.patients=out.patients.map(r=>transformRow(r,c,scenario));
  const hist=generate({...c,trainN:0,n:Math.max(100,c.trainN),seed:(c.seed^0x5AD92E31)>>>0,
    eventShift:0,xShift:0,prevalenceShift:0,censorShift:0});
  out.training=hist.patients.slice(0,c.trainN).map((r,j)=>observed({...transformRow(r,c,scenario,true),i:-j-1}));
  return out;
}
function fitOutcome(rows,c){
  // A proportional-rate working event model with known prediction offset -log(p).
  // The coefficients are LEARNED; no true S or latent T enters this likelihood.
  const transformed=rows.map(r=>({...r,U:r.U*(-Math.log(r.p)),dc:+(!r.dc&&r.U<c.tau)}));
  return fitExponential(transformed,c.tau,Math.exp(-1));
}
const floorCache=new WeakMap();
function fittedFloor(model,estimator,c,clip){
  if(!c.censoring)return 1;
  const key=estimator+'|'+c.tau+'|'+clip;
  let cache=floorCache.get(model);
  if(!cache){cache=new Map();floorCache.set(model,cache);}
  if(cache.has(key))return cache.get(key);
  if(estimator==='km'){
    const v=clamp(model.at({p:.5,x:0,group:0},c.tau),clip,1);cache.set(key,v);return v;
  }
  const profiles=estimator==='stratified'?
    [0,1].flatMap(group=>[1/6,.5,5/6].map(p=>({group,p,x:0}))):
    [0,1].flatMap(group=>[-4,4].map(x=>({group,x,p:.5})));
  const v=Math.max(clip,Math.min(...profiles.map(r=>model.at(r,c.tau))));
  cache.set(key,v);return v;
}
function oracleFloor(c){
  if(!c.censoring)return 1;
  const maxHazard=-Math.log(1-c.censorRate)*Math.exp(4*Math.abs(c.censorX)+Math.max(0,c.censorGroup)+Math.max(0,c.censorShift));
  return Math.max(c.gMin,Math.exp(-maxHazard));
}
export function auditReplicate(scenario,seed,settings={}){
  const c=normalize({...BASE,...scenario.config,...settings,seed,trainN:2000,gBias:0});
  const lookEvery=settings.lookEvery??BASE.lookEvery,delta=settings.delta??BASE.delta;
  if(!(delta>0&&delta<c.alpha))throw Error('Require 0 < delta < alpha');
  const allowed=settings.solutions?new Set(settings.solutions):null;
  const methods=SOLUTIONS.filter(m=>!allowed||allowed.has(m.id));
  const {patients,training}=makeCohort(c,scenario);
  if(!c.censoring){
    const standard=new AuditMonitor(c.n,1,{lookEvery,alpha:c.alpha});
    const guarded=new AuditMonitor(c.n,1,{lookEvery,alpha:c.alpha-delta});
    let sum=0;
    for(let j=0;j<patients.length;j++){
      const r=patients[j],score=r.Y-r.p;sum+=score;
      standard.update(score,score,r.p,j===patients.length-1);
      guarded.update(score,score,r.p,j===patients.length-1);
    }
    const cp=Math.floor(c.change*c.n);
    return {seed,n:c.n,config:c,methods:Object.fromEntries(methods.map(m=>{
      const alarm=(m.kind==='guard'?guarded:standard).firstAlarm;
      return [m.id,{alarm,early:alarm!==null&&alarm<=cp,post:alarm!==null&&alarm>cp,
        delay:alarm!==null&&alarm>cp?alarm-cp:null,meanScore:sum/c.n,gRMSE:0,clipped:0,
        intervalMissFraction:0,intervalEverMiss:false,intervalEmptyFraction:0}];
    }))};
  }
  const trueFloor=scenario.nonlinearC?c.gMin:oracleFloor(c);
  const mutable=methods.map(m=>({...m,monitor:new AuditMonitor(c.n,
    m.kind==='full'||m.kind==='naive'||!c.censoring?1:Math.min(c.gMin,m.clip??c.clip),
    {lookEvery,dr:m.kind==='dr'&&c.censoring,alpha:m.kind==='guard'?c.alpha-delta:c.alpha}),
    bank:training.slice(0,m.train),model:null,stats:{score:0,gSquared:0,clipped:0},
    GintervalMiss:0,GintervalEmpty:0}));
  const common=training.slice(0,200);
  let commonModel,eventModel,pooledRate,interval;
  function fitCommon(){
    commonModel=fitG(common,{...c,estimator:'exponential'});
    eventModel=fitOutcome(common,c);
    const D=common.reduce((s,r)=>s+r.dc,0),V=common.reduce((s,r)=>s+r.U/c.tau,0);
    pooledRate=(D+.05)/(V+.1);
    interval=censorCS(D,V,delta,c.gMin);
  }
  const wantsCommon=methods.some(m=>m.kind==='dr'||m.kind==='guard');
  if(wantsCommon)fitCommon();
  for(let j=0;j<patients.length;j++){
    const r=patients[j],i=j+1,final=i===c.n;
    if(wantsCommon&&j>0&&j%c.refitEvery===0)fitCommon();
    const cache=new Map();
    for(const m of mutable){
      let score,G=1,lower,upper,currentFloor=1;
      if(m.kind==='full')score=r.Y-r.p;
      else if(m.kind==='naive')score=r.R-r.p;
      else if(m.kind==='oracle'){G=r.G;currentFloor=trueFloor;score=r.R/G-r.p;}
      else if(m.kind==='guard'){
        const bounds=c.censoring?interval:{lo:1,hi:1,empty:false};
        lower=r.R/bounds.hi-r.p;upper=r.R/bounds.lo-r.p;
        score=(lower+upper)/2;
        m.GintervalMiss+=+(r.G<bounds.lo-1e-12||r.G>bounds.hi+1e-12);
        m.GintervalEmpty+=+bounds.empty;G=(bounds.lo+bounds.hi)/2;currentFloor=bounds.lo;
      }else if(m.kind==='dr'){
        const conditional=c.censoring?commonModel.at(r,c.tau):1;
        G=c.censoring?clamp(m.conditionalG?conditional:Math.exp(-pooledRate),c.clip,1):1;
        const th=eventModel.theta;
        const a=clamp(-Math.log(r.p)*Math.exp(clamp(th[0]+th[1]*r.x+th[2]*r.group,-12,8)),1e-5,12);
        const b=-Math.log(G);
        score=c.censoring?aipcw({u:r.U/c.tau,de:r.de},a,b)-r.p:r.Y-r.p;
        currentFloor=c.censoring?(m.conditionalG?fittedFloor(commonModel,'exponential',c,c.clip):G):1;
      }else{
        const cacheKey=m.reuse??m.id;
        let model=cache.get(cacheKey);
        if(!model){
          if(!m.model||(m.learning!=='frozen'&&j%c.refitEvery===0)){
            const rows=m.learning==='sliding'?m.bank.slice(-(m.window??500)):m.bank;
            m.model=fitG(rows,{...c,estimator:m.estimator});
          }
          model=m.model;cache.set(cacheKey,model);
        }
        const raw=c.censoring?model.at(r,c.tau):1;
        const clip=m.clip??c.clip;
        G=c.censoring?clamp(raw,clip,1):1;m.stats.clipped+=+(raw<clip);
        currentFloor=fittedFloor(model,m.estimator,c,clip);
        score=r.R/G-r.p;
      }
      if(!Number.isFinite(score))throw Error('Nonfinite score '+m.id);
      m.stats.score+=score;m.stats.gSquared+=(r.G-G)**2;
      m.monitor.update(lower??score,upper??score,r.p,final,currentFloor);
    }
    const o=observed(r);for(const m of mutable)if(m.kind==='ipcw'&&m.learning!=='frozen')m.bank.push(o);
    if(wantsCommon)common.push(o);
  }
  const cp=Math.floor(c.change*c.n);
  return {seed,n:c.n,config:c,methods:Object.fromEntries(mutable.map(m=>{
    const alarm=m.monitor.firstAlarm;
    return [m.id,{alarm,early:alarm!==null&&alarm<=cp,post:alarm!==null&&alarm>cp,
      delay:alarm!==null&&alarm>cp?alarm-cp:null,meanScore:m.stats.score/c.n,
      gRMSE:Math.sqrt(m.stats.gSquared/c.n),clipped:m.stats.clipped/c.n,
      intervalMissFraction:m.GintervalMiss/c.n,intervalEverMiss:m.GintervalMiss>0,
      intervalEmptyFraction:m.GintervalEmpty/c.n}];
  }))};
}
export function binomialUpperTail(k,n,p){
  if(k<=0)return 1;if(k>n)return 0;
  const logs=[];
  for(let j=k;j<=n;j++)logs.push(logGamma(n+1)-logGamma(j+1)-logGamma(n-j+1)+j*Math.log(p)+(n-j)*Math.log1p(-p));
  const max=Math.max(...logs);
  return Math.min(1,Math.exp(max)*logs.reduce((s,l)=>s+Math.exp(l-max),0));
}
export function summarizeAudit(replicates,scenario,alpha){
  const methods={};
  for(const id of Object.keys(replicates[0].methods)){
    const rr=replicates.map(r=>r.methods[id]),hits=rr.filter(r=>r.alarm!==null).length;
    const early=rr.filter(r=>r.early).length,post=rr.filter(r=>r.post).length,delays=rr.flatMap(r=>r.delay===null?[]:[r.delay]);
    const atRisk=rr.length-early;
    methods[id]={hits,total:rr.length,rate:hits/rr.length,ci:wilson(hits,rr.length),early,post,
      postRateAmongNoEarly:atRisk?post/atRisk:null,nonDetection:rr.length-hits,
      medianDelay:quantile(delays,.5),q25Delay:quantile(delays,.25),q75Delay:quantile(delays,.75),
      meanScore:mean(rr.map(r=>r.meanScore)),meanGRMSE:mean(rr.map(r=>r.gRMSE)),
      meanClipFraction:mean(rr.map(r=>r.clipped)),
      intervalEverMissRate:mean(rr.map(r=>+r.intervalEverMiss)),
      intervalEmptyRate:mean(rr.map(r=>r.intervalEmptyFraction)),
      inflationP:scenario.null?binomialUpperTail(hits,rr.length,alpha):null,
      guardModelValid:id==='guard_exp'?!!scenario.guardValid:null};
  }
  return {scenario:{...scenario},methods};
}
export function applyHolm(results){
  // One predeclared family across all H0 scenario/procedure inflation tests.
  const entries=[];
  for(const result of results)if(result.scenario.null){
    for(const [id,m] of Object.entries(result.methods))entries.push({m,scenario:result.scenario.id,id,p:m.inflationP});
  }
  entries.sort((a,b)=>a.p-b.p);let running=0;
  for(let j=0;j<entries.length;j++){
    running=Math.max(running,Math.min(1,entries[j].p*(entries.length-j)));
    entries[j].m.inflationPHolm=running;
    entries[j].m.inflationDetected=running<.05;
  }
  return entries.length;
}
export async function runAudit(options={},progress=()=>{}){
  const reps=Math.max(2,Math.min(1000,Math.round(options.reps??200)));
  const selected=options.scenarios?new Set(options.scenarios):null;
  const scenarios=SCENARIOS.filter(s=>!selected||selected.has(s.id));
  if(!scenarios.length)throw Error('No audit scenarios selected');
  const baseSeed=(options.baseSeed??0x53A91D07)>>>0;
  const settings={...options.settings};const results=[],raw=[];
  let completed=0;
  for(const scenario of scenarios){
    const rr=[];
    for(let r=0;r<reps;r++){
      const seed=(baseSeed+Math.imul(r+1,0x9E3779B1))>>>0;
      const out=auditReplicate(scenario,seed,settings);
      rr.push(out);raw.push({scenario:scenario.id,replicate:r+1,seed,methods:out.methods});
      completed++;progress({completed,total:reps*scenarios.length,scenario:scenario.id});
      if(r%4===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    results.push(summarizeAudit(rr,scenario,settings.alpha??BASE.alpha));
  }
  const familySize=applyHolm(results);
  return {auditVersion:AUDIT_VERSION,engineVersion:ENGINE_VERSION,reps,baseSeed,
    baseConfig:{...BASE,...settings},solutions:SOLUTIONS.filter(m=>!settings.solutions||settings.solutions.includes(m.id)),
    looks:'Every '+(settings.lookEvery??BASE.lookEvery)+' assessed patients and at final N; wealth stopped after first alarm.',
    designedBeforeConfirmation:true,artificialGBias:0,
    familySize,results,raw};
}

