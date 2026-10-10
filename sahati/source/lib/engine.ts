import type {Account,Entity,Kind,Role} from './model';
import {hospitals,roles,today,age} from './model';
import {seedAccounts,seedRecords} from './seed';
import {canWrite,inScope,redact,allowedTransition,patientPublished,kinds} from './policy';
import {randomToken,sha,verifyPassword,hashPassword} from './crypto';
import {UserError,validateFields,textField,positive,slotsFor,dateField} from './validation';
import {qrSvg} from './qr';
import {createRoles} from './modules';
export interface Environment {DB?:D1Database;BUCKET?:R2Bucket;SAHATI_GATE_HASH?:string;}
const gateCookie='__Host-sahati-gate',accountCookie='__Host-sahati-account';
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const ok=(data:any,status=200,extra:Record<string,string>={})=>Response.json(data,{status,headers:{...headers,...extra}});
function cookie(name:string,value:string,seconds:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;}
function readCookie(request:Request,name:string){const part=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));return part?.slice(name.length+1)||'';}
function dbFor(env:Environment){if(!env.DB)throw new UserError('Le stockage serveur n’est pas disponible.',503);return env.DB;}
export async function session(db:D1Database,req:Request,phase:'gate'|'account'){
 const token=readCookie(req,phase==='gate'?gateCookie:accountCookie);if(!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await db.prepare('SELECT * FROM sahati_sessions WHERE token_hash=? AND phase=? AND expires_at>?').bind(await sha(token),phase,Date.now()).first<any>();return row||null;
}
async function account(db:D1Database,req:Request):Promise<Account>{const s=await session(db,req,'account');if(!s)throw new UserError('Connectez-vous à votre espace.',401);const r=await db.prepare('SELECT * FROM sahati_accounts WHERE id=? AND active=1').bind(s.account_id).first<any>();if(!r)throw new UserError('Ce compte n’est plus actif.',401);return {id:r.id,name:r.name,email:r.email,role:r.role,hospitalId:r.hospital_id,patientId:r.patient_id||undefined,active:true};}
async function newSession(db:D1Database,phase:string,accountId?:string){const token=randomToken(),ttl=phase==='gate'?8*3600:3600;await db.prepare('INSERT INTO sahati_sessions(token_hash,phase,account_id,expires_at,created_at) VALUES(?,?,?,?,?)').bind(await sha(token),phase,accountId||null,Date.now()+ttl*1000,Date.now()).run();return cookie(phase==='gate'?gateCookie:accountCookie,token,ttl);}
function auditStmt(db:D1Database,a:Account|undefined,action:string,target:string,detail='') {return db.prepare('INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) VALUES(?,?,?,?,?,?,?)').bind(randomToken(),a?.id||'private-owner',a?.name||'Propriétaire',action,target,detail,new Date().toISOString());}
async function log(db:D1Database,a:Account|undefined,action:string,target:string,detail=''){await auditStmt(db,a,action,target,detail).run();}
async function guardAttempts(db:D1Database,req:Request,scope:string){const id=await sha(`${scope}:${req.headers.get('oai-authenticated-user-id')||req.headers.get('cf-connecting-ip')||'private-owner'}`);const now=Date.now();await db.prepare('INSERT INTO sahati_attempts(id,count,reset_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END').bind(id,now+900000,now,now,now+900000).run();const r=await db.prepare('SELECT count FROM sahati_attempts WHERE id=?').bind(id).first<any>();if(r.count>10)throw new UserError('Trop de tentatives. Réessayez dans 15 minutes.',429);return id;}
async function clearAttempt(db:D1Database,id:string){await db.prepare('DELETE FROM sahati_attempts WHERE id=?').bind(id).run();}
async function allRecords(db:D1Database):Promise<Entity[]>{const r=await db.prepare('SELECT id,kind,hospital_id,patient_id,data,version,quantity FROM sahati_records ORDER BY updated_at DESC LIMIT 3000').all<any>();return r.results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,hospitalId:r.hospital_id,patientId:r.patient_id||undefined,version:r.version,...(r.kind==='stock'?{quantity:r.quantity}:{})}));}
async function getRecord(db:D1Database,id:string){const r=await db.prepare('SELECT * FROM sahati_records WHERE id=?').bind(id).first<any>();if(!r)throw new UserError('Élément introuvable.',404);return {...JSON.parse(r.data),id:r.id,kind:r.kind,hospitalId:r.hospital_id,patientId:r.patient_id||undefined,version:r.version,...(r.kind==='stock'?{quantity:r.quantity}:{})} as Entity;}
function insertStmt(db:D1Database,e:Entity,author:string){return db.prepare('INSERT INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(e.id,e.kind,e.hospitalId,e.patientId||null,JSON.stringify(e),e.kind==='stock'?e.quantity:0,e.version,author,e.createdAt||new Date().toISOString());}
async function ensureSeed(db:D1Database){
 await db.batch(hospitals.map(h=>db.prepare('INSERT OR IGNORE INTO sahati_hospitals(id,data) VALUES(?,?)').bind(h.id,JSON.stringify(h))));
 if(await db.prepare("SELECT key FROM sahati_metadata WHERE key='seed_complete'").first())return;
 const hash=await hashPassword('SahatiDemo2026!');const commands:D1PreparedStatement[]=[];
 seedAccounts().forEach(a=>commands.push(db.prepare('INSERT OR IGNORE INTO sahati_accounts(id,email,name,role,hospital_id,patient_id,password_hash,active) VALUES(?,?,?,?,?,?,?,1)').bind(a.id,a.email,a.name,a.role,a.hospitalId,a.patientId||null,hash)));
 const records=seedRecords();records.forEach(e=>{if(e.kind==='prescriptions')e.verificationToken=randomToken();commands.push(db.prepare('INSERT OR IGNORE INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(e.id,e.kind,e.hospitalId,e.patientId||null,JSON.stringify(e),e.kind==='stock'?e.quantity:0,1,'seed-demo',e.createdAt));});
 // Small bounded batches; all inserts are idempotent. Seed data never enters schema migrations.
 for(let i=0;i<commands.length;i+=50)await db.batch(commands.slice(i,i+50));
 const ap=records.filter(e=>['appointments','surgeries'].includes(e.kind));const slotCommands=ap.flatMap(e=>slotsFor(e).map(s=>db.prepare('INSERT OR IGNORE INTO sahati_schedule_slots(id,record_id,resource,slot) VALUES(?,?,?,?)').bind(randomToken(),e.id,s.resource,s.slot)));for(let i=0;i<slotCommands.length;i+=50)await db.batch(slotCommands.slice(i,i+50));
 await db.prepare("INSERT OR IGNORE INTO sahati_metadata(key,value) VALUES('seed_complete','1')").run();
}
function metrics(records:Entity[],a:Account){const hospital=['admin','director'].includes(a.role)?records:records.filter(e=>e.hospitalId===a.hospitalId);const p=records.filter(e=>e.kind==='patients');const scoped=['doctor','resident','patient'].includes(a.role)?hospital.filter(e=>inScope(a,e,p)):hospital;const count=(kind:string,filter=(e:Entity)=>true)=>scoped.filter(e=>e.kind===kind&&filter(e)).length;const occupied=hospital.filter(e=>e.kind==='beds'&&e.status==='occupied').length;const beds=hospital.filter(e=>e.kind==='beds').length;return {patients:count('patients'),appointments:count('appointments',e=>e.date===today()&&e.status!=='cancelled'),pendingPrescriptions:count('prescriptions',e=>e.status==='pending'),pendingOrders:count('orders',e=>!['published','acknowledged','cancelled'].includes(e.status)),occupied,beds,occupancy:beds?Math.round(100*occupied/beds):0,stockAlerts:hospital.filter(e=>e.kind==='stock'&&e.quantity<e.threshold).length,unpaid:hospital.filter(e=>e.kind==='invoices'&&e.status==='unpaid').reduce((s,e)=>s+e.amount,0),admissions:count('admissions',e=>e.status==='admitted'),incidents:count('incidents',e=>e.status!=='resolved'),byService:[...new Set(hospital.filter(e=>e.kind==='admissions').map(e=>e.service))].map(service=>({service,count:hospital.filter(e=>e.kind==='admissions'&&e.service===service&&e.status==='admitted').length})),series:Array.from({length:7},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-6+i);const date=d.toISOString().slice(0,10);return {date,count:hospital.filter(e=>e.kind==='appointments'&&e.date===date&&e.status!=='cancelled').length};})};}
function initialStatus(kind:Kind,role:Role){return ({patients:'active',appointments:role==='patient'?'requested':'scheduled',encounters:'draft',prescriptions:'draft',orders:'requested',admissions:'admitted',care:'pending',emergencies:'waiting',surgeries:'scheduled',invoices:'unpaid',staff:'active',equipment:'active',studies:'draft',requests:'pending',incidents:'open',documents:'draft',consents:'active',messages:'sent',stock:'active',beds:'available'} as Record<string,string>)[kind];}
async function createRecord(db:D1Database,a:Account,input:any){
 const kind=input.kind as Kind;if(!kinds.includes(kind)||!canWrite(a,kind)||!createRoles[kind]?.includes(a.role))throw new UserError('Votre rôle ne peut pas créer cet élément.',403);
 if(kind==='prescriptions'&&!['doctor','resident'].includes(a.role)||kind==='orders'&&!['doctor','resident'].includes(a.role))throw new UserError('La demande doit être créée par un médecin.',403);
 const data=validateFields(kind,input.data||{}),now=new Date().toISOString(),id=randomToken().slice(0,24),hospitalId=a.hospitalId;
 const patientKinds=['appointments','encounters','prescriptions','orders','admissions','care','emergencies','surgeries','invoices','documents','consents'];
 if(!await db.prepare('SELECT id FROM sahati_hospitals WHERE id=?').bind(hospitalId).first())throw new UserError('Établissement introuvable.');
 let patientId:string|undefined=undefined;if(patientKinds.includes(kind)){patientId=a.role==='patient'?a.patientId:textField(input.patientId,'Patient',60,true);const p=await getRecord(db,patientId!);if(p.kind!=='patients'||p.hospitalId!==hospitalId||(['doctor','resident'].includes(a.role)&&!inScope(a,p,[p])))throw new UserError('Ce patient est hors de votre périmètre.',403);}
 const e:Entity={...data,id,kind,hospitalId,patientId,version:1,status:initialStatus(kind,a.role),date:data.date||today(),authorId:a.id,authorName:a.name,createdAt:now};
 if(kind==='patients'){const possible=await db.prepare("SELECT id FROM sahati_records WHERE kind='patients' AND hospital_id=? AND lower(json_extract(data,'$.firstName'))=lower(?) AND lower(json_extract(data,'$.lastName'))=lower(?) AND json_extract(data,'$.birthDate')=?").bind(hospitalId,e.firstName,e.lastName,e.birthDate).first();if(possible)throw new UserError('Un dossier avec le même nom et la même naissance existe déjà. Vérifiez les doublons.',409);e.identifier='SAH-'+new Date().getFullYear().toString().slice(2)+'-'+id.slice(0,8).toUpperCase();e.careTeam=(await db.prepare("SELECT id FROM sahati_accounts WHERE hospital_id=? AND active=1 AND role IN ('doctor','resident')").bind(hospitalId).all<any>()).results.map(a=>a.id);e.allergies='Non renseigné — à vérifier par l’équipe soignante';e.problems=[];e.researchConsent=false;}
 if(kind==='appointments'){e.doctorId=textField(data.doctorId,'Médecin',60)||'doctor';const doctor=await db.prepare("SELECT id FROM sahati_accounts WHERE id=? AND role='doctor' AND hospital_id=? AND active=1").bind(e.doctorId,hospitalId).first();if(!doctor)throw new UserError('Médecin indisponible dans cet établissement.');e.duration=positive(input.data?.duration||20,'Durée',5,240);}
 if(kind==='surgeries'){e.duration=positive(input.data?.duration||90,'Durée',5,240);e.surgeon=a.id;e.checklist={identity:false,consent:false,site:false,anesthesia:false,counts:false};}
 if(kind==='prescriptions'){const meds=input.data?.medications;if(!Array.isArray(meds)||meds.length<1||meds.length>12)throw new UserError('Ajoutez entre 1 et 12 traitements.');e.medications=meds.map(m=>({name:textField(m.name,'Médicament',200,true),dose:textField(m.dose,'Dose',300,true),route:textField(m.route,'Voie',100,true),frequency:textField(m.frequency,'Fréquence',200,true),duration:textField(m.duration,'Durée',200,true),quantity:positive(m.quantity,'Quantité',1,1000)}));if(e.medications.some((m:any)=>!Number.isInteger(m.quantity)))throw new UserError('Quantité entière requise.');e.verificationToken=randomToken();e.instructions=data.instructions||'Document de démonstration — sans valeur clinique.';}
 if(kind==='beds'&&(await allRecords(db)).some(b=>b.kind==='beds'&&b.hospitalId===hospitalId&&b.number===e.number))throw new UserError('Ce numéro de lit existe déjà.',409);
 if(kind==='stock'){e.quantity=positive(input.data.quantity,'Quantité');e.threshold=positive(input.data.threshold,'Seuil');e.unitPrice=positive(input.data.unitPrice,'Prix');}
 if(kind==='invoices'){e.amount=positive(input.data.amount,'Montant',1);e.reference='FAC-'+id.slice(0,8).toUpperCase();}
 if(kind==='requests'){const study=await getRecord(db,e.studyId);if(study.kind!=='studies'||!inScope(a,study,[]))throw new UserError('Étude inaccessible.',403);e.authorId=a.id;e.expiresAt=e.expiresAt||`${new Date().getFullYear()+1}-12-31`;}
 if(kind==='studies'){e.members=[a.id];e.variables=['ageBand','sex','followUpDays','event'];}
 if(kind==='consents'){e.researchConsent=!!input.data.researchConsent;}
 if(kind==='messages'&&e.recipientId!=='team'){const dest=await db.prepare('SELECT id FROM sahati_accounts WHERE id=? AND active=1 AND hospital_id=?').bind(e.recipientId,hospitalId).first();if(!dest)throw new UserError('Destinataire indisponible.');}if(kind==='messages'&&a.role==='patient'&&e.recipientId==='team')throw new UserError('Choisissez un membre de votre équipe soignante.');
 const commands:D1PreparedStatement[]=[];
 if(kind==='admissions'){
  const bed=await getRecord(db,e.bedId);if(bed.kind!=='beds'||bed.hospitalId!==hospitalId||bed.status!=='available'||bed.service!==e.service)throw new UserError('Ce lit n’est pas disponible.',409);
  commands.push(db.prepare("UPDATE sahati_records SET data=json_set(data,'$.status','occupied','$.patientId',?),version=version+1,updated_at=? WHERE id=? AND kind='beds' AND json_extract(data,'$.status')='available'").bind(patientId,now,e.bedId));
  commands.push(db.prepare('INSERT INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) SELECT ?,?,?,?,?,0,1,?,? WHERE EXISTS(SELECT 1 FROM sahati_records WHERE id=? AND updated_at=?)').bind(id,kind,hospitalId,patientId,JSON.stringify(e),a.id,now,e.bedId,now));
 }else commands.push(insertStmt(db,e,a.id));
 slotsFor(e).forEach(s=>commands.push(db.prepare('INSERT INTO sahati_schedule_slots(id,record_id,resource,slot) VALUES(?,?,?,?)').bind(randomToken(),id,s.resource,s.slot)));
 commands.push(db.prepare('INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sahati_records WHERE id=?)').bind(randomToken(),a.id,a.name,'Création',id,kind,now,id));
 if(kind==='consents')commands.push(db.prepare("UPDATE sahati_records SET data=json_set(data,'$.researchConsent',json(?)),version=version+1,updated_at=? WHERE id=?").bind(e.researchConsent?'true':'false',now,patientId));
 const results=await db.batch(commands);if(!results[0].meta.changes)throw new UserError('La ressource a changé. Actualisez puis réessayez.',409);return e;
}
async function mutate(db:D1Database,a:Account,id:string,input:any){
 const e=await getRecord(db,id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients)||!canWrite(a,e.kind))throw new UserError('Action non autorisée sur cet élément.',403);
 if(input.version!==e.version)throw new UserError('Cet élément a été modifié. Actualisez avant de poursuivre.',409);
 const next={...e},now=new Date().toISOString();
 if(input.action==='transition'){
  const target=textField(input.status,'Statut',40,true);if(!allowedTransition(a,e,target))throw new UserError('Cette transition est interdite pour votre rôle ou le statut actuel.',403);
  if(['encounters','prescriptions'].includes(e.kind)&&target==='validated'){next.validatedBy=a.id;next.validatedByName=a.name;next.validatedAt=now;}
  if(e.kind==='orders'&&target==='validated'&&!e.result)throw new UserError('Saisissez le compte rendu avant validation.');
  if(e.kind==='surgeries'&&target==='in_progress'&&!['identity','consent','site','anesthesia'].every(k=>e.checklist?.[k]))throw new UserError('Complétez les contrôles préopératoires avant de démarrer.');
  if(e.kind==='surgeries'&&target==='done'&&!e.checklist?.counts)throw new UserError('Confirmez le comptage de fin d’intervention.');
  if(e.kind==='admissions'&&target==='discharged'&&!textField(input.reason,'Synthèse de sortie',3000,true))throw new UserError('Ajoutez la synthèse de sortie.');
  if(e.kind==='prescriptions'&&target==='cancelled')next.cancellationReason=textField(input.reason,'Motif d’annulation',3000,true);
  if(e.kind==='admissions'&&target==='discharged')next.dischargeSummary=textField(input.reason,'Synthèse de sortie',3000,true);
  if(e.kind==='invoices'&&target==='paid')next.paymentMethod=textField(input.paymentMethod,'Mode de règlement',100,true);
  if(['requests','studies'].includes(e.kind)&&['approved','rejected'].includes(target)){next.decisionReason=textField(input.reason,'Motif de décision',3000,true);if(target==='approved'&&(!e.ethicsReference||e.ethicsReference==='À soumettre'))throw new UserError('Une référence éthique est requise.');next.decidedBy=a.id;next.decidedAt=now;}
  next.status=target;
 }else if(input.action==='patient'){
  if(e.kind!=='patients'||!['doctor','reception'].includes(a.role))throw new UserError('Modification du dossier non autorisée.',403);
  next.correctionReason=textField(input.reason,'Motif de correction',1000,true);
  if(a.role==='reception'){
   Object.assign(next,validateFields('patients',input.data||{}));
   const team=input.data?.careTeam;if(!Array.isArray(team)||team.length>50||team.some(id=>typeof id!=='string'))throw new UserError('Équipe invalide.');
   const available=(await db.prepare("SELECT id FROM sahati_accounts WHERE hospital_id=? AND active=1 AND role IN ('doctor','resident')").bind(e.hospitalId).all<any>()).results.map(r=>r.id);
   if(team.some(id=>!available.includes(id)))throw new UserError('L’équipe doit appartenir à cet établissement.');next.careTeam=[...new Set(team)];
  }else{
   next.allergies=textField(input.data?.allergies,'Allergies',3000,true);next.bloodGroup=textField(input.data?.bloodGroup,'Groupe',10);next.service=textField(input.data?.service,'Service',200);
   if(next.bloodGroup&&!['A+','A−','B+','B−','AB+','AB−','O+','O−'].includes(next.bloodGroup))throw new UserError('Groupe invalide.');
   next.problems=textField(input.data?.problems,'Problèmes',3000).split('\n').map(s=>s.trim()).filter(Boolean).slice(0,20);
  }
 }else if(input.action==='result'){
  if(e.kind!=='orders'||!['lab','radiology'].includes(a.role)||!['requested','collected','in_progress'].includes(e.status))throw new UserError('Le résultat ne peut pas être modifié à cette étape.',403);
  next.result=textField(input.result,'Résultat',6000,true);next.critical=!!input.critical;
 }else if(input.action==='checklist'){
  if(e.kind!=='surgeries'||a.role!=='doctor'||!['scheduled','in_progress'].includes(e.status))throw new UserError('Checklist non modifiable.',403);
  const items=['identity','consent','site','anesthesia','counts'];if(!items.includes(input.item))throw new UserError('Contrôle inconnu.');next.checklist={...e.checklist,[input.item]:!!input.checked};
 }else if(input.action==='restock'){
  if(e.kind!=='stock'||!['pharmacy','logistics'].includes(a.role))throw new UserError('Mouvement de stock non autorisé.',403);const delta=positive(input.quantity,'Réception',1,100000);if(!Number.isInteger(delta))throw new UserError('Quantité entière requise.');next.quantity=e.quantity+delta;next.lastMovement={quantity:delta,by:a.name,date:now};
 }else if(input.action==='staff'){
  if(e.kind!=='staff'||!['admin','director'].includes(a.role))throw new UserError('Affectation non modifiable.',403);next.service=textField(input.service,'Service',200,true);next.shift=textField(input.shift,'Horaire',200,true);
 }else if(input.action==='care'){
  if(e.kind!=='care'||!['nurse','doctor','resident'].includes(a.role)||e.status==='done')throw new UserError('Transmission non modifiable.',403);for(const k of ['notes','temperature','pulse','bloodPressure'])next[k]=textField(input[k],k,2000);next.performedBy=a.name;
 }else throw new UserError('Action inconnue.');
 next.version=e.version+1;next.updatedAt=now;
 const commands=[db.prepare('UPDATE sahati_records SET data=?,quantity=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(next),next.kind==='stock'?next.quantity:0,now,id,e.version)];
 const condition='EXISTS(SELECT 1 FROM sahati_records WHERE id=? AND version=? AND updated_at=?)';
 if(e.kind==='prescriptions'&&next.status==='dispensed'){
  const disp=input.dispenses;if(!Array.isArray(disp)||disp.length!==e.medications.length)throw new UserError('Associez un lot à chaque traitement.');const seen=new Set<string>();
  for(let i=0;i<disp.length;i++){const d=disp[i],stock=await getRecord(db,d.stockId),med=e.medications[i];const qty=positive(d.quantity,'Quantité délivrée',1,10000);if(!Number.isInteger(qty)||seen.has(d.stockId)||stock.kind!=='stock'||stock.hospitalId!==e.hospitalId||stock.title.toLocaleLowerCase()!==med.name.toLocaleLowerCase()||stock.expiry<today()||qty!==med.quantity)throw new UserError('Le lot, la péremption ou la quantité ne correspond pas au traitement.');if(stock.quantity<qty)throw new UserError('Stock insuffisant.',409);seen.add(d.stockId);commands.push(db.prepare(`UPDATE sahati_records SET quantity=quantity-?,data=json_set(data,'$.quantity',quantity-?),version=version+1,updated_at=? WHERE id=? AND ${condition}`).bind(qty,qty,now,stock.id,id,next.version,now));}
  next.dispenses=disp;next.dispensedBy=a.name;next.dispensedAt=now;commands[0]=db.prepare('UPDATE sahati_records SET data=?,quantity=0,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(next),now,id,e.version);
 }
 if(e.kind==='admissions'&&next.status==='discharged')commands.push(db.prepare(`UPDATE sahati_records SET data=json_remove(json_set(data,'$.status','cleaning'),'$.patientId'),patient_id=NULL,version=version+1,updated_at=? WHERE id=? AND ${condition}`).bind(now,e.bedId,id,next.version,now));
 if(['appointments','surgeries'].includes(e.kind)&&['cancelled','done'].includes(next.status))commands.push(db.prepare(`DELETE FROM sahati_schedule_slots WHERE record_id=? AND ${condition}`).bind(id,id,next.version,now));
 commands.push(db.prepare(`INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE ${condition}`).bind(randomToken(),a.id,a.name,input.action==='transition'?'Changement de statut':'Modification',id,`${e.kind} : ${input.action==='transition'?e.status+' → '+next.status:input.action}`,now,id,next.version,now));
 const result=await db.batch(commands);if(!result[0].meta.changes)throw new UserError('Modification concurrente. Actualisez votre vue.',409);return next;
}
async function cohort(db:D1Database,a:Account,studyId:string,exporting=false){
 if(!['researcher','student'].includes(a.role))throw new UserError('Espace réservé à la recherche.',403);const records=await allRecords(db),study=records.find(e=>e.id===studyId&&e.kind==='studies');
 if(!study||study.status!=='approved'||!inScope(a,study,[]))throw new UserError('Cette étude n’est pas approuvée ou accessible.',403);
 const permit=records.find(e=>e.kind==='requests'&&e.authorId===a.id&&e.studyId===studyId&&e.status==='approved'&&e.expiresAt>=today());if(!permit)throw new UserError('Une autorisation d’accès approuvée et non expirée est nécessaire.',403);
 const patients=records.filter(e=>e.kind==='patients'&&e.hospitalId===a.hospitalId&&e.researchConsent&&e.service===study.specialty);const rows=await Promise.all(patients.map(async(p,i)=>({code:'COH-'+(await sha(studyId+':'+p.id)).slice(0,10).toUpperCase(),ageBand:age(p.birthDate)<18?'0–17':age(p.birthDate)<40?'18–39':age(p.birthDate)<65?'40–64':'65+',sex:p.sex,followUpDays:30+i*23,event:i%3===0?1:0})));
 await log(db,a,exporting?'Export recherche':'Lecture cohorte',studyId,`${rows.length} lignes fictives ; variables autorisées`);return rows;
}
async function jsonInput(request:Request){const raw=await request.text();if(new TextEncoder().encode(raw).length>128000)throw new UserError('Requête trop volumineuse.',413);const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw new UserError('Format de requête invalide.');return value;}
export async function handleAPI(request:Request,path:string[],env:Environment):Promise<Response>{
 try{
  const db=dbFor(env),route=path[0]||'',method=request.method;
  if(!['GET','POST','PATCH'].includes(method))return ok({error:'Méthode non autorisée.'},405);
  if(method!=='GET'){
   const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw new UserError('Origine de la requête non autorisée.',403);
   const len=Number(request.headers.get('content-length')||0);if(len>(route==='upload'?6000000:128000))throw new UserError('Requête trop volumineuse.',413);
  }
  if(route==='status'&&method==='GET'){const gate=await session(db,request,'gate');let a:Account|undefined;try{if(gate)a=await account(db,request);}catch{}return ok({gate:!!gate,account:a||null});}
  if(route==='gate'&&method==='POST'){
   if(!env.SAHATI_GATE_HASH)throw new UserError('L’accès privé doit être configuré par le propriétaire.',503);const rate=await guardAttempts(db,request,'gate');const input=await jsonInput(request) as any;if(!await verifyPassword(String(input.password||''),env.SAHATI_GATE_HASH))throw new UserError('Mot de passe incorrect.',401);
   await clearAttempt(db,rate);await log(db,undefined,'Ouverture de l’accès privé','gate');return ok({ok:true},200,{'Set-Cookie':await newSession(db,'gate')});
  }
  if(!await session(db,request,'gate'))throw new UserError('L’accès privé est verrouillé.',401);
  if(route==='login'&&method==='POST'){
   const rate=await guardAttempts(db,request,'login'),input=await jsonInput(request) as any;await ensureSeed(db);const row=await db.prepare('SELECT * FROM sahati_accounts WHERE lower(email)=lower(?) AND active=1').bind(textField(input.email,'E-mail',200,true)).first<any>();
   if(!row||!await verifyPassword(String(input.password||''),row.password_hash))throw new UserError('Identifiants incorrects ou compte inactif.',401);await clearAttempt(db,rate);const prev=await session(db,request,'account');if(prev)await db.prepare('DELETE FROM sahati_sessions WHERE token_hash=?').bind(prev.token_hash).run();await log(db,{id:row.id,name:row.name} as Account,'Connexion',row.role);return ok({ok:true},200,{'Set-Cookie':await newSession(db,'account',row.id)});
  }
  if(['logout','lock'].includes(route)&&method==='POST'){
   for(const phase of (route==='lock'?['gate','account']:['account']) as ('gate'|'account')[]){const s=await session(db,request,phase);if(s)await db.prepare('DELETE FROM sahati_sessions WHERE token_hash=?').bind(s.token_hash).run();}
   const r=ok({ok:true});r.headers.append('Set-Cookie',cookie(accountCookie,'',0));if(route==='lock')r.headers.append('Set-Cookie',cookie(gateCookie,'',0));return r;
  }
  const a=await account(db,request);
  if(route==='bootstrap'&&method==='GET'){
   const records=await allRecords(db),patients=records.filter(e=>e.kind==='patients');const hospitalFilter=new URL(request.url).searchParams.get('hospital');const scopedRecords=hospitalFilter&&['admin','director'].includes(a.role)?records.filter(e=>e.hospitalId===hospitalFilter):records;const allowed=scopedRecords.filter(e=>inScope(a,e,patients)&&patientPublished(a,e)).map(e=>redact(a,e));const audits=['admin','director'].includes(a.role)?(await db.prepare('SELECT * FROM sahati_audit ORDER BY created_at DESC LIMIT 120').all()).results:[];
   const users=(await db.prepare('SELECT id,name,email,role,hospital_id,active FROM sahati_accounts').all<any>()).results.map(u=>({id:u.id,name:u.name,email:u.email,role:u.role,hospitalId:u.hospital_id,active:!!u.active}));await log(db,a,'Lecture espace',a.role,`${allowed.length} éléments autorisés`);
   const attachmentRows=(await db.prepare('SELECT id,record_id,file_name,mime,size,created_at FROM sahati_attachments').all<any>()).results.filter(f=>allowed.some(e=>e.id===f.record_id));
   const directory=(await db.prepare('SELECT data FROM sahati_hospitals').all<any>()).results.map(h=>JSON.parse(h.data));
   return ok({account:a,records:allowed,metrics:metrics(scopedRecords,a),hospitals:directory,accounts:users.filter(u=>['admin','director'].includes(a.role)||u.hospitalId===a.hospitalId),audit:audits,attachments:attachmentRows,demo:true});
  }
  if(route==='records'&&method==='POST')return ok({record:redact(a,await createRecord(db,a,await jsonInput(request)))},201);
  if(route==='records'&&path[1]&&method==='PATCH')return ok({record:redact(a,await mutate(db,a,path[1],await jsonInput(request)))});
  if(route==='accounts'&&method==='PATCH'){
   if(a.role!=='admin')throw new UserError('Administration requise.',403);const input=await jsonInput(request) as any;if(input.id===a.id)throw new UserError('Votre propre compte administrateur doit rester actif.');const exists=await db.prepare('SELECT id FROM sahati_accounts WHERE id=?').bind(input.id).first();if(!exists)throw new UserError('Compte introuvable.',404);await db.batch([db.prepare('UPDATE sahati_accounts SET active=? WHERE id=?').bind(input.active?1:0,input.id),db.prepare('DELETE FROM sahati_sessions WHERE account_id=?').bind(input.id),auditStmt(db,a,'Modification accès',input.id,input.active?'Réactivation':'Désactivation')]);return ok({ok:true});
  }
  if(route==='hospitals'&&method==='POST'){
   if(a.role!=='admin')throw new UserError('Administration requise.',403);const input=await jsonInput(request) as any;const wilaya=String(input.wilaya||'').padStart(2,'0');if(!/^\d{2}$/.test(wilaya)||Number(wilaya)<1||Number(wilaya)>58)throw new UserError('Code de wilaya entre 01 et 58 requis.');const id=randomToken().slice(0,24),h={id,name:textField(input.name,'Établissement',200,true),city:textField(input.city,'Ville',100,true),wilaya,type:textField(input.type,'Type',100)||'Établissement de démonstration',services:0,beds:0};await db.batch([db.prepare('INSERT INTO sahati_hospitals(id,data) VALUES(?,?)').bind(id,JSON.stringify(h)),auditStmt(db,a,'Ajout établissement',id,h.name)]);return ok({ok:true},201);
  }
  if(route==='accounts'&&method==='POST'){
   if(a.role!=='admin')throw new UserError('Administration requise.',403);const input=await jsonInput(request) as any,role=input.role as Role;if(!roles.some(r=>r.id===role))throw new UserError('Rôle invalide.');const email=textField(input.email,'E-mail',200,true);if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new UserError('Adresse e-mail invalide.');const password=textField(input.password,'Mot de passe',256,true);if(password.length<12)throw new UserError('Choisissez au moins 12 caractères.');const hospitalId=input.hospitalId||a.hospitalId;if(!await db.prepare('SELECT id FROM sahati_hospitals WHERE id=?').bind(hospitalId).first())throw new UserError('Établissement inconnu.');const id=randomToken().slice(0,24);let patientId=null;if(role==='patient'){const p=await getRecord(db,textField(input.patientId,'Patient',60,true));if(p.kind!=='patients'||p.hospitalId!==hospitalId)throw new UserError('Patient invalide.');patientId=p.id;}await db.batch([db.prepare('INSERT INTO sahati_accounts(id,email,name,role,hospital_id,patient_id,password_hash,active) VALUES(?,?,?,?,?,?,?,1)').bind(id,email,textField(input.name,'Nom',150,true),role,hospitalId,patientId,await hashPassword(password)),auditStmt(db,a,'Création de compte',id,role)]);return ok({ok:true},201);
  }
  if(route==='cohort'&&method==='GET')return ok({rows:await cohort(db,a,path[1]||'',new URL(request.url).searchParams.get('export')==='1')});
  if(route==='verify'&&method==='GET'){
   const token=path[1]||'';if(!/^[a-f0-9]{64}$/.test(token))throw new UserError('Référence invalide.',404);const row=await db.prepare("SELECT id FROM sahati_records WHERE kind='prescriptions' AND json_extract(data,'$.verificationToken')=?").bind(token).first<any>();if(!row)throw new UserError('Ordonnance introuvable.',404);const e=await getRecord(db,row.id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients))throw new UserError('Cette ordonnance est hors de votre périmètre.',403);await log(db,a,'Vérification QR',e.id);return ok({id:e.id,status:e.status,version:e.version,date:e.date,author:e.authorName,validator:e.validatedByName||'Validation de démonstration',valid:['validated','dispensed'].includes(e.status),demo:true});
  }
  if(route==='qr'&&method==='GET'){
   const e=await getRecord(db,path[1]),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(e.kind!=='prescriptions'||!inScope(a,e,patients)||!patientPublished(a,e))throw new UserError('Accès refusé.',403);const url=new URL(request.url).origin+'/verifier?reference='+e.verificationToken;return new Response(qrSvg(url),{headers:{...headers,'Content-Type':'image/svg+xml'}});
  }
  if(route==='audit-event'&&method==='POST'){const input=await jsonInput(request) as any;const e=await getRecord(db,input.id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients)||!patientPublished(a,e))throw new UserError('Accès refusé.',403);if(!['Impression','Lecture dossier','Export dossier'].includes(input.action))throw new UserError('Événement invalide.');await log(db,a,input.action,e.id);return ok({ok:true});}
  if(route==='fhir'&&method==='GET'){
   if(!['doctor','patient'].includes(a.role))throw new UserError('Export clinique non autorisé.',403);const p=await getRecord(db,path[1]),records=await allRecords(db);if(p.kind!=='patients'||!inScope(a,p,records.filter(r=>r.kind==='patients')))throw new UserError('Accès refusé.',403);const entry:any[]=[{resource:{resourceType:'Patient',id:p.id,identifier:[{system:'urn:sahati:demo',value:p.identifier}],name:[{family:p.lastName,given:[p.firstName]}],gender:p.sex==='F'?'female':p.sex==='M'?'male':'unknown',birthDate:p.birthDate}}];records.filter(e=>e.kind==='prescriptions'&&e.patientId===p.id&&inScope(a,e,[p])&&patientPublished(a,e)).forEach(e=>e.medications.forEach((m:any,i:number)=>entry.push({resource:{resourceType:'MedicationRequest',id:e.id+'-'+i,status:{validated:'active',dispensed:'completed',cancelled:'cancelled',draft:'draft',pending:'draft'}[e.status as string]||'unknown',intent:'order',subject:{reference:'Patient/'+p.id},medication:{concept:{text:m.name}},dosageInstruction:[{text:[m.dose,m.route,m.frequency,m.duration].join(' ; ')}]}})));await log(db,a,'Export dossier',p.id,'JSON inspiré de FHIR R5 ; non certifié');return ok({resourceType:'Bundle',type:'collection',meta:{tag:[{system:'urn:sahati:environment',code:'demo'}]},entry});
  }
  if(route==='upload'&&method==='POST'){
   if(!env.BUCKET)throw new UserError('Le stockage de fichiers n’est pas disponible.',503);const form=await request.formData(),file=form.get('file'),id=String(form.get('recordId')||'');if(!(file instanceof File)||file.size>5000000||file.size===0)throw new UserError('Fichier vide ou supérieur à 5 Mo.');const e=await getRecord(db,id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients)||!canWrite(a,e.kind)||!['documents','orders','encounters'].includes(e.kind))throw new UserError('Dépôt non autorisé.',403);if(['orders','encounters'].includes(e.kind)&&!['draft','requested','collected','in_progress','pending'].includes(e.status))throw new UserError('Le document est déjà validé.');
   const bytes=new Uint8Array(await file.arrayBuffer());let mime='';if(bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70)mime='application/pdf';else if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)mime='image/png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';if(!mime)throw new UserError('Formats autorisés : PDF, PNG, JPEG.');const fileId=randomToken().slice(0,24),key='documents/'+fileId,name=file.name.replace(/[^\p{L}\p{N}._ -]/gu,'').slice(0,120)||'document';await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});try{await db.batch([db.prepare('INSERT INTO sahati_attachments(id,record_id,file_name,mime,size,object_key,created_at) VALUES(?,?,?,?,?,?,?)').bind(fileId,id,name,mime,file.size,key,new Date().toISOString()),auditStmt(db,a,'Dépôt document',id,name)]);}catch(error){await env.BUCKET.delete(key);throw error;}return ok({ok:true},201);
  }
  if(route==='files'&&method==='GET'){
   const f=await db.prepare('SELECT * FROM sahati_attachments WHERE id=?').bind(path[1]).first<any>();if(!f||!env.BUCKET)throw new UserError('Fichier introuvable.',404);const e=await getRecord(db,f.record_id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients)||!patientPublished(a,e))throw new UserError('Accès refusé.',403);const object=await env.BUCKET.get(f.object_key);if(!object)throw new UserError('Fichier introuvable.',404);await log(db,a,'Téléchargement',e.id,f.file_name);return new Response(object.body,{headers:{...headers,'Content-Type':f.mime,'Content-Disposition':`attachment; filename="document-${f.id}.${f.mime==='application/pdf'?'pdf':f.mime==='image/png'?'png':'jpg'}"`}});
  }
  return ok({error:'Route introuvable.'},404);
 }catch(error){if(error instanceof SyntaxError)return ok({error:'Format de requête invalide.'},400);if(error instanceof UserError)return ok({error:error.message},error.status);const msg=String(error);if(/UNIQUE constraint|unique_resource_slot|one_active_admission/i.test(msg))return ok({error:'Conflit : créneau, compte ou hospitalisation déjà enregistré.'},409);if(/stock_nonnegative|CHECK constraint/.test(msg))return ok({error:'Stock insuffisant. Aucune délivrance n’a été enregistrée.'},409);console.error('SAHATI API failed',error instanceof Error?error.message:'unknown');return ok({error:'Une erreur serveur est survenue. Actualisez puis réessayez.'},500);}
}
