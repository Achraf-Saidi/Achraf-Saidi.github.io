(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format((v||0)/100);
 const date=v=>v?new Intl.DateTimeFormat('fr-BE',{dateStyle:'medium'}).format(new Date(v.length===10?v+'T12:00:00':v)):'—';
 const instant=v=>v?new Intl.DateTimeFormat('fr-BE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const roleNames={manager:'Direction',account:'Relation client',developer:'Développement',client:'Votre espace client',finance:'Finances',sysadmin:'Administration des accès'};
 const labels={new:'Nouveau',qualified:'Qualifié',discovery:'Découverte',scoping:'Cadrage',proposal:'Proposition',negotiation:'Négociation',won:'Gagné',lost:'Perdu',active:'En cours',awaiting_client:'Validation client',delivered:'Livré',maintenance:'Maintenance',archived:'Archivé',todo:'À faire',in_progress:'En cours',blocked:'Bloquée',review:'En revue',approved:'Validé',rejected:'À reprendre',planned:'Planifié',received:'Reçue',analysing:'En analyse',resolved:'Résolue',declined:'Refusé',draft:'Brouillon',shared:'Partagé',accepted:'Accepté',registered:'Enregistrée',paid:'Réglée',submitted:'Soumis',reserved:'Réservé',cancelled:'Annulé',invited:'Invitation en attente',suspended:'Suspendu',sent:'Transmis',queued:'En attente',failed:'Échec'};
 const badge=value=>`<span class="badge ${['approved','paid','delivered','accepted'].includes(value)?'good':['blocked','rejected','suspended','failed'].includes(value)?'alert':''}">${escape(labels[value]||value)}</span>`;
 const state={user:null,csrf:'',view:'dashboard',project:null,bundle:null,tab:'roadmap',channel:'internal',epoch:0};
 const navigation={
  manager:[['dashboard','Vue d’ensemble','◈'],['leads','Commercial','↗'],['clients','Clients','◎'],['projects','Projets','▣'],['tasks','Réalisation','≡'],['time','Temps','◷'],['calendar','Rendez-vous','▦'],['finance','Finances','€'],['users','Équipe et accès','✳'],['audit','Journal','↳'],['integrations','Connexions','⌘']],
  account:[['dashboard','À coordonner','◈'],['leads','Mon portefeuille','↗'],['clients','Mes clients','◎'],['projects','Mes projets','▣'],['tasks','Réalisation','≡'],['time','Temps à valider','◷'],['calendar','Rendez-vous','▦']],
  developer:[['dashboard','Ma journée','◈'],['tasks','Mes tâches','≡'],['projects','Mes projets','▣'],['time','Mon temps','◷']],
  client:[['dashboard','Mon suivi','◈'],['projects','Mes projets','▣']],
  finance:[['finance','Finances','€'],['projects','Projets','▣']],
  sysadmin:[['users','Comptes et accès','✳'],['integrations','Connexions','⌘']]
 };
 async function api(path,method='GET',body){
  const options={method,credentials:'same-origin',headers:{}};
  if(method!=='GET')options.headers['X-CSRF-Token']=state.csrf;
  if(body instanceof FormData)options.body=body;
  else if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
  const result=await fetch(path,options);
  const value=await result.json().catch(()=>({error:'Le service n’est pas disponible sur cette adresse.'}));
  if(!result.ok){const error=new Error(value.error||'Une erreur est survenue.');error.status=result.status;throw error;}
  return value;
 }
 let toastTimer;
 function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;},6500);}
 function title(label,heading,description=''){ $('view-label').textContent=label;$('view-title').textContent=heading;$('view-description').textContent=description;$('view-actions').replaceChildren(); }
 function button(text,action,host=$('view-actions'),secondary=false){const b=document.createElement('button');b.type='button';b.className=secondary?'secondary':'button';b.textContent=text;b.addEventListener('click',()=>Promise.resolve(action()).catch(e=>toast(e.message)));host.append(b);return b;}
 function empty(copy){return `<div class="empty"><p>${escape(copy)}</p></div>`;}
 function panel(heading,content){return `<section class="panel"><div class="panel-head"><h2>${escape(heading)}</h2></div>${content}</section>`;}
 function showError(error){$('view-content').replaceChildren();const p=document.createElement('p');p.className='notice';p.textContent=error.message;$('view-content').append(p);if(error.status===401){state.user=null;$('app-shell').hidden=true;$('auth-screen').hidden=false;}}
 function openDialog(heading,html){$('dialog-title').textContent=heading;$('dialog-content').innerHTML=html;$('dialog-error').textContent='';if(!$('dialog').open)$('dialog').showModal();}
 let dialogBusy=false;
 $('dialog-close').addEventListener('click',()=>{if(!dialogBusy)$('dialog').close();});
 $('dialog').addEventListener('cancel',e=>{if(dialogBusy)e.preventDefault();});
 function modal(heading,fields,onSubmit){
  const renderField=f=>{
   const attr=`name="${escape(f.name)}" ${f.required===false?'':'required'}`;
   if(f.type==='checkbox')return `<label class="check-label"><input type="checkbox" ${attr} ${f.value?'checked':''}>${escape(f.label)}</label>`;
   if(f.type==='select')return `<label>${escape(f.label)}<select ${attr}>${(f.options||[]).map(o=>`<option value="${escape(o[0])}" ${String(o[0])===String(f.value)?'selected':''}>${escape(o[1])}</option>`).join('')}</select></label>`;
   if(f.type==='textarea')return `<label>${escape(f.label)}<textarea ${attr} maxlength="${f.maxlength||10000}">${escape(f.value||'')}</textarea></label>`;
   return `<label>${escape(f.label)}<input ${attr} type="${f.type||'text'}" ${f.type==='file'?'':`value="${escape(f.value??'')}"`} ${f.min!==undefined?`min="${f.min}"`:''} ${f.step?`step="${f.step}"`:''} maxlength="${f.maxlength||1000}"></label>`;
  };
  openDialog(heading,`<form id="operation-form">${fields.map(renderField).join('')}<button class="button" type="submit">Enregistrer ↗</button></form>`);
  const form=$('operation-form');
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!form.reportValidity()||dialogBusy)return;
   const data=new FormData(form),value={};
   fields.forEach(f=>{value[f.name]=f.type==='checkbox'?data.get(f.name)==='on':f.type==='number'?Number(data.get(f.name)):f.type==='file'?form.elements[f.name].files[0]:String(data.get(f.name)||'').trim();});
   dialogBusy=true;form.querySelector('[type=submit]').disabled=true;$('dialog-error').textContent='';
   try{await onSubmit(value);$('dialog').close();}
   catch(error){$('dialog-error').textContent=error.message;}
   finally{dialogBusy=false;form.querySelector('[type=submit]').disabled=false;}
  });
 }
 async function start(session){
  state.user=session.user;state.csrf=session.csrf;
  if(session.mfa_required){$('auth-status').textContent='Activez la double authentification pour ouvrir cet espace.';await setupMfa();return;}
  $('auth-screen').hidden=true;$('app-shell').hidden=false;
  $('role-label').textContent=roleNames[state.user.role];$('user-name').textContent=state.user.name;$('user-email').textContent=state.user.email;
  $('main-nav').replaceChildren();
  navigation[state.user.role].forEach(([name,label,symbol])=>{const b=document.createElement('button');b.type='button';b.dataset.view=name;b.innerHTML=`<span aria-hidden="true">${symbol}</span><span>${escape(label)}</span>`;b.addEventListener('click',()=>view(name));$('main-nav').append(b);});
  await view(navigation[state.user.role][0][0]);
 }
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const submit=form.querySelector('button');submit.disabled=true;$('auth-status').textContent='Connexion…';
  try{await start(await api('/api/auth/login','POST',Object.fromEntries(new FormData(form))));form.elements.password.value='';form.elements.code.value='';$('auth-status').textContent='';}
  catch(error){$('auth-status').textContent=error.message;}
  finally{submit.disabled=false;}
 });
 $('reset-password').addEventListener('click',()=>modal('Réinitialiser mon mot de passe',[{name:'email',label:'Adresse e-mail',type:'email'}],async d=>{await api('/api/auth/reset','POST',d);toast('Si ce compte existe, une invitation à réinitialiser le mot de passe sera préparée.');}));
 $('logout').addEventListener('click',async()=>{try{await api('/api/auth/logout','POST',{});location.reload();}catch(e){toast(e.message);}});
 $('menu-toggle').addEventListener('click',()=>{const open=!$('sidebar').classList.contains('open');$('sidebar').classList.toggle('open',open);$('menu-toggle').setAttribute('aria-expanded',String(open));});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('sidebar').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');}});
 async function setupMfa(){
  modal('Protéger mon compte',[{name:'password',label:'Confirmer mon mot de passe',type:'password'}],async d=>{
   const setup=await api('/api/auth/mfa/setup','POST',d);
   // Open the next step after the password dialog has closed.
   setTimeout(()=>{
    modal('Activer la double authentification',[{name:'code',label:'Code à 6 chiffres de votre application d’authentification'}],async value=>{
     const result=await api('/api/auth/mfa/confirm','POST',value);
     setTimeout(()=>{openDialog('Conserver mes codes de récupération',`<p class="dialog-copy">Ces codes ne seront affichés qu’une fois. Conservez-les dans un gestionnaire de mots de passe.</p><div class="secret">${result.recovery_codes.map(escape).join('<br>')}</div><button class="button" id="mfa-continue" type="button">Ouvrir mon espace ↗</button>`);$('mfa-continue').addEventListener('click',async()=>{$('dialog').close();await start(await api('/api/session'));});},0);
    });
    const note=document.createElement('p');note.className='dialog-copy';note.textContent='Ajoutez un compte TOTP dans votre application d’authentification en copiant cette clé. Ne la partagez pas.';
    const seed=document.createElement('p');seed.className='secret';seed.textContent=setup.secret;$('operation-form').prepend(note,seed);
   },0);
  });
 }
 $('session-tools').addEventListener('click',()=>{
  modal('Sécurité du compte',[{name:'confirm',type:'checkbox',label:'Révoquer toutes mes autres sessions'}],async()=>{await api('/api/auth/revoke-sessions','POST',{});toast('Les autres sessions ont été révoquées.');});
 });
 async function view(name){
  const epoch=++state.epoch;state.view=name;
  $('sidebar').classList.remove('open');$('menu-toggle').setAttribute('aria-expanded','false');
  $('main-nav').querySelectorAll('button').forEach(b=>{if(b.dataset.view===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('view-content').innerHTML='<p class="loading" role="status">Chargement de votre espace…</p>';
  try{
   const handlers={dashboard,leads,clients,projects:projectList,tasks:taskList,time:timeList,calendar,finance:financeView,users,audit:journal,integrations};
   if(!handlers[name])throw new Error('Cette vue n’est pas disponible.');
   await handlers[name](epoch);
  }catch(e){if(epoch===state.epoch)showError(e);}
 }
 function current(epoch){return epoch===state.epoch;}
 function projectRows(items){return items.length?'<div class="rows">'+items.map(p=>`<article class="row"><div class="row-content"><button class="link" data-open-project="${p.id}">${escape(p.name)}</button><p>${escape(p.account_name)} · ${date(p.due_date)}</p></div>${badge(p.status)}<progress class="progress" max="100" value="${p.progress}" aria-label="Avancement validé : ${p.progress} %"></progress><span class="mini">${p.progress} %</span></article>`).join('')+'</div>':empty('Aucun projet n’est encore associé à votre espace.');}
 function bindProjects(){document.querySelectorAll('[data-open-project]').forEach(b=>b.addEventListener('click',()=>openProject(b.dataset.openProject).catch(showError)));}
 async function dashboard(epoch){
  const d=await api('/api/dashboard');if(!current(epoch))return;
  const heading={manager:['Direction','Une vision claire de l’activité.','Les indicateurs proviennent des projets et demandes enregistrés.'],account:['Relation client','Les décisions à faire avancer.','Votre portefeuille, les points à arbitrer et les échanges à suivre.'],developer:['Développement','Votre travail, sans détour.','Vos tâches, les points bloquants et le temps à faire valider.'],client:['Votre suivi','Bienvenue dans votre projet.','Votre interlocuteur, les étapes partagées et les décisions qui vous concernent.']}[state.user.role];
  title(...heading);
  const metricNames={active_projects:'Projets actifs',leads:'Opportunités ouvertes',my_tasks:'Mes tâches ouvertes',submitted_minutes:'Minutes en attente de validation'};
  const metrics=Object.entries(d.stats).map(([k,v])=>`<div class="metric"><span>${escape(metricNames[k]||k)}</span><strong>${escape(v)}</strong></div>`).join('');
  const alerts=d.alerts.length?d.alerts.map(a=>`<article class="row"><div class="row-content"><strong>${escape(a.name)}</strong><p>Échéance : ${date(a.due_date)}</p></div>${badge(a.status)}<button class="secondary" data-open-project="${a.project_id}">Consulter</button></article>`).join(''):empty('Aucun retard ou blocage signalé dans les tâches qui vous sont accessibles.');
  $('view-content').innerHTML=`<div class="metrics">${metrics}</div>${panel(state.user.role==='client'?'Votre roadmap':'Vos projets',projectRows(d.projects))}`+(state.user.role==='client'?'':panel('Points d’attention',alerts))+panel('Dernières notifications',d.notifications.length?d.notifications.map(n=>`<div class="notification"><p>${escape(n.title)}<br><small>${instant(n.created_at)}</small></p>${n.seen?'':`<button class="secondary" data-read="${n.id}">Vu</button>`}</div>`).join(''):empty('Les nouvelles demandes et validations apparaîtront ici.'));
  bindProjects();document.querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',async()=>{try{await api('/api/notifications/'+b.dataset.read+'/read','POST',{});b.remove();}catch(e){toast(e.message);}}));
  if(state.user.role==='developer')button('Ouvrir mes tâches',()=>view('tasks'));
  if(state.user.role==='manager')button('Qualifier les demandes',()=>view('leads'));
 }
 async function projectList(epoch){
  const d=await api('/api/projects');if(!current(epoch))return;
  title('Projets',state.user.role==='client'?'Vos projets, simplement.':'Le portefeuille de projets.','L’avancement repose sur l’effort estimé des tâches validées.');
  $('view-content').innerHTML=panel('Projets accessibles',projectRows(d.items));bindProjects();
  if(state.user.role==='manager')button('Créer un projet',newProject);
 }
 async function newProject(){
  const [clients,people]=await Promise.all([api('/api/clients'),api('/api/collaborators')]);
  if(!clients.items.length){toast('Créez d’abord un client ou convertissez une opportunité.');return;}
  modal('Créer un projet',[{name:'name',label:'Nom du projet'},{name:'client_id',label:'Client',type:'select',options:clients.items.map(c=>[c.id,c.name])},{name:'account_id',label:'Interlocuteur',type:'select',options:people.items.filter(p=>['manager','account'].includes(p.role)).map(p=>[p.id,p.name])},{name:'scope',label:'Périmètre accepté',type:'textarea'},{name:'budget',label:'Budget contractuel en euros',type:'number',min:0,step:'.01'},{name:'due_date',label:'Date prévue de livraison',type:'date'}],async d=>{d.budget_cents=Math.round(d.budget*100);delete d.budget;const result=await api('/api/projects','POST',d);await openProject(result.id);toast('Projet créé.');});
 }
 async function clients(epoch){
  const d=await api('/api/clients');if(!current(epoch))return;
  title('Relation client','Les organisations accompagnées.','Les données affichées sont limitées à votre périmètre.');
  $('view-content').innerHTML=panel('Clients',d.items.length?'<div class="rows">'+d.items.map(c=>`<article class="row"><div class="row-content"><strong>${escape(c.name)}</strong><p>${escape(c.email)} · ${escape(c.company_number||'Numéro d’entreprise non renseigné')}</p></div></article>`).join('')+'</div>':empty('Aucun client enregistré.'));
  if(state.user.role==='manager')button('Ajouter un client',()=>modal('Ajouter un client',[{name:'name',label:'Organisation'},{name:'email',label:'Adresse e-mail',type:'email'},{name:'company_number',label:'Numéro d’entreprise',required:false}],async d=>{await api('/api/clients','POST',d);await view('clients');}));
 }
 async function leads(epoch){
  const d=await api('/api/leads');if(!current(epoch))return;
  title('Commercial','Du premier contact au projet.','Qualifiez le besoin, rédigez la note de cadrage et conservez l’historique de conversion.');
  const draw=query=>{
   const filtered=d.items.filter(l=>(l.name+' '+l.company+' '+l.email).toLowerCase().includes(query));
   $('lead-rows').innerHTML=filtered.length?filtered.map(l=>`<article class="row"><div class="row-content"><strong>${escape(l.company||l.name)}</strong><p>${escape(l.name)} · ${escape(l.email)}</p><p>${escape(l.description)}</p></div>${badge(l.status)}<div class="row-actions"><button class="secondary" data-lead="${l.id}">Qualifier</button>${l.scoping_note?`<button class="secondary" data-note="${l.id}">Envoyer la note</button>`:''}${state.user.role==='manager'&&['proposal','negotiation'].includes(l.status)?`<button class="button" data-convert="${l.id}">Créer le projet</button>`:''}</div></article>`).join(''):empty('Aucune opportunité dans cette sélection.');
   document.querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>editLead(d.items.find(l=>l.id===b.dataset.lead),d.stages)));
   document.querySelectorAll('[data-note]').forEach(b=>b.addEventListener('click',()=>modal('Partager la note de cadrage',[{name:'confirm',label:'Préparer l’e-mail pour ce prospect',type:'checkbox'}],async()=>{await api(`/api/leads/${b.dataset.note}/send-note`,'POST',{});toast('Note de cadrage placée en attente d’envoi.');})));
   document.querySelectorAll('[data-convert]').forEach(b=>b.addEventListener('click',()=>convertLead(d.items.find(l=>l.id===b.dataset.convert))));
  };
  $('view-content').innerHTML='<label class="filter">Rechercher<input id="lead-search" type="search" placeholder="Entreprise ou contact"></label>'+panel('Pipeline','<div id="lead-rows" class="rows"></div>');draw('');$('lead-search').addEventListener('input',e=>draw(e.target.value.toLowerCase()));
  if(state.user.role==='manager')button('Ajouter une opportunité',()=>modal('Ajouter une opportunité',[{name:'name',label:'Contact'},{name:'email',label:'Adresse e-mail',type:'email'},{name:'company',label:'Entreprise',required:false},{name:'category',label:'Type de projet'},{name:'description',label:'Besoin exprimé',type:'textarea'}],async value=>{await api('/api/leads','POST',value);await view('leads');}));
 }
 async function editLead(lead,stages){
  let people={items:[]};if(state.user.role==='manager')people=await api('/api/collaborators');
  const fields=[{name:'status',label:'Étape commerciale',type:'select',value:lead.status,options:stages.filter(s=>s!=='won').map(s=>[s,labels[s]])},{name:'scoping_note',label:'Note de cadrage : objectifs, priorités, risques, étapes',type:'textarea',value:lead.scoping_note,required:false},{name:'loss_reason',label:'Motif de perte, le cas échéant',type:'textarea',value:lead.loss_reason,required:false}];
  if(state.user.role==='manager')fields.push({name:'owner_id',label:'Responsable de compte',type:'select',value:lead.owner_id,options:[['','Non affecté'],...people.items.filter(p=>p.role!=='developer').map(p=>[p.id,p.name])]});
  modal('Qualifier le besoin',fields,async d=>{d.version=lead.version;if(d.owner_id==='')d.owner_id=null;await api('/api/leads/'+lead.id,'PATCH',d);await view('leads');});
 }
 async function convertLead(lead){
  const people=await api('/api/collaborators');
  modal('Convertir la proposition acceptée',[{name:'name',label:'Projet',value:lead.company||lead.name},{name:'scope',label:'Périmètre accepté',type:'textarea',value:lead.scoping_note||lead.description},{name:'account_id',label:'Interlocuteur',type:'select',value:lead.owner_id,options:people.items.filter(p=>p.role!=='developer').map(p=>[p.id,p.name])},{name:'budget',label:'Budget contractuel en euros',type:'number',min:0,step:'.01'},{name:'due_date',label:'Échéance prévue',type:'date'},{name:'accepted',label:'L’accord commercial du client a été obtenu',type:'checkbox'}],async d=>{d.version=lead.version;d.budget_cents=Math.round(d.budget*100);delete d.budget;const result=await api('/api/leads/'+lead.id+'/convert','POST',d);await openProject(result.id);toast('Projet créé avec l’historique du prospect. Invitez ensuite le client depuis Équipe et accès.');});
 }
 async function openProject(id){
  state.project=id;state.view='project';const epoch=++state.epoch;
  const d=await api('/api/projects/'+id);if(!current(epoch))return;state.bundle=d;const p=d.project;
  title('Projet / '+(roleNames[state.user.role]),p.name,state.user.role==='client'?'Votre interlocuteur vous accompagne à chaque étape.':'Périmètre, responsabilités et avancement validé.');
  const coord=['manager','account'].includes(state.user.role);
  if(coord){button('Ajouter une tâche',()=>newTask());button('Équipe',projectTeam,$('view-actions'),true);}
  $('view-content').innerHTML=panel('Le projet',`<div class="project-summary"><div><p>${escape(p.scope)}</p></div><aside><p>Interlocuteur : <strong>${escape(p.account_name)}</strong></p><p>Échéance : ${date(p.due_date)}</p><p>Avancement validé : ${p.progress} %</p>${badge(p.status)}</aside></div>`)+'<div class="project-tabs" id="project-tabs"></div><div id="project-body"></div>';
  let tabs=state.user.role==='finance'?[['invoices','Finances']]:[['roadmap','Roadmap'],['tasks','Tâches'],['messages','Échanges'],['documents','Documents']];
  if(state.user.role==='client')tabs=tabs.filter(t=>t[0]!=='tasks');
  if(['manager','account','client'].includes(state.user.role))tabs.push(['proposals','Propositions']);
  if(['manager','client'].includes(state.user.role))tabs.push(['invoices','Règlements']);
  if(!tabs.some(t=>t[0]===state.tab))state.tab=tabs[0][0];
  tabs.forEach(([key,label])=>{const b=button(label,()=>projectTab(key),$('project-tabs'),true);b.dataset.tab=key;});
  await projectTab(state.tab);
 }
 async function refreshProject(){await openProject(state.project);}
 async function projectTab(tab){
  state.tab=tab;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
  const host=$('project-body'),d=state.bundle,p=d.project,coord=['manager','account'].includes(state.user.role);
  if(tab==='roadmap'){
   host.innerHTML=panel('Les étapes partagées',d.milestones.length?'<div class="client-timeline">'+d.milestones.map((m,i)=>`<article class="row" data-status="${m.status}"><span aria-hidden="true">${m.status==='approved'?'✓':i+1}</span><div class="row-content"><strong>${escape(m.name)}</strong><p>${escape(m.description)}</p><p>${date(m.due_date)}</p></div>${badge(m.status)}<div class="row-actions">${coord&&['planned','rejected'].includes(m.status)?`<button class="secondary" data-submit-milestone="${m.id}">Présenter au client</button>`:''}${state.user.role==='client'&&m.status==='awaiting_client'?`<button class="button" data-approve-milestone="${m.id}">Valider</button><button class="secondary" data-reject-milestone="${m.id}">À reprendre</button>`:''}</div></article>`).join('')+'</div>':empty('Les jalons partagés apparaîtront ici.'))+'<div class="toolbar" id="roadmap-actions"></div>';
   if(coord)button('Ajouter un jalon',()=>modal('Ajouter une étape',[{name:'name',label:'Jalon'},{name:'description',label:'Livrable et critères d’acceptation',type:'textarea'},{name:'due_date',label:'Date prévue',type:'date'}],async value=>{await api(`/api/projects/${p.id}/milestones`,'POST',value);await refreshProject();}),$('roadmap-actions'),true);
   if(coord&&p.status==='active')button('Demander la validation finale',()=>confirmAction('Soumettre la livraison finale','Toutes les tâches et les jalons doivent être validés.',()=>api(`/api/projects/${p.id}/delivery`,'POST',{version:p.version})), $('roadmap-actions'));
   if(state.user.role==='client'&&p.status==='awaiting_client')button('Approuver la livraison finale',()=>confirmAction('Approuver la livraison','Je confirme avoir examiné les livrables finaux.',()=>api(`/api/projects/${p.id}/accept-delivery`,'POST',{version:p.version})),$('roadmap-actions'));
   if(state.user.role==='manager'&&['delivered','maintenance'].includes(p.status))button('Passer en maintenance',()=>confirmAction('Activer la maintenance','Le suivi de ce projet continue en maintenance.',()=>api(`/api/projects/${p.id}/archive`,'POST',{version:p.version,status:'maintenance'})),$('roadmap-actions'),true);
   host.querySelectorAll('[data-submit-milestone]').forEach(b=>b.addEventListener('click',()=>milestoneAction(b.dataset.submitMilestone,'review')));
   host.querySelectorAll('[data-approve-milestone]').forEach(b=>b.addEventListener('click',()=>milestoneAction(b.dataset.approveMilestone,'approved')));
   host.querySelectorAll('[data-reject-milestone]').forEach(b=>b.addEventListener('click',()=>milestoneAction(b.dataset.rejectMilestone,'rejected')));
  } else if(tab==='tasks'){host.innerHTML=board(d.tasks);bindTasks(d.tasks);}
  else if(tab==='messages')renderMessages(host,d);
  else if(tab==='documents')renderDocuments(host,d);
  else if(tab==='invoices'){const inv=await api(`/api/projects/${p.id}/invoices`);host.innerHTML=invoiceRows(inv.items);bindInvoices(inv.items);}
  else if(tab==='proposals'){
   const proposals=await api(`/api/projects/${p.id}/proposals`);
   host.innerHTML=panel('Propositions versionnées',proposals.items.length?proposals.items.map(q=>`<article class="row"><div class="row-content"><strong>${escape(q.title)} · v${q.version}</strong><p>${escape(q.scope)}</p><p>${money(q.amount_cents)}</p></div>${badge(q.status)}<div class="row-actions">${coord&&q.status==='draft'?`<button class="secondary" data-proposal="${q.id}" data-decision="shared">Partager</button>`:''}${state.user.role==='client'&&q.status==='shared'?`<button class="button" data-proposal="${q.id}" data-decision="accepted">Accepter</button><button class="secondary" data-proposal="${q.id}" data-decision="declined">Refuser</button>`:''}</div></article>`).join(''):empty('Aucune proposition partagée.'))+'<div id="proposal-actions"></div>';
   if(coord)button('Nouvelle proposition',()=>modal('Nouvelle version',[{name:'title',label:'Objet de la proposition'},{name:'scope',label:'Prestations et livrables',type:'textarea'},{name:'assumptions',label:'Hypothèses',type:'textarea',required:false},{name:'exclusions',label:'Exclusions',type:'textarea',required:false},{name:'amount',label:'Montant hors taxes en euros',type:'number',min:0,step:'.01'}],async value=>{value.amount_cents=Math.round(value.amount*100);delete value.amount;await api(`/api/projects/${p.id}/proposals`,'POST',value);await refreshProject();}),$('proposal-actions'),true);
   host.querySelectorAll('[data-proposal]').forEach(b=>b.addEventListener('click',()=>confirmAction('Confirmer cette décision','La décision sera conservée avec cette version. Cette validation ne remplace pas une signature électronique qualifiée.',()=>api(`/api/proposals/${b.dataset.proposal}/decision`,'POST',{status:b.dataset.decision}))));
  }
 }
 function confirmAction(heading,label,action){modal(heading,[{name:'confirm',label,type:'checkbox'}],async()=>{await action();await refreshProject();toast('Décision enregistrée.');});}
 function milestoneAction(id,status){const m=state.bundle.milestones.find(x=>x.id===id);confirmAction('Validation du livrable',status==='review'?'Soumettre ce livrable au client':'Enregistrer ma décision sur ce livrable',()=>api(`/api/milestones/${id}/${status==='review'?'review':'approve'}`,'POST',{version:m.version,status}));}
 async function projectTeam(){
  const people=await api('/api/collaborators');
  modal('Affecter un collaborateur',[{name:'user_id',label:'Collaborateur',type:'select',options:people.items.map(p=>[p.id,p.name+' · '+roleNames[p.role]])}],async value=>{await api(`/api/projects/${state.project}/members`,'POST',value);await refreshProject();});
 }
 function taskFields(){const team=state.bundle.team;return [{name:'name',label:'Tâche'},{name:'description',label:'Spécifications et critères de revue',type:'textarea'},{name:'assignee_id',label:'Collaborateur affecté',type:'select',options:team.map(u=>[u.id,u.name])},{name:'milestone_id',label:'Jalon',type:'select',required:false,options:[['','Sans jalon'],...state.bundle.milestones.map(m=>[m.id,m.name])]},{name:'estimate_minutes',label:'Effort estimé en minutes',type:'number',min:1},{name:'due_date',label:'Date attendue',type:'date'},{name:'priority',label:'Priorité',type:'select',options:[['normal','Normale'],['high','Haute'],['low','Basse']]},{name:'client_visible',label:'Partager le titre et le statut avec le client',type:'checkbox',required:false}];}
 function newTask(){if(!state.bundle.team.length){toast('Affectez un collaborateur au projet avant de créer une tâche.');return;}modal('Créer une tâche',taskFields(),async d=>{if(!d.milestone_id)delete d.milestone_id;await api(`/api/projects/${state.project}/tasks`,'POST',d);state.tab='tasks';await refreshProject();});}
 function board(items){
  const groups=[['todo','À faire'],['in_progress','En cours'],['review','En revue'],['approved','Validées']];
  if(!items.length)return empty('Aucune tâche dans cette vue. Les tâches soumises en revue attendent une validation du responsable.');
  return '<div class="kanban">'+groups.map(([key,label])=>{const list=items.filter(t=>t.status===key||(key==='in_progress'&&t.status==='blocked'));return `<section class="kanban-column"><h2>${label}<span>${list.length}</span></h2>${list.map(t=>`<article class="task-card"><h3>${escape(t.name)}</h3><p>${escape(t.project_name||t.description)}</p><p>${date(t.due_date)} · ${t.estimate_minutes} min prévues</p>${badge(t.status)}<div class="row-actions">${taskActions(t)}</div></article>`).join('')}</section>`;}).join('')+'</div>';
 }
 function taskActions(t){
  const coord=['manager','account'].includes(state.user.role),own=t.assignee_id===state.user.id;
  let buttons='';
  if(['todo','blocked','review'].includes(t.status)&&(own||coord))buttons+=`<button class="secondary" data-task="${t.id}" data-status="in_progress">Reprendre</button>`;
  if(t.status==='in_progress'&&(own||coord))buttons+=`<button class="button" data-task="${t.id}" data-status="review">Soumettre</button><button class="secondary" data-task="${t.id}" data-status="blocked">Bloquée</button>`;
  if(t.status==='review'&&coord)buttons+=`<button class="button" data-task="${t.id}" data-status="approved">Valider</button>`;
  if(own)buttons+=`<button class="secondary" data-time-task="${t.id}">Mon temps</button>`;
  return buttons;
 }
 function bindTasks(items){
  document.querySelectorAll('[data-task]').forEach(b=>b.addEventListener('click',()=>{
   const task=items.find(t=>t.id===b.dataset.task),status=b.dataset.status;
   modal('Mettre à jour la tâche',[{name:'remaining_minutes',label:'Travail restant estimé en minutes',type:'number',min:0,value:status==='approved'||status==='review'?0:task.remaining_minutes}],async d=>{d.version=task.version;d.status=status;await api('/api/tasks/'+task.id,'PATCH',d);if(state.view==='project')await refreshProject();else await view('tasks');});
  }));
  document.querySelectorAll('[data-time-task]').forEach(b=>b.addEventListener('click',()=>modal('Enregistrer mon temps',[{name:'work_date',label:'Date',type:'date',value:today()},{name:'minutes',label:'Durée en minutes',type:'number',min:1},{name:'note',label:'Travail effectué',type:'textarea'},{name:'billable',label:'Temps facturable',type:'checkbox',required:false}],async d=>{await api(`/api/tasks/${b.dataset.timeTask}/time`,'POST',d);toast('Temps soumis à validation.');})));
 }
 async function taskList(epoch){
  const d=await api('/api/tasks');if(!current(epoch))return;
  title('Réalisation',state.user.role==='developer'?'Mes tâches et mes revues.':'Le travail en cours.','La soumission et la validation sont deux étapes distinctes.');
  $('view-content').innerHTML='<label class="filter">Rechercher une tâche<input type="search" id="task-search"></label><div id="task-board"></div>';
  const draw=query=>{const items=d.items.filter(t=>(t.name+' '+t.project_name).toLowerCase().includes(query));$('task-board').innerHTML=board(items);bindTasks(items);};draw('');$('task-search').addEventListener('input',e=>draw(e.target.value.toLowerCase()));
 }
 function renderMessages(host,d){
  if(state.user.role==='client')state.channel='external';else if(state.user.role==='developer')state.channel='internal';
  const coord=['manager','account'].includes(state.user.role),requests=d.requests;
  host.innerHTML=(coord?'<div class="toolbar" id="channel-buttons"></div>':'')+`<p class="notice">${state.channel==='internal'?'Échanges internes : les clients ne voient pas ce canal.':'Échanges partagés : le client et son interlocuteur Novalis uniquement.'}</p>`+panel('Conversation',`<div class="messages">${d.messages.filter(m=>m.channel===state.channel).map(m=>`<article class="message"><strong>${escape(m.author_name)}</strong><small>${instant(m.created_at)}</small><p>${escape(m.body)}</p></article>`).join('')||empty('Aucun message dans ce canal.')}</div><form class="chat-form" id="message-form"><label>Votre message<textarea name="body" required maxlength="10000"></textarea></label><button class="button" type="submit">Envoyer le message ↗</button></form>`)+panel('Demandes client',requests.length?requests.map(r=>`<article class="row"><div class="row-content"><strong>${escape(r.title)}</strong><p>${escape(r.description)}</p></div>${badge(r.status)}${coord&&!r.task_id?`<button class="secondary" data-qualify="${r.id}">Qualifier</button>`:''}</article>`).join(''):empty('Les demandes de changement sont suivies ici.'))+'<div id="request-actions"></div>';
  if(coord)[['internal','Interne'],['external','Avec le client']].forEach(([channel,label])=>button(label,()=>{state.channel=channel;renderMessages(host,d);},$('channel-buttons'),true));
  $('message-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const b=f.querySelector('button');b.disabled=true;try{await api(`/api/projects/${state.project}/messages`,'POST',{channel:state.channel,body:new FormData(f).get('body')});await refreshProject();}catch(e){toast(e.message);b.disabled=false;}});
  if(state.user.role==='client')button('Nouvelle demande',()=>modal('Envoyer une demande',[{name:'title',label:'Objet'},{name:'description',label:'Décrire votre demande',type:'textarea'}],async d=>{await api(`/api/projects/${state.project}/requests`,'POST',d);await refreshProject();}),$('request-actions'));
  host.querySelectorAll('[data-qualify]').forEach(b=>b.addEventListener('click',()=>{
   const req=d.requests.find(r=>r.id===b.dataset.qualify);const fields=taskFields().filter(f=>f.name!=='client_visible');fields[0].value=req.title;fields[1].value=req.description;fields.push({name:'within_scope',label:'Cette demande entre dans le périmètre approuvé ; tout avenant nécessaire a été accepté',type:'checkbox'});
   modal('Qualifier et planifier',fields,async value=>{value.version=req.version;if(!value.milestone_id)delete value.milestone_id;await api(`/api/requests/${req.id}/qualify`,'POST',value);await refreshProject();});
  }));
 }
 function renderDocuments(host,d){
  host.innerHTML=panel('Documents accessibles',d.documents.length?d.documents.map(doc=>`<article class="row"><div class="row-content"><strong>${escape(doc.filename)}</strong><p>${Math.ceil(doc.size/1024)} Ko · ${doc.channel==='internal'?'Interne':'Partagé avec le client'}</p></div><a class="secondary" href="/api/documents/${doc.id}" download>Télécharger</a></article>`).join(''):empty('Aucun document dans votre périmètre d’accès.'))+'<div id="document-actions"></div>';
  if(state.user.role==='finance')return;
  button('Ajouter un document',()=>modal('Partager un document',[{name:'file',label:'PDF, texte, PNG, JPEG ou WebP — 6 Mo maximum',type:'file'},{name:'channel',label:'Visibilité',type:'select',options:state.user.role==='client'?[['external','Avec mon interlocuteur']]:state.user.role==='developer'?[['internal','Interne']]:[['internal','Interne'],['external','Avec le client']]}],async value=>{const form=new FormData();form.append('file',value.file);form.append('channel',value.channel);await api(`/api/projects/${state.project}/documents`,'POST',form);await refreshProject();}),$('document-actions'));
 }
 async function timeList(epoch){
  const d=await api('/api/time');if(!current(epoch))return;
  title('Temps','Le travail enregistré.','Les saisies soumises restent distinctes du temps validé.');
  $('view-content').innerHTML=panel('Feuilles de temps',d.items.length?d.items.map(e=>`<article class="row"><div class="row-content"><strong>${escape(e.task_name)} · ${e.minutes} min</strong><p>${escape(e.user_name)} · ${date(e.work_date)} · ${e.billable?'Facturable':'Non facturable'}</p><p>${escape(e.note)}</p></div>${badge(e.status)}<div class="row-actions">${state.user.role!=='developer'&&e.status==='submitted'?`<button class="button" data-time="${e.id}" data-status="approved">Valider</button><button class="secondary" data-time="${e.id}" data-status="rejected">Refuser</button>`:''}</div></article>`).join(''):empty('Enregistrez le temps depuis une tâche qui vous est affectée.'));
  document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>modal('Examiner une saisie',[{name:'confirm',label:'Confirmer cette décision',type:'checkbox'}],async()=>{await api(`/api/time/${b.dataset.time}/review`,'POST',{status:b.dataset.status});await view('time');})));
 }
 async function calendar(epoch){
  const d=await api('/api/calendar');if(!current(epoch))return;
  title('Rendez-vous','Une heure pour comprendre le besoin.','Seuls les créneaux publiés et non réservés sont proposés aux visiteurs.');
  $('view-content').innerHTML=panel('Créneaux et rendez-vous',d.items.length?d.items.map(s=>`<article class="row"><div class="row-content"><strong>${instant(s.starts_at)}</strong><p>${s.meeting_id?escape((s.company||s.name)+' — '+s.name):'Créneau publié et disponible'}</p><p>1 heure · affichage dans votre fuseau local</p></div>${badge(s.status||'active')}</article>`).join(''):empty('Publiez vos premiers créneaux disponibles.'));
  button('Publier un créneau',()=>modal('Ouvrir un rendez-vous d’une heure',[{name:'starts_at',label:'Début — heure locale de votre navigateur ('+Intl.DateTimeFormat().resolvedOptions().timeZone+')',type:'datetime-local'}],async value=>{value.starts_at=new Date(value.starts_at).toISOString();await api('/api/calendar/slots','POST',value);await view('calendar');}));
 }
 function invoiceRows(items){return panel('Factures et échéances',items.length?items.map(i=>`<article class="row"><div class="row-content"><strong>${escape(i.external_number||'Brouillon interne')}</strong><p>${escape(i.project_name||'')} · ${date(i.due_date)}</p><p>${money(i.total_cents)} · solde ${money(i.balance_cents)}</p></div>${badge(i.status)}<div class="row-actions">${['manager','finance'].includes(state.user.role)&&i.status==='draft'?`<button class="secondary" data-register="${i.id}">Référence externe</button>`:''}${['manager','finance'].includes(state.user.role)&&i.status==='registered'?`<button class="button" data-payment="${i.id}">Confirmer un règlement</button>`:''}<button class="secondary" data-invoice="${i.id}">Détail</button></div></article>`).join(''):empty('Aucune facture accessible. Les brouillons internes ne sont pas des factures réglementaires émises.'));}
 function bindInvoices(items){
  document.querySelectorAll('[data-invoice]').forEach(b=>b.addEventListener('click',async()=>{try{const d=await api('/api/invoices/'+b.dataset.invoice);openDialog('Détail de la facture',`<p class="dialog-copy">${escape(d.invoice.external_number||'Brouillon non émis')} · ${date(d.invoice.due_date)}</p><div class="rows">${d.lines.map(l=>`<div class="row"><div class="row-content"><strong>${escape(l.description)}</strong><p>${l.quantity} × ${money(l.unit_cents)} · TVA ${l.vat_basis_points/100} %</p></div></div>`).join('')}</div><p class="dialog-copy">Total : ${money(d.invoice.total_cents)}<br>Solde : ${money(d.invoice.balance_cents)}</p>`);}catch(e){toast(e.message);}}));
  document.querySelectorAll('[data-register]').forEach(b=>b.addEventListener('click',()=>modal('Enregistrer une facture déjà émise',[{name:'external_number',label:'Numéro de la facture émise par votre outil comptable'},{name:'peppol_reference',label:'Référence de transmission Peppol ou preuve externe'},{name:'issued_externally',label:'La facture a déjà été émise et transmise par le fournisseur habilité',type:'checkbox'}],async value=>{await api(`/api/invoices/${b.dataset.register}/register`,'POST',value);await refreshFinance();})));
  document.querySelectorAll('[data-payment]').forEach(b=>b.addEventListener('click',()=>modal('Confirmer un règlement bancaire',[{name:'amount',label:'Montant reçu en euros',type:'number',min:'.01',step:'.01'},{name:'paid_at',label:'Date de réception',type:'date',value:today()},{name:'bank_reference',label:'Référence bancaire vérifiée'},{name:'bank_confirmed',label:'Le règlement a été vérifié sur le compte bancaire',type:'checkbox'}],async value=>{value.amount_cents=Math.round(value.amount*100);delete value.amount;value.idempotency_key=crypto.randomUUID();await api(`/api/invoices/${b.dataset.payment}/payments`,'POST',value);await refreshFinance();toast('Règlement bancaire enregistré.');})));
 }
 async function refreshFinance(){if(state.view==='project')await refreshProject();else await view('finance');}
 async function financeView(epoch){
  const d=await api('/api/finance');if(!current(epoch))return;
  title('Finances','Des montants traçables.','Suivi de gestion. L’émission réglementaire s’effectue dans votre outil comptable, puis sa référence est enregistrée ici.');
  const names={invoiced_cents:'Factures enregistrées TTC',paid_cents:'Règlements confirmés',receivable_cents:'Solde à recevoir',expenses_cents:'Dépenses enregistrées'};
  $('view-content').innerHTML='<div class="metrics">'+Object.entries(d.totals).map(([k,v])=>`<div class="metric"><span>${names[k]}</span><strong>${money(v)}</strong></div>`).join('')+'</div><p class="notice">Un brouillon interne n’est pas une facture Peppol. Les paiements sont confirmés par une personne habilitée à partir d’une référence bancaire vérifiée. Aucun paiement en ligne n’est activé.</p>'+invoiceRows(d.invoices)+panel('Dépenses',d.expenses.length?d.expenses.map(e=>`<article class="row"><div class="row-content"><strong>${escape(e.description)}</strong><p>${date(e.spent_at)}</p></div><strong>${money(e.amount_cents)}</strong></article>`).join(''):empty('Aucune dépense enregistrée.'));bindInvoices(d.invoices);
  button('Brouillon de facture',newInvoice);button('Enregistrer une dépense',newExpense,$('view-actions'),true);const link=document.createElement('a');link.className='secondary';link.href='/api/finance/export.csv';link.textContent='Exporter CSV';$('view-actions').append(link);
 }
 async function newInvoice(){
  const p=await api('/api/projects');if(!p.items.length){toast('Créez un projet avant de préparer un brouillon.');return;}
  modal('Préparer un brouillon de facture',[{name:'project_id',label:'Projet',type:'select',options:p.items.map(i=>[i.id,i.name])},{name:'description',label:'Prestation'},{name:'amount',label:'Montant hors taxes en euros',type:'number',min:0,step:'.01'},{name:'vat',label:'TVA (%) à confirmer avec le comptable',type:'number',min:0,step:'.01',value:21},{name:'due_date',label:'Échéance prévue',type:'date'}],async d=>{await api(`/api/projects/${d.project_id}/invoices`,'POST',{due_date:d.due_date,lines:[{description:d.description,quantity:1,unit_cents:Math.round(d.amount*100),vat_basis_points:Math.round(d.vat*100)}]});await view('finance');});
 }
 function newExpense(){modal('Enregistrer une dépense',[{name:'description',label:'Dépense ou fournisseur'},{name:'amount',label:'Montant en euros',type:'number',min:0,step:'.01'},{name:'spent_at',label:'Date',type:'date',value:today()}],async d=>{d.amount_cents=Math.round(d.amount*100);delete d.amount;await api('/api/expenses','POST',d);await view('finance');});}
 async function users(epoch){
  const d=await api('/api/users');if(!current(epoch))return;
  title('Accès','La bonne personne, le bon rôle.','L’utilisateur active lui-même son compte depuis une invitation à usage unique.');
  $('view-content').innerHTML=panel('Comptes',d.items.length?d.items.map(u=>`<article class="row"><div class="row-content"><strong>${escape(u.name)}</strong><p>${escape(u.email)} · ${escape(roleNames[u.role])}</p></div>${badge(u.status)}${u.id!==state.user.id&&u.status!=='invited'&&!(state.user.role==='sysadmin'&&['manager','finance','sysadmin'].includes(u.role))?`<button class="secondary" data-user="${u.id}" data-status="${u.status==='active'?'suspended':'active'}">${u.status==='active'?'Suspendre':'Réactiver'}</button>`:''}</article>`).join(''):empty('Aucun compte.'));
  button('Inviter un utilisateur',inviteUser);
  document.querySelectorAll('[data-user]').forEach(b=>b.addEventListener('click',()=>modal('Modifier un accès',[{name:'confirm',label:'Cette action révoquera les sessions de cet utilisateur',type:'checkbox'}],async()=>{await api(`/api/users/${b.dataset.user}/status`,'POST',{status:b.dataset.status});await view('users');})));
 }
 async function inviteUser(){
  const clients=state.user.role==='manager'?await api('/api/clients'):{items:[]};
  const roles=Object.entries(roleNames).filter(([key])=>state.user.role==='manager'||!['manager','finance','sysadmin','client'].includes(key));
  const fields=[{name:'name',label:'Nom complet'},{name:'email',label:'Adresse e-mail',type:'email'},{name:'role',label:'Rôle',type:'select',options:roles}];
  if(clients.items.length)fields.push({name:'client_id',label:'Organisation cliente (uniquement pour le rôle Client)',type:'select',required:false,options:[['','Sans organisation cliente'],...clients.items.map(c=>[c.id,c.name])]});
  modal('Inviter un utilisateur',fields,async d=>{if(d.role!=='client')delete d.client_id;if(d.role==='client'&&!d.client_id)throw new Error('Sélectionnez l’organisation de ce client.');const invitation=await api('/api/users','POST',d);await view('users');
   if(!invitation.activation_url){toast('Invitation préparée et placée en attente d’envoi.');return;}
   setTimeout(()=>{
    openDialog('Partager l’invitation',`<p class="dialog-copy">${invitation.email_enabled?'Un e-mail est en attente d’envoi. Vous pouvez aussi transmettre ce lien personnel.':'L’envoi d’e-mails est désactivé. Transmettez ce lien personnel directement à la personne invitée.'} Ce lien est valable 24 heures et ne peut être utilisé qu’une fois.</p><label class="dialog-copy">Lien d’activation<input id="invitation-url" readonly value="${escape(invitation.activation_url)}"></label><button class="button" id="copy-invitation" type="button">Copier le lien</button><p id="invitation-copy-status" role="status"></p>`);
    $('invitation-url').addEventListener('focus',e=>e.target.select());
    $('copy-invitation').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(invitation.activation_url);$('invitation-copy-status').textContent='Lien copié. Transmettez-le uniquement à la personne invitée.';}catch{$('invitation-url').focus();$('invitation-url').select();$('invitation-copy-status').textContent='Sélectionnez et copiez le lien affiché.';}});
   },0);});
 }
 async function journal(epoch){
  const d=await api('/api/audit');if(!current(epoch))return;title('Journal','Les décisions restent traçables.','Les opérations importantes sont conservées dans un journal qui refuse les modifications et suppressions applicatives.');
  $('view-content').innerHTML=panel('Derniers événements',d.items.map(e=>`<article class="row"><div class="row-content"><strong>${escape(e.action)}</strong><p>${escape(e.entity_id)}</p></div><span class="mini">${instant(e.created_at)}</span></article>`).join('')||empty('Aucun événement.'));
 }
 async function integrations(epoch){
  const d=await api('/api/integrations');if(!current(epoch))return;title('Connexions','Des services dont l’état est explicite.','Les traitements en attente ne sont pas annoncés comme transmis.');
  $('view-content').innerHTML=panel('Services',`<div class="rows"><article class="row"><div class="row-content"><strong>E-mail transactionnel</strong><p>${d.email==='configured'?'SMTP configuré ; consultez le résultat de chaque envoi.':'Service à configurer avant l’envoi d’invitations.'}</p></div></article><article class="row"><div class="row-content"><strong>Rendez-vous</strong><p>Calendrier interne et réservations transactionnelles. Synchronisation externe non configurée.</p></div></article><article class="row"><div class="row-content"><strong>Facturation et paiement</strong><p>Références de factures externes et règlements bancaires. Point d’accès Peppol et prestataire de paiement non intégrés.</p></div></article></div>`)+panel('File des messages',d.outbox.length?d.outbox.map(e=>`<article class="row"><div class="row-content"><strong>${escape(e.subject)}</strong><p>${instant(e.created_at)} · ${e.attempts} tentative(s)</p></div>${badge(e.status)}</article>`).join(''):empty('Aucun e-mail en attente.'));
 }
 const hash=new URLSearchParams(location.hash.slice(1)),activation=hash.get('activate'),booking=hash.get('booking');
 if(activation||booking)history.replaceState(null,'',location.pathname);
 if(activation){$('login-form').hidden=true;$('activation-form').hidden=false;$('auth-title').textContent='Activer mon accès.';$('auth-intro').textContent='Définissez un mot de passe personnel de 12 caractères minimum.';$('reset-password').hidden=true;
  $('activation-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('password')!==f.get('confirm')){$('auth-status').textContent='Les deux mots de passe doivent correspondre.';return;}try{await api('/api/auth/activate','POST',{token:activation,password:f.get('password')});$('activation-form').hidden=true;$('login-form').hidden=false;$('auth-status').textContent='Votre accès est activé. Connectez-vous.';}catch(e){$('auth-status').textContent=e.message;}});
 }else if(booking){$('login-form').hidden=true;$('booking-management').hidden=false;$('reset-password').hidden=true;$('auth-title').textContent='Gérer mon rendez-vous.';$('auth-intro').textContent='Votre lien personnel permet de reporter ou annuler la réservation.';
  api('/api/public/slots').then(d=>{const select=$('reschedule-slot');d.items.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=instant(s.starts_at);select.append(o);});$('reschedule-booking').disabled=!d.items.length;}).catch(e=>{$('auth-status').textContent=e.message;});
  $('cancel-booking').addEventListener('click',()=>modal('Annuler le rendez-vous',[{name:'confirm',label:'Confirmer l’annulation',type:'checkbox'}],async()=>{await api('/api/public/bookings/cancel','POST',{token:booking});$('auth-status').textContent='Rendez-vous annulé.';$('booking-management').hidden=true;}));
  $('reschedule-booking').addEventListener('click',async()=>{try{const d=await api('/api/public/bookings/reschedule','POST',{token:booking,slot_id:$('reschedule-slot').value});$('auth-status').textContent='Rendez-vous reporté : '+instant(d.starts_at);}catch(e){$('auth-status').textContent=e.message;}});
 }else api('/api/session').then(start).catch(e=>{if(e.status!==401)$('auth-status').textContent=e.message;});
})();
