const $=id=>document.getElementById(id);
let mode="login",session=null;
const show=m=>{$("feedback").textContent=m;};
async function call(path,data){
 const response=await fetch(path,{method:data===undefined?"GET":"POST",credentials:"same-origin",
  headers:{"Accept":"application/json",...(data===undefined?{}:{"Content-Type":"application/json"})},
  ...(data===undefined?{}:{body:JSON.stringify(data)})});
 const value=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(value.message||value.error||"Service indisponible");
 return value;
}
function setMode(next){
 mode=next;
 $("choose-login").setAttribute("aria-pressed",String(mode==="login"));
 $("choose-register").setAttribute("aria-pressed",String(mode==="register"));
 $("name-wrap").hidden=mode!=="register";
 $("display-name").required=mode==="register";
 $("password").autocomplete=mode==="register"?"new-password":"current-password";
 $("identity-submit").textContent=mode==="register"?"Créer un compte":"Me connecter";
 show("");
}
async function refresh(){
 try{const s=await call("/api/auth/get-session");session=s?.user?.emailVerified?s:null;}
 catch{session=null;}
 $("identity-form").hidden=!!session;
 $("profile").hidden=!session;
 $("password-reset").hidden=!!session;
 if(session){
  $("account-email").textContent=session.user.email;
  try{
   const e=await call("/api/me/entitlements");
   $("access").textContent=e.products?.length?"Accès actifs : "+e.products.join(", "):"Aucun accès premium actif.";
  }catch{$("access").textContent="Impossible de consulter les abonnements.";}
 }
}
$("choose-login").onclick=()=>setMode("login");
$("choose-register").onclick=()=>setMode("register");
$("identity-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const email=$("email").value.trim(),password=$("password").value,name=$("display-name").value.trim();
 if(mode==="register"&&!name)return show("Le nom est obligatoire.");
 $("identity-submit").disabled=true;
 try{
  if(mode==="register"){
   await call("/api/auth/sign-up/email",{name,email,password});
   show("Compte créé. Vérifiez le lien envoyé par e-mail.");
  }else{
   await call("/api/auth/sign-in/email",{email,password});
   show("");
  }
  $("password").value="";
  await refresh();
 }catch(error){show(error.message||"Erreur de connexion");}
 finally{$("identity-submit").disabled=false;}
});
$("password-reset").onclick=async()=>{
 const email=$("email").value.trim();
 if(!$("email").checkValidity()||!email)return show("Saisissez une adresse e-mail.");
 try{await call("/api/auth/request-password-reset",{email,redirectTo:location.origin+"/account"});}
 catch{} // Avoid disclosing whether an account exists.
 show("Si le compte existe, un e-mail de réinitialisation pourra être envoyé.");
};
$("logout").onclick=async()=>{
 try{await call("/api/auth/sign-out",{});await refresh();show("Déconnecté.");}
 catch{show("Impossible de se déconnecter.");}
};
$("billing-portal").onclick=async()=>{
 try{
  const response=await call("/api/billing/portal",{});
  const url=new URL(response.url);
  if(url.protocol!=="https:"||!url.hostname.endsWith(".stripe.com"))throw Error();
  location.assign(response.url);
 }catch{show("Espace de facturation indisponible.");}
};
for(const button of document.querySelectorAll(".buy")){
 button.addEventListener("click",()=>{
  show("Paiements désactivés : validation juridique, technique et éditoriale requise.");
  $("compte").scrollIntoView({behavior:"smooth"});
 });
}
if(location.pathname==="/billing/success")show("Retour de Stripe reçu : seul le serveur peut confirmer un droit d'accès.");
refresh();
