(()=>{
'use strict';
const $=id=>document.getElementById(id);
const STORE='achraf-rayan-finances-aes-gcm-v1';
const AAD=new TextEncoder().encode('achraf-rayan-ledger-v1');
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const nShort=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3});
const knownIds=new Set(['sahati','numeria','athar','jetnext']);
let envelope=null,secretKey=null,model=null,unit='centimes',changed=false;
const bytes=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
const base64=arr=>btoa(String.fromCharCode(...arr));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const set=(id,value)=>{$(id).textContent=String(value)};
const properNumber=n=>typeof n==='number' && Number.isFinite(n) && Math.abs(n)<=100000000000000;
const shareValid=n=>n===null || (typeof n==='number' && Number.isFinite(n) && n>=0 && n<=100);
function checkEnvelope(v){return !!v && v.v===1 && v.kdf==='PBKDF2-SHA256' && Number.isInteger(v.iterations) && v.iterations>=250000 && v.iterations<=1000000 && [v.salt,v.iv,v.data].every(x=>typeof x==='string'&&x.length>8);}
function checkModel(m){
  if(!m || m.version!==1 || m.unit!=='centimes' || !Array.isArray(m.projects) || m.projects.length!==4 || !Number.isFinite(m.reserveRate) || m.reserveRate<0 || m.reserveRate>100)throw Error('Format des données financières non reconnu.');
  for(const p of m.projects){if(!knownIds.has(p.id) || typeof p.name!=='string' || p.name.length>80 || !properNumber(p.amount) || !shareValid(p.achraf) || !shareValid(p.rayan) || (p.achraf||0)+(p.rayan||0)>100.000001)throw Error('Données invalides.');}
  if(new Set(m.projects.map(p=>p.id)).size!==4)throw Error('Projet en doublon.');
  if(!Array.isArray(m.future))m.future=[];
  if(m.future.length>100 || !m.future.every(x=>typeof x.name==='string'&&x.name.length<=80&&properNumber(x.amount)&&x.amount>0&&typeof x.id==='string'))throw Error('Enveloppes invalides.');
  return m;
}
async function derive(password,env){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(env.salt),iterations:env.iterations,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function decrypt(env,key){
  const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(env.iv),additionalData:AAD},key,bytes(env.data));
  return checkModel(JSON.parse(new TextDecoder().decode(raw)));
}
async function loadSeed(){const res=await fetch('../assets/finance.enc.json',{cache:'no-store'});if(!res.ok)throw Error('Impossible de charger les données initiales.');const v=await res.json();if(!checkEnvelope(v))throw Error('Format de coffre incorrect.');return v;}
async function currentEnvelope(){
  const local=localStorage.getItem(STORE);
  if(local){const env=JSON.parse(local);if(!checkEnvelope(env))throw Error('La sauvegarde locale est corrompue. Réinitialise-la via le bouton en bas du tableau après une restauration.');return env;}
  return await loadSeed();
}
function money(x,compact=false,alwaysSign=false){
  if(x===null || x===undefined)return '—';
  const num=unit==='dzd'?x/100:x,abs=Math.abs(num),prefix=(num<0?'−':alwaysSign&&num>0?'+':'');
  const suffix=unit==='dzd'?'DZD':'cts';
  if(!compact)return prefix+nf.format(abs)+' '+suffix;
  const threshold=abs>=1e9?1e9:abs>=1e6?1e6:abs>=1e3?1e3:1;
  const scale=threshold===1e9?'Md':threshold===1e6?'M':threshold===1e3?'k':'';
  return prefix+nShort.format(abs/threshold)+' '+(scale?scale+' ':'')+suffix;
}
const signClass=n=>n<0?'money-negative':n>0?'money-positive':'';
function split(){
  let achraf=0,rayan=0,others=0,total=0,complete=0;
  for(const p of model.projects){total+=p.amount;if(p.achraf!==null)achraf+=Math.round(p.amount*p.achraf/100);if(p.rayan!==null)rayan+=Math.round(p.amount*p.rayan/100);if(p.achraf!==null&&p.rayan!==null){others+=p.amount-Math.round(p.amount*p.achraf/100)-Math.round(p.amount*p.rayan/100);complete++;}}
  const reserveA=Math.round(Math.max(0,achraf)*model.reserveRate/100),reserveR=Math.round(Math.max(0,rayan)*model.reserveRate/100);
  return {total,achraf,rayan,others,complete,reserveA,reserveR,reserve:reserveA+reserveR,availableA:achraf-reserveA,availableR:rayan-reserveR};
}
function render(){
  if(!model)return;
  const v=split();
  set('updatedAt',model.updatedAt||'Non datée');
  set('kpiTotal',money(v.total,true,true));set('kpiAchraf',money(v.achraf,true,true));set('kpiRayan',money(v.rayan,true,true));set('kpiReserve',money(v.reserve,true));
  for(const [id,val] of [['kpiTotal',v.total],['kpiAchraf',v.achraf],['kpiRayan',v.rayan]]){$(id).className='metric-value '+signClass(val);}
  const maxAbs=Math.max(...model.projects.map(p=>Math.abs(p.amount)),1);
  $('portfolioBars').innerHTML=model.projects.map(p=>{
    const width=(Math.abs(p.amount)/maxAbs)*50;
    const left=p.amount>=0?50:50-width;
    const kind=p.amount>=0?'positive':'negative';
    return '<div class="portfolio-row"><span class="portfolio-name">'+esc(p.name)+'</span><div class="bar-axis"><div class="midline"></div><span class="barfill '+kind+'" style="left:'+left+'%;width:'+width+'%"></span></div><strong class="portfolio-amount '+kind+'">'+esc(money(p.amount,true,true))+'</strong></div>';
  }).join('');
  $('shareRows').innerHTML=model.projects.map(p=>{
    const a=p.achraf===null?null:Math.round(p.amount*p.achraf/100),r=p.rayan===null?null:Math.round(p.amount*p.rayan/100);
    const other=(a===null||r===null)?null:p.amount-a-r;
    const f=(n)=>n===null?'<span class="placeholder">À préciser</span>':'<span class="'+signClass(n)+'">'+esc(money(n))+'</span>';
    const pr=x=>x===null?'<span class="placeholder">?</span>':esc(nShort.format(x))+' %';
    return '<tr><td>'+esc(p.name)+'</td><td>'+f(p.amount)+'</td><td>'+pr(p.achraf)+'</td><td>'+f(a)+'</td><td>'+pr(p.rayan)+'</td><td>'+f(r)+'</td><td>'+f(other)+'</td><td><button type="button" class="edit-mini" data-edit="'+esc(p.id)+'">Éditer</button></td></tr>';
  }).join('');
  $('shareFooter').innerHTML='<tr><td>Consolidé</td><td>'+esc(money(v.total))+'</td><td>—</td><td>'+esc(money(v.achraf))+'</td><td>—</td><td>'+esc(money(v.rayan))+'</td><td>—</td><td></td></tr>';
  set('rateDisplay',nShort.format(model.reserveRate)+' %');$('reserveSlider').value=model.reserveRate;
  set('reserveAchraf',money(v.reserveA));set('reserveRayan',money(v.reserveR));set('reserveTotal',money(v.reserve));set('availableAchraf',money(v.availableA));set('availableRayan',money(v.availableR));
  const max=Math.max(v.availableA,v.availableR,1);$('splitAchraf').style.width=Math.max(0,v.availableA)/max*100+'%';$('splitRayan').style.width=Math.max(0,v.availableR)/max*100+'%';
  const allocated=model.future.reduce((s,item)=>s+item.amount,0);
  set('unallocated',money(v.reserve-allocated));
  $('unallocated').className=(v.reserve-allocated)<0?'money-negative':'';
  $('envelopeList').innerHTML=model.future.length?model.future.map(x=>'<div class="envelope-item"><strong>'+esc(x.name)+'</strong><span>'+esc(money(x.amount))+'</span><button type="button" title="Supprimer" aria-label="Supprimer '+esc(x.name)+'" data-remove="'+esc(x.id)+'">×</button></div>').join(''):'<div class="empty-note">Aucune enveloppe créée. Ajoute un projet futur pour préparer l’affectation de la réserve simulée.</div>';
}
async function persist(){
  if(!secretKey||!envelope||!model)throw Error('Coffre verrouillé.');
  model.updatedAt=new Date().toISOString().slice(0,10);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD},secretKey,new TextEncoder().encode(JSON.stringify(model))));
  envelope={...envelope,iv:base64(iv),data:base64(ciphertext)};
  localStorage.setItem(STORE,JSON.stringify(envelope));
  changed=false;render();
  set('saveStatus','Enregistré et chiffré sur cet appareil.');
}
$('unlockForm').addEventListener('submit',async ev=>{
  ev.preventDefault();$('unlockError').textContent='';
  if(!window.crypto||!crypto.subtle){set('unlockError','Cette page exige HTTPS et un navigateur compatible avec Web Crypto.');return;}
  const password=$('vaultPassword').value;
  $('unlockButton').disabled=true;$('unlockButton').firstElementChild.textContent='Déchiffrement en cours…';
  try{
    envelope=await currentEnvelope();
    secretKey=await derive(password,envelope);
    model=await decrypt(envelope,secretKey);
    $('vaultPassword').value='';$('lockPanel').hidden=true;$('dashboard').hidden=false;$('lockButton').hidden=false;
    render();
  }catch(e){
    envelope=null;secretKey=null;model=null;
    set('unlockError',e.message&&(/charger|sauvegarde|corrompue|incorrect/.test(e.message))?e.message:'Mot de passe incorrect ou données inaccessibles.');
  }finally{$('unlockButton').disabled=false;$('unlockButton').firstElementChild.textContent='Déverrouiller l’espace';}
});
$('togglePassword').addEventListener('click',()=>{
  const i=$('vaultPassword');i.type=i.type==='password'?'text':'password';$('togglePassword').textContent=i.type==='password'?'Afficher':'Masquer';i.focus();
});
$('lockButton').addEventListener('click',()=>{model=null;secretKey=null;envelope=null;location.reload();});
document.querySelectorAll('[data-unit]').forEach(btn=>btn.addEventListener('click',()=>{unit=btn.dataset.unit;document.querySelectorAll('[data-unit]').forEach(b=>b.classList.toggle('active',b===btn));render();}));
$('reserveSlider').addEventListener('input',ev=>{model.reserveRate=Number(ev.target.value);changed=true;set('saveStatus','Taux modifié, pas encore enregistré.');render();});
$('saveReserve').addEventListener('click',async()=>{try{await persist();}catch(e){set('saveStatus','Enregistrement impossible : '+e.message);}});
$('shareRows').addEventListener('click',ev=>{
  const btn=ev.target.closest('[data-edit]');if(!btn)return;
  const p=model.projects.find(x=>x.id===btn.dataset.edit);if(!p)return;
  $('projectModalTitle').textContent='Modifier '+p.name;$('editProjectId').value=p.id;$('editAmount').value=p.amount;
  $('editAchraf').value=p.achraf===null?'':p.achraf;$('editRayan').value=p.rayan===null?'':p.rayan;
  $('projectError').textContent='';$('projectDialog').showModal();
});
$('projectForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const p=model.projects.find(x=>x.id===$('editProjectId').value);if(!p)return;
  const amount=Number($('editAmount').value),a=$('editAchraf').value.trim()===''?null:Number($('editAchraf').value),r=$('editRayan').value.trim()===''?null:Number($('editRayan').value);
  if(!Number.isSafeInteger(amount)||!properNumber(amount)||!shareValid(a)||!shareValid(r)||(a||0)+(r||0)>100.000001){set('projectError','Vérifie le montant et les pourcentages (somme ≤ 100 %).');return;}
  const copy={...p,amount,achraf:a,rayan:r};Object.assign(p,copy);
  try{await persist();$('projectDialog').close();}catch(err){set('projectError','Sauvegarde impossible : '+err.message);}
});
$('addEnvelope').addEventListener('click',()=>{$('envelopeForm').reset();set('envelopeError','');$('envelopeDialog').showModal();});
$('envelopeForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const name=$('envelopeName').value.trim(),amount=Number($('envelopeAmount').value),v=split();
  const total=model.future.reduce((s,x)=>s+x.amount,0);
  if(!name||name.length>80||!Number.isSafeInteger(amount)||amount<=0||!properNumber(amount)){set('envelopeError','Saisis un nom et un budget entier positif en centimes.');return;}
  if(total+amount>v.reserve){set('envelopeError','Le budget dépasse la réserve simulée disponible. Augmente le taux ou diminue le montant.');return;}
  model.future.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random(),name,amount});
  try{await persist();$('envelopeDialog').close();}catch(err){set('envelopeError','Sauvegarde impossible : '+err.message);}
});
$('envelopeList').addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-remove]');if(!b)return;
  model.future=model.future.filter(x=>x.id!==b.dataset.remove);
  try{await persist();}catch(err){set('saveStatus','Impossible de supprimer l’enveloppe.');}
});
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.closeDialog).close()));
$('downloadEncrypted').addEventListener('click',()=>{
  if(!envelope)return;
  const blob=new Blob([JSON.stringify(envelope,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='achraf-rayan-sauvegarde-chiffree.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
const importBtn=document.createElement('button');importBtn.type='button';importBtn.className='btn secondary btn-sm';importBtn.textContent='↑ Restaurer une sauvegarde';
const importInput=document.createElement('input');importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;
$('downloadEncrypted').after(importBtn,importInput);
importBtn.addEventListener('click',()=>importInput.click());
importInput.addEventListener('change',async()=>{
  const f=importInput.files&&importInput.files[0];if(!f)return;
  try{
    if(f.size>120000)throw Error('Fichier trop volumineux.');
    const candidate=JSON.parse(await f.text());
    if(!checkEnvelope(candidate)||!envelope||candidate.salt!==envelope.salt||candidate.iterations!==envelope.iterations)throw Error('Sauvegarde incompatible avec ce coffre.');
    const incoming=await decrypt(candidate,secretKey);
    if(!confirm('Remplacer les données locales par cette sauvegarde chiffrée ?'))return;
    model=incoming;envelope=candidate;localStorage.setItem(STORE,JSON.stringify(envelope));render();set('saveStatus','Sauvegarde restaurée.');
  }catch(err){alert('Import impossible : '+err.message);}finally{importInput.value='';}
});
$('restoreDefault').addEventListener('click',()=>$('resetDialog').showModal());
$('resetDialog').addEventListener('close',()=>{if($('resetDialog').returnValue==='confirm'){localStorage.removeItem(STORE);location.reload();}});
})();