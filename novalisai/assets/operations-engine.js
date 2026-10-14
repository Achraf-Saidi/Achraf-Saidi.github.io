/* Pure deterministic rules for explicitly fictional workflows and workload comparison. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NovalisOperations=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 function initial(kind){if(![0,1,2].includes(kind))throw new Error('Invalid scenario');return {kind,requested:12,available:8,split:false,document:false,manager:false,source:false,review:false,approved:false,reserved:0};}
 function issues(s){if(s.approved)return [];if(s.kind===0)return (s.split?Math.min(s.available,s.requested):s.requested)>s.available||s.available<=0?[0]:[];if(s.kind===1)return [...(!s.document?[1]:[]),...(!s.manager?[2]:[])];return [...(!s.source?[3]:[]),...(!s.review?[4]:[])];}
 function fix(s,issue){if(s.approved)return {...s};const n={...s};if(issue===0)n.split=true;if(issue===1)n.document=true;if(issue===2)n.manager=true;if(issue===3)n.source=true;if(issue===4)n.review=true;return n;}
 function approve(s){const blocked=issues(s);if(s.approved||blocked.length)return {state:{...s},issues:blocked,changed:false};const n={...s,approved:true};if(s.kind===0){n.reserved=s.split?Math.min(s.available,s.requested):s.requested;n.available-=n.reserved;}return {state:n,issues:[],changed:true};}
 function workload(values){
  const limits=[100000,240,240,100,240,100000];if(!Array.isArray(values)||values.length!==6||values.some((v,i)=>!Number.isFinite(v)||v<0||v>limits[i])||!Number.isInteger(values[0]))return null;
  const [volume,before,processing,percentage,review,operating]=values,share=percentage/100;
  const current=volume*before,manual=volume*(1-share)*before,automated=volume*share*processing,checks=volume*share*review,after=manual+automated+checks+operating;
  return {current,manual,automated,checks,operating,after,netHours:(current-after)/60};
 }
 return {initial,issues,fix,approve,workload};
});
