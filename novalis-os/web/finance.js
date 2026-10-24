/* A single journal sourced from confirmed payments, expenses and refunds. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(v/100);
 const date=v=>new Intl.DateTimeFormat('fr-BE',{dateStyle:'medium'}).format(new Date(v.slice(0,10)+'T12:00:00'));
 const methods={transfer:'Virement',bancontact:'Bancontact',qr:'QR code',online:'Paiement en ligne',creditcard:'Carte',expense:'Dépense'};
 let c,data,mode='live',timer,sequence=0,filters={q:'',kind:'',from:'',to:''};
 const active=()=>c&&c.state.view==='finance'&&c.current(c.epoch)&&$('finance-workspace');
 function schedule(){clearTimeout(timer);if(active())timer=setTimeout(()=>{if(active()&&!document.hidden&&!document.querySelector('dialog[open]'))refresh().catch(report);else schedule();},30000);}
 function report(error){if(active())$('finance-updated').textContent='Mise à jour interrompue · '+error.message;}
 async function refresh(){
  clearTimeout(timer);const ticket=++sequence,context=c,scope=mode;
  try{
   const next=await context.api('/api/finance'+(scope==='test'?'?mode=test':''));
   if(ticket!==sequence||context!==c||!c.current(c.epoch)||c.state.view!=='finance')return;
   data=next;
   if(!$('finance-workspace'))shell();
   render();
  }finally{schedule();}
 }
 function exportURL(path){const params=new URLSearchParams({mode,...filters});return path+'?'+params;}
 function filtered(){return (data.movements||[]).filter(m=>{
  const day=m.occurred_at.slice(0,10),q=filters.q.trim().toLowerCase();
  return (!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)&&(!filters.kind||[m.direction,m.kind,m.method].includes(filters.kind))&&
   (!q||['reference','description','invoice_number','client_name','project_name'].map(k=>m[k]||'').join(' ').toLowerCase().includes(q));
 });}
 function shell(){
  c.title('Suivi financier','Une vue claire de vos flux.','Encaissements, dépenses et remboursements, reliés à leurs factures.');
  $('view-content').classList.remove('billing-workspace');
  $('view-content').innerHTML=`<div id="finance-workspace" class="finance-workspace">
   <div class="finance-topline"><div class="finance-scopes" role="group" aria-label="Environnement financier"><button type="button" data-finance-mode="live">Opérations réelles</button><button type="button" data-finance-mode="test">Démonstration <span id="finance-demo-count"></span></button></div><span id="finance-updated" class="finance-updated" role="status"></span></div>
   <div id="finance-scope-note"></div><div id="finance-metrics" class="metrics financial-metrics"></div>
   <div id="finance-summary" class="finance-summary"></div><div id="finance-attention"></div>
   <section class="panel finance-journal" aria-labelledby="finance-journal-title"><div class="panel-head"><div><p class="eyebrow">JOURNAL DES FLUX</p><h2 id="finance-journal-title">Les mouvements enregistrés</h2></div><a id="finance-export" class="secondary">Exporter les mouvements ↗</a></div>
    <div class="finance-filters"><label class="finance-search">Rechercher<input id="finance-search" type="search" placeholder="Client, facture ou référence…" maxlength="200"></label><label>Type de mouvement<select id="finance-kind"><option value="">Tous les mouvements</option value="in">Encaissements</option><option value="out">Sorties</option><option value="transfer">Virements reçus</option><option value="bancontact">Bancontact</option><option value="refund">Remboursements</option></select></label><label>Du<input id="finance-from" type="date"></label><label>Au<input id="finance-to" type="date"></label></div>
    <div class="finance-result-line"><p id="finance-result-count" role="status"></p><button id="finance-clear" type="button" class="link">Réinitialiser les filtres</button></div><div id="finance-period-error" class="error" role="alert"></div><div id="finance-movements"></div>
    <p class="finance-journal-note">Les flux nets correspondent aux mouvements enregistrés, avant frais prestataire. Ils ne constituent pas un solde bancaire. Une déclaration de virement reste à confirmer.</p>
   </section><div id="finance-invoices"></div><div id="finance-expenses"></div></div>`;
  document.querySelectorAll('[data-finance-mode]').forEach(b=>b.addEventListener('click',async()=>{
   if(mode===b.dataset.financeMode)return;mode=b.dataset.financeMode;filters={q:'',kind:'',from:'',to:''};
   document.querySelectorAll('[data-finance-mode]').forEach(x=>x.disabled=true);
   try{await refresh();}catch(e){report(e);}finally{if(active())document.querySelectorAll('[data-finance-mode]').forEach(x=>x.disabled=false);}
  }));
  for(const [key,id]of Object.entries({q:'finance-search',kind:'finance-kind',from:'finance-from',to:'finance-to'})){
   $(id).value=filters[key];$(id).addEventListener(key==='q'?'input':'change',()=>{filters[key]=$(id).value;renderJournal();});
  }
  $('finance-clear').addEventListener('click',()=>{filters={q:'',kind:'',from:'',to:''};for(const id of ['finance-search','finance-kind','finance-from','finance-to'])$(id).value='';renderJournal();});
 }
 function render(){
  mode=data.mode||mode;
  for(const [key,id]of Object.entries({q:'finance-search',kind:'finance-kind',from:'finance-from',to:'finance-to'}))if($(id).value!==filters[key])$(id).value=filters[key];
  document.querySelectorAll('[data-finance-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.financeMode===mode)));
  $('finance-demo-count').textContent=data.demo_invoice_count?String(data.demo_invoice_count):'';
  $('finance-updated').textContent='Actualisé à '+new Intl.DateTimeFormat('fr-BE',{timeStyle:'short'}).format(new Date(data.updated_at||Date.now()))+' · suivi automatique';
  $('finance-scope-note').innerHTML=mode==='test'?'<div class="finance-demo-banner"><span class="finance-demo-mark">TEST</span><div><strong>Votre environnement de démonstration</strong><p>Chaque règlement simulé apparaît ici avec sa facture et son reçu. Aucun argent ne circule.</p></div></div>':data.demo_invoice_count?'<div class="finance-live-note"><p>Vos essais sont disponibles dans <strong>Démonstration</strong> : '+data.demo_invoice_count+' facture(s) de test, séparées des opérations réelles.</p><button class="link" id="finance-open-demo" type="button">Voir mes tests ↗</button></div>':'';
  $('finance-open-demo')?.addEventListener('click',()=>document.querySelector('[data-finance-mode="test"]').click());
  const t=data.totals;
  $('finance-summary').innerHTML=`<p><span>Factures enregistrées TTC</span><strong>${money(t.invoiced_cents||0)}</strong></p><p><span>Règlements affectés aux factures</span><strong>${money(t.paid_cents||0)}</strong></p><p><span>Brouillons à finaliser</span><strong>${t.draft_count??data.invoices.filter(i=>i.status==='draft').length}</strong></p><a class="link" href="/api/finance/export.csv?mode=${mode}">Exporter les factures ↗</a>`;
  const notices=data.pending_transfers||[],refunds=data.pending_refunds||[];
  $('finance-attention').innerHTML=(notices.length?`<p class="finance-attention">${notices.length} facture(s) avec virement déclaré par le client : réception bancaire à vérifier.</p>`:'')+(refunds.length?`<p class="finance-attention">${refunds.length} remboursement(s) en cours : les sorties apparaîtront après confirmation du prestataire.</p>`:'');
  $('finance-invoices').innerHTML=c.invoiceRows(data.invoices);c.bindInvoices(data.invoices);
  $('finance-expenses').innerHTML=mode==='live'&&data.expenses.length?`<section class="panel"><div class="panel-head"><h2>Dépenses enregistrées</h2></div>${data.expenses.map(e=>`<article class="row"><div class="row-content"><strong>${esc(e.description)}</strong><p>${date(e.spent_at)}</p></div><strong>${money(e.amount_cents)}</strong></article>`).join('')}</section>`:'';
  $('view-actions').replaceChildren();
  c.button('Actualiser',()=>refresh(),$('view-actions'),true);
  if(c.state.user.role==='manager')c.button('Créer une facture',c.newInvoice,$('view-actions'));
  if(mode==='live')c.button('Enregistrer une dépense',c.newExpense,$('view-actions'),true);
  renderJournal();
 }
 function renderJournal(){
  const invalid=filters.from&&filters.to&&filters.from>filters.to;
  $('finance-period-error').textContent=invalid?'La date de début doit précéder la date de fin.':'';
  const items=invalid?[]:filtered(),incoming=items.filter(m=>m.direction==='in').reduce((s,m)=>s+m.amount_cents,0),outgoing=items.filter(m=>m.direction==='out').reduce((s,m)=>s+m.amount_cents,0);
  const scoped=filters.q||filters.kind||filters.from||filters.to,caption=scoped?'Mouvements filtrés':'Tous les mouvements';
  $('finance-metrics').innerHTML=[[mode==='test'?'Encaissements simulés':'Encaissements confirmés',incoming,caption,'in'],['Sorties enregistrées',outgoing,caption,'out'],['Flux net enregistré',incoming-outgoing,'Encaissements − sorties','net'],['Reste à encaisser',data.totals.receivable_cents||0,'Toutes les factures enregistrées','due']].map(([label,amount,note,tone])=>`<div class="metric finance-metric" data-tone="${tone}"><span>${label}</span><strong>${money(amount)}</strong><small>${note}</small></div>`).join('');
  $('finance-result-count').textContent=items.length+' mouvement'+(items.length>1?'s':'')+(scoped?' · filtres appliqués':' · toutes les dates');
  $('finance-export').href=exportURL('/api/finance/movements.csv');
  $('finance-export').setAttribute('aria-disabled',String(Boolean(invalid)));$('finance-export').onclick=e=>{if(invalid)e.preventDefault();};
  $('finance-movements').innerHTML=items.length?`<div class="table-scroll"><table class="finance-table"><thead><tr><th>Date</th><th>Opération & référence</th><th>Client & facture</th><th>Montant</th><th>Justificatif</th></tr></thead><tbody>${items.map(m=>`<tr><td data-label="Date">${date(m.occurred_at)}</td><td data-label="Opération"><span class="finance-kind">${mode==='test'?'Simulation · ':''}${m.kind==='refund'?'Remboursement':m.kind==='expense'?'Dépense':esc(methods[m.method]||m.method||'Paiement')}</span><strong>${esc(m.description)}</strong><small>${esc(m.reference)}${m.excess_cents?' · dont '+money(m.excess_cents)+' à rapprocher':''}</small></td><td data-label="Client & facture"><strong>${esc(m.client_name||'Novalis')}</strong><small>${esc(m.invoice_number||m.project_name||'Dépense interne')}</small></td><td data-label="Montant" class="finance-amount ${m.direction==='in'?'finance-in':'finance-out'}">${m.direction==='in'?'+':'−'} ${money(m.amount_cents)}</td><td data-label="Justificatif"><div class="finance-row-links">${m.invoice_id?`<button type="button" class="link" data-finance-invoice="${esc(m.invoice_id)}">Voir la facture ↗</button>`:'<span class="mini">Saisie interne</span>'}${m.receipt_url?`<a class="link" href="${esc(m.receipt_url)}" target="_blank" rel="noopener">Reçu PDF ↓</a>`:''}</div></td></tr>`).join('')}</tbody></table></div>`:`<div class="finance-empty"><span aria-hidden="true">↗</span><h3>${scoped?'Aucun mouvement pour ces filtres.':mode==='test'?'Vos simulations apparaîtront ici.':'Votre journal est prêt.'}</h3><p>${scoped?'Ajustez la période ou la recherche pour retrouver vos opérations.':mode==='test'?'Testez un paiement depuis une facture TEST : le mouvement et son reçu seront disponibles dans ce journal.':'Les virements confirmés, paiements en ligne, dépenses et remboursements alimenteront automatiquement ce suivi.'}</p></div>`;
  document.querySelectorAll('[data-finance-invoice]').forEach(b=>b.addEventListener('click',()=>c.openInvoice(b.dataset.financeInvoice).catch(c.toastError)));
 }
 window.addEventListener('focus',()=>{if(active())refresh().catch(report);});
 document.addEventListener('visibilitychange',()=>{if(active()&&!document.hidden)refresh().catch(report);});
 window.NovalisFinance={mount:async context=>{c=context;mode=context.state.user?.demo_mode?'test':'live';filters={q:'',kind:'',from:'',to:''};clearTimeout(timer);await refresh();}};
})();
