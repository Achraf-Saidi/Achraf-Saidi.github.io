/* Local illustrative model. Currency amounts describe this scenario, never a Novalis quote. */
(function(root){'use strict';
 function plan(demand,capacity){
  if(!Number.isInteger(demand)||demand<60||demand>160||!Number.isInteger(capacity)||capacity<0||capacity>100)throw new RangeError('Invalid scenario');
  const cost=(a,b)=>a*7+b*4+(b>0?60:0);
  const baseA=Math.min(120,demand),baseB=Math.min(capacity,demand-baseA),missing=Math.max(0,demand-120-capacity);
  let best=null;
  for(let b=0;b<=Math.min(demand,capacity);b++){
   const a=demand-b;if(a>120)continue;const total=cost(a,b);
   if(!best||total<best.cost)best={a,b,cost:total};
  }
  const baseline={a:baseA,b:baseB,cost:cost(baseA,baseB)};
  const previous=1410,other=830,history=[1260,1290,1350,1320,1410,baseline.cost+other];
  return {demand,capacity,feasible:!missing,missing,baseline,optimal:best,saving:best?baseline.cost-best.cost:null,
   history,previous,current:history[5],transportChange:baseline.cost-610,otherChange:30,
   forecast:Math.round((history[3]+history[4]+history[5])/3)};
 }
 const api=Object.freeze({plan});if(typeof module==='object'&&module.exports)module.exports=api;else root.NovalisDecision=api;
})(typeof window==='object'?window:this);
