import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
const ids=["G4","I2","D3","D9","B1","F2","H2"];
const scripts=[17,18,19,20,21,22,23];
function load(lang){
 const env={};env.window=env;vm.createContext(env);
 const dir=path.join("public","academy",lang);
 for(const n of scripts){
  const file=path.join(dir,"content-"+n+".js");
  const source=fs.readFileSync(file,"utf8");
  vm.runInContext(source,env,{timeout:2000,filename:file});
 }
 return env.ACHRAF_DEEP[lang];
}
for(const lang of ["fr","en"]){
 test(lang+": seven advanced masterclasses contain ten mathematical sections, runnable Python and four worked problems",()=>{
  const curriculum=load(lang);
  assert.deepEqual(Object.keys(curriculum).sort(),ids.slice().sort());
  for(const id of ids){
   const entry=curriculum[id];
   assert.equal(entry.sections.length,11,id);
   assert.ok(entry.sections.slice(0,10).every(([title,body])=>title.length>25&&body.length>=350),id);
   assert.ok(entry.sections.slice(0,10).every(([,body])=>body.includes("<p>")&&body.includes("</p>")),id);
   assert.ok((entry.sections[10][1].match(/<details class="worked-problem">/g)||[]).length===4,id);
   assert.ok(entry.code.length>=700,id);
   assert.match(entry.code,/assert /,id);
   assert.ok(entry.exercise.length>=40,id);
   assert.ok(entry.solution.length>=40,id);
  }
 });
 test(lang+": masterclass files and lazy-loader script remain wired to the public Academy",()=>{
  const html=fs.readFileSync(path.join("public","academy",lang,"index.html"),"utf8");
  const visuals=fs.readFileSync(path.join("public","academy",lang,"visuals-4.js"),"utf8");
  assert.match(html,/visuals-4.js/);
  for(const n of scripts)assert.ok(visuals.includes('"content-'+n+'.js"'),"Missing content-"+n);
  assert.match(visuals,/Promise.all\(scripts.map/);
  assert.match(visuals,/document.querySelectorAll\("#modnav \[data-id\]"\)/);
 });
}
test("new flagship depth does not inflate the 92 authored-draft inventory",()=>{
 const inventory=JSON.parse(fs.readFileSync("curriculum/academy-expansions.json","utf8"));
 assert.equal(inventory.moduleIds.length,92);
 for(const id of ids)assert.ok(inventory.moduleIds.includes(id),id);
});
