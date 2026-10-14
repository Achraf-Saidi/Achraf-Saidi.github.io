const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const {JSDOM}=require(process.env.NOVALIS_JSDOM_MODULE || 'jsdom');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const experience=fs.readFileSync(path.join(root,'assets/experience.js'),'utf8');
(async()=>{
 let total=0;
 for(const lang of ['fr','en','nl','de']){
  const html=fs.readFileSync(path.join(root,lang,'index.html'),'utf8');
  const dom=new JSDOM(html,{url:`https://achraf-saidi.github.io/novalisai/${lang}/`,runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  const motion={matches:false,addEventListener(){}};
  w.matchMedia=q=>q.includes('prefers-reduced-motion')?motion:{matches:false,addEventListener(){}};
  let frameID=0;const frames=new Map();
  w.requestAnimationFrame=cb=>{frames.set(++frameID,cb);return frameID;};
  w.cancelAnimationFrame=id=>frames.delete(id);
  const tick=time=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(time));};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async s=>{copied=s;}},configurable:true});
  w.eval(script);
  const ids=[...d.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length);
  assert.equal(d.documentElement.lang,lang);assert.equal(d.querySelectorAll('h1').length,1);
  for(const a of d.querySelectorAll('a[href^="#"]'))assert(d.getElementById(a.hash.slice(1)),a.href);
  assert.equal(d.querySelectorAll('.service-card').length,6);assert.equal(d.querySelectorAll('.showcase-card').length,0);
  for(const a of d.querySelectorAll('a'))assert(!/github\.com/.test(a.href),'Repository links must not appear in portfolio');
  const menu=d.querySelector('.menu-button');menu.click();assert.equal(menu.getAttribute('aria-expanded'),'true');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.getAttribute('aria-expanded'),'false');
  assert.equal(d.querySelectorAll('.product-slot').length,3);assert.equal(d.querySelectorAll('.product-card').length,0);assert(d.getElementById('saas'));assert(d.querySelector('a[href="#saas"]'));
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
  const mail=new URL(d.getElementById('send-email').href);assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'contact@novalisai.com');assert.equal(mail.searchParams.get('body'),body);
  d.getElementById('copy-email').click();await Promise.resolve();await Promise.resolve();assert.equal(copied,body);
  d.getElementById('edit-email').click();assert(!form.hidden);assert(preview.hidden);assert.equal(d.getElementById('contact-name').value,'Élodie <script>alert(1)</script>');
  d.querySelector('[data-policy=privacy]').click();assert(d.getElementById('policy-dialog').open);assert(d.getElementById('policy-title').textContent);
  d.querySelector('.dialog-close').click();assert(!d.getElementById('policy-dialog').open);
  for(const el of d.querySelectorAll('[src],link[href]')){
   const url=el.getAttribute(el.hasAttribute('src')?'src':'href');if(!url||/^(https?:|data:|#)/.test(url))continue;
   assert(fs.existsSync(path.resolve(root,lang,url.split('?')[0])),`Missing asset: ${url}`);
  }
  console.log(`${lang.toUpperCase()}: empty SaaS catalogue, navigation, safe contact draft and local assets OK`);total++;dom.window.close();
 }
 console.log(`${total} language editions verified. Visual browser QA is not available in this environment.`);
})().catch(e=>{console.error(e);process.exit(1);});
