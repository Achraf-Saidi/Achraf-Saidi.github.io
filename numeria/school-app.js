import { initSchool, getSchool, storageMode, subscribeSchool, newId, dispatch, downloadResource, downloadBlob, exportBackup, importBackup, resetSchool } from './school-store.js?v=cf0edce1d5';
import { authenticateDemo, DEMO_ACCOUNTS, DEMO_PASSWORD, LEARNERS, courseIds, learnerIds, visibleResources, quizForCourse, scoreQuiz } from './school-core.js?v=cf0edce1d5';
import { messages } from './i18n.js?v=cf0edce1d5';
import { NAV, loginHTML, shellHTML, userForm, courseForm, resourceForm, assignmentForm, assignmentDialog, submissionDialog, lessonDialog, groupDialog, attendanceDialog, sessionForm, sessionDialog, invoiceForm, invoicePayDialog, announcementForm, resetDialog, reportHTML, invoiceReceiptHTML } from './school-views.js?v=cf0edce1d5';

const root=document.getElementById('school-app');
let actorId='',screen='overview',query='',child='all',dialogInfo=null,lastFocus=null,busy=false,toastTimer;
try{actorId=sessionStorage.getItem('numeria.school.account')||'';}catch{}
const actor=()=>getSchool()?.users.find(u=>u.id===actorId&&u.active);
const requireRole=(roles)=>{if(!actor()||!roles.includes(actor().role))throw Error('Cet écran n’appartient pas à ce rôle.');};
const allowedCourse=id=>{if(!courseIds(getSchool(),actor()).includes(id))throw Error('Ce parcours n’est pas attribué à ce compte.');return getSchool().courses.find(c=>c.id===id);};
const toast=message=>{const el=document.getElementById('school-toast');if(!el)return;clearTimeout(toastTimer);el.textContent=message;el.classList.add('visible');toastTimer=setTimeout(()=>el.classList.remove('visible'),5000);};
function remember(){try{if(actorId)sessionStorage.setItem('numeria.school.account',actorId);else sessionStorage.removeItem('numeria.school.account');}catch{toast('La connexion reste active seulement dans cette page.');}}
function render(focus=false){
 document.body.classList.remove('school-dialog-open');dialogInfo=null;
 const user=actor();if(!user){actorId='';remember();root.innerHTML=loginHTML();return;}
 if(!NAV[user.role].some(item=>item[0]===screen))screen='overview';
 root.innerHTML=shellHTML(getSchool(),user,screen,{query,child,mode:storageMode()});
 const modal=document.getElementById('school-dialog');
 modal.addEventListener('close',()=>{document.body.classList.remove('school-dialog-open');dialogInfo=null;if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
 modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();});
 document.getElementById('school-menu').addEventListener('close',()=>document.body.classList.remove('school-dialog-open'));
 if(focus)document.getElementById('school-main').focus({preventScroll:true});
}
function navigate(next){if(!NAV[actor().role].some(item=>item[0]===next))throw Error('Navigation non autorisée.');screen=next;query='';window.history.replaceState(null,'',`#${screen}`);render(true);window.scrollTo({top:0,behavior:'instant'});}
function open(html,info={}){
 const modal=document.getElementById('school-dialog');if(!modal.open)lastFocus=document.activeElement;
 document.getElementById('school-dialog-body').innerHTML=html;dialogInfo=info;if(!modal.open)modal.showModal();document.body.classList.add('school-dialog-open');modal.scrollTop=0;modal.querySelector('#school-dialog-title').focus({preventScroll:true});
}
async function save(command,file=null){busy=true;try{return await dispatch(actorId,command,file);}finally{busy=false;}}
function accountPick(id){const account=DEMO_ACCOUNTS.find(u=>u.id===id);if(!account)return;const form=root.querySelector('[data-school-form="login"]');form.querySelector('[name="email"]').value=account.email;form.querySelector('[name="password"]').value=DEMO_PASSWORD;root.querySelectorAll('.school-account-pick').forEach(button=>{const chosen=button.dataset.id===id;button.classList.toggle('selected',chosen);button.setAttribute('aria-pressed',String(chosen));});form.querySelector('[type="submit"]').focus({preventScroll:true});}
function checkSubmission(id){const sub=getSchool().submissions.find(s=>s.id===id),assignment=getSchool().assignments.find(a=>a.id===sub?.assignmentId);if(!sub||!learnerIds(getSchool(),actor()).includes(sub.userId)||!courseIds(getSchool(),actor()).includes(assignment?.courseId))throw Error('Copie non accessible.');return sub;}
function checkInvoice(id){const x=getSchool().invoices.find(i=>i.id===id);if(!x||!learnerIds(getSchool(),actor()).includes(x.userId)||actor().role==='teacher')throw Error('Échéance non accessible.');return x;}

document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-school-action],[data-school-screen]');if(!button||!root.contains(button)||busy)return;
 try{
  if(button.dataset.schoolScreen){navigate(button.dataset.schoolScreen);return;}
  const {schoolAction:action,id}=button.dataset,s=getSchool(),user=actor();
  switch(action){
   case 'pick-account':accountPick(id);break;
   case 'show-password':{const el=root.querySelector('[name="password"]');el.type=el.type==='password'?'text':'password';button.textContent=el.type==='password'?'Afficher':'Masquer';button.setAttribute('aria-label',`${el.type==='password'?'Afficher':'Masquer'} le mot de passe`);break;}
   case 'logout':actorId='';query='';child='all';remember();render();window.history.replaceState(null,'',location.pathname);break;
   case 'menu':document.getElementById('school-menu').showModal();document.body.classList.add('school-dialog-open');break;
   case 'close-menu':document.getElementById('school-menu').close();break;
   case 'close':document.getElementById('school-dialog').close();break;
   case 'go-courses':navigate('courses');break;
   case 'go-followup':navigate('followup');break;
   case 'clear-search':query='';render();break;
   case 'user-new':case 'user-edit':requireRole(['admin']);open(userForm(s,action==='user-edit'?id:''));break;
   case 'course-new':case 'course-edit':requireRole(['admin']);open(courseForm(s,action==='course-edit'?id:''));break;
   case 'course-open':allowedCourse(id);open(lessonDialog(s,user,id),{type:'lesson',id,module:0});break;
   case 'lesson-select':{const c=allowedCourse(id),module=Number(button.dataset.module);if(!Number.isInteger(module)||module<0||module>=c.modules.length)throw Error('Module invalide.');open(lessonDialog(s,user,id,module),{type:'lesson',id,module});break;}
   case 'group-open':requireRole(['admin','teacher']);allowedCourse(id);open(groupDialog(s,id));break;
   case 'resource-new':case 'resource-edit':requireRole(['admin','teacher']);if(id&&!visibleResources(s,user).some(r=>r.id===id))throw Error('Ressource non accessible.');open(resourceForm(s,user,action==='resource-edit'?id:''));break;
   case 'resource-download':if(!visibleResources(s,user).some(r=>r.id===id))throw Error('Ressource non accessible.');await downloadResource(id,user);toast('Téléchargement demandé au navigateur.');break;
   case 'resource-delete':open(`<h2 id="school-dialog-title" tabindex="-1">Supprimer cette ressource démo ?</h2><p>Le fichier local et sa référence seront retirés de l’espace école.</p><form data-school-form="resource-delete" data-id="${id}" class="school-form"><label class="school-checkbox"><input name="confirm" type="checkbox" required> Supprimer la ressource et son PDF local.</label><button class="school-button primary" type="submit">Supprimer</button><p class="school-form-status" role="status"></p></form>`);break;
   case 'assignment-new':requireRole(['admin','teacher']);open(assignmentForm(s,user));break;
   case 'assignment-open':{requireRole(LEARNERS);const a=s.assignments.find(a=>a.id===id);allowedCourse(a?.courseId);open(assignmentDialog(s,user,id));break;}
   case 'grade-open':requireRole(['admin','teacher']);checkSubmission(id);open(submissionDialog(s,id,true));break;
   case 'submission-open':checkSubmission(id);open(submissionDialog(s,id,false));break;
   case 'attendance-open':requireRole(['admin','teacher']);allowedCourse(s.sessions.find(x=>x.id===id)?.courseId);open(attendanceDialog(s,id));break;
   case 'session-new':requireRole(['admin','teacher']);open(sessionForm(s,user));break;
   case 'session-open':allowedCourse(s.sessions.find(x=>x.id===id)?.courseId);open(sessionDialog(s,user,id));break;
   case 'session-delete':open(`<h2 id="school-dialog-title" tabindex="-1">Retirer cette séance démo ?</h2><p>La séance et les présences associées seront retirées du planning local.</p><form data-school-form="session-delete" data-id="${id}" class="school-form"><label class="school-checkbox"><input name="confirm" type="checkbox" required> Retirer cette séance.</label><button class="school-button primary" type="submit">Retirer</button><p class="school-form-status" role="status"></p></form>`);break;
   case 'calendar-export':exportCalendar(s.sessions.filter(x=>courseIds(s,user).includes(x.courseId)));toast('Calendrier téléchargé, aucune invitation envoyée.');break;
   case 'session-export':{const x=s.sessions.find(x=>x.id===id);allowedCourse(x?.courseId);exportCalendar([x]);toast('Séance exportée, aucune invitation envoyée.');break;}
   case 'invoice-new':requireRole(['admin']);open(invoiceForm(s));break;
   case 'invoice-pay':checkInvoice(id);open(invoicePayDialog(s,id));break;
   case 'invoice-receipt':checkInvoice(id);downloadBlob(new Blob([invoiceReceiptHTML(s,id)],{type:'text/html;charset=utf-8'}),`numeria-${id}-demo.html`);toast('Récapitulatif fictif téléchargé.');break;
   case 'export-finance':requireRole(['admin']);exportFinance();toast('Données financières fictives exportées.');break;
   case 'report-user':if(!learnerIds(s,user).includes(id))throw Error('Bulletin non accessible.');downloadBlob(new Blob([reportHTML(s,id)],{type:'text/html;charset=utf-8'}),`numeria-bulletin-${id}-demo.html`);toast('Bulletin de démonstration téléchargé, imprimable depuis le navigateur.');break;
   case 'messages-read':await save({type:'message.read',id:newId('read')});render();toast('Messages reçus marqués comme lus.');break;
   case 'reply':{const select=root.querySelector('[name="recipientId"]');if(![...select.options].some(o=>o.value===id))throw Error('Destinataire non accessible.');select.value=id;root.querySelector('[name="text"]').focus();break;}
   case 'announcement-new':requireRole(['admin']);open(announcementForm());break;
   case 'backup-export':{requireRole(['admin']);busy=true;try{const backup=await exportBackup(actorId);downloadBlob(new Blob([JSON.stringify(backup)],{type:'application/json'}),`numeria-ecole-demo-${new Date().toISOString().slice(0,10)}.json`);toast('Sauvegarde complète téléchargée avec les PDF.');}finally{busy=false;}break;}
   case 'reset-open':requireRole(['admin']);open(resetDialog());break;
  }
 }catch(error){toast(error.message);}
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('[data-school-form]')||!root.contains(form))return;event.preventDefault();if(busy||!form.reportValidity())return;
 const type=form.dataset.schoolForm,data=new FormData(form),values=Object.fromEntries(data),id=form.dataset.id||'',submit=form.querySelector('[type="submit"]');
 const status=form.querySelector('.school-form-status');if(status)status.textContent='';if(submit)submit.disabled=true;
 try{
  if(type==='login'){
   const account=authenticateDemo(getSchool(),values.email,values.password);
   if(!account){root.innerHTML=loginHTML('Identifiants incorrects ou compte test désactivé.');root.querySelector('[name="email"]').value=values.email;return;}
   actorId=account.id;remember();screen=NAV[account.role].some(n=>n[0]===location.hash.slice(1))?location.hash.slice(1):'overview';render(true);toast(`Espace ${account.role==='admin'?'administrateur':account.role==='parent'?'parent':account.role==='teacher'?'professeur':'apprenant'} de démonstration ouvert.`);return;
  }
  if(type==='search'){query=values.query.trim();render();return;}
  let command,file;
  switch(type){
   case 'user-save':command={type:'user.save',id:id||newId('u'),payload:{...values,active:values.active==='true',children:data.getAll('children'),courses:data.getAll('courses')}};break;
   case 'course-save':command={type:'course.save',id:id||newId('course'),payload:{...values,title:{fr:values.titleFr,en:values.titleEn,ar:values.titleAr},description:{fr:values.descriptionFr,en:values.descriptionEn,ar:values.descriptionAr},modules:values.modules.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const [title,...text]=line.split('|');return {title:title.trim(),text:text.join('|').trim()};})}};break;
   case 'resource-save':file=form.querySelector('[name="pdf"]').files[0];command={type:'resource.save',id:id||newId('res'),payload:{...values,public:data.has('public')}};break;
   case 'resource-delete':command={type:'resource.delete',id};break;
   case 'assignment-save':command={type:'assignment.save',id:newId('a'),payload:{...values,due:algerianISO(values.due)}};break;
   case 'assignment-submit':command={type:'assignment.submit',id,payload:{text:values.text}};break;
   case 'submission-grade':command={type:'submission.grade',id,payload:{grade:values.grade,feedback:values.feedback}};break;
   case 'attendance-save':command={type:'attendance.save',id,payload:{records:Object.fromEntries([...data.entries()].filter(([key])=>key.startsWith('att-')).map(([key,value])=>[key.slice(4),value]))}};break;
   case 'session-save':command={type:'session.save',id:newId('s'),payload:{...values,start:algerianISO(values.start)}};break;
   case 'session-delete':command={type:'session.delete',id};break;
   case 'invoice-save':command={type:'invoice.save',id:newId('inv'),payload:{...values,due:algerianISO(values.due)}};break;
   case 'invoice-pay':command={type:'invoice.pay',id,payload:{method:values.method}};break;
   case 'message-save':command={type:'message.send',id:newId('m'),payload:{recipientId:values.recipientId,text:values.text}};break;
   case 'announcement-save':command={type:'announcement.save',id:newId('an'),payload:{title:values.title,text:values.text}};break;
   case 'site-save':{const old=getSchool().site[values.key]||messages[values.key];command={type:'site.save',id:newId('content'),payload:{overrides:{[values.key]:{...old,[values.language]:values.value}}}};break;}
   case 'lesson-complete':{
    const course=allowedCourse(id),answers=quizForCourse(course).map((_,i)=>Number(values[`q${i}`])),score=scoreQuiz(course,answers),module=Number(form.dataset.module);
    if(score>=2){await save({type:'lesson.complete',id,payload:{module,answers}});render();}
    open(lessonDialog(getSchool(),actor(),id,module,{answers,score}),{type:'lesson',id,module});return;
   }
   case 'backup-import':{requireRole(['admin']);const file=form.querySelector('[name="backup"]').files[0];if(!file||file.size>35*1024*1024)throw Error('Choisissez une sauvegarde JSON de 35 Mo maximum.');let input;try{input=JSON.parse(await file.text());}catch{throw Error('Le fichier n’est pas un JSON valide.');}busy=true;try{await importBackup(actorId,input);}finally{busy=false;}render();toast('Sauvegarde restaurée sur cet appareil.');return;}
   case 'reset':busy=true;try{await resetSchool(actorId);}finally{busy=false;}child='all';query='';render();toast('Les exemples initiaux sont restaurés.');return;
   default:throw Error('Formulaire inconnu.');
  }
  await save(command,file);render();toast(type==='invoice-pay'?'Règlement fictif enregistré. Aucun paiement effectué.':type==='message-save'?'Message enregistré localement. Aucun e-mail envoyé.':'Modification enregistrée sur cet appareil.');
 }catch(error){if(status?.isConnected)status.textContent=error.message;toast(error.message);}
 finally{if(submit?.isConnected)submit.disabled=false;}
});
document.addEventListener('change',event=>{
 const el=event.target;if(!root.contains(el))return;
 if(el.matches('[data-school-child]')){child=el.value;render();}
 if(el.matches('[data-account-role]')){const form=el.closest('form');form.querySelector('[data-role-courses]').hidden=!LEARNERS.includes(el.value);form.querySelector('[data-role-children]').hidden=el.value!=='parent';}
 if(el.matches('[data-course-template]')){const base=getSchool().courses.find(c=>c.id===el.value);if(!base)return;const form=el.closest('form');for(const key of ['price','weeks','live','practice'])form.querySelector(`[name="${key}"]`).value=base[key];form.querySelector('[name="modules"]').value=base.modules.map(m=>`${m.title} | ${m.text}`).join('\n');}
 if(el.matches('[data-content-key],[data-content-language]')){const form=el.closest('form'),key=form.querySelector('[name="key"]').value,lang=form.querySelector('[name="language"]').value;form.querySelector('[data-content-value]').value=getSchool().site[key]?.[lang]||messages[key]?.[lang]||'';const long=key.endsWith('Copy')||key.endsWith('Lead');form.querySelector('[data-content-value]').maxLength=long?1600:180;}
});
function algerianISO(value){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Date invalide.');return new Date(`${value}:00+01:00`).toISOString();}
const icsEscape=value=>String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const icsDate=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function foldLine(line){let result='',current='',size=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(size+bytes>72){result+=current+'\r\n';current=' ';size=1;}current+=char;size+=bytes;}return result+current;}
function exportCalendar(items){const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Numeria//Ecole Demo//FR','CALSCALE:GREGORIAN'];for(const s of items){lines.push('BEGIN:VEVENT',`UID:${s.id}@numeria.dz`,`DTSTAMP:${icsDate(Date.now())}`,`DTSTART:${icsDate(s.start)}`,`DTEND:${icsDate(Date.parse(s.start)+s.duration*60000)}`,`SUMMARY:${icsEscape(s.title+' (démo)')}`,'DESCRIPTION:Séance fictive Numeria. Aucune invitation envoyée.');if(s.meet)lines.push(`URL:${s.meet}`);lines.push('END:VEVENT');}lines.push('END:VCALENDAR');downloadBlob(new Blob([lines.map(foldLine).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}),'numeria-agenda-demo.ics');}
function exportFinance(){const s=getSchool(),cell=value=>`"${String(value).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')}"`;const rows=[['Référence fictive','Apprenant fictif','Formation','DA','Statut démo','Méthode','Échéance ISO'],...s.invoices.map(i=>[i.reference,s.users.find(u=>u.id===i.userId).name,s.courses.find(c=>c.id===i.courseId).title.fr,i.amount,i.status,i.method,i.due])];downloadBlob(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'numeria-finances-demo.csv');}

await initSchool();screen=location.hash.slice(1)||'overview';render();
subscribeSchool((_,external)=>{if(!external||busy)return;if(!actor()){render();return;}if(document.getElementById('school-dialog')?.open){toast('Un autre onglet a modifié les données. Fermez ce panneau pour actualiser la vue.');return;}render();toast('Données actualisées depuis l’autre onglet.');});
const demoRole=new URLSearchParams(location.search).get('demo');if(!actor()&&demoRole){const account=DEMO_ACCOUNTS.find(u=>u.role===demoRole);if(account)accountPick(account.id);}
window.addEventListener('hashchange',()=>{if(actor()){screen=location.hash.slice(1);query='';render(true);}});
