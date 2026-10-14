(() => {
 'use strict';
 const d=document,data=JSON.parse(d.getElementById('site-data').textContent).studio,$=id=>d.getElementById(id);
 const nf=new Intl.NumberFormat(d.documentElement.lang,{maximumFractionDigits:1,minimumFractionDigits:1});
 const money=new Intl.NumberFormat(d.documentElement.lang,{style:'currency',currency:'EUR'});
 let profile=0,approved=false,reviewed=false;
 const defaults=[[0,1,3],[1,2,3],[3,4,5]],checks=[...d.querySelectorAll('[data-studio-need]')],ranges=['volume','manual','share','review'];
 const selected=()=>checks.filter(c=>c.checked).map(c=>Number(c.dataset.studioNeed));
 function estimate(){
  const values=ranges.map(k=>Number($('estimate-'+k).value));
  const [volume,manual,share,review]=values,hours=Math.max(0,volume*(manual*share/100-review)/60);
  ranges.forEach((k,i)=>{$('estimate-'+k+'-value').textContent=String(values[i])+(k==='share'?' %':'');});
  $('estimate-hours').textContent=nf.format(hours);$('estimate-status').textContent=hours>0?data.positive:data.zero;
  return {volume,manual,share,review,hours};
 }
 function draw(){
  const chosen=selected();
  $('studio-profile-name').textContent=data.profiles[profile];$('system-pain').textContent=data.pains[profile];
  d.querySelectorAll('[data-flow-item]').forEach(el=>{el.textContent=data.flowitems[profile][Number(el.dataset.flowItem)];});
  d.querySelectorAll('[data-studio-profile]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.studioProfile)===profile)));
  const fragments=chosen.map(i=>{const article=d.createElement('div'),label=d.createElement('strong'),note=d.createElement('span');article.className='architecture-module';label.textContent=data.modules[i];note.textContent=data.modulecopy[i];article.append(label,note);return article;});
  if(!chosen.length){const p=d.createElement('p');p.textContent=data.empty;fragments.push(p);}
  $('studio-architecture').replaceChildren(...fragments);
  // Recommendations follow the actual selection rather than the original profile.
  const recommendation=chosen.includes(4)?2:chosen.includes(0)?0:1;
  $('studio-recommendation').textContent=chosen.length?data.recommendations[recommendation]:data.empty;
  $('studio-dependency').textContent=chosen.length?data.dependencies[recommendation]:data.empty;
  $('studio-integration').hidden=!chosen.includes(3);$('studio-ai').hidden=!chosen.includes(4);
  $('studio-download').disabled=$('studio-transfer').disabled=!chosen.length;
 }
 d.querySelectorAll('[data-studio-profile]').forEach(button=>button.addEventListener('click',()=>{profile=Number(button.dataset.studioProfile);checks.forEach(c=>{c.checked=defaults[profile].includes(Number(c.dataset.studioNeed));});$('studio-status').textContent='';draw();}));
 checks.forEach(c=>c.addEventListener('change',()=>{$('studio-status').textContent='';draw();}));
 ranges.forEach(k=>$('estimate-'+k).addEventListener('input',estimate));
 $('studio-reset').addEventListener('click',()=>{profile=0;checks.forEach(c=>{c.checked=defaults[0].includes(Number(c.dataset.studioNeed));});[100,12,60,2].forEach((v,i)=>{$('estimate-'+ranges[i]).value=v;});$('studio-status').textContent='';draw();estimate();});
 function brief(){
  const e=estimate(),chosen=selected(),r=chosen.includes(4)?2:chosen.includes(0)?0:1;
  return [data.briefhead,'',data.profile+': '+data.profiles[profile],data.scope+': '+chosen.map(i=>data.modules[i]).join(', '),'',data.recommend+': '+data.recommendations[r],data.validation+': '+data.dependencies[r],chosen.includes(3)?data.integrations:'',chosen.includes(4)?data.aicopy:'','',data.assumptions+':',`${data.volume}: ${e.volume}`,`${data.manual}: ${e.manual}`,`${data.share}: ${e.share}%`,`${data.review}: ${e.review}`,`${data.briefhours}: ${nf.format(e.hours)}`,data.formula].filter(x=>x!==undefined).join('\n');
 }
 $('studio-download').addEventListener('click',()=>{const blob=new Blob([brief()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=d.createElement('a');a.href=url;a.download='novalis-brief-'+d.documentElement.lang+'.txt';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('studio-status').textContent=data.saved;});
 $('studio-transfer').addEventListener('click',()=>{const form=$('contact-form'),field=$('contact-message'),text=brief();$('email-preview').hidden=true;form.hidden=false;field.value=text.slice(0,field.maxLength>0?field.maxLength:1400);const select=$('contact-need'),need=selected().includes(4)?3:selected().includes(0)?0:1;select.selectedIndex=need+1;$('studio-status').textContent=data.transferred;location.hash='contact';$('contact-name').focus({preventScroll:true});});
 const orderInputs=['reference','quantity','price','tax'].map(k=>$('order-'+k));
 function validOrder(){const [ref,q,p,t]=orderInputs.map(el=>el.value);return ref.trim().length>=3&&ref.trim().length<=40&&[q,p,t].every(s=>s.trim()!==''&&Number.isFinite(Number(s)))&&Number.isInteger(Number(q))&&Number(q)>=1&&Number(q)<=100&&Number(p)>=.01&&Number(p)<=10000&&Number(t)>=0&&Number(t)<=100&&orderInputs.every(el=>el.checkValidity());}
 function total(){if(!validOrder()){$('order-total').textContent='—';return;}const q=Number($('order-quantity').value),cents=Math.round(Number($('order-price').value)*100),tax=Number($('order-tax').value);$('order-total').textContent=money.format(Math.round(q*cents*(1+tax/100))/100);}
 function stage(n){d.querySelectorAll('[data-order-step]').forEach(el=>el.setAttribute('aria-current',String(Number(el.dataset.orderStep)===n)));}
 orderInputs.forEach(el=>el.addEventListener('input',()=>{reviewed=false;$('order-approve').disabled=true;$('order-status').textContent=data.draft;stage(0);total();}));
 $('order-check').addEventListener('click',()=>{if(!validOrder()){reviewed=false;$('order-approve').disabled=true;$('order-status').textContent=data.invalid;orderInputs.find(el=>!el.checkValidity()||!el.value.trim())?.focus();return;}reviewed=true;$('order-approve').disabled=false;$('order-status').textContent=data.reviewed;stage(1);total();});
 $('order-approve').addEventListener('click',()=>{if(!reviewed||!validOrder()||approved)return;approved=true;orderInputs.forEach(el=>{el.disabled=true;});$('order-check').hidden=true;$('order-approve').disabled=true;$('order-edit').hidden=false;$('order-status').textContent=data.approved;stage(2);});
 $('order-edit').addEventListener('click',()=>{approved=false;reviewed=false;orderInputs.forEach(el=>{el.disabled=false;});$('order-check').hidden=false;$('order-edit').hidden=true;$('order-approve').disabled=true;$('order-status').textContent=data.edited;stage(0);});
 draw();estimate();total();
})();
