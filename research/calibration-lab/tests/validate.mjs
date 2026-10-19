/**
 * Reproducible finite-sample validation, not a proof of validity.
 * Run: node research/calibration-lab/tests/validate.mjs [replicates]
 */
import {simulate,METHODS,wilson,VERSION,mean,normalize} from '../engine.mjs';
import {writeFileSync} from 'node:fs';
const reps=Math.max(20,Math.min(1000,Number(process.argv[2])||200));
const arms=[
  ['null-homogeneous',{eventShift:0,gBias:0}],
  ['null-biased-G',{eventShift:0,gBias:1}],
  ['predictive-drift',{eventShift:-1.3,gBias:0}],
];
const baseConfig=normalize({n:2000,censorRate:.35,trainN:300});
const report={version:VERSION,replicates:reps,n:2000,alpha:.05,baseSeed:283719,baseConfig,arms:[]};
for(const [name,override] of arms){
  const alarms=Object.fromEntries(METHODS.map(k=>[k,0]));
  const scores=Object.fromEntries(METHODS.map(k=>[k,[]]));
  for(let r=0;r<reps;r++){
    const seed=(283719+Math.imul(r+1,0x9E3779B1))>>>0;
    const s=simulate({...baseConfig,seed,...override},{compact:true});
    for(const k of METHODS){alarms[k]+=s.summary.alarms[k]!==null;scores[k].push(s.summary.average[k]);}
  }
  const arm={name,config:normalize({...baseConfig,...override}),methods:Object.fromEntries(METHODS.map(k=>[k,{
    alarmRate:alarms[k]/reps,alarms:alarms[k],wilson95:wilson(alarms[k],reps),meanScore:mean(scores[k]),
  }]))};
  report.arms.push(arm);process.stderr.write(name+' complete\n');
}
const target=new URL('./validation.json',import.meta.url);
writeFileSync(target,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report,null,2)+'\n');

