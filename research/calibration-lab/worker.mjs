import {simulate,normalize,METHODS,wilson,quantile,hasAlternative,VERSION} from './engine.mjs';
import {runAudit} from './audit.mjs';
self.onmessage=async({data})=>{
  try{
    if(data.type==='audit'){
      const result=await runAudit(data.options,p=>self.postMessage({type:'audit-progress',...p}));
      self.postMessage({type:'audit',result});
      return;
    }
    if(data.type==='simulate'){
      const result=simulate(data.config);
      self.postMessage({type:'simulation',result});
      return;
    }
    if(data.type==='mc'){
      const c=normalize(data.config),reps=Math.max(20,Math.min(1000,Math.round(data.reps||100)));
      const nullConfig={...c,initialShift:0,eventShift:0,slopeShift:0,groupShift:0,censorRho:0};
      const arms=data.arm==='null'?[['null',nullConfig]]:
        data.arm==='both'?[['null',nullConfig],['current',c]]:[['current',c]];
      const results=[],raw=[];
      let completed=0;
      for(const [arm,config] of arms){
        const counts=Object.fromEntries(METHODS.map(k=>[k,{hits:0,preChange:0,postHits:0,delays:[]}]));
        for(let r=0;r<reps;r++){
          const seed=(c.seed+Math.imul(r+1,0x9E3779B1))>>>0;
          const out=simulate({...config,seed},{compact:true});
          const row={arm,replicate:r+1,seed};
          for(const k of METHODS){
            const alarm=out.summary.alarms[k],change=Math.abs(config.initialShift)>1e-12?0:Math.floor(config.change*config.n);
            row[k]=alarm;counts[k].hits+=alarm!==null;
            if(alarm!==null&&alarm<=change)counts[k].preChange++;
            if(alarm!==null&&alarm>change){
              counts[k].postHits++;counts[k].delays.push(alarm-change);
            }
          }
          raw.push(row);completed++;
          if(r%2===0||r===reps-1){
            self.postMessage({type:'progress',completed,total:reps*arms.length,arm});
            await new Promise(resolve=>setTimeout(resolve,0));
          }
        }
        results.push({arm,isAlternative:hasAlternative(config),rho:config.censorRho,
          methods:Object.fromEntries(METHODS.map(k=>[k,{...counts[k],rate:counts[k].hits/reps,
            ci:wilson(counts[k].hits,reps),medianDelay:quantile(counts[k].delays,.5),
            q25Delay:quantile(counts[k].delays,.25),q75Delay:quantile(counts[k].delays,.75)}]))});
      }
      self.postMessage({type:'mc',result:{version:VERSION,config:c,reps,results,raw,
        nullDefinition:'initialShift=eventShift=slopeShift=groupShift=0 et rho=0 ; censure, G estimé et shift de X conservés'}});
    }
  }catch(error){self.postMessage({type:'error',message:error.message,stack:error.stack});}
};

