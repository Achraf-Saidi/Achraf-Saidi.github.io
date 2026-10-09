import { byId, copy } from './catalog.js?v=6e7f347bc8';
import { t, money } from './i18n.js?v=6e7f347bc8';
import { normalizeCart, addToCart, removeFromCart, quote, cleanHistory, createDemoReceipt } from './commerce.js?v=6e7f347bc8';
import { pageHTML, courseCard, resourceCard, detailsHTML, previewHTML, cartHTML, checkoutHTML, successHTML, historyHTML, contactHTML, mailPreviewHTML, privacyHTML, icon } from './views.js?v=6e7f347bc8';
import { courses, resources } from './catalog.js?v=6e7f347bc8';

const root = document.getElementById('app');
const view = document.body.dataset.view || 'home';
const params = new URLSearchParams(location.search);
const allowedLanguages = ['fr','en','ar'];
const allowedFilters = view==='lycee'?['all','2as','bac']:view==='tech'?['all','code','data','ai']:['all','math','code','data','ai'];
let storageAvailable = true;
let lang = 'fr';
let cart = [];
let history = [];
let filter = allowedFilters.includes(params.get('filter')) ? params.get('filter') : 'all';
let modal;
let lastFocus;
let dialogState = null;
let lastReceipt;
let toastTimer;
let mailBody = '';
try {
  const saved = JSON.parse(localStorage.getItem('numeria.demo.v2') || '{}');
  cart = normalizeCart(saved.cart);
  history = cleanHistory(saved.history);
  const preferred = localStorage.getItem('numeria.language');
  if (allowedLanguages.includes(preferred)) lang = preferred;
} catch { storageAvailable = false; }
if (allowedLanguages.includes(params.get('lang'))) lang = params.get('lang');

function persist() {
  try { localStorage.setItem('numeria.demo.v2',JSON.stringify({cart,history})); }
  catch { storageAvailable = false; }
}

function render() {
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  document.title=t({home:'pageHome',lycee:'pageSchool',tech:'pageTech',resources:'pageResources'}[view]||'pageHome',lang);
  root.innerHTML=pageHTML(view,lang,filter);
  modal=document.getElementById('modal');
  modal.addEventListener('close',()=>{
    document.body.classList.remove('modal-open');
    dialogState=null;
    updateCartUI();
    if(lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
  });
  modal.addEventListener('click',event=>{
    if(event.target!==modal) return;
    const bounds=modal.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) modal.close();
  });
  updateCartUI();
  updateGraph(1.2);
}

function updateURL() {
  const url=new URL(location.href);
  if(lang==='fr') url.searchParams.delete('lang'); else url.searchParams.set('lang',lang);
  if(filter==='all') url.searchParams.delete('filter'); else url.searchParams.set('filter',filter);
  window.history.replaceState(null,'',url);
}

function updateCartUI() {
  const q=quote(cart,history);
  const count=q.lines.length;
  root.querySelectorAll('[data-cart-count]').forEach(el=>{el.textContent=count||'0';});
  root.querySelectorAll('[data-action="cart"]').forEach(el=>el.setAttribute('aria-label',`${t('cart',lang)} (${count})`));
  const dock=root.querySelector('[data-basket-dock]');
  dock.hidden=count===0||modal?.open;
  root.querySelector('[data-dock-count]').textContent=count;
  root.querySelector('[data-dock-total]').textContent=money(q.total,lang);
  root.querySelectorAll('[data-action="add"]').forEach(button=>{
    const p=byId[button.dataset.id];
    const included=p?.kind==='pack'?p.courses.every(id=>cart.includes(id)):cart.includes(p?.id);
    button.classList.toggle('in-cart',included);
    button.setAttribute('aria-label',`${t(included?'added':'add',lang)} · ${copy(p?.title,lang)}`);
    if(button.classList.contains('add-square')) button.innerHTML=icon(included?'check':'plus');
    else button.innerHTML=`${t(included?'added':p?.kind==='pack'?'addPack':'add',lang)}${icon(included?'check':'arrow')}`;
  });
  root.querySelectorAll('[data-product]').forEach(el=>el.classList.toggle('in-cart',cart.includes(el.dataset.product)));
}

function showToast(message) {
  const el=document.getElementById('toast');
  clearTimeout(toastTimer);
  el.textContent=message;el.classList.add('visible');
  toastTimer=setTimeout(()=>el.classList.remove('visible'),3600);
}

function openDialog(type,id='',profile='') {
  if(!modal.open) lastFocus=document.activeElement;
  const templates={
    details:()=>detailsHTML(id,lang), preview:()=>previewHTML(id,lang), cart:()=>cartHTML(cart,history,lang),
    checkout:()=>checkoutHTML(cart,history,lang), success:()=>successHTML(lastReceipt,lang),
    history:()=>historyHTML(history,lang), contact:()=>contactHTML(lang,id,profile), privacy:()=>privacyHTML(lang)
  };
  const html=templates[type]?.();
  if(!html) return;
  dialogState={type,id,profile};
  document.getElementById('dialog-body').innerHTML=html;
  if(!modal.open) modal.showModal();
  document.body.classList.add('modal-open');
  modal.scrollTop=0;
  const heading=modal.querySelector('#dialog-title');
  heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
  updateCartUI();
}

function selectFilter(next) {
  if(!allowedFilters.includes(next)) return;
  filter=next;updateURL();
  root.querySelectorAll('[data-filter]').forEach(button=>{
    const selected=button.dataset.filter===filter;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  const target=root.querySelector(view==='resources'?'.resource-grid':'.course-grid');
  const selected=(view==='resources'?resources:courses.filter(p=>p.audience===view)).filter(p=>filter==='all'||(view==='resources'?p.type:p.category)===filter);
  if(target) target.innerHTML=selected.map(p=>(view==='resources'?resourceCard:courseCard)(p,lang)).join('');
  updateCartUI();
}

function updateGraph(value) {
  if(!root.querySelector('[data-point]')) return;
  const x=Number(value);
  if(!Number.isFinite(x)) return;
  const pixelX=235+80*x,pixelY=340-45*x*x;
  root.querySelectorAll('[data-point],[data-halo]').forEach(el=>{el.setAttribute('cx',pixelX);el.setAttribute('cy',pixelY);});
  const yAt=position=>340-45*(2*x*position-x*x);
  root.querySelector('[data-tangent]').setAttribute('d',`M35 ${yAt(-2.5)}L435 ${yAt(2.5)}`);
  root.querySelector('[data-guide]').setAttribute('d',`M${pixelX} 340V${pixelY}H235`);
  const format=n=>new Intl.NumberFormat(lang==='ar'?'ar-DZ':lang==='fr'?'fr-FR':'en-GB',{maximumFractionDigits:1}).format(n===0?0:n);
  root.querySelector('[data-x]').textContent=`x = ${format(x)}`;
  root.querySelector('[data-slope]').textContent=`f′(${format(x)}) = ${format(2*x)}`;
  const slider=root.querySelector('[data-point-range]');
  slider.setAttribute('aria-valuetext',`x = ${format(x)}, ${t('tangent',lang)} ${format(2*x)}`);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action],[data-filter]');
  if(!button) return;
  if(button.dataset.filter!==undefined){selectFilter(button.dataset.filter);return;}
  const {action,id,profile}=button.dataset;
  switch(action){
    case 'menu':{
      const nav=document.getElementById('mobile-nav');
      nav.hidden=!nav.hidden;button.setAttribute('aria-expanded',String(!nav.hidden));break;
    }
    case 'close':modal.close();break;
    case 'add':{
      if(!byId[id]) return;
      const previous=cart.join('|');cart=addToCart(cart,id);persist();updateCartUI();
      if(modal.open||cart.join('|')===previous) openDialog('cart'); else showToast(t('addedNotice',lang));
      break;
    }
    case 'remove':cart=removeFromCart(cart,id);persist();openDialog('cart');break;
    case 'checkout':if(cart.length)openDialog('checkout');break;
    case 'clear-history':history=[];persist();openDialog('history');showToast(t('cleared',lang));break;
    case 'copy-mail':{
      const textarea=document.getElementById('mail-preview');
      textarea.focus();textarea.select();
      if(navigator.clipboard?.writeText) navigator.clipboard.writeText(mailBody).then(()=>{button.textContent=t('copied',lang);}).catch(()=>textarea.select());
      break;
    }
    default:openDialog(action,id,profile);
  }
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!modal.open){
    const nav=document.getElementById('mobile-nav');
    if(!nav.hidden){nav.hidden=true;const toggle=root.querySelector('[data-action="menu"]');toggle.setAttribute('aria-expanded','false');toggle.focus();}
  }
});

document.addEventListener('input',event=>{
  if(event.target.matches('[data-point-range]'))updateGraph(event.target.value);
});

document.addEventListener('change',event=>{
  const el=event.target;
  if(el.matches('[data-language]')){
    if(!allowedLanguages.includes(el.value))return;
    lang=el.value;
    try{localStorage.setItem('numeria.language',lang);}catch{storageAvailable=false;}
    updateURL();render();root.querySelector('[data-language]').focus({preventScroll:true});
  }
  if(el.name==='payment'){
    modal.querySelectorAll('.payment-option').forEach(label=>label.classList.toggle('selected',label.querySelector('input').checked));
    const cash=el.value==='cash';
    modal.querySelector('.dummy-card').hidden=cash;modal.querySelector('.cash-note').hidden=!cash;
    modal.querySelector('[data-simulate-label]').textContent=t(cash?'simulateCash':'simulate',lang);
  }
  if(el.name==='profile'||el.name==='minor'){
    const form=modal.querySelector('#contact-form');if(!form)return;
    const isSchool=form.elements.profile.value==='school';
    const minor=form.elements.minor;
    if(minor)form.querySelector('.minor-field').hidden=!isSchool;
    const needsGuardian=isSchool&&(!minor||minor.checked);
    form.querySelector('.guardian-field').hidden=!needsGuardian;
    form.elements.guardian.required=needsGuardian;
  }
});

document.addEventListener('submit',event=>{
  if(event.target.id==='checkout-form'){
    event.preventDefault();const form=event.target;if(!form.reportValidity()||!cart.length)return;
    const method=new FormData(form).get('payment');
    lastReceipt=createDemoReceipt(cart,history,method);history=[...history,lastReceipt].slice(-30);cart=[];persist();openDialog('success');
  }
  if(event.target.id==='contact-form'){
    event.preventDefault();const form=event.target;if(!form.reportValidity())return;
    const data=new FormData(form);
    const profileKey={school:'schoolPerson',parent:'parent',student:'student',professional:'professional'}[data.get('profile')];
    const programme=byId[data.get('program')];
    mailBody=[
      `${t('name',lang)} : ${data.get('name').trim()}`,
      `${t('email',lang)} : ${data.get('email').trim()}`,
      `${t('profile',lang)} : ${t(profileKey,lang)}`,
      `${t('program',lang)} : ${programme?copy(programme.title,lang):t('undecided',lang)}`,
      form.elements.guardian.required?`${t('guardian',lang)} : ${data.get('guardian').trim()}`:'',
      '',`${t('goal',lang)} :`,data.get('goal').trim()
    ].filter(line=>line!==undefined).join('\n');
    document.getElementById('dialog-body').innerHTML=mailPreviewHTML(mailBody,t('mailSubject',lang),lang);
    modal.scrollTop=0;const heading=modal.querySelector('#dialog-title');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
  }
});

// Keep separate tabs coherent while storing only anonymous cart / demonstration state.
window.addEventListener('storage',event=>{
  if(event.key!=='numeria.demo.v2')return;
  try{const state=JSON.parse(event.newValue||'{}');cart=normalizeCart(state.cart);history=cleanHistory(state.history);updateCartUI();
    if(['cart','checkout','history'].includes(dialogState?.type))openDialog(dialogState.type);
  }catch{ /* Ignore a malformed local state. */ }
});

render();
if(!storageAvailable)showToast(t('offlineStorage',lang));
