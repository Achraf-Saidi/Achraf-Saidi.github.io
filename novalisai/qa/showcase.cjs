const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.NOVALIS_JSDOM_MODULE||'jsdom');
const root=path.resolve(__dirname,'..'),engine=require('../assets/operations-engine.js');
for(let kind=0;kind<3;kind++){
 let s=engine.initial(kind),r=engine.approve(s);assert.equal(r.changed,false);assert.deepEqual(r.state,s);
 for(const issue of engine.issues(s))s=engine.fix(s,issue);
 r=engine.approve(s);assert(r.changed);assert(r.state.approved);assert.equal(engine.approve(r.state).changed,false);
 if(kind===0){assert.equal(r.state.reserved,8);assert.equal(r.state.available,0);assert.equal(r.state.requested-r.state.reserved,4);}
}
assert.equal(engine.workload([100,12,2,40,3,20]).netHours,260/60);
assert.equal(engine.workload([100,12,20,100,3,0]).netHours,-1100/60);
assert.equal(engine.workload([0,0,0,0,0,60]).netHours,-1);
assert.equal(engine.workload([100,12,12,100,0,0]).netHours,0);
for(const values of [[-1,0,0,0,0,0],[1.5,1,1,1,1,1],[1,1,1,101,1,1],[NaN,1,1,1,1,1]])assert.equal(engine.workload(values),null);
for(const lang of ['fr','en','nl','de']){
 const dom=new JSDOM(fs.readFileSync(path.join(root,lang,'index.html'),'utf8'),{url:`https://www.novalisai.com/${lang}/`,runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.eval(fs.readFileSync(path.join(root,'assets/operations-engine.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'assets/showcase.js'),'utf8'));
 assert.equal(d.querySelectorAll('link[rel="stylesheet"]').length,1);assert.equal(d.querySelectorAll('.solution-card').length,4);assert.equal(d.querySelectorAll('[data-method-phase]').length,8);
 d.getElementById('operation-run').click();assert.equal(d.getElementById('operation-state').dataset.phase,'blocked');assert.equal(d.querySelectorAll('#operation-metrics dd')[4].textContent,'0');
 d.querySelector('[data-fix="0"]').click();d.getElementById('operation-run').click();assert.equal(d.getElementById('operation-state').dataset.phase,'approved');assert(d.getElementById('operation-run').disabled);
 assert.equal(d.querySelectorAll('#operation-metrics dd')[4].textContent,'8');d.getElementById('operation-reset').click();assert.equal(d.querySelectorAll('#operation-metrics dd')[4].textContent,'0');
 for(let n=1;n<3;n++){d.querySelector(`[data-operation="${n}"]`).click();d.getElementById('operation-run').click();assert.equal(d.getElementById('operation-state').dataset.phase,'blocked');while(d.querySelector('[data-fix]'))d.querySelector('[data-fix]').click();d.getElementById('operation-run').click();assert.equal(d.getElementById('operation-state').dataset.phase,'approved');}
 d.querySelector('[data-hero-product="2"]').click();assert.equal(d.getElementById('hero-product-name').textContent,'COPILOT');assert.equal(d.querySelector('[data-hero-picture="2"]').hidden,false);
 d.getElementById('hero-image-view').click();assert(d.getElementById('interface-dialog').open);assert(d.getElementById('interface-image').src.endsWith('concept-copilot.webp'));d.getElementById('image-zoom').click();assert.equal(d.getElementById('interface-image').style.width,'200%');d.querySelector('.image-close').click();assert.equal(d.activeElement.id,'hero-image-view');
 d.getElementById('value-2').value='20';d.getElementById('value-2').dispatchEvent(new w.Event('input'));assert.equal(d.getElementById('value-net').dataset.sign,'negative');
 d.getElementById('value-0').value='';d.getElementById('value-0').dispatchEvent(new w.Event('input'));assert.equal(d.getElementById('value-net').textContent,'—');
 d.getElementById('brief-problem').value='<script>alert(1)</script>';d.getElementById('brief-path').value='2';d.getElementById('brief-transfer').click();assert.equal(d.getElementById('contact-need').selectedIndex,4);assert(d.getElementById('contact-message').value.includes('<script>'));assert.equal(d.getElementById('contact-message').querySelector('script'),null);assert.equal(d.getElementById('contact-budget'),null);
 const payload=JSON.parse(d.getElementById('site-data').textContent);assert(!payload.studio&&!payload.ultimate&&!payload.experience_data);
 dom.window.close();console.log(lang+': workflow guards, image zoom, signed workload and brief verified');
}
console.log('Pure arithmetic boundaries and idempotent operations verified.');
