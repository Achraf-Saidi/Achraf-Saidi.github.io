/**
 * Reproduce: node research/calibration-lab/tests/run-audit.mjs --phase confirm --reps 300
 * Development and confirmation use disjoint base seed streams. No G bias is added.
 */
import {runAudit,SCENARIOS} from '../audit.mjs';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),value=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
const phase=value('phase','confirm'),reps=Number(value('reps',phase==='pilot'?30:300));
const n=Number(value('n',2500)),filter=value('scenarios',''),methodFilter=value('solutions','');
const suffix=value('label','');
const sourceHashes=Object.fromEntries(['../audit.mjs','../engine.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(new URL(p,import.meta.url))).digest('hex')]));
const options={reps,baseSeed:phase==='pilot'?0x817CA631:0x53A91D07,
  scenarios:filter?filter.split(','):undefined,
  settings:{n,solutions:methodFilter?methodFilter.split(','):undefined}};
const start=Date.now();let lastScenario='';
const result=await runAudit(options,p=>{
  if(lastScenario!==p.scenario){process.stderr.write('\n'+p.scenario+' ');lastScenario=p.scenario;}
  if(p.completed%25===0)process.stderr.write(p.completed+'/'+p.total+' ');
});
result.phase=phase;result.elapsedSeconds=(Date.now()-start)/1000;result.sourceHashes=sourceHashes;
const directory=new URL('../audit-results/',import.meta.url);mkdirSync(directory,{recursive:true});
const name=phase+(suffix?'-'+suffix:'');
const rawPath=new URL(name+'-replicates.json',directory),summaryPath=new URL(name+'.json',directory);
writeFileSync(rawPath,JSON.stringify({auditVersion:result.auditVersion,phase,raw:result.raw})+'\n');
delete result.raw;
writeFileSync(summaryPath,JSON.stringify(result,null,2)+'\n');
process.stderr.write('\n'+phase+' completed in '+result.elapsedSeconds.toFixed(1)+'s\n');
for(const s of result.results){
  process.stdout.write(s.scenario.id+' '+JSON.stringify(Object.fromEntries(Object.entries(s.methods).map(([k,v])=>[k,{
    rate:+v.rate.toFixed(3),holm:v.inflationPHolm===undefined?null:+v.inflationPHolm.toFixed(5),
    post:v.post,early:v.early,delay:v.medianDelay,score:+v.meanScore.toFixed(4)}])))+'\n');
}

