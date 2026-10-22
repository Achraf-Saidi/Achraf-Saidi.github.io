/**
 * AION / deterministic no-dependency test.
 * Run: node aion/tests/smoke.mjs
 * Uses the exact browser model source and checked-in clinical CSV files.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const src=fs.readFileSync(path.join(root,"app.js"),"utf8")
  .replace(/bootstrap\(\);\s*\}\)\(\);\s*$/,"return {csv,n,classifier,initCox,SPECS,DEFAULT};\n})();")
  .replace("(function(){","return (function(){");
const a=(new Function(src))();
assert.equal(typeof a.csv,"function","Pure data engine extraction");
const read=name=>a.csv(fs.readFileSync(path.join(root,"data",name),"utf8"));
const h=read("heart-failure.csv"),heads=h.shift();
const heart=h.map(row=>Object.fromEntries(heads.map((name,j)=>[name,a.n(row[j])])));
const liver=read("liver-ilpd.csv").filter(r=>r.length>=11).map(r=>({
  age:a.n(r[0]),sex:r[1],bilirubin:a.n(r[2]),direct:a.n(r[3]),
  alp:a.n(r[4]),alt:a.n(r[5]),ast:a.n(r[6]),proteins:a.n(r[7]),
  albumin:a.n(r[8]),agRatio:a.n(r[9]),y:a.n(r[10])===1?1:0
}));
const rawKidney=read("kidney-ckd.csv"),knames=rawKidney.shift();
const kidney=rawKidney.filter(r=>r.length===knames.length).map(r=>{
  const obj={};
  knames.forEach((name,j)=>obj[name]=r[j].trim().toLowerCase());
  ["age","bp","bgr","bu","sc","hemo"].forEach(name=>obj[name]=a.n(obj[name]));
  obj.y=obj.classification.replace(/\s/g,"")==="ckd"?1:0;
  return obj;
});
assert.equal(heart.length,299,"Heart cohort count");
assert.equal(liver.length,583,"Liver cohort count");
assert.equal(kidney.length,400,"Kidney cohort count");
assert.equal(heart.filter(x=>x.DEATH_EVENT===1).length,96,"Heart events");
assert(liver.some(x=>x.y===0)&&liver.some(x=>x.y===1),"Both liver labels");
assert(kidney.some(x=>x.y===0)&&kidney.some(x=>x.y===1),"Both renal labels");
const lm=a.classifier(liver,"liver"),km=a.classifier(kidney,"kidney"),cm=a.initCox(heart);
assert(Number.isFinite(lm.evaluation.auc)&&lm.evaluation.auc>.5,"Liver ROC AUC");
assert(Number.isFinite(km.evaluation.auc)&&km.evaluation.auc>.5,"Kidney ROC AUC");
assert(Number.isFinite(cm.cindex)&&cm.cindex>.5,"Cox holdout concordance");
assert(Math.abs(lm.evaluation.auc-0.7248168498)<0.001,"Reproducible liver AUC");
assert(Math.abs(km.evaluation.auc-0.9899749373)<0.001,"Reproducible kidney AUC");
assert(Math.abs(cm.cindex-0.7215189873)<0.001,"Reproducible Cox c-index");
assert(cm.fit.surv(a.SPECS.heart.profile(a.DEFAULT),0)===1,"S(0)=1");
const v=Array.from({length:20},(_,i)=>cm.fit.surv(a.SPECS.heart.profile(a.DEFAULT),i*14));
assert(v.every((s,i)=>s>=0&&s<=1&&(i===0||s<=v[i-1]+1e-10)),"Survival function must be monotone");
for(const kind of ["liver","kidney"]){let m=kind==="liver"?lm:km;let ps=m.rows.slice(0,15).map(r=>m.fit.predict(r.x));assert(ps.every(p=>p>0&&p<1),"Probability scores bounded for "+kind);}
console.log("AION PASS — 3 real cohorts, reproducible logistic metrics, censor-aware Cox survival");
console.table({liver:{n:liver.length,auc:lm.evaluation.auc,brier:lm.evaluation.brier},kidney:{n:kidney.length,auc:km.evaluation.auc,brier:km.evaluation.brier},heart:{n:heart.length,cindex:cm.cindex}});
