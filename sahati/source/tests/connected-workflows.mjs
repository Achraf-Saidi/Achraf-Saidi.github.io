// Node 24+: real SQLite transaction tests of the same engine deployed to Workers.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const esbuild=require('esbuild');
await mkdir('.sites-runtime/tests',{recursive:true});
await esbuild.build({entryPoints:['lib/engine.ts','lib/crypto.ts','lib/model.ts','lib/clinical.ts','lib/reporting.ts','lib/dicom-demo.ts','lib/document-export.ts'],outdir:'.sites-runtime/tests',bundle:true,format:'esm',platform:'node',target:'node24',logLevel:'silent'});
await esbuild.build({entryPoints:['github/sqlite.ts'],outfile:'.sites-runtime/tests/sqlite.js',bundle:true,format:'esm',platform:'node',target:'node24',logLevel:'silent'});
const {handleAPI}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/engine.js'));
const {hashPassword}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/crypto.js'));
const {today,roles:accountRoles}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/model.js'));
let sqlite,wasmDatabase;
if(process.env.SAHATI_TEST_SQLITE==='wasm') {
 const initSqlJs=require('sql.js'),SQL=await initSqlJs();wasmDatabase=new SQL.Database();
 sqlite={exec:sql=>wasmDatabase.run(sql),close:()=>wasmDatabase.close(),prepare(sql){return {get(...args){const s=wasmDatabase.prepare(sql);try{s.bind(args);return s.step()?s.getAsObject():undefined;}finally{s.free();}}};}};
}else sqlite=new DatabaseSync(':memory:');
for(const file of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(await readFile('drizzle/'+file,'utf8'));
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
 async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
 execute(){const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
 async run(){return this.execute();}
}
const {sqliteDatabase}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/sqlite.js'));
const DB=wasmDatabase?sqliteDatabase(wasmDatabase):{prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>s.execute());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const objects=new Map();
const BUCKET={async put(k,b){objects.set(k,b);},async delete(k){objects.delete(k);},async get(k){return objects.has(k)?{body:objects.get(k)}:null;}};
const env={DB,BUCKET,SAHATI_GATE_HASH:await hashPassword('Synthetic-test-gate-only!')};
const origin='https://achraf-saidi.github.io';let passed=0;
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

const {documentExplanation,validateObservations}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/clinical.js'));
const {cohortSummary,kaplanMeier,operationalIndicators}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/reporting.js'));
const {decodeDemoDicom,demoStudyUID}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/dicom-demo.js'));
const {createReportPDF,csvFile}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/document-export.js'));
const tomorrow=()=>{const d=new Date();d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
for(const role of ['patient','reception','doctor','lab','radiology','director','student','researcher','nurse','admin','finance'])await signIn(role);
let appointment,encounter,rx,labOrder,radiologyOrder;
await test('patient requests and reschedules; identity and own-record scopes hold',async()=>{
 appointment=(await create('patient','appointments',{date:tomorrow(),time:'14:00',duration:20,service:'Médecine interne',reason:'Suivi synthétique',doctorId:'doctor'},'p2')).record;
 assert.equal(appointment.patientId,'p1');assert.equal(appointment.status,'requested');
 await patch('patient',appointment,{action:'transition',status:'scheduled'},403);
 appointment=(await patch('patient',appointment,{action:'reschedule',date:tomorrow(),time:'14:40'})).record;
 assert.equal(appointment.time,'14:40');
 const second=(await create('patient','appointments',{date:tomorrow(),time:'15:20',duration:20,service:'Médecine interne',reason:'Deuxième demande fictive',doctorId:'doctor'})).record;
 await patch('patient',second,{action:'reschedule',date:tomorrow(),time:'14:40'},409);
 assert.equal((await record('patient',second.id)).time,'15:20');
});
await test('arrival, editable encounter and medical validation close the same appointment',async()=>{
 appointment=(await patch('reception',appointment,{action:'transition',status:'scheduled'})).record;
 appointment=(await patch('reception',appointment,{action:'transition',status:'arrived'})).record;
 await patch('patient',appointment,{action:'reschedule',date:tomorrow(),time:'17:00'},403);
 encounter=(await create('doctor','encounters',{title:'Suivi fictif relié',subjective:'Motif saisi',objective:'Observation fictive',assessment:'Hypothèse fictive',plan:'Présenter les documents au suivi',appointmentId:appointment.id},'p1')).record;
 assert.equal(encounter.appointmentId,appointment.id);
 assert.ok(!await record('patient',encounter.id));
 encounter=(await patch('doctor',encounter,{action:'encounter-draft',data:{...encounter,objective:'Observation complétée'}})).record;
 encounter=(await patch('doctor',encounter,{action:'transition',status:'validated'})).record;
 assert.equal((await record('reception',appointment.id)).status,'done');assert.ok(await record('patient',encounter.id));
 await patch('doctor',encounter,{action:'encounter-draft',data:encounter},403);
});
await test('immutable snapshots exclude unpublished versions from patient history',async()=>{
 const history=await call('history/'+encounter.id,{jar:jars.doctor});assert.ok(history.versions.some(v=>v.version===1));assert.equal(history.versions[0].version,encounter.version);
 const patientHistory=await call('history/'+encounter.id,{jar:jars.patient});assert.ok(patientHistory.versions.every(v=>v.data.status==='validated'));
 await call('history/'+encounter.id,{jar:jars.finance,expected:403});
});
await test('structured prescription, document source and opaque verification stay coherent',async()=>{
 rx=(await create('doctor','prescriptions',{title:'Ordonnance synthétique liée',encounterId:encounter.id,instructions:'Consigne synthétique originale',medications:[{name:'Traitement pédagogique A',dci:'Substance fictive',presentation:'Présentation fictive',dose:'Dose fictive non applicable',route:'Voie fictive',frequency:'Fréquence fictive',duration:'Durée fictive',quantity:2,renewals:1,instructions:'Consigne fictive'}]},'p1')).record;
 rx=(await patch('doctor',rx,{action:'transition',status:'validated'})).record;
 const patientRx=await record('patient',rx.id);assert.equal(patientRx.medications[0].renewals,1);assert.equal(patientRx.encounterId,encounter.id);
 const verified=await call('verify/'+rx.verificationToken,{jar:jars.patient});assert.equal(verified.valid,true);assert.equal(verified.version,rx.version);assert.ok(!('patientId'in verified));
 const qr=await call('qr/'+rx.id,{jar:jars.patient});assert.match(qr,/shape-rendering="crispEdges"/);
 const simple=documentExplanation(patientRx);assert.ok(simple.blocks.some(b=>b.source==='medications[0].dose'&&b.original==='Dose fictive non applicable'));
});
await test('laboratory collection, numeric source validation and publication form a linked flow',async()=>{
 labOrder=(await create('doctor','orders',{title:'Bilan synthétique lié',category:'lab',encounterId:encounter.id,clinicalQuestion:'Test pédagogique'},'p1')).record;
 await patch('lab',labOrder,{action:'transition',status:'in_progress'},403);
 labOrder=(await patch('lab',labOrder,{action:'transition',status:'collected'})).record;
 assert.ok(labOrder.specimenId);labOrder=(await patch('lab',labOrder,{action:'transition',status:'in_progress'})).record;
 const observation={name:'Hémoglobine',value:12.3,unit:'g/dL',date:today(),reference:'',method:'Non fournie',source:'Scénario synthétique'};
 await patch('lab',labOrder,{action:'result',result:'Mesure synthétique',observations:[{...observation,value:''}]},400);
 labOrder=(await patch('lab',labOrder,{action:'result',result:'Hémoglobine : 12.3 g/dL. Aucune conclusion.',observations:[observation],critical:true,nextSteps:'Présenter le résultat à la consultation.'})).record;
 labOrder=(await patch('lab',labOrder,{action:'transition',status:'validated'})).record;assert.ok(!await record('patient',labOrder.id));
 labOrder=(await patch('lab',labOrder,{action:'transition',status:'published'})).record;
 const shown=await record('patient',labOrder.id);assert.equal(shown.observations[0].value,12.3);assert.equal(shown.observations[0].reference,'');assert.equal(shown.validatedBy,'lab');
 const simple=documentExplanation(shown);assert.ok(simple.blocks.find(b=>b.source==='observations[0]').original.includes('12.3 g/dL'));
 labOrder=(await patch('doctor',labOrder,{action:'transition',status:'acknowledged'})).record;assert.ok(labOrder.acknowledgedAt);
});
await test('radiology reserves a resource, rejects a conflict and attaches a real synthetic DICOM',async()=>{
 radiologyOrder=(await create('doctor','orders',{title:'Imagerie synthétique liée',category:'radiology',encounterId:encounter.id},'p1')).record;
 radiologyOrder=(await patch('radiology',radiologyOrder,{action:'schedule-imaging',date:tomorrow(),time:'14:00',duration:20,modality:'Équipement démo 01'})).record;
 assert.equal(radiologyOrder.status,'scheduled');
 const second=(await create('doctor','orders',{title:'Conflit radiologie',category:'radiology'},'p1')).record;
 await patch('radiology',second,{action:'schedule-imaging',date:tomorrow(),time:'14:00',duration:20,modality:'Équipement démo 01'},409);
 assert.equal((await record('radiology',second.id)).status,'requested');
 radiologyOrder=(await patch('radiology',radiologyOrder,{action:'transition',status:'in_progress'})).record;
 radiologyOrder=(await patch('radiology',radiologyOrder,{action:'attach-demo-study',studyUID:demoStudyUID})).record;
 const bytes=Buffer.from(await readFile('public/imaging/phantom.dcm.b64','utf8'),'base64'),scan=decodeDemoDicom(bytes);
 assert.equal(scan.studyUID,radiologyOrder.studyUID);assert.equal(scan.pixels.length,128*128);assert.equal(scan.patientID,'DEMO-p1');
 radiologyOrder=(await patch('radiology',radiologyOrder,{action:'result',result:'Fantôme numérique synthétique. Aucune anatomie ni conclusion diagnostique.'})).record;
 radiologyOrder=(await patch('radiology',radiologyOrder,{action:'transition',status:'validated'})).record;
 radiologyOrder=(await patch('radiology',radiologyOrder,{action:'transition',status:'published'})).record;
 assert.equal((await record('patient',radiologyOrder.id)).studyUID,demoStudyUID);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM sahati_schedule_slots WHERE record_id=?').get(radiologyOrder.id).n,0);
});
await test('admission and discharge update beds, patient status and aggregate indicators',async()=>{
 const before=await call('indicators',{jar:jars.director}),data=await bootstrap('doctor'),bed=data.records.find(e=>e.kind==='beds'&&e.status==='available');
 let admitted=(await create('doctor','admissions',{service:bed.service,bedId:bed.id,reason:'Admission synthétique'},'p9')).record;
 assert.equal((await record('doctor','p9')).status,'admitted');
 const during=await call('indicators',{jar:jars.director});assert.equal(during.occupied,before.occupied+1);assert.equal(during.available,before.available-1);assert.equal(during.occupancy,100*during.occupied/during.operable);
 admitted=(await patch('doctor',admitted,{action:'transition',status:'discharged',reason:'Synthèse de sortie fictive'})).record;
 assert.ok(admitted.dischargedAt);assert.equal((await record('doctor','p9')).status,'active');assert.equal((await record('nurse',bed.id)).status,'cleaning');
 const after=await call('indicators',{jar:jars.director});assert.equal(after.occupied,before.occupied);assert.notEqual(after.medianStay,null);
 const or=await call('indicators?wilaya=31',{jar:jars.director});assert.equal(or.facilities.length,1);assert.equal(or.beds,8);assert.equal(or.occupied,0);
 await call('indicators',{jar:jars.patient,expected:403});
});
await test('campus grades answers, persists personal attempts and separates clinical records',async()=>{
 const learning=await call('learning',{jar:jars.student});assert.equal(learning.cases.length,3);assert.ok(learning.cases.every(c=>c.questions.every(q=>!('answer'in q))));
 await call('learning',{jar:jars.student,method:'POST',body:{caseId:'identity',answers:[1]},expected:400});
 const result=await call('learning',{jar:jars.student,method:'POST',body:{caseId:'identity',answers:[1,1,1]},expected:201});assert.equal(result.score,100);assert.equal(result.feedback.length,3);
 assert.equal((await call('learning',{jar:jars.student})).attempts[0].caseId,'identity');assert.equal((await call('learning',{jar:jars.doctor})).attempts.length,0);
 await call('learning',{jar:jars.patient,expected:403});await call('history/p1',{jar:jars.student,expected:403});
});
await test('research access is individually approved and analysis handles tied censoring correctly',async()=>{
 await call('cohort/study1',{jar:jars.researcher,expected:403});
 let permit=(await create('researcher','requests',{title:'Accès de démonstration',studyId:'study1',purpose:'Analyse synthétique',ethicsReference:'DEMO-01',expiresAt:tomorrow()})).record;
 permit=(await patch('director',permit,{action:'transition',status:'approved',reason:'Autorisation synthétique personnelle'})).record;
 const cohort=await call('cohort/study1?export=1',{jar:jars.researcher});assert.ok(cohort.rows.length>0);assert.ok(cohort.rows.every(r=>!('firstName'in r)&&!('patientId'in r)));
 const rows=[{followUpDays:30,event:1},{followUpDays:30,event:0},{followUpDays:60,event:1}],km=kaplanMeier(rows);assert.equal(km[0].atRisk,3);assert.ok(Math.abs(km[0].survival-2/3)<1e-12);assert.equal(km[1].survival,0);assert.equal(cohortSummary(rows).medianFollowUp,30);
});
await test('CSV preserves accents and neutralizes spreadsheet formula injection',async()=>{
 const csv=csvFile([['Établissement','Valeur'],['=WEBSERVICE("x")',12.3],['Texte;avec séparateur',null]]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'="));assert.ok(csv.includes('12.3'));assert.ok(csv.includes('Texte;avec séparateur'));
});
await test('download audit and patient access log enforce own dossier scope',async()=>{
 await call('audit-event',{jar:jars.patient,method:'POST',body:{id:rx.id,action:'Téléchargement PDF'}});
 await call('audit-event',{jar:jars.patient,method:'POST',body:{id:'p2',action:'Téléchargement PDF'},expected:403});
 const log=await call('my-access',{jar:jars.patient});assert.ok(log.rows.some(r=>r.target===rx.id&&r.action==='Téléchargement PDF'));assert.ok(log.rows.every(r=>r.target!=='p2'));
});
await test('PDF generation writes an A4 document with embedded font and actual vector QR',async()=>{
 const font=Buffer.from(await readFile('public/fonts/document-sans.ttf.b64','utf8'),'base64');
 const doc=await createReportPDF('Ordonnance synthétique',[
 {title:'Identité du scénario',lines:['Amel Benyahia · SAH-26-00001']},
 {title:'Traitement pédagogique A',lines:['Dose fictive non applicable','Fréquence : consigne du scénario','Durée : fictive','Quantité : 2','Consigne : présenter le document lors du suivi.']},
 {title:'Document de démonstration',lines:['Aucune valeur clinique. Référence authentifiée localement, sans signature électronique.']}
 ],{font,reference:rx.id,version:rx.version,status:rx.status,date:today(),author:'Dr Yasmine Amrani',qr:origin+'/sahati/verifier/?reference='+rx.verificationToken+'&v='+rx.version});
 await mkdir('.sites-runtime/qa',{recursive:true});await writeFile('.sites-runtime/qa/qr-url.txt',origin+'/sahati/verifier/?reference='+rx.verificationToken+'&v='+rx.version);await writeFile('.sites-runtime/qa/ordonnance-demo.pdf',Buffer.from(doc.output('arraybuffer')));
 const arabic=await createReportPDF('ملخص تجريبي',[{title:'بيانات خيالية',lines:['هذه وثيقة تجريبية دون قيمة طبية.','موعد المتابعة كما ورد في الوثيقة الأصلية.']}],{font,ar:true});await writeFile('.sites-runtime/qa/resume-arabe.pdf',Buffer.from(arabic.output('arraybuffer')));
 const long=await createReportPDF('Pagination du rapport',[{title:'Texte de contrôle',lines:Array.from({length:75},(_,i)=>'Ligne '+(i+1)+' : contenu synthétique avec accents et pagination lisible.')}],{font});assert.ok(long.getNumberOfPages()>1);await writeFile('.sites-runtime/qa/rapport-multipage.pdf',Buffer.from(long.output('arraybuffer')));
});
console.log(`\n${passed} connected workflow scenarios passed.`);sqlite.close();
