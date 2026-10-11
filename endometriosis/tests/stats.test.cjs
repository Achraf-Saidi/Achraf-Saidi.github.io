const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../stats.js');
const C=require('../data/catalog.js');
test('BH matches independently worked sorted example',()=>{
  const q=S.bh([.01,.04,.03,.002]);[.02,.04,.04,.008].forEach((v,i)=>assert.ok(Math.abs(q[i]-v)<1e-12));
});
test('CSV quotes, CRLF, BOM and escaped quotes',()=>{
  const r=S.csv('\ufeffa,b\r\n"x,y","a""b"\r\n');assert.deepEqual(r,[{a:'x,y',b:'a"b'}]);
});
test('CSV rejects broken records',()=>{
  assert.throws(()=>S.csv('a,b\n1'));assert.throws(()=>S.csv('a,b\n"x,y'));assert.throws(()=>S.csv('a,a\n1,2'));
});
test('round trip synthetic CSV',()=>assert.deepEqual(S.validate(S.csv(S.toCSV(S.demo()))),S.demo()));
test('invalid SE, sample size, p-value and duplicate rows refused',()=>{
  for(const replacement of [{se:0},{n_case:2},{p_value:2},{effect:NaN}])assert.throws(()=>S.validate([{...S.demo()[0],...replacement}]));
  assert.throws(()=>S.validate([S.demo()[0],S.demo()[0]]));
});
test('pooled equal-precision effect and standard error analytic result',()=>{
  const r=S.pooled([{effect:1,se:2},{effect:3,se:2}]);assert.equal(r.effect,2);assert.ok(Math.abs(r.se-Math.sqrt(2))<1e-12);assert.equal(r.Q,.5);assert.equal(r.I2,0);
});
test('same cohort prohibits eligibility',()=>{
  const rows=S.demo().map(r=>({...r,cohort:'shared'}));assert.ok(S.analyze(rows).every(r=>!r.eligible&&r.reasons.includes('Cohortes partagées')));
});
test('scales and contrasts never pooled together',()=>{
  const rows=S.demo().filter(r=>r.gene==='DEMO_01').map((r,i)=>({...r,effect_scale:'scale'+i}));assert.equal(S.analyze(rows).length,3);assert.ok(S.analyze(rows).every(r=>!r.eligible));
});
test('discordant and heterogeneous synthetic variables abstain',()=>{
  const results=S.analyze(S.demo());assert.ok(results.find(r=>r.gene==='DEMO_01').eligible);assert.ok(!results.find(r=>r.gene==='DEMO_02').eligible);assert.ok(!results.find(r=>r.gene==='DEMO_03').eligible);
});
test('leave-one-study-out is unavailable with two studies',()=>{
  const result=S.analyze(S.demo().filter(r=>r.study!=='SYN_C'));assert.ok(result.every(r=>r.loo.length===0&&!r.looStable));
});
test('BH families do not share q values between distinct cell types',()=>{
  const rows=S.demo();const clone=rows.filter(r=>r.gene==='DEMO_01').map(r=>({...r,cell_type:'other'}));const base=S.analyze(rows);const both=S.analyze([...rows,...clone]);assert.equal(base.find(r=>r.gene==='DEMO_01').q_meta,both.find(r=>r.gene==='DEMO_01'&&r.cell_type==='synthetic_stroma').q_meta);
});
test('all bibliographic edges resolve to source and nodes',()=>{
  const nodes=new Set(C.nodes.map(n=>n.id)),sources=new Set(C.sources.map(s=>s.id));assert.equal(nodes.size,C.nodes.length);for(const e of C.edges){assert.ok(nodes.has(e.source)&&nodes.has(e.target)&&sources.has(e.evidence));}
});
test('synthetic data has no real gene symbols',()=>assert.ok(S.demo().every(r=>r.gene.startsWith('DEMO_')&&r.cohort.startsWith('SYN_'))));
test('normal approximation agrees with reference tail values',()=>{
  assert.ok(Math.abs(S.normalTail(1.95996398454)-.05)<2e-7);assert.ok(Math.abs(S.normalTail(0)-1)<2e-7);
});
