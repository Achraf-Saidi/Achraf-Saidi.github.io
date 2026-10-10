// Node 24+: real SQLite transaction tests of the same engine deployed to Workers.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const esbuild=require(createRequire(require.resolve('drizzle-kit')).resolve('esbuild'));
await mkdir('.sites-runtime/tests',{recursive:true});
await esbuild.build({entryPoints:['lib/engine.ts','lib/crypto.ts','lib/model.ts'],outdir:'.sites-runtime/tests',bundle:true,format:'esm',platform:'node',target:'node24',logLevel:'silent'});
const {handleAPI}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/engine.js'));
const {hashPassword}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/crypto.js'));
const {today,roles:accountRoles}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/model.js'));
const sqlite=new DatabaseSync(':memory:');
for(const file of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(await readFile('drizzle/'+file,'utf8'));
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
 execute(){const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
 async run(){return this.execute();}
}
const DB={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>s.execute());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const objects=new Map();
const BUCKET={async put(k,b){objects.set(k,b);},async delete(k){objects.delete(k);},async get(k){return objects.has(k)?{body:objects.get(k)}:null;}};
const env={DB,BUCKET,SAHATI_GATE_HASH:await hashPassword('Synthetic-test-gate-only!')};
const origin='https://sahati-test.invalid';let passed=0;
async function test(name,fn){await fn();passed++;console.log('✓ '+name);}
async function call(path,{method='GET',body,jar={},expected=200,raw=false,overrideEnv,headers={}}={}){
 const req=new Request(origin+'/api/sahati/'+path,{method,headers:{Origin:origin,Cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; '),...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});
 const res=await handleAPI(req,path.split('?')[0].split('/'),overrideEnv||env);
 const cookies=res.headers.getSetCookie();for(const c of cookies){const kv=c.split(';')[0],i=kv.indexOf('=');jar[kv.slice(0,i)]=kv.slice(i+1);}
 const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 assert.equal(res.status,expected,path+': '+text);return raw?{data,res}:data;
}
const jars={};
async function signIn(role){const jar={};await call('gate',{method:'POST',jar,body:{password:'Synthetic-test-gate-only!'}});await call('login',{method:'POST',jar,body:{email:accountRoles.find(r=>r.id===role).email,password:'SahatiDemo2026!'}});jars[role]=jar;return jar;}
async function bootstrap(role){return call('bootstrap',{jar:jars[role]});}
async function record(role,id){return (await bootstrap(role)).records.find(r=>r.id===id);}
async function patch(role,e,body,expected=200){return call('records/'+e.id,{jar:jars[role],method:'PATCH',body:{version:e.version,...body},expected});}
async function create(role,kind,data,patientId,expected=201){return call('records',{jar:jars[role],method:'POST',body:{kind,data,patientId},expected});}
await test('private gate fails closed and protected data require two sessions',async()=>{
 await call('bootstrap',{expected:401});await call('gate',{method:'POST',body:{password:'wrong'},expected:401});
 await call('gate',{method:'POST',body:{password:'x'},overrideEnv:{DB},expected:503});
 await call('gate',{method:'POST',body:{password:'x'},headers:{Origin:'https://other.invalid'},expected:403});
 const jar={};const r=await call('gate',{method:'POST',body:{password:'Synthetic-test-gate-only!'},jar,raw:true});assert.match(r.res.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);await call('bootstrap',{jar,expected:401});
});
await test('all fourteen account roles authenticate and seeded schedules are reserved',async()=>{
 const roles=['admin','director','doctor','resident','nurse','reception','lab','radiology','pharmacy','finance','logistics','researcher','student','patient'];
 for(const role of roles){await signIn(role);assert.equal((await bootstrap(role)).account.role,role);}
 assert.equal(sqlite.prepare('SELECT count(*) n FROM sahati_accounts').get().n,14);
 assert.equal(sqlite.prepare("SELECT count(*) n FROM sahati_schedule_slots WHERE record_id='s1'").get().n,18);
});
await test('role and hospital filtering removes unauthorized clinical records',async()=>{
 for(const role of ['admin','director','researcher','student'])assert.ok(!(await bootstrap(role)).records.some(r=>r.kind==='patients'));
 for(const role of ['doctor','resident','nurse','reception','lab','radiology','pharmacy','finance'])assert.ok((await bootstrap(role)).records.every(r=>r.hospitalId==='h1'));
 assert.ok((await bootstrap('lab')).records.filter(r=>r.kind==='orders').every(r=>r.category==='lab'));
 assert.ok((await bootstrap('radiology')).records.filter(r=>r.kind==='orders').every(r=>r.category==='radiology'));
 assert.ok(!(await record('reception','p1')).allergies);assert.ok(!(await record('pharmacy','p1')).address);
});
await test('patient sees only own records and published results',async()=>{
 const p=await bootstrap('patient');assert.ok(p.records.every(r=>r.patientId==='p1'||r.id==='p1'||r.kind==='messages'&&r.recipientId==='patient'));
 assert.ok(!p.records.some(r=>r.id==='o1'||r.id==='m1'));assert.ok(p.records.some(r=>r.id==='rx1'));
});
await test('resident cannot validate, physician countersigns, stale writes conflict',async()=>{
 const rx=await record('resident','rx2');await patch('resident',rx,{action:'transition',status:'validated'},403);
 const r=await patch('doctor',rx,{action:'transition',status:'validated'});assert.equal(r.record.validatedBy,'doctor');await patch('doctor',rx,{action:'transition',status:'validated'},409);
 await patch('pharmacy',await record('pharmacy','rx3'),{action:'transition',status:'draft'},403);
 await call('records/rx1',{jar:jars.student,method:'PATCH',body:{version:1,action:'transition',status:'cancelled',reason:'test'},expected:403});
});
await test('pharmacy dispensing deducts the matching lot atomically',async()=>{
 const before=await record('pharmacy','st1'),rx=await record('pharmacy','rx1');
 const r=await patch('pharmacy',rx,{action:'transition',status:'dispensed',dispenses:[{stockId:'st1',quantity:1}]});assert.equal(r.record.status,'dispensed');assert.equal((await record('pharmacy','st1')).quantity,before.quantity-1);
 await patch('pharmacy',rx,{action:'transition',status:'dispensed',dispenses:[{stockId:'st1',quantity:1}]},409);
});
await test('insufficient stock refuses dispensing without changing the prescription',async()=>{
 const med={name:'Solution saline',dose:'Fictif',route:'Fictif',frequency:'Fictif',duration:'Fictif',quantity:100};
 let rx=(await create('doctor','prescriptions',{title:'Test stock',medications:[med]},'p1')).record;rx=(await patch('doctor',rx,{action:'transition',status:'validated'})).record;
 const before=await record('pharmacy','st2');await patch('pharmacy',rx,{action:'transition',status:'dispensed',dispenses:[{stockId:'st2',quantity:100}]},409);
 assert.equal((await record('pharmacy',rx.id)).status,'validated');assert.equal((await record('pharmacy','st2')).quantity,before.quantity);
});
await test('cancelled prescription QR remains traceable and reports invalid status',async()=>{
 const rx=await record('doctor','rx3');const r=await patch('doctor',rx,{action:'transition',status:'cancelled',reason:'Correction fictive'});
 const verification=await call('verify/'+r.record.verificationToken,{jar:jars.doctor});assert.equal(verification.valid,false);assert.equal(verification.status,'cancelled');assert.ok(!('patientId' in verification));
});
await test('QR is a real SVG encoding an opaque authenticated reference',async()=>{
 const rx=await record('doctor','rx1');const svg=await call('qr/rx1',{jar:jars.doctor});assert.match(svg,/<svg/);assert.match(svg,/<path|<rect/);assert.ok(!svg.includes('Benyahia'));
 await writeFile('.sites-runtime/tests/prescription-qr.svg',svg);await writeFile('.sites-runtime/tests/qr-expected.txt',origin+'/verifier?reference='+rx.verificationToken);
 await call('qr/rx1',{jar:jars.student,expected:403});
});
await test('overlapping doctor appointment and operating room slots are rejected',async()=>{
 await create('reception','appointments',{date:today(),time:'09:05',duration:20,doctorId:'doctor',service:'Médecine interne',reason:'Test conflit'},'p1',409);
 await create('doctor','surgeries',{title:'Conflit bloc',date:today(),time:'09:30',duration:90,room:'Salle 1'},'p1',409);
 const r=await create('reception','appointments',{date:today(),time:'18:00',duration:20,doctorId:'doctor',service:'Médecine interne',reason:'Test libre'},'p1');assert.equal(r.record.status,'scheduled');
 await patch('reception',r.record,{action:'transition',status:'cancelled'});
 await create('reception','appointments',{date:today(),time:'18:00',duration:20,doctorId:'doctor',service:'Médecine interne',reason:'Créneau libéré'},'p1');
});
await test('bed allocation, duplicate admission rollback, discharge and cleaning form one workflow',async()=>{
 const bed=await record('reception','b11');await create('reception','admissions',{service:bed.service,bedId:bed.id,reason:'Double patient'},'p1',409);assert.equal((await record('reception',bed.id)).status,'available');
 const ad=(await create('reception','admissions',{service:bed.service,bedId:bed.id,reason:'Admission fictive'},'p10')).record;assert.equal((await record('reception',bed.id)).status,'occupied');
 await create('reception','admissions',{service:bed.service,bedId:bed.id,reason:'Lit occupé'},'p11',409);
 await patch('reception',ad,{action:'transition',status:'discharged',reason:'Test'},403);
 await patch('doctor',ad,{action:'transition',status:'discharged',reason:'Synthèse fictive'});assert.equal((await record('reception',bed.id)).status,'cleaning');
 await patch('reception',await record('reception',bed.id),{action:'transition',status:'available'});assert.equal((await record('reception',bed.id)).status,'available');
});
await test('laboratory result validation and publication are distinct steps',async()=>{
 let o=await record('lab','o1');o=(await patch('lab',o,{action:'result',result:'Compte rendu fictif',critical:true})).record;
 o=(await patch('lab',o,{action:'transition',status:'collected'})).record;o=(await patch('lab',o,{action:'transition',status:'in_progress'})).record;o=(await patch('lab',o,{action:'transition',status:'validated'})).record;
 assert.ok(!(await record('patient','o1')));o=(await patch('lab',o,{action:'transition',status:'published'})).record;assert.ok(await record('patient','o1'));
 await patch('doctor',o,{action:'transition',status:'acknowledged'});await patch('lab',await record('lab','o1'),{action:'result',result:'Changed'},403);
});
await test('surgery cannot start before preoperative checks or finish before counts',async()=>{
 let s=await record('doctor','s1');await patch('doctor',s,{action:'transition',status:'in_progress'},400);
 for(const item of ['identity','consent','site','anesthesia'])s=(await patch('doctor',s,{action:'checklist',item,checked:true})).record;
 s=(await patch('doctor',s,{action:'transition',status:'in_progress'})).record;await patch('doctor',s,{action:'transition',status:'done'},400);
 s=(await patch('doctor',s,{action:'checklist',item:'counts',checked:true})).record;await patch('doctor',s,{action:'transition',status:'done'});
});
await test('research requires approved protocol, personal permit and permitted variables',async()=>{
 const r=await call('cohort/study1?export=1',{jar:jars.student});assert.ok(r.rows.length>0);assert.deepEqual(Object.keys(r.rows[0]).sort(),['ageBand','code','event','followUpDays','sex'].sort());assert.ok(!JSON.stringify(r).includes('Benyahia'));
 await call('cohort/study1',{jar:jars.researcher,expected:403});await call('cohort/study2',{jar:jars.student,expected:403});
 const permit=(await create('researcher','requests',{title:'Permission',studyId:'study1',purpose:'Test',ethicsReference:'DEMO-TEST',expiresAt:'2029-01-01'})).record;
 await patch('researcher',permit,{action:'transition',status:'approved',reason:'test'},403);await patch('director',permit,{action:'transition',status:'approved',reason:'Avis fictif'});assert.ok((await call('cohort/study1',{jar:jars.researcher})).rows.length>0);
});
await test('patient consent changes server-side research inclusion',async()=>{
 const initial=await record('patient','p1');assert.equal(initial.researchConsent,false);
 await create('patient','consents',{scope:'Recherche fictive',researchConsent:true});assert.equal((await record('patient','p1')).researchConsent,true);
 await create('patient','consents',{scope:'Recherche fictive',researchConsent:false});assert.equal((await record('patient','p1')).researchConsent,false);
});
await test('attachments are stored and downloaded through authenticated record scope',async()=>{
 let en=(await create('doctor','encounters',{title:'Upload',subjective:'Fictif',assessment:'Fictif',plan:'Fictif'},'p1')).record;
 const form=new FormData();form.set('recordId',en.id);form.set('file',new File(['%PDF-1.7\nDemo'], 'test.pdf',{type:'application/pdf'}));await call('upload',{jar:jars.doctor,method:'POST',body:form,expected:201});
 const f=(await bootstrap('doctor')).attachments.find(f=>f.record_id===en.id);assert.ok(f);assert.match(await call('files/'+f.id,{jar:jars.doctor}),/^%PDF/);await call('files/'+f.id,{jar:jars.student,expected:403});
 await patch('doctor',en,{action:'transition',status:'validated'});await call('upload',{jar:jars.doctor,method:'POST',body:form,expected:400});
});
await test('exports enforce clinical scope and retain demo provenance',async()=>{
 const f=await call('fhir/p1',{jar:jars.patient});assert.equal(f.resourceType,'Bundle');assert.equal(f.entry[0].resource.resourceType,'Patient');await call('fhir/p2',{jar:jars.patient,expected:403});await call('fhir/p1',{jar:jars.admin,expected:403});
});
await test('invalid dates and server creation permissions are enforced',async()=>{
 await create('reception','patients',{firstName:'Invalid',lastName:'Date',birthDate:'2000-99-99',sex:'F'},undefined,400);
 await create('admin','prescriptions',{title:'Forbidden'},'p1',403);await create('nurse','emergencies',{title:'Forbidden',priority:'Priorité 1'},'p1',403);
 const b=(await create('admin','beds',{number:'C-01',service:'Médecine interne'})).record;assert.equal(b.status,'available');
 await create('admin','beds',{number:'C-01',service:'Médecine interne'},undefined,409);
});
await test('demographic updates preserve redaction and clinical fields are restricted',async()=>{
 const p=await record('reception','p1');const r=await patch('reception',p,{action:'patient',reason:'Correction fictive',data:{...p,city:'Alger centre',careTeam:['doctor','resident']}});assert.equal(r.record.city,'Alger centre');assert.ok(!r.record.allergies);
 await patch('patient',await record('patient','p1'),{action:'patient',reason:'Test',data:{}},403);
 const d=await record('doctor','p1');await patch('doctor',d,{action:'patient',reason:'Synthèse fictive',data:{allergies:'Allergie fictive documentée',bloodGroup:'A+',service:'Médecine interne',problems:'Observation fictive'}});assert.equal((await record('doctor','p1')).problems.length,1);
});
await test('deactivating an account revokes its active session and self-disable is blocked',async()=>{
 await call('accounts',{jar:jars.admin,method:'PATCH',body:{id:'resident',active:false}});await call('bootstrap',{jar:jars.resident,expected:401});
 await call('accounts',{jar:jars.admin,method:'PATCH',body:{id:'admin',active:false},expected:400});
});
await test('audit includes validation, dispensing, exports and attachment operations',async()=>{
 const rows=(await bootstrap('admin')).audit;for(const action of ['Changement de statut','Export recherche','Dépôt document','Téléchargement','Export dossier'])assert.ok(rows.some(r=>r.action===action),action);
});
await test('master lock revokes both server sessions',async()=>{await call('lock',{jar:jars.patient,method:'POST'});await call('bootstrap',{jar:jars.patient,expected:401});assert.equal((await call('status',{jar:jars.patient})).gate,false);});
console.log(`\n${passed} integration scenarios passed.`);
sqlite.close();
