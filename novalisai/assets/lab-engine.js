/* Small deterministic algorithms. No remote calls and no neural-network training. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NovalisLab=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const clamp=v=>Math.max(-1,Math.min(1,v));
 function random(seed){let state=seed>>>0;return()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
 function sample(kind,seed,count){
  const rng=random(seed),points=[];
  for(let i=0;i<count;i++){
   let x,y,label;
   if(kind==='circles'||kind==='xor'){x=rng()*1.9-.95;y=rng()*1.9-.95;label=kind==='xor'?Number(x*y>=0):Number(x*x+y*y>.4);}
   else if(kind==='moons'){label=i%2;const a=rng()*Math.PI;x=.65*Math.cos(a)+(label?.25:-.25);y=(label?-.65*Math.sin(a)+.25:.65*Math.sin(a)-.25);x+=(rng()-.5)*.08;y+=(rng()-.5)*.08;}
   else if(kind==='spirals'){label=i%2;const r=.12+.78*rng(),a=r*4*Math.PI+label*Math.PI;x=r*Math.cos(a)+(rng()-.5)*.035;y=r*Math.sin(a)+(rng()-.5)*.035;}
   else throw new Error('Unknown dataset');
   points.push({x:clamp(x),y:clamp(y),label});
  }
  return points;
 }
 function neighbors(points,x,y,k=3){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isInteger(k)||k<1||k>15)throw new Error('Invalid query');
  const found=[];
  points.forEach((p,index)=>{
   const d2=(p.x-x)**2+(p.y-y)**2;
   const entry={index,x:p.x,y:p.y,label:p.label,d2};let position=found.length;
   while(position&&found[position-1].d2>d2)position--;
   if(position<k){found.splice(position,0,entry);if(found.length>k)found.pop();}
  });
  return found;
 }
 function predict(points,x,y,k=3){
  let near=neighbors(points,x,y,k);const exact=near.filter(p=>p.d2<1e-12);if(exact.length)near=exact;
  let yes=0,total=0;
  near.forEach(p=>{p.weight=exact.length?1:1/Math.sqrt(p.d2);total+=p.weight;yes+=p.weight*p.label;});
  const vote=total?yes/total:.5;
  return {label:total?Number(vote>.5):null,vote,neighbors:near};
 }
 function evaluate(points,test,k){const correct=test.reduce((sum,p)=>sum+Number(predict(points,p.x,p.y,k).label===p.label),0);return {correct,total:test.length,accuracy:test.length?correct/test.length:null};}
 const referenceCache={};
 function truth(kind,x,y){
  if(kind==='xor')return Number(x*y>=0);if(kind==='circles')return Number(x*x+y*y>.4);
  // Reference curves are independent of every example and test set.
  const reference=referenceCache[kind]||(referenceCache[kind]=sample(kind,991177,512));return neighbors(reference,x,y,1)[0].label;
 }
 function optimize(items,capacity){
  if(!Number.isInteger(capacity)||capacity<0||capacity>50||items.length>16||items.some(i=>!Number.isInteger(i.cost)||i.cost<1||!Number.isFinite(i.value)||i.value<0))throw new Error('Invalid optimization inputs');
  let best={cost:0,value:0,selected:[]};
  for(let mask=0;mask<2**items.length;mask++){
   let cost=0,value=0;const selected=[];
   items.forEach((item,i)=>{if(mask&(1<<i)){cost+=item.cost;value+=item.value;selected.push(i);}});
   if(cost<=capacity&&(value>best.value||(value===best.value&&cost<best.cost)))best={cost,value,selected};
  }
  let cost=0,value=0;const selected=[];
  items.forEach((item,i)=>{if(cost+item.cost<=capacity){cost+=item.cost;value+=item.value;selected.push(i);}});
  return {best,baseline:{cost,value,selected},combinations:2**items.length};
 }
 function extractDocument(text){
  if(typeof text!=='string'||text.length>12000)throw new Error('Invalid document');
  const clean=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const find=keys=>{const m=clean.match(new RegExp('^(?:'+keys+')\\s*:\\s*(.+)$','im'));return m?m[1].trim():null;};
  const parse=v=>v!==null&&/^\d+(?:[.,]\d{1,2})?$/.test(v)?Number(v.replace(',','.')):null;
  const fields={reference:find('reference|ref|referentie|referenz'),supplier:find('fournisseur|supplier|leverancier|lieferant'),quantity:parse(find('quantite|quantity|aantal|menge')),unit:parse(find('prix unitaire|unit price|eenheidsprijs|einzelpreis')),vat:parse(find('tva|vat|btw|mwst'))};
  const errors=[];if(!fields.reference||fields.reference.length<3)errors.push('reference');if(!fields.supplier)errors.push('supplier');if(!Number.isInteger(fields.quantity)||fields.quantity<1||fields.quantity>100)errors.push('quantity');if(fields.unit===null||fields.unit<=0||fields.unit>10000)errors.push('unit');if(fields.vat===null||fields.vat<0||fields.vat>100)errors.push('vat');
  const total=errors.length?null:Math.round(fields.quantity*Math.round(fields.unit*100)*(1+fields.vat/100))/100;
  return {fields,errors,total};
 }
 return {random,sample,neighbors,predict,evaluate,truth,optimize,extractDocument};
});
