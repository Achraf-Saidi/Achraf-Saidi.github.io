import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const curriculum=JSON.parse(fs.readFileSync('curriculum/manifest.json','utf8'));
const refs=JSON.parse(fs.readFileSync('curriculum/references.json','utf8'));
test('new robotics track has prerequisite DAG and grounded sources',()=>{
 const ids=new Set(curriculum.modules.map(m=>m.id)),school=curriculum.schools.find(s=>s.id==='M');
 assert.ok(school);
 assert.equal(school.moduleIds.length,15);
 for(const id of school.moduleIds){
  const m=curriculum.modules.find(x=>x.id===id);
  assert.equal(m.schoolId,'M');
  assert.ok(m.estimatedHours>0 && m.topics.length>=4);
  for(const prerequisite of m.prerequisites)assert.ok(ids.has(prerequisite),id+' missing '+prerequisite);
  for(const reference of m.references)assert.ok(refs.references.some(x=>x.id===reference),id+' reference '+reference);
 }
 assert.equal(curriculum.summary.moduleCount,151);
 assert.equal(curriculum.summary.schoolCount,13);
 assert.ok(refs.references.some(x=>x.id==='modern-robotics'));
});
test('bilingual authored robotics, interactive diagrams, math sanity',()=>{
 for(const lang of ['fr','en']){
  const root='public/academy/'+lang+'/';
  const sandbox={};sandbox.window=sandbox;vm.createContext(sandbox);
  for(let part=1;part<=7;part++)vm.runInContext(fs.readFileSync(root+'content-'+part+'.js','utf8'),sandbox,{timeout:1000});
  const data=sandbox.ACHRAF_DEEP[lang];
  assert.equal(Object.keys(data).length,38);
  for(let i=1;i<=15;i++){
    const m=data['M'+i];
    assert.ok(m,'M'+i);
    assert.ok(m.sections.length>=3,'M'+i);
    assert.ok(m.sections.reduce((x,s)=>x+s[1].length,0)>900,'M'+i);
    assert.ok(m.code.length>70,'M'+i);
    assert.ok(m.exercise&&m.solution,'M'+i);
  }
  const html=fs.readFileSync(root+'index.html','utf8');
  assert.ok(html.includes('151 modules'));
  const raw=html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.equal(JSON.parse(raw[1]).modules.length,151);
  const svg=fs.readFileSync(root+'visuals.js','utf8');
  new vm.Script(svg);assert.ok(svg.includes('M3:'));assert.ok(svg.includes('M8:'));
  const hub=fs.readFileSync('public/robotics/'+lang+'/index.html','utf8');
  assert.ok(hub.includes('<svg'));assert.ok(hub.includes('academy/'+lang+'/?id=M15'));
 }
 const l1=1,l2=.5,q1=Math.PI/6,q2=Math.PI/3;
 const x=l1*Math.cos(q1)+l2*Math.cos(q1+q2);
 const y=l1*Math.sin(q1)+l2*Math.sin(q1+q2);
 assert.ok(Math.abs(x-Math.sqrt(3)/2)<1e-12);
 assert.ok(Math.abs(y-1)<1e-12);
 const c=(x*x+y*y-l1*l1-l2*l2)/(2*l1*l2);
 assert.ok(Math.abs(c-Math.cos(q2))<1e-12);
 assert.ok(Math.abs(l1*l2*Math.sin(q2))>0.4);
 const kalmanGain=4/(4+1),mean=10+kalmanGain*(12-10);
 assert.ok(Math.abs(mean-11.6)<1e-12);
});
