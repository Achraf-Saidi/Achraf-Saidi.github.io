import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,METHODS,normalize,generate,simulate,observed,fitKM,fitExponential,fitG,
  EMonitor,mean,wilson,uniformBand,calibrationBins,aggregate,csv,logit} from '../engine.mjs';

const constant={n:20000,seed:812944,baseSurvival:.7,riskSpread:0,groupEffect:0,
  censorRate:.4,censorX:0,censorGroup:0,shape:1.3,eventShift:0};
const close=(x,y,tolerance,message='')=>assert.ok(Math.abs(x-y)<tolerance,message+' | '+x+' vs '+y);

test('normalization rejects invalid numbers and categorical methods',()=>{
  assert.throws(()=>normalize({n:'NaN'}));
  assert.throws(()=>normalize({estimator:'future-leaking'}));
  assert.equal(normalize({n:1}).n,100);
  assert.equal(normalize({n:99999}).n,20000);
});
test('identical seed reproduces observed, latent and sequential quantities',()=>{
  const a=simulate({n:120,seed:77}),b=simulate({n:120,seed:77});
  assert.deepEqual(a,b);
  assert.notDeepEqual(generate({n:100,seed:77}).patients,generate({n:100,seed:78}).patients);
});
test('censoring toggle preserves the same cohort, predictions and latent event times',()=>{
  const a=generate({n:300,seed:88,censoring:false}),b=generate({n:300,seed:88,censoring:true});
  for(let j=0;j<a.patients.length;j++){
    for(const k of ['T','Y','x','group','p','S','arrival'])assert.equal(a.patients[j][k],b.patients[j][k]);
  }
});
test('all four methods coincide without censoring, including evidence',()=>{
  const s=simulate({n:500,censoring:false,gBias:1.3,clip:.8,censorRho:.8});
  for(const r of s.patients){
    assert.equal(r.G,1);assert.equal(r.gHat,1);assert.equal(r.Y,r.R);
    for(const k of METHODS){
      assert.equal(r.scores[k],r.scores.full);
      assert.equal(r.brier[k],r.brier.full);
      assert.equal(r.logE[k],r.logE.full);
    }
  }
});
test('generator has calibrated survival and identifies R expectation under independence',()=>{
  const rows=generate(constant).patients;
  close(mean(rows.map(r=>r.Y)),.7,.014);
  close(mean(rows.map(r=>r.R)),.7*.6,.014);
  for(const r of rows){close(r.S,r.p,1e-12);close(r.G,.6,1e-12);}
});
test('known G centers oracle while ignoring censoring creates the predicted bias',()=>{
  const s=simulate({...constant,trainN:0,learning:'frozen',initialG:.6});
  close(s.summary.average.full,0,.015);
  close(s.summary.average.oracle,0,.025);
  close(s.summary.average.naive,-.7*.4,.015);
});
test('wrong G produces exactly the plug-in bias predicted by the PDF identity',()=>{
  const s=simulate({...constant,trainN:0,learning:'frozen',initialG:.3});
  close(s.summary.average.plugin,.7*(.6/.3-1),.04);
  close(mean(s.patients.map(r=>r.expectedNuisance)),.7,.000001);
  assert.equal(s.summary.alarms.full,null);
  assert.notEqual(s.summary.alarms.plugin,null);
});
test('weight clipping introduces a measurable bias and is recorded',()=>{
  const s=simulate({...constant,censorRate:.6,initialG:.4,trainN:0,learning:'frozen',clip:.8});
  assert.equal(s.summary.clipped,s.config.n);
  close(s.summary.average.plugin,.7*(.4/.8-1),.02);
  for(const r of s.patients)assert.equal(r.gHat,.8);
});
test('conditional dependence breaks IPCW even with true marginal G',()=>{
  const s=simulate({...constant,censorRho:.8});
  assert.ok(Math.abs(s.summary.average.oracle)>.06);
  assert.equal(s.patients[0].expectedNuisance,null);
  assert.equal(s.patients[0].expectedPlugin,null);
  assert.ok(Number.isNaN(aggregate(s.patients,s.config).nuisance));
});
test('covariate shift alone preserves conditional calibration',()=>{
  const s=generate({n:1000,xShift:2,prevalenceShift:.5,eventShift:0,slopeShift:0,groupShift:0,initialShift:0});
  for(const r of s.patients)assert.equal(r.S,r.p);
  const before=s.patients.slice(0,500),after=s.patients.slice(500);
  assert.ok(mean(after.map(r=>r.x))-mean(before.map(r=>r.x))>1.8);
});
test('fixed model remains fixed while true survival changes only after the configured change',()=>{
  const a=generate({n:1000,seed:3,eventShift:0}),b=generate({n:1000,seed:3,eventShift:-1});
  for(let j=0;j<1000;j++){
    assert.equal(a.patients[j].p,b.patients[j].p);
    if(j<500)assert.equal(a.patients[j].S,b.patients[j].S);
    else assert.ok(b.patients[j].S<a.patients[j].S);
  }
});
test('calendar arrivals and evaluation maturity are strictly ordered',()=>{
  for(const arrival of ['regular','poisson']){
    const s=generate({n:1000,tau:12,arrival,arrivalRate:30});
    for(let j=0;j<s.patients.length;j++){
      const r=s.patients[j];close(r.evalTime-r.arrival,12,1e-10);
      if(j)assert.ok(r.arrival>s.patients[j-1].arrival);
    }
  }
});
test('censored is distinct from event and all horizon statuses partition the sample',()=>{
  const rows=generate({n:1000}).patients;
  for(const r of rows){
    assert.equal(r.dc+r.de+r.R,1);
    assert.equal(r.known,1-r.dc);
    if(r.de)assert.equal(r.Y,0);
    if(r.R)assert.equal(r.Y,1);
  }
});
test('historical estimator inputs contain no latent outcomes, times or true probabilities',()=>{
  const s=generate({n:100,trainN:200});
  assert.equal(s.training.length,200);
  assert.deepEqual(Object.keys(s.training[0]).sort(),['U','dc','group','i','p','x']);
  const o=observed(s.patients[0]);
  for(const k of ['Y','T','C','G','S'])assert.ok(!(k in o));
});
test('current patient is never included in its own G fit; frozen fits never update',()=>{
  for(const learning of ['frozen','expanding','sliding']){
    const s=simulate({n:250,trainN:20,refitEvery:17,window:60,learning});
    for(const r of s.patients){
      assert.ok(r.fitThrough<r.i);
      assert.ok(r.fitN<=20+r.i-1);
      if(learning==='frozen'){assert.equal(r.fitThrough,0);assert.equal(r.fitN,20);}
      if(learning==='sliding')assert.ok(r.fitN<=60);
    }
  }
});
test('reverse Kaplan–Meier matches a hand-calculated product limit including tied removals',()=>{
  const model=fitKM([{U:1,dc:1},{U:2,dc:0},{U:3,dc:1},{U:4,dc:0}],5);
  close(model.at(1),1,1e-12);close(model.at(2),.75,1e-12);close(model.at(4),.375,1e-12);
  const tied=fitKM([{U:1,dc:1},{U:1,dc:0},{U:2,dc:1},{U:3,dc:0}],5);
  close(tied.at(1.5),.75,1e-12);close(tied.at(2.5),.375,1e-12);
  close(fitKM([],5,.7).at(5),.7,1e-12);
});
test('conditional exponential censor model recovers known coefficients from observed data',()=>{
  const c=normalize({n:20000,seed:123,censorRate:.3,censorX:.3,censorGroup:.2,gMin:.01});
  const rows=generate(c).patients.map(observed),model=fitExponential(rows,c.tau,c.initialG);
  close(model.theta[0],Math.log(-Math.log(.7)),.08);
  close(model.theta[1],.3,.07);close(model.theta[2],.2,.12);
  close(model.at({x:0,group:0},c.tau),.7,.025);
});
test('IPCW Brier agrees with the full-data target, using event-time G',()=>{
  const s=simulate({...constant,trainN:0,initialG:.6,learning:'frozen'});
  close(s.summary.brier.oracle,s.summary.brier.full,.015);
  close(s.summary.brier.plugin,s.summary.brier.full,.015);
  // Squaring the pseudo outcome is NOT the Brier calculation.
  assert.ok(Math.abs(mean(s.patients.map(r=>(r.R/r.G-r.p)**2))-s.summary.brier.oracle)>.1);
});
test('constant outcomes and predictions preserve e=1 for zero scores',()=>{
  const m=new EMonitor(1000,.05,true);
  for(let i=0;i<1000;i++)close(m.update(0,.6),0,1e-12);
  assert.equal(m.firstAlarm,null);
});
test('mixture expectation after one Bernoulli update is exactly one under H0',()=>{
  const p=.72;
  for(const G of [1,.7,.1]){
    const a=new EMonitor(100,G,true),b=new EMonitor(100,G,true);
    const e1=Math.exp(a.update(1/G-p,p)),e0=Math.exp(b.update(-p,p));
    close(p*G*e1+(1-p*G)*e0,1,1e-12);
  }
});
test('evidence mixture handles extreme positive weights and small G without overflow',()=>{
  const m=new EMonitor(1000,.01,true);
  for(let j=0;j<1000;j++){
    const v=m.update(j%7===0?99:-.99,.99);
    assert.ok(Number.isFinite(v));
  }
  assert.throws(()=>new EMonitor(100,1,false).update(-100,.5));
});
test('multiple risk channels can detect opposing conditional miscalibration',()=>{
  const m=new EMonitor(2000,1,true);
  for(let i=0;i<2000;i++){
    // Global score mean cancels, but low p is always under-predicted, high p over-predicted.
    const low=i%2===0,p=low?.2:.8,score=low?.5:-.5;
    m.update(score,p,.05);
  }
  assert.notEqual(m.firstAlarm,null);
});
test('max e and first alarms use every contribution, not display downsampling',()=>{
  const s=simulate({n:500,censoring:true,censorRate:.8});
  for(const k of METHODS){
    const first=s.patients.find(r=>r.logE[k]>=Math.log(1/s.config.alpha));
    assert.equal(s.summary.alarms[k],first?.i??null);
    for(let j=1;j<s.patients.length;j++)assert.ok(s.patients[j].maxLogE[k]>=s.patients[j-1].maxLogE[k]);
  }
});
test('calibration bins use Horvitz–Thompson means without clipping estimates to one',()=>{
  const rows=[{p:.75,S:.75,Y:1,R:1,G:.2,gHat:.1}];
  const b=calibrationBins(rows,6)[0];assert.equal(b.oracle,5);assert.equal(b.plugin,10);
});
test('Wilson CI, alpha-spending band and CSV escaping have known boundary behavior',()=>{
  const ci=wilson(0,100);close(ci[0],0,1e-10);close(ci[1],.0369935,.00001);
  assert.ok(uniformBand(1000,.05,2)<uniformBand(100,.05,2));
  const s=csv([{a:'hello,"world"',b:Infinity}], [{key:'a'},{key:'b'}]);
  assert.ok(s.includes('"hello,""world"""'));assert.ok(!s.includes('Infinity'));
});
test('compact simulation retains the same exact final summary for Monte-Carlo',()=>{
  const a=simulate({n:200,seed:17}),b=simulate({n:200,seed:17},{compact:true});
  assert.deepEqual(a.summary,b.summary);assert.equal(b.patients.length,0);
});

