const el=id=>document.getElementById(id);
async function verify(){
 const credential=location.pathname.split("/").filter(Boolean).at(-1);
 if(!/^[0-9a-f-]{36}$/i.test(credential))throw Error("invalid_id");
 const response=await fetch("/api/certificates/verify/"+encodeURIComponent(credential),
  {headers:{Accept:"application/json"},credentials:"omit",cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"not_found");
 return data;
}
verify().then(c=>{
 if(c.status!=="valid")throw Error("revoked");
 el("recipient").textContent=c.recipient;
 el("track-name").textContent=c.trackId==="statistical-inference"?"Inférence statistique et Bayes":c.trackId;
 el("score").textContent=c.finalExamScore+" %";
 el("issued").textContent=new Date(c.issuedAt).toLocaleDateString("fr-BE",{day:"numeric",month:"long",year:"numeric"});
 el("credential-id").textContent=c.credentialId;
 el("verify-status").textContent="✓ Certificat public valide, vérifié auprès de l'Académie.";
 el("certificate").hidden=false;
 el("print").disabled=false;
}).catch(error=>{
 el("verify-status").textContent=error.message==="revoked"?
 "Certificat révoqué : ce document ne constitue plus une attestation valable.":
 "Aucun certificat public valide pour cet identifiant, ou serveur temporairement indisponible.";
});
el("print").addEventListener("click",()=>window.print());