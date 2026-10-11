const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const {JSDOM}=require(process.env.NOVALIS_JSDOM_MODULE || 'jsdom');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
(async()=>{
 let total=0;
 for(const lang of ['fr','en','nl','de']){
  const html=fs.readFileSync(path.join(root,lang,'index.html'),'utf8');
  const dom=new JSDOM(html,{url:`https://achraf-saidi.github.io/novalisai/${lang}/`,runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async s=>{copied=s;}},configurable:true});
  w.eval(script);
  const ids=[...d.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length);
  assert.equal(d.documentElement.lang,lang);assert.equal(d.querySelectorAll('h1').length,1);
  for(const a of d.querySelectorAll('a[href^="#"]'))assert(d.getElementById(a.hash.slice(1)),a.href);
  assert.equal(d.querySelectorAll('.service-card').length,6);assert.equal(d.querySelectorAll('.showcase-card').length,3);
  for(const a of d.querySelectorAll('a'))assert(!/github\.com/.test(a.href),'Repository links must not appear in portfolio');
  const tabs=[...d.querySelectorAll('[role=tab]')];const panels=[...d.querySelectorAll('[role=tabpanel]')];
  assert.equal(panels.filter(p=>!p.hidden).length,1);
  tabs[1].click();assert.equal(panels[1].hidden,false);assert.equal(panels[0].hidden,true);
  tabs[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(d.activeElement,tabs[2]);assert.equal(panels[2].hidden,false);
  tabs[2].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(d.activeElement,tabs[0]);
  const menu=d.querySelector('.menu-button');menu.click();assert.equal(menu.getAttribute('aria-expanded'),'true');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.getAttribute('aria-expanded'),'false');
  const form=d.getElementById('contact-form');assert(!form.hidden);
  form.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));assert(d.getElementById('email-preview').hidden,'Invalid form must not create a message');
  d.querySelector('[data-need="3"]').click();assert.equal(d.getElementById('contact-need').selectedIndex,4);
  d.getElementById('contact-name').value='Élodie <script>alert(1)</script>';
  d.getElementById('contact-email').value='elodie@example.com';
  d.getElementById('contact-company').value='Atelier & Compagnie';
  d.getElementById('contact-message').value='Bonjour, nous voulons relier nos documents et préparer des rapports.';
  d.getElementById('contact-budget').selectedIndex=2;d.getElementById('contact-timing').selectedIndex=1;
  form.querySelector('[name=consent]').checked=true;
  form.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
  const preview=d.getElementById('email-preview');assert(!preview.hidden);assert(form.hidden);
  const body=d.getElementById('email-body').textContent;
  assert(body.includes('Atelier & Compagnie'));assert(body.includes(d.getElementById('contact-budget').value));assert(body.includes(d.getElementById('contact-timing').value));assert(body.includes('<script>'));assert.equal(d.getElementById('email-body').querySelector('script'),null);
  const mail=new URL(d.getElementById('send-email').href);assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'achraf@novalisai.com');assert.equal(mail.searchParams.get('body'),body);
  d.getElementById('copy-email').click();await Promise.resolve();await Promise.resolve();assert.equal(copied,body);
  d.getElementById('edit-email').click();assert(!form.hidden);assert(preview.hidden);assert.equal(d.getElementById('contact-name').value,'Élodie <script>alert(1)</script>');
  d.querySelector('[data-policy=privacy]').click();assert(d.getElementById('policy-dialog').open);assert(d.getElementById('policy-title').textContent);
  d.querySelector('.dialog-close').click();assert(!d.getElementById('policy-dialog').open);
  for(const el of d.querySelectorAll('[src],link[href]')){
   const url=el.getAttribute(el.hasAttribute('src')?'src':'href');if(!url||/^(https?:|data:|#)/.test(url))continue;
   assert(fs.existsSync(path.resolve(root,lang,url.split('?')[0])),`Missing asset: ${url}`);
  }
  console.log(`${lang.toUpperCase()}: structure, assets, tabs, menu, validation, safe email, copy/edit, policies OK`);total++;dom.window.close();
 }
 console.log(`${total} language editions verified. Visual browser QA is not available in this environment.`);
})().catch(e=>{console.error(e);process.exit(1);});
