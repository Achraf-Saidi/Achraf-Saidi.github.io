const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.NOVALIS_JSDOM_MODULE||'jsdom');
const root=path.resolve(__dirname,'..'),L=require('../assets/lab-engine.js');
assert.equal(L.predict([],0,0).label,null);
assert.equal(L.predict([{x:0,y:0,label:1},{x:.2,y:0,label:0}],0,0).label,1);
assert.equal(L.predict([{x:-.1,y:0,label:0},{x:.1,y:0,label:1}],0,0,3).label,0);
assert.throws(()=>L.predict([],NaN,0));assert.throws(()=>L.neighbors([],0,0,16));
for(const kind of ['circles','xor','moons','spirals']){
 const a=L.sample(kind,1042,12),b=L.sample(kind,890123,128);
 assert.deepEqual(a,L.sample(kind,1042,12));assert(!a.some(p=>b.some(q=>p.x===q.x&&p.y===q.y)));
 const score=L.evaluate(a,b,3);assert.equal(score.total,128);assert.equal(score.accuracy,score.correct/128);
}
const items=[{cost:4,value:7},{cost:3,value:7},{cost:3,value:9},{cost:5,value:8},{cost:2,value:5},{cost:2,value:6}];
assert.deepEqual(L.optimize(items,0).best,{cost:0,value:0,selected:[]});
for(let cap=0;cap<=20;cap++){
 const r=L.optimize(items,cap);assert(r.best.cost<=cap);assert(r.best.value>=r.baseline.value);
 for(let mask=0;mask<64;mask++){let cost=0,value=0;items.forEach((v,i)=>{if(mask&(1<<i)){cost+=v.cost;value+=v.value;}});if(cost<=cap)assert(value<=r.best.value);}
}
assert.throws(()=>L.optimize(items,2.5));assert.equal(L.extractDocument('Quantité: 2.5').total,null);
assert.equal(L.extractDocument('Référence: DEMO\nFournisseur: Atelier\nQuantité: 2\nPrix unitaire: 125,00\nTVA: 21').total,302.5);
for(const lang of ['fr','en','nl','de']){
 const dom=new JSDOM(fs.readFileSync(path.join(root,lang,'index.html'),'utf8'),{url:`https://www.novalisai.com/${lang}/`,runScripts:'outside-only'}),w=dom.window,d=w.document,$=id=>d.getElementById(id);
 w.HTMLCanvasElement.prototype.getContext=()=>null;
 w.eval(fs.readFileSync(path.join(root,'assets/lab-engine.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'assets/ultimate.js'),'utf8'));
 const t=JSON.parse($('site-data').textContent).ultimate;
 assert.equal(Number($('play-score').textContent),Math.round(L.evaluate(L.sample('circles',1042,12),L.sample('circles',890123,128),3).accuracy*100));
 $('play-hint').click();assert.equal($('play-examples').textContent,'13');$('play-undo').click();assert.equal($('play-examples').textContent,'12');
 $('play-canvas').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));assert.equal($('play-examples').textContent,'13');$('play-reset').click();assert.equal($('play-examples').textContent,'12');
 $('play-dataset').value='spirals';$('play-dataset').dispatchEvent(new w.Event('change'));assert.equal($('play-target').textContent,'80 %');
 $('play-tab-0').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight'}));assert.equal($('play-tab-1').getAttribute('aria-selected'),'true');assert($('play-panel-0').hidden);assert(!$('play-panel-1').hidden);
 $('opt-capacity').value=0;$('opt-capacity').dispatchEvent(new w.Event('input'));assert.equal($('opt-best').textContent,'0');
 $('play-tab-2').click();$('doc-analyze').click();assert(!$('doc-approve').disabled);assert.equal($('doc-total').textContent,new Intl.NumberFormat(lang,{style:'currency',currency:'EUR'}).format(326.7));
 $('doc-approve').click();assert.equal($('doc-status').textContent,t.doc_validated);
 $('doc-input').value='Reference: DEMO\nSupplier: <img src=x>\nQuantity: 2\nUnit price: 10\nVAT: 21';$('doc-input').dispatchEvent(new w.Event('input'));assert($('doc-approve').disabled);$('doc-analyze').click();assert.equal($('doc-fields').querySelector('img'),null);
 $('doc-input').value='Quantity: 2.5';$('doc-analyze').click();assert($('doc-approve').disabled);
 d.querySelector('[data-method-phase="7"]').click();assert.equal($('method-deliverable').textContent,t.method_deliverables[7]);
 d.querySelector('[data-crew-stage="4"]').click();assert.equal($('crew-handoff').textContent,t.crew_handoffs[4]);
 d.querySelector('[data-graph-node="6"]').click();assert.equal($('graph-description').textContent,t.graph_descriptions[6]);
 d.querySelector('[data-studio-profile="2"]').click();assert.equal(d.querySelector('[data-graph-label="2"]').textContent,t.graph_scenarios[2][2]);
 assert.equal(d.querySelectorAll('.crew-count')[0].textContent,'05');assert.equal(d.querySelectorAll('.crew-count')[1].textContent,'06');
 assert.equal(new Set([...d.querySelectorAll('[id]')].map(el=>el.id)).size,d.querySelectorAll('[id]').length);
 console.log(`${lang}: independent test-set metrics, add/undo/reset, keyboard tabs, exact optimizer, safe extraction, stale approval, method and crew checked.`);dom.window.close();
}
console.log('Deterministic algorithm boundaries and optimality checked. No training/API cost and no fabricated metrics.');
