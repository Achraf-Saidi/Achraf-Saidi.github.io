(() => {
 'use strict';
 const data=JSON.parse(document.getElementById('site-data').textContent),v=data.v2;
 let role=0;const states=v.roles.map(()=>0);
 function drawRole(){
  document.getElementById('lab-role-title').textContent=v.role_title[role];
  document.getElementById('lab-role-copy').textContent=v.role_copy[role];
  document.getElementById('lab-current-role').textContent=v.roles[role];
  document.querySelectorAll('[data-lab-role]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===role)));
  document.getElementById('lab-role-items').replaceChildren(...v.role_items[role].map((text,i)=>{
   const li=document.createElement('li'),span=document.createElement('span');span.setAttribute('aria-hidden','true');
   span.textContent=i<states[role]?'✓':'↗';li.append(span,document.createTextNode(text));li.dataset.done=String(i<states[role]);return li;
  }));
  const button=document.getElementById('lab-role-action');button.disabled=states[role]>=3;
  document.getElementById('lab-role-status').textContent=states[role]?v.role_done+' · '+states[role]+'/3':'';
 }
 document.querySelectorAll('[data-lab-role]').forEach((b,i)=>b.addEventListener('click',()=>{role=i;drawRole();}));
 document.getElementById('lab-role-action').addEventListener('click',()=>{states[role]=Math.min(3,states[role]+1);drawRole();});
 const tabs=[document.getElementById('lab-tab-access'),document.getElementById('lab-tab-calc')];
 function selectTab(index){tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;document.getElementById(b.getAttribute('aria-controls')).hidden=i!==index;});}
 tabs.forEach((b,i)=>{b.addEventListener('click',()=>selectTab(i));b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?1:1-i;selectTab(n);tabs[n].focus();}});});
 const sliders=['volume','duration','share'].map(k=>document.getElementById('lab-'+k));
 function calculate(){
  const [volume,duration,share]=sliders.map(s=>Number(s.value));
  sliders.forEach(s=>{document.getElementById(s.id+'-output').textContent=s.value+(s.id==='lab-share'?' %':'');});
  document.getElementById('lab-hours').textContent=new Intl.NumberFormat(document.documentElement.lang,{maximumFractionDigits:1,minimumFractionDigits:1}).format(volume*duration*share/100/60);
  document.getElementById('lab-gauge-value').setAttribute('width',String(220*share/100));
 }
 sliders.forEach(s=>s.addEventListener('input',calculate));calculate();
 document.querySelectorAll('[data-team-pole]').forEach((b,i)=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-team-pole]').forEach((button,n)=>button.setAttribute('aria-pressed',String(n===i)));
  document.getElementById('team-pole-detail').textContent=v.team_details[i];
 }));
 const form=document.getElementById('contact-form'),labels=v.api_labels;
 fetch(data.runtime_config,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(config=>{
  if(config?.portal_url){const u=new URL(config.portal_url);if(u.protocol==='https:'&&!u.username&&!u.password)document.querySelectorAll('[data-portal-link]').forEach(a=>{a.href=u.href;});}
  if(!config?.api_origin)return;
  const url=new URL(config.api_origin);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/')return;
  const api=url.origin;
  const slotField=document.createElement('div');slotField.className='field';
  const label=document.createElement('label');label.htmlFor='booking-slot';label.textContent=labels.slots;
  const select=document.createElement('select');select.id='booking-slot';select.name='slot_id';
  const initial=document.createElement('option');initial.value='';initial.textContent='—';select.append(initial);slotField.append(label,select);
  form.querySelector('.consent').before(slotField);
  fetch(api+'/api/public/slots',{credentials:'omit'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{
   if(!d.items.length){const p=document.createElement('p');p.className='form-note';p.textContent=labels.no_slots;slotField.append(p);select.hidden=true;return;}
   d.items.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=new Intl.DateTimeFormat(document.documentElement.lang,{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Brussels'}).format(new Date(s.starts_at))+' · Europe/Brussels';select.append(o);});
  }).catch(()=>{slotField.hidden=true;});
  const status=document.createElement('p');status.className='form-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.append(status);
  const submit=form.querySelector('[type=submit]');submit.textContent=labels.send;form.dataset.server='ready';
  form.addEventListener('submit',async e=>{
   e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity()||submit.disabled)return;
   const f=new FormData(form);const get=k=>String(f.get(k)||'').trim();
   const body={name:get('name'),email:get('email'),company:get('company'),category:get('need'),description:get('message'),budget:get('budget'),horizon:get('timing'),consent:f.get('consent')==='on',website:get('website')};
   const slot=get('slot_id');if(slot)body.slot_id=slot;
   submit.disabled=true;submit.textContent=labels.sending;status.textContent='';
   try{
    const response=await fetch(api+(slot?'/api/public/bookings':'/api/public/contact'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(body)});
    if(!response.ok)throw new Error();const accepted=await response.json();
    if(!accepted.id)throw new Error();
    status.textContent=slot?labels.reserved+' '+new Intl.DateTimeFormat(document.documentElement.lang,{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Brussels'}).format(new Date(accepted.starts_at)):labels.received;
    form.reset();if(slot){[...select.options].find(option=>option.value===slot)?.remove();}
   }catch{status.textContent=labels.failed;}
   finally{submit.disabled=false;submit.textContent=labels.send;}
  },true);
 }).catch(()=>{});
})();
