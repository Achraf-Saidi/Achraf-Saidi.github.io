const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const domain=fs.readFileSync(path.join(root,'domain.mjs'),'utf8').replace(/export /g,'');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/^import .*\n/,'');
function launch(saved){const dom=new JSDOM(html,{url:'https://example.test/tamara/',runScripts:'outside-only'});const w=dom.window;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>true;if(saved)w.localStorage.setItem('tamara-demo-v1',saved);w.eval(domain+'\n'+app);return dom;}
const dom=launch(),w=dom.window,d=w.document;const wait=()=>new Promise(r=>setTimeout(r,15));
const route=async p=>{w.location.hash='/'+p;await wait();assert(!d.querySelector('#main').textContent.includes('Un problème est survenu.'));};
(async()=>{
assert(d.querySelector('.hero'));await route('collection');assert.equal(d.querySelectorAll('.product').length,4);
await route('article/aurore');d.querySelector('[data-add]').click();assert.equal(d.querySelector('#count').textContent,'1');
await route('panier');assert(d.querySelector('.cart-line'));await route('commande');
const form=d.querySelector('#checkout');for(const [key,value] of Object.entries({name:'Lina <script>test</script>',phone:'0555000000',wilaya:'Alger',commune:'Test',address:'Adresse fictive'}))form.elements[key].value=value;
form.elements.consent.checked=true;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
assert(d.querySelector('.reference'));assert.equal(d.querySelector('#main script'),null);const reference=d.querySelector('.reference').textContent;
await route('studio/orders/'+reference);const update=d.querySelector('#orderUpdate');const submit=update.querySelector('button[value="Confirmée"]');update.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:submit}));assert(d.querySelector('.status').textContent==='Confirmée');
await route('suivi');d.querySelector('#reference').value=reference;d.querySelector('#mobile').value='+213555000000';d.querySelector('#tracking').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(d.querySelector('.status').textContent,'Confirmée');
await route('studio/products/new');d.querySelector('#pname').value='Nouvel article';d.querySelector('#pprice').value=3000;d.querySelector('#addVariant').click();d.querySelector('[data-v="size"]').value='M';d.querySelector('[data-v="color"]').value='Bleu';d.querySelector('[data-v="stock"]').value=5;d.querySelector('[name="active"]').checked=true;d.querySelector('#productForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert(d.querySelector('#main').textContent.includes('Nouvel article'));await route('collection');assert.equal(d.querySelectorAll('.product').length,5);
for(const p of ['','favoris','aide','studio','studio/orders','studio/products','studio/customers','studio/settings'])await route(p);
const saved=w.localStorage.getItem('tamara-demo-v1');const restored=launch(saved);restored.window.location.hash='/suivi';await wait();const rd=restored.window.document;rd.querySelector('#reference').value=reference;rd.querySelector('#mobile').value='0555000000';rd.querySelector('#tracking').dispatchEvent(new restored.window.Event('submit',{bubbles:true,cancelable:true}));assert(rd.querySelector('.reference').textContent===reference);
console.log('UI: collection, cart, checkout, escaped customer input, manager status, tracking, product creation, 9 routes and persisted reload passed.');restored.window.close();w.close();
})().catch(err=>{console.error(err);w.close();process.exitCode=1;});
