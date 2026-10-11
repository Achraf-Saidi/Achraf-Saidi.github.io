(() => {
 'use strict';
 const data=JSON.parse(document.getElementById('site-data').textContent);
 const app=document.getElementById('live-app');
 const modules=[...document.querySelectorAll('[data-module]')];
 const scenarios=[...document.querySelectorAll('[data-experience]')];
 const requestHost=document.getElementById('experience-requests');
 const create=document.getElementById('experience-create');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let selected=0,sequence=0;
 const states=data.experience_data.map(s=>({requests:s.items.map((name,i)=>({id:i,name,approved:false})),next:s.items.length}));
 const current=()=>states[selected];
 const pulse=element=>{if(element.animate&&!reduced.matches)element.animate([{opacity:.15,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});};
 const render=(notify=false)=>{
  const s=data.experience_data[selected],state=current(),management=modules[0].checked,automation=modules[1].checked,assistant=modules[2].checked;
  app.dataset.automation=String(automation);app.dataset.assistant=String(assistant);
  document.getElementById('experience-name').textContent=s.name;
  document.getElementById('experience-category').textContent=s.category;
  document.getElementById('experience-app-title').textContent=s.title;
  document.getElementById('experience-pending').textContent=String(state.requests.filter(r=>!r.approved).length);
  document.getElementById('experience-approved').textContent=String(state.requests.filter(r=>r.approved).length);
  document.getElementById('experience-metrics').hidden=!management;
  document.getElementById('experience-workspace').hidden=!management;
  document.getElementById('experience-no-management').hidden=management;
  document.getElementById('experience-assistant').hidden=!assistant;
  document.getElementById('experience-suggestion').textContent=state.requests.some(r=>!r.approved)?s.suggestion:data.experience_actions[4];
  create.disabled=!management||state.requests.length>=8;
  requestHost.replaceChildren(...state.requests.map(r=>{
   const row=document.createElement('div');row.className='app-request';row.dataset.approved=String(r.approved);
   const symbol=document.createElement('span');symbol.className='request-symbol';symbol.setAttribute('aria-hidden','true');symbol.textContent=r.approved?'✓':'↗';
   const copy=document.createElement('div');copy.className='request-copy';
   const name=document.createElement('strong');name.textContent=r.name;copy.append(name);
   if(automation){const small=document.createElement('small');small.textContent=r.approved?s.auto:data.experience_labels[7];copy.append(small);}
   const button=document.createElement('button');button.type='button';button.className='request-approve';button.disabled=r.approved;button.textContent=r.approved?'✓':data.experience_actions[1];button.setAttribute('aria-label',(r.approved?data.experience_actions[2]:data.experience_actions[1])+' — '+r.name);
   button.addEventListener('click',()=>{if(r.approved)return;r.approved=true;render(true);});
   row.append(symbol,copy,button);return row;
  }));
  if(notify)document.getElementById('experience-module-status').textContent=data.experience_modules.filter((_,i)=>modules[i].checked).join(' · ')||data.experience_labels[9];
 };
 scenarios.forEach((button,i)=>button.addEventListener('click',()=>{
  if(selected===i)return;selected=i;
  scenarios.forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));render(true);pulse(app);
 }));
 modules.forEach(input=>input.addEventListener('change',()=>{render(true);pulse(app);}));
 create.addEventListener('click',()=>{
  if(!modules[0].checked||current().requests.length>=8)return;
  const state=current();state.requests.push({id:state.next++,name:data.experience_data[selected].new_item+' · '+String(++sequence).padStart(2,'0'),approved:false});render(true);pulse(requestHost.lastElementChild);
 });
 render();
 document.querySelectorAll('[data-product-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.productFilter;
  document.querySelectorAll('[data-product-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  let count=0;document.querySelectorAll('[data-product-status]').forEach(card=>{card.hidden=filter!=='all'&&!(filter==='building'?['building','planned'].includes(card.dataset.productStatus):card.dataset.productStatus===filter);if(!card.hidden)count++;});
  const empty=document.getElementById('product-no-match');if(empty)empty.hidden=count>0;
 }));
})();
