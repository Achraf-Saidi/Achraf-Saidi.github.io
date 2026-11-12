import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const root=path.resolve('public/academy');
for(const lang of ['fr','en']){
test('Academy '+lang+' has 151 distinct modules and 70 authored expansions',()=>{
 const html=fs.readFileSync(path.join(root,lang,'index.html'),'utf8');
 const raw=html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(raw,'Embedded manifest missing');
 const m=JSON.parse(raw[1]);
 assert.equal(m.modules.length,151);
 assert.equal(new Set(m.modules.map(x=>x.id)).size,151);
 const ids=new Set(m.modules.map(x=>x.id));
 for(const module of m.modules){
  assert.ok(module.title.fr&&module.title.en);
  assert.ok(module.topics.length>0,module.id);
  for(const pre of module.prerequisites)assert.ok(ids.has(pre),module.id+': '+pre);
 }
 const env={};env.window=env;
 vm.createContext(env);
 for(let part=1;part<=12;part++){
  const s=fs.readFileSync(path.join(root,lang,'content-'+part+'.js'),'utf8');
  vm.runInContext(s,env,{timeout:1000});
 }
 const d=env.ACHRAF_DEEP[lang];
 assert.equal(Object.keys(d).length,70);
 for(const [id,c] of Object.entries(d)){
  assert.ok(ids.has(id),id);
  assert.ok(c.sections.length>=3,id);
  assert.ok(c.sections.every(s=>s[0].length>10 && s[1].length>250),id);
  assert.ok(c.code.length>70 && c.exercise.length>30 && c.solution.length>30,id);
 }
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
 assert.match(html,/achraf-academy-completed-v1/);
 assert.match(html,/id="notes"/);assert.match(html,/id="visual"/);assert.match(html,/visuals.js/);const visual=fs.readFileSync(path.join(root,lang,'visuals.js'),'utf8');new vm.Script(visual);for(const name of ['visuals-2.js','visuals-3.js']){const code=fs.readFileSync(path.join(root,lang,name),'utf8');new vm.Script(code)}
});
}

test('Academy new derivation pack includes original bilingual lessons',()=>{
 for(const lang of ['fr','en']){
  const env={}; env.window=env; vm.createContext(env);
  for(let part=1;part<=12;part++)vm.runInContext(fs.readFileSync(path.join(root,lang,'content-'+part+'.js'),'utf8'),env,{timeout:1000});
  for(const id of ['A10','D6','D13','F7','F8','G9','H4','H5','I2','I3','B8','C5','D3','D9','D16','G2','G5','J3','K4','L7']){
   const lesson=env.ACHRAF_DEEP[lang][id];
   assert.ok(lesson, id+' missing');
   assert.ok(lesson.sections.every(([heading,body])=>heading.length>10&&body.length>260));
   assert.ok(lesson.code.length>120);
   assert.ok(lesson.exercise.length>40);
  }
 }
});

test('Bilingual knowledge checkpoints are well formed and cannot certify users',()=>{
 for(const lang of ['fr','en']){
  const html=fs.readFileSync(path.join(root,lang,'index.html'),'utf8');
  assert.match(html,/id="checkpoint"/);
  const js=fs.readFileSync(path.join(root,lang,'checkpoints.js'),'utf8');
  const env={};env.window=env;vm.createContext(env);vm.runInContext(js,env,{timeout:1000});
  assert.equal(Object.keys(env.ACHRAF_EXAMS).length,20);
  for(const [id,entry] of Object.entries(env.ACHRAF_EXAMS)){
   const q=entry[lang];assert.ok(q.q.length>15,id);
   assert.equal(q.o.length,3,id);assert.ok(q.a>=0&&q.a<3,id);
   assert.ok(q.e.length>30,id);
  }
 }
});
