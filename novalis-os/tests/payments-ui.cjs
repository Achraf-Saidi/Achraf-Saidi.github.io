/* UI contracts run against the real app controller with explicitly simulated APIs. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require(process.env.NOVALIS_JSDOM_MODULE||'jsdom');
const root=path.resolve(__dirname,'..'),wait=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 for(const mode of ['disabled','test','live']){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'web/index.html'),'utf8'),{url:'https://app.novalis.test/os/?role=finance',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.eval(fs.readFileSync(path.join(root,'tests/visual-fixture.js'),'utf8'));const base=w.fetch,calls=[];let status='pending';const id='a'.repeat(32),attempt=()=>({id,invoice_id:'invoice-demo',mode,amount_cents:101000,status,test_only:mode==='test',refunds:[],events:[{status,created_at:'2026-10-14T10:00:00Z',detail:''}]});
  w.fetch=async(url,o={})=>{calls.push([url,o]);let data;
   if(url.endsWith('/payment-methods')&&mode!=='disabled')data={items:[{id:'bancontact',description:'Bancontact'}],configuration:{mode,message:'test',enabled:true}};
   else if(url.endsWith('/checkout')){const b=JSON.parse(o.body);assert.deepEqual(b,{method:'bancontact'});assert.equal(o.headers['X-CSRF-Token'],'visual-review-only');data={attempt:{...attempt(),checkout_url:null}};}
   else if(url.startsWith('/api/payment-attempts/')){if(url.endsWith('/reconcile')){assert.equal(o.method,'POST');status='paid';}data={attempt:attempt()};}
   if(data)return {ok:true,status:200,json:async()=>data};return base(url,o);
  };
  w.eval(fs.readFileSync(path.join(root,'web/app.js'),'utf8'));await wait();await wait();await wait();
  d.querySelector('[data-invoice]').click();await wait();await wait();assert(d.getElementById('dialog-content').textContent.includes('Référence fictive'));
  d.getElementById('invoice-online-actions').querySelector('button').click();await wait();await wait();
  if(mode==='disabled'){assert(d.getElementById('dialog-content').textContent.includes('Aucun encaissement en ligne actif'));assert(!d.getElementById('operation-form'));}
  else {const form=d.getElementById('operation-form');form.elements.confirm.checked=true;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();await wait();await wait();assert.equal(d.querySelector('[data-payment-state]').dataset.paymentState,'pending');assert(d.getElementById('dialog-content').textContent.includes(mode==='test'?'facture réelle reste inchangée':'retour navigateur seul'));d.getElementById('payment-actions').querySelector('button').click();await wait();await wait();assert.equal(d.querySelector('[data-payment-state]').dataset.paymentState,'paid');}
  if(d.getElementById('dialog').open)d.getElementById('dialog').close();d.getElementById('view-actions').querySelector('button').click();await wait();await wait();
  const form=d.getElementById('invoice-draft-form');assert(form);form.elements.due_date.value='2026-11-01';let line=d.querySelector('.invoice-draft-line');line.querySelector('[data-line-field="description"]').value='Prestation 1';line.querySelector('[data-line-field="unit"]').value='100';line.dispatchEvent(new w.Event('input',{bubbles:true}));assert(d.getElementById('invoice-draft-total').textContent.includes('121'));
  d.getElementById('invoice-add-line').click();assert.equal(d.querySelectorAll('.invoice-draft-line').length,2);line=d.querySelectorAll('.invoice-draft-line')[1];line.querySelector('[data-line-field="description"]').value='Prestation 2';line.querySelector('[data-line-field="unit"]').value='200';line.querySelector('[data-line-field="vat"]').value='0';line.dispatchEvent(new w.Event('input',{bubbles:true}));assert(d.getElementById('invoice-draft-total').textContent.includes('321'));
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();await wait();const posted=calls.find(([url,o])=>url==='/api/projects/project-demo/invoices'&&o.method==='POST');assert(posted);assert.equal(JSON.parse(posted[1].body).lines.length,2);assert.equal(JSON.parse(posted[1].body).lines[0].unit_cents,10000);
  console.log(mode+': payment availability, status verification and multiline invoice UI verified');dom.window.close();
 }
})().catch(e=>{console.error(e);process.exit(1);});
