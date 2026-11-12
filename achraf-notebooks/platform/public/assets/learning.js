const $=id=>document.getElementById(id);
const state={catalog:null,progress:null,track:null,activeExam:null,timer:null,logged:false};
const pilot=["D3","D6","D9","D13"];
function make(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
async function request(path,data){
 const options={method:data===undefined?"GET":"POST",credentials:"same-origin",headers:{"Accept":"application/json"}};
 if(data!==undefined){options.headers["Content-Type"]="application/json";options.body=JSON.stringify(data);}
 const r=await fetch(path,options);
 const v=await r.json().catch(()=>({error:"invalid_response"}));
 if(!r.ok)throw Object.assign(Error(v.error||"service_unavailable"),{status:r.status,details:v});
 return v;
}
function listPasses(){return new Map((state.progress?.passed||[]).map(x=>[x.exam_id,x.best_score]));}
function studiedIds(){return new Set((state.progress?.selfReported||[]).filter(x=>x.self_reported_completed).map(x=>x.module_id));}
function displayNotice(s){$("access-notice").textContent=s;}
function updateSummary(){
 const passed=listPasses(),studied=studiedIds();
 const validated=pilot.filter(id=>passed.has(id)).length;
 $("stat-studied").textContent=studied.size;
 $("stat-mastery").textContent=passed.size;
 $("mastery-percent").textContent=Math.round(100*validated/pilot.length)+"%";
 $("mastery-ring").style.setProperty("--ring-progress",100*validated/pilot.length+"%");
 $("mastery-ring").setAttribute("aria-label","Progression évaluée du parcours pilote : "+Math.round(100*validated/pilot.length)+" %");
 $("account-label").textContent=state.logged?"Suivi synchronisé dans ton compte":"Identifie-toi pour sauvegarder la progression et passer des examens.";
}
function renderTracks(){
 const root=$("track-cards");root.replaceChildren();
 for(const s of state.catalog.specializations){
  const selected=s.id===state.track;
  const btn=make("button","track"+(selected?" active":""),"");
  btn.type="button";
  btn.setAttribute("aria-pressed",String(selected));
  const tag=make("small","",s.level.toUpperCase()+" · "+s.modules.length+" MODULES");
  const title=make("h3","",s.title);
  const description=make("p","",s.summary);
  const studied=studiedIds();
  const completed=s.modules.filter(id=>studied.has(id)).length;
  const progress=make("div","bar");
  const fill=make("span");
  fill.style.width=(100*completed/s.modules.length).toFixed(1)+"%";
  progress.append(fill);
  const status=make("span","status",completed+"/"+s.modules.length+" étudiés · "+(s.assessment==="pilot"?"Examens pilotes disponibles":"Évaluations en préparation"));
  btn.append(tag,title,description,progress,status);
  btn.onclick=()=>{state.track=s.id;renderTracks();renderModules();};
  root.append(btn);
 }
}
function renderModules(){
 const s=state.catalog.specializations.find(x=>x.id===state.track);
 if(!s)return;
 $("current-track-title").textContent=s.title;
 $("current-track-desc").textContent=s.summary;
 const root=$("module-list");root.replaceChildren();
 const studied=studiedIds(),passed=listPasses();
 for(let index=0;index<s.modules.length;index++){
  const id=s.modules[index];
  const row=make("div","module-line");
  const idNode=make("span","module-id",id);
  const info=make("div","module-info");
  info.append(make("strong","",s.moduleTitles[index]===id?id+" · Programme académique":s.moduleTitles[index]));
  info.append(make("small","",passed.has(id)?"✓ Examen réussi : "+passed.get(id)+" %":
   studied.has(id)?"Étudié (auto-déclaré)":"À étudier · aucune validation d'examen"));
  const button=make("button","",studied.has(id)?"Réviser":"Marquer étudié");
  button.type="button";
  button.disabled=!state.logged;
  button.setAttribute("aria-label",(studied.has(id)?"Réviser ":"Marquer étudié ")+id);
  button.onclick=async()=>{
   try{
    await request("/api/me/learning/modules/"+id,{completed:!studied.has(id)});
    await fetchProgress();renderAll();
   }catch{displayNotice("Impossible de sauvegarder la progression.");}
  };
  row.append(idNode,info,button);root.append(row);
 }
}
function examName(id){
 if(id==="statistical-inference-final")return "Épreuve finale — Inférence statistique et Bayes";
 const s=state.catalog.specializations[0];
 const ix=s.modules.indexOf(id);
 return id+" · "+(ix>=0?s.moduleTitles[ix]:"Examen de module");
}
function renderExamStepper(){
 const root=$("exam-progress");root.replaceChildren();
 const passed=listPasses();
 for(const [i,id] of [...pilot,"statistical-inference-final"].entries()){
  const ok=passed.has(id),locked=!ok&&i>0&&!passed.has(i===pilot.length?pilot[pilot.length-1]:pilot[i-1]);
  const step=make("div","checkpoint"+(ok?" complete":locked?" locked":""));
  step.append(make("strong","",examName(id)));
  step.append(make("small","",ok?"✓ "+passed.get(id)+" %":locked?"Prérequis manquant":id.endsWith("-final")?"Final : 85 % minimum":"Module : 80 % minimum"));
  root.append(step);
 }
 const next=[...pilot,"statistical-inference-final"].find(id=>!passed.has(id));
 const btn=$("next-exam");btn.disabled=!state.logged||!next;
 btn.dataset.exam=next||"";
 btn.textContent=next?"Commencer : "+examName(next):"Tous les examens réussis";
}
function renderCredentials(){
 const certificates=state.progress?.certificates||[];
 const reviews=state.progress?.reviews||[];
 const passed=listPasses();
 const reviewed=reviews.some(r=>r.track_id==="statistical-inference"&&r.status==="approved"&&r.evidence_verified===true);
 const requirements=[...pilot,"statistical-inference-final"].every(id=>passed.has(id));
 const allowed=state.logged&&requirements&&reviewed;
 $("claim-button").disabled=!allowed;
 $("credential-status").textContent=certificates.length?
  "Certificat enregistré : "+certificates.length:!requirements?
  "Examens en cours · "+[...pilot,"statistical-inference-final"].filter(id=>passed.has(id)).length+"/5 étapes réussies":
  reviewed?"Examen validé et projet approuvé. Tu peux demander ton certificat public.":
  "Examens validés. Le projet scientifique doit encore être évalué par un relecteur.";
 const root=$("certificates-list");root.replaceChildren();
 for(const certificate of certificates){
  const link=make("a","certificate-link","Consulter le certificat "+certificate.track_id+" ↗");
  link.href="/certificates/"+certificate.public_id;link.rel="noopener";
  root.append(link);
 }
}
function renderLibrary(){
 const modules=state.catalog?.modules||[];
 const root=$("all-modules");root.replaceChildren();
 const search=$("module-search").value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const school=$("module-school").value,status=$("module-status").value;
 const filtered=modules.filter(m=>{
  if(school!=="all"&&m.school!==school)return false;
  if(status==="draft"&&!m.expandedDraft||status==="outline"&&m.expandedDraft)return false;
  const text=[m.id,m.title,...m.topics].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  return !search||text.includes(search);
 });
 $("module-count").textContent=filtered.length+" modules correspondent aux filtres · "+Math.min(48,filtered.length)+" affichés. Affine la recherche pour retrouver un module précis.";
 for(const m of filtered.slice(0,48)){
  const row=make("div","course-mini");row.append(make("span","code",m.id));
  const info=make("div");
  info.append(make("strong","",m.title));
  info.append(make("small","",m.expandedDraft?"Chapitre enrichi · relecture à poursuivre":"Parcours guidé · cours détaillé à rédiger"));
  const link=make("a","","Consulter le programme ↗");
  link.href="https://achraf-saidi.github.io/achraf-notebooks/academy/fr/?id="+encodeURIComponent(m.id);
  link.rel="noopener";link.target="_blank";
  info.append(link);
  row.append(info);root.append(row);
 }
}
function renderAll(){updateSummary();if(state.catalog){renderTracks();renderModules();renderExamStepper();renderCredentials();renderLibrary();}}
async function fetchProgress(){
 if(!state.logged){state.progress={selfReported:[],passed:[],certificates:[],reviews:[]};return;}
 state.progress=await request("/api/me/learning");
}
function formatTime(seconds){const n=Math.max(0,Math.floor(seconds));return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");}
function stopTimer(){if(state.timer!==null){clearInterval(state.timer);state.timer=null;}}
function updateTimer(){
 if(!state.activeExam)return;
 const left=(new Date(state.activeExam.expiresAt).getTime()-Date.now())/1000;
 $("exam-clock").textContent=formatTime(left);
 if(left<=0){stopTimer();$("exam-clock").textContent="Temps écoulé";displayNotice("La tentative a dépassé la limite ; le serveur refusera toute réponse hors délai.");}
}
function renderStartedExam(data){
 state.activeExam=data;stopTimer();
 $("exam-workspace").hidden=false;$("exam-result").replaceChildren();
 $("exam-title").textContent=examName(data.examId);
 const root=$("questions");root.replaceChildren();
 for(let i=0;i<data.questions.length;i++){
  const question=data.questions[i],box=make("section","question");
  box.append(make("p","overline","QUESTION "+String(i+1).padStart(2,"0")+" / "+data.questions.length+" · "+question.moduleId));
  box.append(make("h3","",question.prompt));
  if(question.kind==="choice"){
   const group=make("div");
   for(let j=0;j<question.options.length;j++){
    const label=make("label");const radio=make("input");
    radio.type="radio";radio.name=question.id;radio.value=String(j);radio.required=true;
    label.append(radio,document.createTextNode(question.options[j]));group.append(label);
   }
   box.append(group);
  }else{
   const label=make("label","", "Réponse numérique");
   const input=make("input");input.type="number";input.step="any";input.required=true;input.name=question.id;
   label.append(input);box.append(label);
  }
  root.append(box);
 }
 state.timer=setInterval(updateTimer,1000);updateTimer();
 $("exam-workspace").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderResult(data){
 stopTimer();state.activeExam=null;
 const result=$("exam-result");
 result.replaceChildren();
 result.append(make("h3","",data.passed?"Réussite : "+data.score+" %":"À retravailler : "+data.score+" %"));
 result.append(make("p","minor",data.correct+"/"+data.total+" réponses justes. La correction apparaît après la soumission; le score est calculé sur le serveur."));
 for(const item of data.review){
  const row=make("div","result-row");
  row.append(make("strong","",item.id+" · "+(item.correct?"Bonne réponse":"Réponse incorrecte")));
  row.append(make("p","", "Corrigé : "+item.explanation));
  result.append(row);
 }
 $("exam-form").hidden=true;
 displayNotice(data.passed?"Examen réussi et enregistré sur le serveur.":"Examen enregistré. Révise les notions avant une nouvelle tentative.");
}
$("next-exam").onclick=async()=>{
 const id=$("next-exam").dataset.exam;
 if(!id)return;
 $("next-exam").disabled=true;
 try{
  const data=await request("/api/exams/"+encodeURIComponent(id)+"/start",{lang:"fr"});
  $("exam-form").hidden=false;
  renderStartedExam(data);
  displayNotice("Tentative d'examen ouverte : "+data.questions.length+" questions, limite stricte côté serveur.");
 }catch(err){
  const messages={prerequisites_missing:"Il faut d'abord réussir les examens précédents.",exam_daily_limit:"Limite atteinte : trois tentatives maximum sur 24 h.",exam_not_yet_reviewed:"La banque privée de questions attend sa relecture scientifique. Cet examen ne peut pas encore ouvrir.",exam_unavailable:"Le serveur d'examen est indisponible."};
  displayNotice(messages[err.message]||"Examen indisponible.");
 }finally{renderExamStepper();}
};
$("exam-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.activeExam)return;
 const attempt=state.activeExam,responses={};
 for(const q of attempt.questions){
  const selected=new FormData(e.currentTarget).get(q.id);
  if(selected===null){displayNotice("Toutes les questions doivent recevoir une réponse.");return;}
  responses[q.id]=Number(selected);
 }
 const button=e.currentTarget.querySelector("button[type=submit]");button.disabled=true;
 try{
  const grade=await request("/api/exams/"+encodeURIComponent(attempt.examId)+"/submit",
   {attemptId:attempt.attemptId,responses});
  renderResult(grade);await fetchProgress();renderAll();
 }catch(err){displayNotice("Soumission refusée : "+(err.message==="exam_time_expired"?"durée dépassée":err.message));}
 finally{button.disabled=false;}
});
$("claim-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const button=$("claim-button");if(button.disabled)return;
 button.disabled=true;
 try{
  const data=await request("/api/certificates/claim",
    {trackId:"statistical-inference",displayName:$("claim-name").value,publicConsent:$("claim-consent").checked});
  displayNotice("Certificat créé après vérification des examens et du projet. Code public : "+data.certificate.public_id);
  await fetchProgress();renderAll();
 }catch{displayNotice("Certificat non délivré. Vérifier les examens, le projet et le consentement public.");}
 finally{renderCredentials();}
});
async function start(){
 state.catalog=await request("/api/learning/catalog?lang=fr");
 for(const s of state.catalog.schools){
  const option=make("option","",s.id+" · "+s.title+" ("+s.moduleCount+")");
  option.value=s.id;$("module-school").append(option);
 }
 for(const id of ["module-search","module-school","module-status"])
  $(id).addEventListener(id==="module-search"?"input":"change",renderLibrary);

 state.track=state.catalog.specializations[0].id;
 try{const s=await request("/api/auth/get-session");state.logged=Boolean(s?.user?.id&&s.user.emailVerified);}
 catch{state.logged=false;}
 try{await fetchProgress();displayNotice(state.logged?"Bienvenue dans ton tableau de bord scientifique.":"Catalogue visible en mode invité. Connecte-toi pour sauvegarder tes résultats.");}
 catch{state.progress={selfReported:[],passed:[],certificates:[],reviews:[]};displayNotice("Les données personnelles ne sont pas accessibles pour le moment.");}
 renderAll();
 if(typeof window.renderScienceLabs==="function")window.renderScienceLabs();
}
start().catch(()=>displayNotice("Impossible de charger l'académie. Vérifie la connexion au serveur."));
