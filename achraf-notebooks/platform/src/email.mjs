export async function sendEmail({to,subject,text}) {
 const apiKey=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
 if(!apiKey||!from)throw new Error("Transactional email is not configured");
 const res=await fetch("https://api.resend.com/emails",{
  method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
  body:JSON.stringify({from,to,subject,text}),signal:AbortSignal.timeout(10000)
 });
 if(!res.ok)throw new Error("Transactional email provider rejected request: "+res.status);
}
