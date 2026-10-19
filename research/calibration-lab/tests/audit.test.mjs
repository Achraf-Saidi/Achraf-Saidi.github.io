import test from 'node:test';
import assert from 'node:assert/strict';
import {EMonitor,generate,mean} from '../engine.mjs';
import {AuditMonitor,aipcw,censorCS,censorLogMixture,logGamma,auditReplicate,SCENARIOS,SOLUTIONS,applyHolm,binomialUpperTail} from '../audit.mjs';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,a+' vs '+b);

test('Lanczos logGamma and gamma-mixture likelihood agree with known values',()=>{
  close(logGamma(1),0);close(logGamma(10),Math.log(362880));
  close(censorLogMixture(0,1,.35),-Math.log(2)+.35);
  const cs=censorCS(30,100);close(cs.lo,.5759301400921195);close(cs.hi,.8696033884716492);
});
test('censoring CS is vacuous without exposure and brackets the likelihood minimum',()=>{
  assert.deepEqual(censorCS(0,0),{lo:.05,hi:1,empty:false});
  for(const [D,V] of [[0,1],[3,8],[30,100],[350,1300]]){
    const cs=censorCS(D,V),g=Math.exp(-D/V);
    if(g>=.05){assert.ok(cs.lo<=g);assert.ok(cs.hi>=g);}
    assert.ok(cs.lo>0&&cs.hi<=1&&cs.lo<=cs.hi);
  }
});
test('audit wealth with lookEvery=1 equals existing monitor until first alarm',()=>{
  const a=new AuditMonitor(1000,.05,{lookEvery:1}),b=new EMonitor(1000,.05);
  for(let i=0;i<200;i++){
    const score=i%3===0?.5:-.2,p=.6;
    a.update(score,score,p,i===199);b.update(score,p);
    close(a.logE,b.logE,1e-10);
  }
});
test('sign-specific envelope produces identical wealth for equal lower/upper scores',()=>{
  const a=new AuditMonitor(100,1,{lookEvery:1}),b=new AuditMonitor(100,1,{lookEvery:1});
  for(let i=0;i<50;i++){a.update(.1,.1,.7);b.update(.1,.1,.7,false,1);}
  close(a.logE,b.logE);
});
test('AIPCW vanishes to the full observed outcome without censoring',()=>{
  // With G=1, the event process augmentation recovers Y at tau pathwise.
  for(const a of [.1,.5,2]){
    close(aipcw({u:.4,de:1},a,0),0);
    close(aipcw({u:1,de:0},a,0),1);
  }
});
test('AIPCW obeys the declared range for all sampled working hazards',()=>{
  for(const floor of [.02,.05,.2,.7])for(const a of [.01,.3,1,5,12]){
    const b=-Math.log(floor);
    for(const u of [0,.1,.5,.99,1])for(const de of [0,1]){
      const q=aipcw({u,de},a,b);
      assert.ok(q>=-1/floor-1e-8&&q<=1/floor+1e-8);
    }
  }
});
test('exact analytic AIPCW expectation is doubly robust for exponential laws',()=>{
  // Independent midpoint quadrature over observed event/censor times plus survival atom.
  function expectation(at,bt,ah,bh){
    const n=20000;let result=0;
    for(let j=0;j<n;j++){
      const u=(j+.5)/n;
      result+=(at*aipcw({u,de:1},ah,bh)+bt*aipcw({u,de:0},ah,bh))*Math.exp(-(at+bt)*u)/n;
    }
    return result+Math.exp(-at-bt)*aipcw({u:1,de:0},ah,bh);
  }
  close(expectation(.3,.7,.3,.2),Math.exp(-.3),1e-8);
  close(expectation(.3,.7,.9,.7),Math.exp(-.3),1e-8);
  assert.ok(Math.abs(expectation(.3,.7,.9,.2)-Math.exp(-.3))>.005);
});
test('baseline conditional censor scenario is exactly in the exponential working family',()=>{
  for(const id of ['conditional','population','double-misspec']){
    const s=SCENARIOS.find(x=>x.id===id);
    const {config:c,patients}=generate({...s.config,n:2000});
    for(const r of patients)assert.ok(r.G>c.gMin,'positivity cap must be inactive in this exact-specification benchmark');
  }
});
test('every audit scenario executes without G perturbation and preserves sample size',()=>{
  for(const s of SCENARIOS){
    const r=auditReplicate(s,712,{n:100});
    assert.equal(r.config.gBias,0);assert.equal(r.n,100);
    assert.equal(Object.keys(r.methods).length,SOLUTIONS.length);
    for(const m of Object.values(r.methods))assert.ok(Number.isFinite(m.meanScore));
  }
});
test('conditional-calibration H0 and shape/censor changes require no assumed observed labels',()=>{
  for(const id of ['weak-calibration','shape-and-censor-drift','nonlinear-censor']){
    const a=auditReplicate(SCENARIOS.find(s=>s.id===id),84,{n:100});
    const b=auditReplicate(SCENARIOS.find(s=>s.id===id),84,{n:100});
    assert.deepEqual(a,b);
  }
});
test('Holm correction is monotone and flags a large false-alarm inflation',()=>{
  const make=(k)=>({rate:k/200,inflationP:binomialUpperTail(k,200,.05)});
  const r=[{scenario:{null:true,id:'H0'},methods:{bad:make(90),near:make(12),none:make(0)}}];
  assert.equal(applyHolm(r),3);
  assert.equal(r[0].methods.bad.inflationDetected,true);
  assert.equal(r[0].methods.none.inflationDetected,false);
  close(binomialUpperTail(0,100,.05),1);
  close(binomialUpperTail(1,10,.05),1-.95**10);
});

