/* DOM tests of role-specific navigation and real API contracts. No visual claims. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {JSDOM}=require(process.env.NOVALIS_JSDOM_MODULE||'jsdom');
const root=path.resolve(__dirname,'..'),wait=()=>new Promise(resolve=>setTimeout(resolve,0));
const script=fs.readFileSync(path.join(root,'web/app.js'),'utf8');
(async()=>{
 for(const role of ['manager','account','developer','client','finance','sysadmin']){
  const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
  const dom=new JSDOM(html,{url:'https://app.novalis.test/os/',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const user={id:role,role,name:'Test <script>role</script>',email:'test@example.test'},calls=[];
  const p={id:'p1',name:'Test <img onerror="alert(1)">',scope:'Une specification',due_date:'2026-12-01',status:'active',account_id:'account',client_id:'c1',account_name:'Coordinateur',progress:0,version:1};
  const task={id:'t1',project_id:'p1',project_name:'Projet',name:'Module',description:'Specification',estimate_minutes:60,remaining_minutes:60,due_date:'2026-12-01',status:'in_progress',assignee_id:role,version:1};
  w.fetch=async(url,options={})=>{
   calls.push([url,options.method||'GET',options.body]);
   let value;
   if(url==='/api/session')value={user,csrf:'test-csrf',mfa_required:false};
   else if(url==='/api/dashboard')value={stats:{active_projects:1},projects:[p],alerts:[],notifications:[]};
   else if(url==='/api/projects')value={items:[p]};
   else if(url==='/api/projects/p1')value={project:p,tasks:role==='client'?[]:[task],milestones:[{id:'m1',name:'Premier jalon',description:'Resultat',due_date:'2026-12-01',status:'planned',version:1}],messages:[],documents:[],requests:[],team:role==='client'?[]:[{id:role,name:'Test',role}]};
   else if(url==='/api/tasks')value={items:[task]};
   else if(url==='/api/tasks/t1'&&options.method==='PATCH'){
    const body=JSON.parse(options.body);assert.equal(body.version,1);assert.equal(body.status,'review');assert.equal(options.headers['X-CSRF-Token'],'test-csrf');task.status='review';task.version++;value={ok:true};
   }
   else if(url==='/api/finance')value={totals:{invoiced_cents:0,paid_cents:0,receivable_cents:0,expenses_cents:0},invoices:[],expenses:[]};
   else if(url==='/api/users')value={items:[{...user,status:'active'}]};
   else if(url==='/api/integrations')value={email:'not_configured',outbox:[]};
   else if(url.endsWith('/invoices')||url.endsWith('/proposals')||url==='/api/time'||url==='/api/calendar'||url==='/api/audit'||url==='/api/leads'||url==='/api/clients')value={items:[],stages:[]};
   else throw new Error('Unexpected endpoint '+url);
   return {ok:true,json:async()=>value};
  };
  w.eval(script);await wait();await wait();await wait();
  assert(d.getElementById('auth-screen').hidden);assert(!d.getElementById('app-shell').hidden);assert.equal(d.querySelectorAll('#user-name script').length,0);
  assert.equal(new Set([...d.querySelectorAll('[id]')].map(e=>e.id)).size,d.querySelectorAll('[id]').length);
  if(['developer','client','account','sysadmin'].includes(role))assert(!d.querySelector('[data-view="finance"]'));
  if(['manager','account','developer','client'].includes(role)){
   d.querySelector('[data-open-project]').click();await wait();await wait();
   assert(d.getElementById('view-title').textContent.includes('<img'));assert.equal(d.querySelectorAll('#workspace img').length,0);
   if(role==='client'){assert(!d.querySelector('[data-tab="tasks"]'));assert(d.querySelector('[data-tab="messages"]'));}
   if(role==='developer'){
    d.querySelector('[data-tab="tasks"]').click();await wait();
    assert(!d.querySelector('[data-status="approved"]'));
    d.querySelector('[data-status="review"]').click();assert(d.getElementById('dialog').open);
    const form=d.getElementById('operation-form');assert.equal(form.elements.remaining_minutes.value,'0');
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();await wait();await wait();
    assert.equal(task.status,'review');assert(!d.getElementById('dialog').open);
   }
  }
  d.getElementById('menu-toggle').click();assert.equal(d.getElementById('menu-toggle').getAttribute('aria-expanded'),'true');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(d.getElementById('menu-toggle').getAttribute('aria-expanded'),'false');
  if(!['manager','finance'].includes(role))assert(!calls.some(([url])=>url==='/api/finance'));
  console.log(`${role}: authorised navigation, API loading, escaped data and interactions OK`);dom.window.close();
 }
})().catch(error=>{console.error(error);process.exit(1);});
