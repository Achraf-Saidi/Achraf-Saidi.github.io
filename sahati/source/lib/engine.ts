import type {Account,Entity,Kind,Role} from './model';
import {hospitals,roles,today,age} from './model';
import {seedAccounts,seedRecords} from './seed';
import {canWrite,inScope,redact,allowedTransition,patientPublished,kinds} from './policy';
import {randomToken,sha,verifyPassword,hashPassword} from './crypto';
import {UserError,validateFields,textField,positive,slotsFor,dateField} from './validation';
import {qrSvg} from './qr';
import {createRoles} from './modules';
import {validateObservations,demoExtras} from './clinical';
import {clinicalCases,casePublic,gradeCase} from './education';
import {demoStudyUID} from './dicom-demo';
import {operationalIndicators} from './reporting';
import {ensureInventory,normalizeStock,movementStmt,inventorySnapshot,inventoryAction,medicationCatalog,allocateFEFO,usableLot,matchesMedication,lotGuard} from './inventory';
import {patientTools,patientToolsSchema} from './patient-tools';
export interface Environment {DB?:D1Database;BUCKET?:R2Bucket;SAHATI_GATE_HASH?:string;onSessionCookie?:(value:string)=>void;}
// The shared engine needs body readers and application headers, not a network
// Request. Browsers forbid setting Origin/Cookie on network Request objects.
export type ApplicationRequest=Pick<Request,'url'|'method'|'headers'|'text'|'formData'>;
const gateCookie='__Host-sahati-gate',accountCookie='__Host-sahati-account';
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const ok=(data:any,status=200,extra:Record<string,string>={})=>Response.json(data,{status,headers:{...headers,...extra}});
function cookie(name:string,value:string,seconds:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;}
function sessionResponse(env:Environment,values:string[]){const response=ok({ok:true});for(const value of values){if(env.onSessionCookie)env.onSessionCookie(value);else response.headers.append('Set-Cookie',value);}return response;}
function readCookie(request:ApplicationRequest,name:string){const part=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));return part?.slice(name.length+1)||'';}
function dbFor(env:Environment){if(!env.DB)throw new UserError('Le stockage serveur n’est pas disponible.',503);return env.DB;}
export async function session(db:D1Database,req:ApplicationRequest,phase:'gate'|'account'){
 const token=readCookie(req,phase==='gate'?gateCookie:accountCookie);if(!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await db.prepare('SELECT * FROM sahati_sessions WHERE token_hash=? AND phase=? AND expires_at>?').bind(await sha(token),phase,Date.now()).first<any>();return row||null;
}
async function account(db:D1Database,req:ApplicationRequest):Promise<Account>{const s=await session(db,req,'account');if(!s)throw new UserError('Connectez-vous à votre espace.',401);const r=await db.prepare('SELECT * FROM sahati_accounts WHERE id=? AND active=1').bind(s.account_id).first<any>();if(!r)throw new UserError('Ce compte n’est plus actif.',401);return {id:r.id,name:r.name,email:r.email,role:r.role,hospitalId:r.hospital_id,patientId:r.patient_id||undefined,active:true};}
async function newSession(db:D1Database,phase:string,accountId?:string){const token=randomToken(),ttl=phase==='gate'?8*3600:3600;await db.prepare('INSERT INTO sahati_sessions(token_hash,phase,account_id,expires_at,created_at) VALUES(?,?,?,?,?)').bind(await sha(token),phase,accountId||null,Date.now()+ttl*1000,Date.now()).run();return cookie(phase==='gate'?gateCookie:accountCookie,token,ttl);}
function auditStmt(db:D1Database,a:Account|undefined,action:string,target:string,detail='') {return db.prepare('INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) VALUES(?,?,?,?,?,?,?)').bind(randomToken(),a?.id||'private-owner',a?.name||'Propriétaire',action,target,detail,new Date().toISOString());}
async function log(db:D1Database,a:Account|undefined,action:string,target:string,detail=''){await auditStmt(db,a,action,target,detail).run();}
async function guardAttempts(db:D1Database,req:ApplicationRequest,scope:string){const id=await sha(`${scope}:${req.headers.get('cf-connecting-ip')||'visitor'}`);const now=Date.now();await db.prepare('INSERT INTO sahati_attempts(id,count,reset_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END').bind(id,now+900000,now,now,now+900000).run();const r=await db.prepare('SELECT count FROM sahati_attempts WHERE id=?').bind(id).first<any>();if(r.count>10)throw new UserError('Trop de tentatives. Réessayez dans 15 minutes.',429);return id;}
async function clearAttempt(db:D1Database,id:string){await db.prepare('DELETE FROM sahati_attempts WHERE id=?').bind(id).run();}
async function allRecords(db:D1Database):Promise<Entity[]>{const r=await db.prepare('SELECT id,kind,hospital_id,patient_id,data,version,quantity FROM sahati_records ORDER BY updated_at DESC LIMIT 3000').all<any>();return r.results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,hospitalId:r.hospital_id,patientId:r.patient_id||undefined,version:r.version,...(r.kind==='stock'?{quantity:r.quantity}:{})}));}
async function getRecord(db:D1Database,id:string){const r=await db.prepare('SELECT * FROM sahati_records WHERE id=?').bind(id).first<any>();if(!r)throw new UserError('Élément introuvable.',404);return {...JSON.parse(r.data),id:r.id,kind:r.kind,hospitalId:r.hospital_id,patientId:r.patient_id||undefined,version:r.version,...(r.kind==='stock'?{quantity:r.quantity}:{})} as Entity;}
function insertStmt(db:D1Database,e:Entity,author:string){return db.prepare('INSERT INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(e.id,e.kind,e.hospitalId,e.patientId||null,JSON.stringify(e),e.kind==='stock'?e.quantity:0,e.version,author,e.createdAt||new Date().toISOString());}
async function upgradeDemo(db:D1Database){
 await ensureInventory(db);await db.prepare(patientToolsSchema).run();
 const versionSchema=["CREATE TABLE IF NOT EXISTS sahati_record_versions(record_id TEXT NOT NULL,version INTEGER NOT NULL,data TEXT NOT NULL,actor_id TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(record_id,version))","CREATE TABLE IF NOT EXISTS sahati_learning_attempts(id TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL,case_id TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL)"];
 await db.batch(versionSchema.map(sql=>db.prepare(sql)));
 if(await db.prepare("SELECT key FROM sahati_metadata WHERE key='connected_demo_v2'").first())return;
 const extras=demoExtras(),now=new Date().toISOString();
 await db.batch(extras.map(e=>db.prepare('INSERT OR IGNORE INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) VALUES(?,?,?,?,?,0,1,?,?)').bind(e.id,e.kind,e.hospitalId,e.patientId||null,JSON.stringify(e),'seed-demo',now)));
 // Only enrich untouched synthetic seed records. Never overwrite a user's edits.
 const seed=(await allRecords(db)).filter(e=>e.kind==='patients'&&e.version===1&&/^p\d+$/.test(e.id));
 await db.batch(seed.map(e=>db.prepare("UPDATE sahati_records SET data=json_set(data,'$.personalHistory',?,'$.familyHistory',?,'$.vaccinations',?,'$.surgicalHistory',?,'$.status',?) WHERE id=? AND version=1 AND created_by='seed-demo'").bind('Non renseigné dans le scénario','Non renseigné dans le scénario','Non renseigné dans le scénario','Non renseigné dans le scénario',Number(e.id.slice(1))<=8?'admitted':'active',e.id)));
 const facilityBeds=['h2','h3'].flatMap(hospitalId=>Array.from({length:8},(_,i)=>({id:`demo-${hospitalId}-bed-${i}`,kind:'beds',hospitalId,version:1,createdAt:now,number:`${hospitalId.toUpperCase()}-${i+1}`,service:i<4?'Médecine interne':'Pédiatrie',status:'available'} as Entity)));
 await db.batch(facilityBeds.map(e=>db.prepare('INSERT OR IGNORE INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) VALUES(?,?,?,NULL,?,0,1,?,?)').bind(e.id,e.kind,e.hospitalId,JSON.stringify(e),'seed-demo',now)));
 await db.prepare("INSERT OR IGNORE INTO sahati_metadata(key,value) VALUES('connected_demo_v2','1')").run();
}
async function ensureSeed(db:D1Database){
 await db.batch(hospitals.map(h=>db.prepare('INSERT OR IGNORE INTO sahati_hospitals(id,data) VALUES(?,?)').bind(h.id,JSON.stringify(h))));
 if(await db.prepare("SELECT key FROM sahati_metadata WHERE key='seed_complete'").first()){await upgradeDemo(db);return;}
 const hash=await hashPassword('SahatiDemo2026!');const commands:D1PreparedStatement[]=[];
 seedAccounts().forEach(a=>commands.push(db.prepare('INSERT OR IGNORE INTO sahati_accounts(id,email,name,role,hospital_id,patient_id,password_hash,active) VALUES(?,?,?,?,?,?,?,1)').bind(a.id,a.email,a.name,a.role,a.hospitalId,a.patientId||null,hash)));
 const records=seedRecords();records.forEach(e=>{if(e.kind==='prescriptions')e.verificationToken=randomToken();commands.push(db.prepare('INSERT OR IGNORE INTO sahati_records(id,kind,hospital_id,patient_id,data,quantity,version,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(e.id,e.kind,e.hospitalId,e.patientId||null,JSON.stringify(e),e.kind==='stock'?e.quantity:0,1,'seed-demo',e.createdAt));});
 // Small bounded batches; all inserts are idempotent. Seed data never enters schema migrations.
 for(let i=0;i<commands.length;i+=50)await db.batch(commands.slice(i,i+50));
 const ap=records.filter(e=>['appointments','surgeries'].includes(e.kind));const slotCommands=ap.flatMap(e=>slotsFor(e).map(s=>db.prepare('INSERT OR IGNORE INTO sahati_schedule_slots(id,record_id,resource,slot) VALUES(?,?,?,?)').bind(randomToken(),e.id,s.resource,s.slot)));for(let i=0;i<slotCommands.length;i+=50)await db.batch(slotCommands.slice(i,i+50));
 await db.prepare("INSERT OR IGNORE INTO sahati_metadata(key,value) VALUES('seed_complete','1')").run();await upgradeDemo(db);
}
function metrics(records:Entity[],a:Account){const hospital=['admin','director'].includes(a.role)?records:records.filter(e=>e.hospitalId===a.hospitalId);const p=records.filter(e=>e.kind==='patients');const scoped=['doctor','resident','patient'].includes(a.role)?hospital.filter(e=>inScope(a,e,p)):hospital;const count=(kind:string,filter=(e:Entity)=>true)=>scoped.filter(e=>e.kind===kind&&filter(e)).length;const occupied=hospital.filter(e=>e.kind==='beds'&&e.status==='occupied').length;const beds=hospital.filter(e=>e.kind==='beds').length;return {patients:count('patients'),appointments:count('appointments',e=>e.date===today()&&e.status!=='cancelled'),pendingPrescriptions:count('prescriptions',e=>e.status==='pending'),pendingOrders:count('orders',e=>!['published','acknowledged','cancelled'].includes(e.status)),occupied,beds,occupancy:beds?Math.round(100*occupied/beds):0,stockAlerts:(['pharmacy','logistics','director','admin'].includes(a.role)?hospital:[]).filter(e=>e.kind==='stock'&&e.quantity<e.threshold).length,unpaid:(['finance','director','admin'].includes(a.role)?hospital:[]).filter(e=>e.kind==='invoices'&&e.status==='unpaid').reduce((s,e)=>s+e.amount,0),admissions:count('admissions',e=>e.status==='admitted'),incidents:count('incidents',e=>e.status!=='resolved'),byService:[...new Set(hospital.filter(e=>e.kind==='admissions').map(e=>e.service))].map(service=>({service,count:hospital.filter(e=>e.kind==='admissions'&&e.service===service&&e.status==='admitted').length})),series:Array.from({length:7},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-6+i);const date=d.toISOString().slice(0,10);return {date,count:hospital.filter(e=>e.kind==='appointments'&&e.date===date&&e.status!=='cancelled').length};})};}
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
 if(['encounters','prescriptions','orders'].includes(kind)&&input.data?.encounterId){const linked=await getRecord(db,textField(input.data.encounterId,'Consultation',60,true));if(linked.kind!=='encounters'||linked.patientId!==patientId||!inScope(a,linked,[await getRecord(db,patientId!)]))throw new UserError('Consultation liée inaccessible.',403);e.encounterId=linked.id;}
 if(kind==='encounters'&&input.data?.appointmentId){const ap=await getRecord(db,textField(input.data.appointmentId,'Rendez-vous',60,true));if(ap.kind!=='appointments'||ap.patientId!==patientId||ap.status!=='arrived'||ap.doctorId!==a.id&&a.role!=='resident')throw new UserError('Confirmez l’arrivée du patient avant la consultation.');e.appointmentId=ap.id;}
 if(kind==='orders'&&e.category==='lab'){e.specimenId='PREL-'+id.slice(0,10).toUpperCase();e.specimenType=textField(input.data?.specimenType,'Échantillon',200)||'À préciser par le laboratoire';}
 if(kind==='surgeries'){e.duration=positive(input.data?.duration||90,'Durée',5,240);e.surgeon=a.id;e.checklist={identity:false,consent:false,site:false,anesthesia:false,counts:false};}
 if(kind==='prescriptions'){const meds=input.data?.medications;if(!Array.isArray(meds)||meds.length<1||meds.length>12)throw new UserError('Ajoutez entre 1 et 12 traitements.');e.medications=meds.map(m=>({productId:textField(m.productId,'Article catalogue',60),unit:textField(m.unit,'Unité',60),name:textField(m.name,'Médicament',200,true),dose:textField(m.dose,'Dose',300,true),route:textField(m.route,'Voie',100,true),frequency:textField(m.frequency,'Fréquence',200,true),duration:textField(m.duration,'Durée',200,true),dci:textField(m.dci,'DCI',200),presentation:textField(m.presentation,'Présentation',200),instructions:textField(m.instructions,'Instructions',500),renewals:positive(m.renewals||0,'Renouvellements',0,12),quantity:positive(m.quantity,'Quantité',1,1000)}));if(e.medications.some((m:any)=>!Number.isInteger(m.quantity)||!Number.isInteger(m.renewals)))throw new UserError('Quantité entière requise.');for(const m of e.medications){if(!m.productId)continue;const row=await db.prepare('SELECT data FROM sahati_products WHERE id=? AND hospital_id=?').bind(m.productId,hospitalId).first<any>();if(!row)throw new UserError('Article du catalogue introuvable.');const product=JSON.parse(row.data);if(product.category!=='medication'||product.title!==m.name)throw new UserError('Le médicament doit correspondre à l’article sélectionné.');m.dci=product.dci;m.presentation=product.presentation;m.unit=product.unit;}e.verificationToken=randomToken();e.instructions=data.instructions||'Document de démonstration — sans valeur clinique.';}
 if(kind==='beds'&&(await allRecords(db)).some(b=>b.kind==='beds'&&b.hospitalId===hospitalId&&b.number===e.number))throw new UserError('Ce numéro de lit existe déjà.',409);
 if(kind==='stock'){e.quantity=positive(input.data.quantity,'Quantité');e.threshold=positive(input.data.threshold,'Seuil');e.unitPrice=positive(input.data.unitPrice,'Prix');if(!Number.isInteger(e.quantity)||!Number.isInteger(e.threshold))throw new UserError('Les quantités de stock et seuils doivent être entiers.');await normalizeStock(db,e);}
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
 if(kind==='stock')commands.push(movementStmt(db,a,e,'opening',e.quantity,e.quantity,id,'Création du lot',now));
 slotsFor(e).forEach(s=>commands.push(db.prepare('INSERT INTO sahati_schedule_slots(id,record_id,resource,slot) VALUES(?,?,?,?)').bind(randomToken(),id,s.resource,s.slot)));
 commands.push(db.prepare('INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sahati_records WHERE id=?)').bind(randomToken(),a.id,a.name,'Création',id,kind,now,id));
 if(kind==='consents')commands.push(db.prepare("UPDATE sahati_records SET data=json_set(data,'$.researchConsent',json(?)),version=version+1,updated_at=? WHERE id=?").bind(e.researchConsent?'true':'false',now,patientId));
 if(kind==='admissions')commands.push(db.prepare("UPDATE sahati_records SET data=json_set(data,'$.status','admitted'),version=version+1,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM sahati_records WHERE id=?)").bind(now,patientId,id));
 const results=await db.batch(commands);if(!results[0].meta.changes)throw new UserError('La ressource a changé. Actualisez puis réessayez.',409);return e;
}
async function mutate(db:D1Database,a:Account,id:string,input:any){
 const e=await getRecord(db,id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients)||!canWrite(a,e.kind))throw new UserError('Action non autorisée sur cet élément.',403);
 if(input.version!==e.version)throw new UserError('Cet élément a été modifié. Actualisez avant de poursuivre.',409);
 const next={...e},now=new Date().toISOString();
 if(input.action==='transition'){
  const target=textField(input.status,'Statut',40,true);if(!allowedTransition(a,e,target))throw new UserError('Cette transition est interdite pour votre rôle ou le statut actuel.',403);
  if(['encounters','prescriptions'].includes(e.kind)&&target==='validated'){next.validatedBy=a.id;next.validatedByName=a.name;next.validatedAt=now;}
  if(e.kind==='orders'&&target==='validated'){next.validatedBy=a.id;next.validatedByName=a.name;next.validatedAt=now;}
  if(e.kind==='orders'&&target==='published')next.publishedAt=now;
  if(e.kind==='orders'&&target==='collected'){next.collectedAt=now;next.specimenId=e.specimenId||'PREL-'+e.id.slice(0,10).toUpperCase();}
  if(e.kind==='orders'&&target==='acknowledged'){next.acknowledgedAt=now;next.acknowledgedBy=a.name;}
  if(e.kind==='admissions'&&target==='discharged')next.dischargedAt=now;
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
   for(const field of ['personalHistory','familyHistory','vaccinations','surgicalHistory'])next[field]=textField(input.data?.[field],field,3000)||e[field]||'';
   next.problems=textField(input.data?.problems,'Problèmes',3000).split('\n').map(s=>s.trim()).filter(Boolean).slice(0,20);
  }
 }else if(input.action==='result'){
  if(e.kind!=='orders'||!['lab','radiology'].includes(a.role)||!['requested','collected','in_progress'].includes(e.status))throw new UserError('Le résultat ne peut pas être modifié à cette étape.',403);
  next.result=textField(input.result,'Résultat',6000,true);next.critical=!!input.critical;next.observations=validateObservations(input.observations);next.nextSteps=textField(input.nextSteps,'Suivi explicitement indiqué',1000);next.specimenType=textField(input.specimenType,'Échantillon',200)||e.specimenType||'';
  }else if(input.action==='schedule-imaging'){
  if(e.kind!=='orders'||e.category!=='radiology'||a.role!=='radiology'||e.status!=='requested')throw new UserError('Programmation radiologique non autorisée.',403);next.imagingDate=dateField(input.date);next.imagingTime=textField(input.time,'Heure',5,true);next.imagingDuration=positive(input.duration||20,'Durée',5,240);next.modality=textField(input.modality,'Équipement',200,true);if(!['Équipement démo 01','Équipement démo 02'].includes(next.modality))throw new UserError('Équipement du scénario inconnu.');next.status='scheduled';slotsFor(next);
 }else if(input.action==='attach-demo-study'){
  if(e.kind!=='orders'||e.category!=='radiology'||a.role!=='radiology'||e.status!=='in_progress'||e.patientId!=='p1'||input.studyUID!==demoStudyUID)throw new UserError('Rattachement du scénario DICOM non autorisé.',403);next.studyUID=demoStudyUID;next.imagingSource='Fantôme SAHATI entièrement synthétique';
 }else if(input.action==='reschedule'){
  if(e.kind!=='appointments'||!['patient','reception'].includes(a.role)||!['requested','scheduled'].includes(e.status))throw new UserError('Ce rendez-vous ne peut plus être modifié.',403);
  next.date=dateField(input.date);next.time=textField(input.time,'Heure',5,true);next.status=a.role==='patient'?'requested':'scheduled';slotsFor(next);
 }else if(input.action==='encounter-draft'){
  if(e.kind!=='encounters'||!['doctor','resident'].includes(a.role)||!['draft','pending'].includes(e.status)||a.role==='resident'&&e.authorId!==a.id)throw new UserError('Ce brouillon ne peut pas être modifié.',403);
  Object.assign(next,validateFields('encounters',input.data||{}));
 }else if(input.action==='checklist'){
  if(e.kind!=='surgeries'||a.role!=='doctor'||!['scheduled','in_progress'].includes(e.status))throw new UserError('Checklist non modifiable.',403);
  const items=['identity','consent','site','anesthesia','counts'];if(!items.includes(input.item))throw new UserError('Contrôle inconnu.');next.checklist={...e.checklist,[input.item]:!!input.checked};
 }else if(input.action==='restock'){
  if(e.kind!=='stock'||!['pharmacy','logistics'].includes(a.role))throw new UserError('Mouvement de stock non autorisé.',403);if(e.status!=='active'||e.expiry<today())throw new UserError('Réception impossible sur un lot bloqué ou périmé.');const delta=positive(input.quantity,'Réception',1,100000);if(!Number.isInteger(delta))throw new UserError('Quantité entière requise.');next.quantity=e.quantity+delta;next.lastMovement={quantity:delta,by:a.name,date:now};
 }else if(input.action==='staff'){
  if(e.kind!=='staff'||!['admin','director'].includes(a.role))throw new UserError('Affectation non modifiable.',403);next.service=textField(input.service,'Service',200,true);next.shift=textField(input.shift,'Horaire',200,true);
 }else if(input.action==='care'){
  if(e.kind!=='care'||!['nurse','doctor','resident'].includes(a.role)||e.status==='done')throw new UserError('Transmission non modifiable.',403);for(const k of ['notes','temperature','pulse','bloodPressure'])next[k]=textField(input[k],k,2000);next.performedBy=a.name;
 }else throw new UserError('Action inconnue.');
 next.version=e.version+1;next.updatedAt=now;
 const commands=[db.prepare('UPDATE sahati_records SET data=?,quantity=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(next),next.kind==='stock'?next.quantity:0,now,id,e.version)];
 const condition='EXISTS(SELECT 1 FROM sahati_records WHERE id=? AND version=? AND updated_at=?)';
 if(e.kind==='prescriptions'&&next.status==='dispensed'){
  const stocks=(await allRecords(db)).filter(r=>r.kind==='stock'&&r.hospitalId===e.hospitalId);
  let disp:any[];
  if(input.autoFEFO===true)disp=allocateFEFO(e,stocks);
  else {const selected=input.dispenses;if(!Array.isArray(selected)||selected.length!==e.medications.length)throw new UserError('Associez un lot à chaque traitement.');const seen=new Set<string>();disp=selected.map((d:any,i:number)=>{const stock=stocks.find(s=>s.id===d.stockId),med=e.medications[i],quantity=positive(d.quantity,'Quantité délivrée',1,10000);if(!stock||!Number.isInteger(quantity)||seen.has(stock.id)||!usableLot(stock)||!matchesMedication(stock,med)||quantity!==med.quantity)throw new UserError('Le lot, la péremption ou la quantité ne correspond pas au traitement.');seen.add(stock.id);return {...d,medIndex:i,medication:med.name,lot:stock.lot,expiry:stock.expiry,productId:stock.productId,unit:stock.unit};});}
  const totals=new Map<string,number>();for(const d of disp)totals.set(d.stockId,(totals.get(d.stockId)||0)+d.quantity);
  next.dispenses=disp;next.dispensedBy=a.name;next.dispensedAt=now;next.dispensingMethod=input.autoFEFO?'FEFO':'manual';
  commands[0]=db.prepare('UPDATE sahati_records SET data=?,quantity=0,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(next),now,id,e.version);
  const guards:D1PreparedStatement[]=[db.prepare('INSERT INTO sahati_inventory_guard(id,valid) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM sahati_records WHERE id=? AND version=?) THEN 1 ELSE 0 END)').bind(randomToken(),e.id,e.version)];
  for(const [stockId,qty] of totals){const stock=stocks.find(s=>s.id===stockId)!;if(stock.quantity<qty)throw new UserError('Stock insuffisant.',409);guards.push(lotGuard(db,stock));commands.push(db.prepare("UPDATE sahati_records SET quantity=quantity-?,data=json_set(data,'$.quantity',quantity-?),version=version+1,updated_at=? WHERE id=? AND version=?").bind(qty,qty,now,stockId,stock.version),movementStmt(db,a,stock,'dispense',-qty,stock.quantity-qty,e.id,'Délivrance de l’ordonnance validée',now));}
  commands.unshift(...guards);
 }
 if(e.kind==='stock'){commands.unshift(lotGuard(db,e));commands.push(movementStmt(db,a,e,'receive',next.quantity-e.quantity,next.quantity,e.id,'Réception du lot existant',now));}

 if(e.kind==='admissions'&&next.status==='discharged')commands.push(db.prepare(`UPDATE sahati_records SET data=json_remove(json_set(data,'$.status','cleaning'),'$.patientId'),patient_id=NULL,version=version+1,updated_at=? WHERE id=? AND ${condition}`).bind(now,e.bedId,id,next.version,now));
 if((['appointments','surgeries'].includes(e.kind)&&['cancelled','done'].includes(next.status))||(e.kind==='orders'&&e.category==='radiology'&&['validated','cancelled'].includes(next.status)))commands.push(db.prepare(`DELETE FROM sahati_schedule_slots WHERE record_id=? AND ${condition}`).bind(id,id,next.version,now));
 commands.push(db.prepare(`INSERT INTO sahati_audit(id,actor_id,actor_name,action,target,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE ${condition}`).bind(randomToken(),a.id,a.name,input.action==='transition'?'Changement de statut':'Modification',id,`${e.kind} : ${input.action==='transition'?e.status+' → '+next.status:input.action}`,now,id,next.version,now));
 commands.push(db.prepare(`INSERT OR IGNORE INTO sahati_record_versions(record_id,version,data,actor_id,reason,created_at) SELECT ?,?,?,?,?,? WHERE ${condition}`).bind(e.id,e.version,JSON.stringify(e),a.id,input.reason||input.action,now,id,next.version,now));
 commands.push(db.prepare(`INSERT OR IGNORE INTO sahati_record_versions(record_id,version,data,actor_id,reason,created_at) SELECT ?,?,?,?,?,? WHERE ${condition}`).bind(e.id,next.version,JSON.stringify(next),a.id,input.reason||input.action,now,id,next.version,now));
 if(input.action==='schedule-imaging')for(const slot of slotsFor(next))commands.push(db.prepare(`INSERT INTO sahati_schedule_slots(id,record_id,resource,slot) SELECT ?,?,?,? WHERE ${condition}`).bind(randomToken(),id,slot.resource,slot.slot,id,next.version,now));
 if(input.action==='reschedule'){commands.push(db.prepare(`DELETE FROM sahati_schedule_slots WHERE record_id=? AND ${condition}`).bind(id,id,next.version,now));for(const slot of slotsFor(next))commands.push(db.prepare(`INSERT INTO sahati_schedule_slots(id,record_id,resource,slot) SELECT ?,?,?,? WHERE ${condition}`).bind(randomToken(),id,slot.resource,slot.slot,id,next.version,now));}
 if(e.kind==='encounters'&&next.status==='validated'&&e.appointmentId){commands.push(db.prepare(`UPDATE sahati_records SET data=json_set(data,'$.status','done','$.encounterId',?),version=version+1,updated_at=? WHERE id=? AND json_extract(data,'$.status')='arrived' AND ${condition}`).bind(e.id,now,e.appointmentId,id,next.version,now));commands.push(db.prepare(`DELETE FROM sahati_schedule_slots WHERE record_id=? AND ${condition}`).bind(e.appointmentId,id,next.version,now));}
 if(e.kind==='admissions'&&next.status==='discharged')commands.push(db.prepare(`UPDATE sahati_records SET data=json_set(data,'$.status','active'),version=version+1,updated_at=? WHERE id=? AND ${condition}`).bind(now,e.patientId,id,next.version,now));
 commands.push(db.prepare('DELETE FROM sahati_inventory_guard'));await db.batch(commands);const saved=await getRecord(db,id);if(saved.version!==next.version||saved.updatedAt!==now)throw new UserError('Modification concurrente. Actualisez votre vue.',409);return next;
}
async function cohort(db:D1Database,a:Account,studyId:string,exporting=false){
 if(!['researcher','student'].includes(a.role))throw new UserError('Espace réservé à la recherche.',403);const records=await allRecords(db),study=records.find(e=>e.id===studyId&&e.kind==='studies');
 if(!study||study.status!=='approved'||!inScope(a,study,[]))throw new UserError('Cette étude n’est pas approuvée ou accessible.',403);
 const permit=records.find(e=>e.kind==='requests'&&e.authorId===a.id&&e.studyId===studyId&&e.status==='approved'&&e.expiresAt>=today());if(!permit)throw new UserError('Une autorisation d’accès approuvée et non expirée est nécessaire.',403);
 const patients=records.filter(e=>e.kind==='patients'&&e.hospitalId===a.hospitalId&&e.researchConsent&&e.service===study.specialty);const rows=await Promise.all(patients.map(async p=>{const hash=await sha(studyId+':'+p.id),scenario=Number.parseInt(hash.slice(0,6),16);return {code:'COH-'+hash.slice(0,10).toUpperCase(),ageBand:age(p.birthDate)<18?'0–17':age(p.birthDate)<40?'18–39':age(p.birthDate)<65?'40–64':'65+',sex:p.sex,followUpDays:30+(scenario%10)*23,event:scenario%3===0?1:0};}));rows.sort((left,right)=>left.code.localeCompare(right.code));
 await log(db,a,exporting?'Export recherche':'Lecture cohorte',studyId,`${rows.length} lignes fictives ; variables autorisées`);return rows;
}
async function jsonInput(request:ApplicationRequest){const raw=await request.text();if(new TextEncoder().encode(raw).length>128000)throw new UserError('Requête trop volumineuse.',413);const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw new UserError('Format de requête invalide.');return value;}
export async function handleAPI(request:ApplicationRequest,path:string[],env:Environment):Promise<Response>{
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
   await clearAttempt(db,rate);await log(db,undefined,'Ouverture de l’accès privé','gate');return sessionResponse(env,[await newSession(db,'gate')]);
  }
  if(!await session(db,request,'gate'))throw new UserError('L’accès privé est verrouillé.',401);
  if(route==='login'&&method==='POST'){
   const rate=await guardAttempts(db,request,'login'),input=await jsonInput(request) as any;await ensureSeed(db);const row=await db.prepare('SELECT * FROM sahati_accounts WHERE lower(email)=lower(?) AND active=1').bind(textField(input.email,'E-mail',200,true)).first<any>();
   if(!row||!await verifyPassword(String(input.password||''),row.password_hash))throw new UserError('Identifiants incorrects ou compte inactif.',401);await clearAttempt(db,rate);const prev=await session(db,request,'account');if(prev)await db.prepare('DELETE FROM sahati_sessions WHERE token_hash=?').bind(prev.token_hash).run();await log(db,{id:row.id,name:row.name} as Account,'Connexion',row.role);return sessionResponse(env,[await newSession(db,'account',row.id)]);
  }
  if(['logout','lock'].includes(route)&&method==='POST'){
   for(const phase of (route==='lock'?['gate','account']:['account']) as ('gate'|'account')[]){const s=await session(db,request,phase);if(s)await db.prepare('DELETE FROM sahati_sessions WHERE token_hash=?').bind(s.token_hash).run();}
   return sessionResponse(env,[cookie(accountCookie,'',0),...(route==='lock'?[cookie(gateCookie,'',0)]:[])]);
  }
  const a=await account(db,request);
  if(route==='bootstrap'&&method==='GET'){
   const records=await allRecords(db),patients=records.filter(e=>e.kind==='patients');const hospitalFilter=new URL(request.url).searchParams.get('hospital');const scopedRecords=hospitalFilter&&['admin','director'].includes(a.role)?records.filter(e=>e.hospitalId===hospitalFilter):records;const allowed=scopedRecords.filter(e=>inScope(a,e,patients)&&patientPublished(a,e)).map(e=>redact(a,e));const audits=['admin','director'].includes(a.role)?(await db.prepare('SELECT * FROM sahati_audit ORDER BY created_at DESC LIMIT 120').all()).results:[];
   const users=(await db.prepare('SELECT id,name,email,role,hospital_id,active FROM sahati_accounts').all<any>()).results.map(u=>({id:u.id,name:u.name,email:u.email,role:u.role,hospitalId:u.hospital_id,active:!!u.active}));await log(db,a,'Lecture espace',a.role,`${allowed.length} éléments autorisés`);
   const attachmentRows=(await db.prepare('SELECT id,record_id,file_name,mime,size,created_at FROM sahati_attachments').all<any>()).results.filter(f=>allowed.some(e=>e.id===f.record_id));
   const directory=(await db.prepare('SELECT data FROM sahati_hospitals').all<any>()).results.map(h=>JSON.parse(h.data));
   return ok({account:a,records:allowed,metrics:metrics(scopedRecords,a),hospitals:directory,accounts:users.filter(u=>['admin','director'].includes(a.role)||(u.hospitalId===a.hospitalId&&(u.role!=='patient'||['doctor','resident','nurse','reception'].includes(a.role)||u.id===a.id))),audit:audits,attachments:attachmentRows,demo:true});
  }
  if(route==='catalog'&&method==='GET')return ok(await medicationCatalog(db,a));
  if(route==='inventory'&&method==='GET')return ok(await inventorySnapshot(db,a,new URL(request.url).searchParams.get('hospital')));
  if(route==='inventory'&&method==='POST')return ok(await inventoryAction(db,a,await jsonInput(request)));
  if(route==='patient-tools'&&method==='GET')return ok(await patientTools(db,a));
  if(route==='patient-tools'&&method==='PATCH')return ok(await patientTools(db,a,await jsonInput(request)));
  if(route==='records'&&method==='POST')return ok({record:redact(a,await createRecord(db,a,await jsonInput(request)))},201);
  if(route==='records'&&path[1]&&method==='PATCH')return ok({record:redact(a,await mutate(db,a,path[1],await jsonInput(request)))});
  if(route==='accounts'&&method==='PATCH'){
   if(a.role!=='admin')throw new UserError('Administration requise.',403);const input=await jsonInput(request) as any;if(input.id===a.id)throw new UserError('Votre propre compte administrateur doit rester actif.');const exists=await db.prepare('SELECT id FROM sahati_accounts WHERE id=?').bind(input.id).first();if(!exists)throw new UserError('Compte introuvable.',404);await db.batch([db.prepare('UPDATE sahati_accounts SET active=? WHERE id=?').bind(input.active?1:0,input.id),db.prepare('DELETE FROM sahati_sessions WHERE account_id=?').bind(input.id),auditStmt(db,a,'Modification accès',input.id,input.active?'Réactivation':'Désactivation')]);return ok({ok:true});
  }
  if(route==='hospitals'&&method==='POST'){
   if(a.role!=='admin')throw new UserError('Administration requise.',403);const input=await jsonInput(request) as any;const wilaya=String(input.wilaya||'').padStart(2,'0');if(!/^\d{2}$/.test(wilaya)||Number(wilaya)<1||Number(wilaya)>99)throw new UserError('Code territorial de scénario sur deux chiffres (01–99) requis. Le référentiel officiel doit être validé au pilote.');const id=randomToken().slice(0,24),h={id,name:textField(input.name,'Établissement',200,true),city:textField(input.city,'Ville',100,true),wilaya,type:textField(input.type,'Type',100)||'Établissement de démonstration',services:0,beds:0};await db.batch([db.prepare('INSERT INTO sahati_hospitals(id,data) VALUES(?,?)').bind(id,JSON.stringify(h)),auditStmt(db,a,'Ajout établissement',id,h.name)]);return ok({ok:true},201);
  }
  if(route==='accounts'&&method==='POST'){
   if(a.role!=='admin')throw new UserError('Administration requise.',403);const input=await jsonInput(request) as any,role=input.role as Role;if(!roles.some(r=>r.id===role))throw new UserError('Rôle invalide.');const email=textField(input.email,'E-mail',200,true);if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new UserError('Adresse e-mail invalide.');const password=textField(input.password,'Mot de passe',256,true);if(password.length<12)throw new UserError('Choisissez au moins 12 caractères.');const hospitalId=input.hospitalId||a.hospitalId;if(!await db.prepare('SELECT id FROM sahati_hospitals WHERE id=?').bind(hospitalId).first())throw new UserError('Établissement inconnu.');const id=randomToken().slice(0,24);let patientId=null;if(role==='patient'){const p=await getRecord(db,textField(input.patientId,'Patient',60,true));if(p.kind!=='patients'||p.hospitalId!==hospitalId)throw new UserError('Patient invalide.');patientId=p.id;}await db.batch([db.prepare('INSERT INTO sahati_accounts(id,email,name,role,hospital_id,patient_id,password_hash,active) VALUES(?,?,?,?,?,?,?,1)').bind(id,email,textField(input.name,'Nom',150,true),role,hospitalId,patientId,await hashPassword(password)),auditStmt(db,a,'Création de compte',id,role)]);return ok({ok:true},201);
  }
  if(route==='learning'){
   if(!['student','resident','doctor'].includes(a.role))throw new UserError('Espace pédagogique non autorisé.',403);
   if(method==='GET'){const attempts=(await db.prepare('SELECT case_id,result,created_at FROM sahati_learning_attempts WHERE account_id=? ORDER BY created_at DESC LIMIT 100').bind(a.id).all<any>()).results;return ok({cases:clinicalCases.map(casePublic),attempts:attempts.map(r=>({...JSON.parse(r.result),date:r.created_at})),synthetic:true});}
   if(method==='POST'){const input=await jsonInput(request) as any,result=gradeCase(input.caseId,input.answers),date=new Date().toISOString();await db.batch([db.prepare('INSERT INTO sahati_learning_attempts(id,account_id,case_id,result,created_at) VALUES(?,?,?,?,?)').bind(randomToken(),a.id,result.caseId,JSON.stringify(result),date),auditStmt(db,a,'Évaluation pédagogique',result.caseId,'Cas fictif ; score '+result.score)]);return ok({...result,date},201);}
  }
  if(route==='indicators'&&method==='GET'){
   if(!['admin','director'].includes(a.role))throw new UserError('Pilotage du réseau non autorisé.',403);
   const params=new URL(request.url).searchParams,facilities=(await db.prepare('SELECT data FROM sahati_hospitals').all<any>()).results.map(h=>JSON.parse(h.data));
   return ok(operationalIndicators(await allRecords(db),facilities,{hospital:params.get('hospital')||'all',wilaya:params.get('wilaya')||'all',service:params.get('service')||'all'}));
  }
  if(route==='history'&&method==='GET'){
   const e=await getRecord(db,path[1]),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients)||!patientPublished(a,e))throw new UserError('Historique inaccessible.',403);
   const rows=(await db.prepare('SELECT version,data,actor_id,reason,created_at FROM sahati_record_versions WHERE record_id=? ORDER BY version DESC').bind(e.id).all<any>()).results;
   await log(db,a,'Lecture historique',e.id);return ok({versions:rows.filter(r=>patientPublished(a,JSON.parse(r.data))).map(r=>({...r,data:redact(a,JSON.parse(r.data))}))});
  }
  if(route==='my-access'&&method==='GET'){
   if(a.role!=='patient')throw new UserError('Espace patient requis.',403);const records=(await allRecords(db)).filter(e=>e.id===a.patientId||e.patientId===a.patientId),ids=records.map(e=>e.id);
   const rows=(await db.prepare('SELECT actor_name,action,target,created_at FROM sahati_audit ORDER BY created_at DESC LIMIT 500').all<any>()).results.filter(r=>ids.includes(r.target)).slice(0,60);return ok({rows});
  }
  if(route==='cohort'&&method==='GET')return ok({rows:await cohort(db,a,path[1]||'',new URL(request.url).searchParams.get('export')==='1')});
  if(route==='verify'&&method==='GET'){
   const token=path[1]||'';if(!/^[a-f0-9]{64}$/.test(token))throw new UserError('Référence invalide.',404);const row=await db.prepare("SELECT id FROM sahati_records WHERE kind='prescriptions' AND json_extract(data,'$.verificationToken')=?").bind(token).first<any>();if(!row)throw new UserError('Ordonnance introuvable.',404);const e=await getRecord(db,row.id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients))throw new UserError('Cette ordonnance est hors de votre périmètre.',403);await log(db,a,'Vérification QR',e.id);return ok({id:e.id,status:e.status,version:e.version,date:e.date,author:e.authorName,validator:e.validatedByName||'Validation de démonstration',valid:['validated','dispensed'].includes(e.status),demo:true});
  }
  if(route==='qr'&&method==='GET'){
   const e=await getRecord(db,path[1]),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(e.kind!=='prescriptions'||!inScope(a,e,patients)||!patientPublished(a,e))throw new UserError('Accès refusé.',403);const url=new URL(request.url).origin+'/verifier?reference='+e.verificationToken+'&v='+e.version;return new Response(qrSvg(url),{headers:{...headers,'Content-Type':'image/svg+xml'}});
  }
  if(route==='audit-event'&&method==='POST'){const input=await jsonInput(request) as any;const e=await getRecord(db,input.id),patients=(await allRecords(db)).filter(e=>e.kind==='patients');if(!inScope(a,e,patients)||!patientPublished(a,e))throw new UserError('Accès refusé.',403);if(!['Impression','Lecture dossier','Export dossier','Téléchargement PDF'].includes(input.action))throw new UserError('Événement invalide.');await log(db,a,input.action,e.id);return ok({ok:true});}
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
