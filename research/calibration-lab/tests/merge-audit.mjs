/**
 * Merge independently executed confirmation chunks and recompute one global Holm family.
 * Usage: node research/calibration-lab/tests/merge-audit.mjs
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {SCENARIOS,SOLUTIONS,applyHolm,binomialUpperTail} from '../audit.mjs';
const directory=new URL('../audit-results/',import.meta.url);
const chunks=['a','b','c'].map(k=>JSON.parse(readFileSync(new URL('confirm-'+k+'.json',directory),'utf8')));
for(const c of chunks){
  if(c.reps!==200||c.baseConfig.n!==2500||c.baseSeed!==chunks[0].baseSeed)throw Error('Incompatible confirmation chunks');
  if(JSON.stringify(c.sourceHashes)!==JSON.stringify(chunks[0].sourceHashes))throw Error('Source changed during confirmation');
}
for(const path of ['../audit.mjs','../engine.mjs']){
  const expectedHash=createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
  if(chunks[0].sourceHashes[path]!==expectedHash)throw Error('Source differs from confirmation: '+path);
}
const report={...chunks[0],results:chunks.flatMap(c=>c.results),elapsedSecondsByChunk:chunks.map(c=>c.elapsedSeconds)};
delete report.elapsedSeconds;
report.results.sort((a,b)=>SCENARIOS.findIndex(s=>s.id===a.scenario.id)-SCENARIOS.findIndex(s=>s.id===b.scenario.id));
if(report.results.length!==SCENARIOS.length||new Set(report.results.map(r=>r.scenario.id)).size!==SCENARIOS.length)throw Error('Missing/duplicate scenarios');
report.familySize=applyHolm(report.results);
report.totalCohorts=report.reps*report.results.length;
report.totalMethodRuns=report.totalCohorts*SOLUTIONS.length;
report.rawFormat='first-alarm-matrix-v1; per-replicate first alarms and seeds retained; score diagnostics reproducible by seed';
const raw=['a','b','c'].flatMap(k=>JSON.parse(readFileSync(new URL('confirm-'+k+'-replicates.json',directory),'utf8')).raw);
const methodIds=SOLUTIONS.map(m=>m.id),scenarioIds=SCENARIOS.map(s=>s.id);
const thin={format:'first-alarm-matrix-v1',auditVersion:report.auditVersion,n:2500,methods:methodIds,scenarios:scenarioIds,
  raw:raw.map(r=>[scenarioIds.indexOf(r.scenario),r.replicate,r.seed,...methodIds.map(id=>r.methods[id].alarm)])};
const contrasts=[
 ['homogeneous','km_small','km_large'],['conditional','km_online','exp_online'],
 ['nonlinear-censor','exp_online','dr_cond'],['mild-drift','guard_exp','oracle'],
];
report.exploratoryPairedContrasts=contrasts.map(([scenario,first,second])=>{
  let firstOnly=0,secondOnly=0;
  for(const r of raw.filter(r=>r.scenario===scenario)){
    const a=r.methods[first].alarm!==null,b=r.methods[second].alarm!==null;
    firstOnly+=a&&!b;secondOnly+=b&&!a;
  }
  const d=firstOnly+secondOnly,p=d?Math.min(1,2*binomialUpperTail(Math.max(firstOnly,secondOnly),d,.5)):1;
  return {scenario,first,second,firstOnly,secondOnly,discordant:d,exactMcNemarP:p,
    caution:'Exploratory paired contrast; p-values not included in primary Holm family. H1 contrast uses any alarm, see early counts.'};
});
writeFileSync(new URL('confirm.json',directory),JSON.stringify(report,null,2)+'\n');
writeFileSync(new URL('confirm-replicates.json.gz',directory),gzipSync(JSON.stringify(thin),{level:9}));
for(const r of report.results){
  const ids=['oracle','km_small','km_large','km_online','km_window','exp_online','dr_pooled','dr_cond','guard_exp'];
  process.stdout.write(r.scenario.id+' '+JSON.stringify(Object.fromEntries(ids.map(id=>{
    const m=r.methods[id];return [id,{rate:m.rate,ci:m.ci,holm:m.inflationPHolm,post:m.post,early:m.early,
      delay:m.medianDelay,coverageMiss:m.intervalEverMissRate}];
  })))+'\n');
}
process.stdout.write('Global H0 family: '+report.familySize+'; cohorts: '+report.totalCohorts+'; method runs: '+report.totalMethodRuns+'\n');

