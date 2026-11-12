const $=id=>document.getElementById(id);
let mode="login",session=null;
function notify(message){$("feedback").textContent=message;}
async function call(path,data){
 const r=await fetch(path,{method:data===undefined?"GET":"POST",credentials:"same-origin",
  headers:{"Accept":"application/json",...(data===undefined?{}:{"Content-Type":"application/json"})},
  ...(data===undefined?{}:{body:JSON.stringify(data)})});
 const value=await r.json().catch(()=>({error:"Service indisponible"}));
 if(!r.ok)throw Error(value.message||value.error||"Service indisponible");
 return value;
}
const storageKey="achraf-preferred-theme";
const persisted=(()=>{try{return localStorage.getItem(storageKey);}catch{return null;}})();
if(persisted==="light"||persisted==="dark")document.documentElement.dataset.theme=persisted;
$("theme-toggle").addEventListener("click",()=>{
 const next=document.documentElement.dataset.theme==="light"?"dark":"light";
 document.documentElement.dataset.theme=next;
 $("theme-toggle").setAttribute("aria-label",next==="light"?"Activer le thème sombre":"Activer le thème clair");
 try{localStorage.setItem(storageKey,next);}catch{}
});
$("menu-toggle").addEventListener("click",()=>{
 const expanded=$("menu-toggle").getAttribute("aria-expanded")==="true";
 $("menu-toggle").setAttribute("aria-expanded",String(!expanded));
 $("menu-toggle").setAttribute("aria-label",expanded?"Ouvrir la navigation":"Fermer la navigation");
 $("main-nav").classList.toggle("open",!expanded);
});
$("main-nav").addEventListener("click",event=>{
 if(event.target.closest("a")){$("main-nav").classList.remove("open");$("menu-toggle").setAttribute("aria-expanded","false");}
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"){$("main-nav").classList.remove("open");$("menu-toggle").setAttribute("aria-expanded","false");}
});
function updateBilling(yearly){
 $("billing-monthly").setAttribute("aria-pressed",String(!yearly));
 $("billing-yearly").setAttribute("aria-pressed",String(yearly));
 $("billing-explanation").textContent=yearly?
 "Montant annuel facturé en une seule fois, pas en mensualités. Tarifs indicatifs.":
 "Prix mensuels proposés, susceptibles d'évoluer après validation des coûts.";
 const mode=yearly?"yearly":"monthly";
 for(const element of document.querySelectorAll("[data-monthly][data-yearly]"))
  element.textContent=element.dataset[mode];
}
$("billing-monthly").addEventListener("click",()=>updateBilling(false));
$("billing-yearly").addEventListener("click",()=>updateBilling(true));
function setMode(next){
 mode=next;
 $("choose-login").setAttribute("aria-pressed",String(mode==="login"));
 $("choose-register").setAttribute("aria-pressed",String(mode==="register"));
 $("name-wrap").hidden=mode!=="register";
 $("display-name").required=mode==="register";
 $("password").autocomplete=mode==="register"?"new-password":"current-password";
 $("identity-submit").textContent=mode==="register"?"Créer mon compte":"Me connecter";
 notify("");
}
async function refresh(){
 try{const s=await call("/api/auth/get-session");session=s?.user?.emailVerified?s:null;}
 catch{session=null;}
 $("identity-form").hidden=!!session;
 $("profile").hidden=!session;
 $("password-reset").hidden=!!session;
 $("choose-login").disabled=!!session;$("choose-register").disabled=!!session;
 if(session){
  $("account-email").textContent=session.user.email;
  try{
   const e=await call("/api/me/entitlements");
   $("access").textContent=e.products?.length?"Accès actifs : "+e.products.join(", "):"Aucun accès premium actif.";
  }catch{$("access").textContent="Les informations d'abonnement ne sont pas disponibles.";}
 }
}
$("choose-login").addEventListener("click",()=>setMode("login"));
$("choose-register").addEventListener("click",()=>setMode("register"));
$("identity-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const email=$("email").value.trim(),password=$("password").value,name=$("display-name").value.trim();
 if(mode==="register"&&!name){notify("Indique ton nom.");return;}
 $("identity-submit").disabled=true;
 try{
  if(mode==="register"){
   await call("/api/auth/sign-up/email",{name,email,password});
   notify("Compte créé. Vérifie le lien de confirmation envoyé par e-mail.");
  }else{
   await call("/api/auth/sign-in/email",{email,password});
   notify("");
  }
  $("password").value="";
  await refresh();
 }catch(error){notify(error.message||"Erreur de connexion");}
 finally{$("identity-submit").disabled=false;}
});
$("password-reset").addEventListener("click",async()=>{
 const email=$("email").value.trim();
 if(!email||!$("email").checkValidity()){notify("Saisis une adresse e-mail valide.");return;}
 try{await call("/api/auth/request-password-reset",{email,redirectTo:location.origin+"/account"});}catch{}
 notify("Si un compte correspond, un lien de réinitialisation pourra être envoyé.");
});
$("logout").addEventListener("click",async()=>{
 try{await call("/api/auth/sign-out",{});await refresh();notify("Déconnexion effectuée.");}
 catch{notify("Impossible de se déconnecter.");}
});
$("billing-portal").addEventListener("click",async()=>{
 try{
  const result=await call("/api/billing/portal",{});
  const u=new URL(result.url);
  if(u.protocol!=="https:"||!(u.hostname==="stripe.com"||u.hostname.endsWith(".stripe.com")))throw Error();
  location.assign(u.href);
 }catch{notify("Le portail de facturation n'est pas disponible.");}
});
for(const button of document.querySelectorAll(".buy"))button.addEventListener("click",()=>{
 notify("Cette tarification est à l'étude. Les ventes sont désactivées.");
 $("compte").scrollIntoView({behavior:"smooth"});
});
if(location.pathname==="/billing/success")notify("Retour du paiement : seul le serveur confirme un droit d'accès.");
setMode("login");updateBilling(false);refresh();
