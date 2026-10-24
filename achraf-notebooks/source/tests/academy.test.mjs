import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const root=path.resolve('public/academy');
for(const lang of ['fr','en']){
test('Academy '+lang+' has 136 distinct modules and 23 authored expansions',()=>{
 const html=fs.readFileSync(path.join(root,lang,'index.html'),'utf8');
 const raw=html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(raw,'Embedded manifest missing');
 const m=JSON.parse(raw[1]);
 assert.equal(m.modules.length,136);
 assert.equal(new Set(m.modules.map(x=>x.id)).size,136);
 const ids=new Set(m.modules.map(x=>x.id));
 for(const module of m.modules){
  assert.ok(module.title.fr&&module.title.en);
  assert.ok(module.topics.length>0,module.id);
  for(const pre of module.prerequisites)assert.ok(ids.has(pre),module.id+': '+pre);
 }
 const env={};env.window=env;
 vm.createContext(env);
 for(let part=1;part<=3;part++){
  const s=fs.readFileSync(path.join(root,lang,'content-'+part+'.js'),'utf8');
  vm.runInContext(s,env,{timeout:1000});
 }
 const d=env.ACHRAF_DEEP[lang];
 assert.equal(Object.keys(d).length,23);
 for(const [id,c] of Object.entries(d)){
  assert.ok(ids.has(id),id);
  assert.ok(c.sections.length>=3,id);
  assert.ok(c.sections.every(s=>s[0].length>10 && s[1].length>250),id);
  assert.ok(c.code.length>70 && c.exercise.length>30 && c.solution.length>30,id);
 }
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
 assert.match(html,/achraf-academy-completed-v1/);
 assert.match(html,/id="notes"/);
});
}
