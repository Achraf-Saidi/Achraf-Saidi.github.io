(() => {
 'use strict';
 document.documentElement.classList.add('js');
 const data=JSON.parse(document.getElementById('site-data').textContent);
 const menu=document.querySelector('.menu-button');
 const nav=document.getElementById('mobile-nav');
 const setMenu=open=>{
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?data.close:data.menu);
  nav.classList.toggle('open',open);
 };
 menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}});
 window.matchMedia('(min-width: 801px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});
 const language=document.getElementById('language');
 language.addEventListener('change',()=>{
  const option=language.selectedOptions[0];
  if(option?.dataset.url)window.location.assign(option.dataset.url+window.location.hash);
 });
 document.querySelectorAll('.footer-languages a').forEach(a=>a.addEventListener('click',()=>{a.hash=window.location.hash;}));
 const tabs=[...document.querySelectorAll('.demo-tabs [role=tab]')];
 const panels=[...document.querySelectorAll('.demo-panel')];
 const activate=(index,focus=false)=>{
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(index===i));tab.tabIndex=index===i?0:-1;panels[i].hidden=index!==i;});
  if(focus)tabs[index].focus();
 };
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activate(index));
  tab.addEventListener('keydown',e=>{
   const next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];
   if(next!==undefined){e.preventDefault();activate(next,true);}
  });
 });
 activate(0);
 const form=document.getElementById('contact-form');
 const preview=document.getElementById('email-preview');
 const emailBody=document.getElementById('email-body');
 const send=document.getElementById('send-email');
 const status=document.getElementById('copy-status');
 document.querySelectorAll('[data-need]').forEach(a=>a.addEventListener('click',()=>{
  const select=document.getElementById('contact-need');const option=select.options[Number(a.dataset.need)+1];
  if(option)select.value=option.value;
  preview.hidden=true;form.hidden=false;
 }));
 form.addEventListener('submit',e=>{
  e.preventDefault();if(!form.reportValidity())return;
  const values=new FormData(form);const get=k=>String(values.get(k)||'').trim();
  const labels=data.mail_labels;
  const parts=[data.mail_greeting,'',`${labels[0]} : ${get('name')}`,`${labels[1]} : ${get('email')}`];
  if(get('company'))parts.push(`${labels[2]} : ${get('company')}`);
  parts.push(`${labels[3]} : ${get('need')}`);
  if(get('budget'))parts.push(`${data.mail_extra[0]} : ${get('budget')}`);
  if(get('timing'))parts.push(`${data.mail_extra[1]} : ${get('timing')}`);
  parts.push('',`${labels[4]} :`,get('message'));
  const body=parts.join('\n');emailBody.textContent=body;
  send.href=`mailto:achraf@novalisai.com?subject=${encodeURIComponent(data.mail_subject+' — '+get('need'))}&body=${encodeURIComponent(body)}`;
  status.textContent='';form.hidden=true;preview.hidden=false;preview.focus();
 });
 form.hidden=false;
 document.getElementById('edit-email').addEventListener('click',()=>{preview.hidden=true;form.hidden=false;document.getElementById('contact-name').focus();});
 document.getElementById('copy-email').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(emailBody.textContent);status.textContent=data.copied;}
  catch{status.textContent=data.copy_error;}
 });
 const dialog=document.getElementById('policy-dialog');let trigger;
 document.querySelectorAll('[data-policy]').forEach(button=>button.addEventListener('click',()=>{
  const policy=data.policies[button.dataset.policy];if(!policy)return;
  document.getElementById('policy-title').textContent=policy.title;
  document.getElementById('policy-body').replaceChildren(...policy.text.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
  trigger=button;dialog.showModal();
 }));
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>trigger?.focus());
 document.querySelectorAll('[data-year]').forEach(el=>{el.textContent=new Date().getFullYear();});
 if('IntersectionObserver' in window){
  const dock=document.querySelector('.mobile-contact');
  const observer=new IntersectionObserver(entries=>{dock.classList.toggle('in-contact',entries[0].isIntersecting);},{threshold:0});
  observer.observe(document.getElementById('contact'));
 }
})();
