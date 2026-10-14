const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.NOVALIS_JSDOM_MODULE||'jsdom');
const root=path.resolve(__dirname,'..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);
const wait=()=>new Promise(resolve=>setTimeout(resolve,0));
(async()=>{
 let pages=0;
 for(const language of ['fr','en','nl','de']){
  const dom=new JSDOM(fs.readFileSync(path.join(root,language,'index.html'),'utf8'),{url:`https://achraf-saidi.github.io/novalisai/${language}/`,runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.fetch=async()=>({ok:true,json:async()=>({api_origin:null,portal_url:null})});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.eval(fs.readFileSync(path.join(root,'assets/app.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'assets/v2.js'),'utf8'));
  await wait();
  assert.equal(d.querySelector('a[href="https://www.cal.eu/novalisai/30min"]').textContent.includes('30'),true);
  for(const file of walk(path.join(root,language)).filter(file=>file.endsWith('index.html'))){
   const page=new JSDOM(fs.readFileSync(file,'utf8'));
   const doc=page.window.document;if(doc.querySelector('meta[http-equiv="refresh"]')){page.window.close();continue;}assert.equal(doc.querySelectorAll('h1').length,1);assert.equal(doc.documentElement.lang,language);assert(!doc.documentElement.outerHTML.includes('{{'));
   for(const node of doc.querySelectorAll('a[href],link[href],img[src],script[src]')){
    const v=node.getAttribute(node.hasAttribute('src')?'src':'href');if(/^(https?:|mailto:|#)/.test(v))continue;
    const resolved=path.resolve(path.dirname(file),v.split('#')[0].split('?')[0]);assert(fs.existsSync(resolved),`Broken link: ${file} => ${v}`);
   }
   pages++;page.window.close();
  }
  dom.window.close();
 }
 // Submission succeeds only after an acknowledged backend response; a failure keeps the entered data.
 for(const success of [false,true]){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'fr','index.html'),'utf8'),{url:'https://achraf-saidi.github.io/novalisai/fr/',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.fetch=async(url,options)=>{
   if(url.endsWith('runtime-config.json'))return {ok:true,json:async()=>({api_origin:'https://app.novalis.test',portal_url:null})};
   if(url.endsWith('/slots'))return {ok:true,json:async()=>({items:[]})};
   assert(url.endsWith('/contact'));assert.equal(options.credentials,'omit');const body=JSON.parse(options.body);assert.equal(body.consent,true);
   return {ok:success,json:async()=>({id:'accepted-test-id',received:true})};
  };
  w.eval(fs.readFileSync(path.join(root,'assets/app.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'assets/v2.js'),'utf8'));await wait();await wait();
  d.getElementById('contact-name').value='Test';d.getElementById('contact-email').value='test@example.test';d.getElementById('contact-need').selectedIndex=1;d.getElementById('contact-message').value='Un projet professionnel à étudier.';d.querySelector('[name=consent]').checked=true;
  d.getElementById('contact-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();await wait();
  assert(d.getElementById('email-preview').hidden);
  assert.equal(d.getElementById('contact-name').value,success?'':'Test');
  assert.equal(d.querySelector('.form-status').textContent.includes(success?'enregistrée':'n’a pas été enregistrée'),true);
  dom.window.close();
 }
 console.log(`${pages} editorial pages: links, languages, headings and assets verified. Team selectors and acknowledged contact submission verified (DOM, not visual browser QA).`);
})().catch(e=>{console.error(e);process.exit(1);});
