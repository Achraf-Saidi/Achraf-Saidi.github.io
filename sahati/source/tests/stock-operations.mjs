// Node 24+: real SQLite transaction tests of the same engine deployed to Workers.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const esbuild=require('esbuild');
await mkdir('.sites-runtime/tests',{recursive:true});
await esbuild.build({entryPoints:['lib/engine.ts','lib/crypto.ts','lib/model.ts','lib/clinical.ts','lib/reporting.ts','lib/dicom-demo.ts','lib/document-export.ts','lib/inventory.ts','lib/patient-tools.ts','lib/sina.ts'],outdir:'.sites-runtime/tests',bundle:true,format:'esm',platform:'node',target:'node24',logLevel:'silent'});
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

for(const role of ['pharmacy','logistics','doctor','nurse','patient','admin','director'])await signIn(role);
const inventory=()=>call('inventory',{jar:jars.pharmacy});
const stock=()=>call('stock-operations',{jar:jars.pharmacy});
const iop=(body,expected=200)=>call('inventory',{method:'POST',jar:jars.pharmacy,body:{operationId:crypto.randomUUID(),...body},expected});
const op=(body,expected=200,role='pharmacy',extra={})=>call('stock-operations',{method:'POST',jar:jars[role],body:{operationId:crypto.randomUUID(),...body},expected,...extra});
const lotBy=async id=>(await inventory()).lots.find(l=>l.id===id);
const requestBy=async id=>(await stock()).requests.find(r=>r.id===id);
const countBy=async id=>(await stock()).stocktakes.find(s=>s.id===id);
const future=d=>{const date=new Date();date.setUTCDate(date.getUTCDate()+d);return date.toISOString().slice(0,10);};
const stocktakeAction=async(id,action,extra={},expected=200)=>op({action,stocktakeId:id,version:(await countBy(id)).version,...extra},expected);
const requestAction=async(id,action,extra={},expected=200,role='pharmacy')=>op({action,requestId:id,version:(await requestBy(id)).version,...extra},expected,role);
let productId,otherProduct,lotA,lotB,requestId,supplierId,countId;
await test('new operations enforce reader, requester and writer roles',async()=>{
 for(const role of ['patient','doctor','nurse'])await call('stock-operations',{jar:jars[role],expected:403});
 for(const role of ['patient','admin','director'])await call('supplies',{jar:jars[role],expected:403});
 await call('stock-operations',{jar:jars.director});await op({action:'supplier-save',data:{}},403,'doctor');await op({action:'stocktake-create'},403,'director');
 const minimal=await call('supplies',{jar:jars.nurse});assert.ok(minimal.products.every(p=>!('unitPrice'in p)&&!('supplier'in p)));assert.ok(!('lots'in minimal));
});
await test('supplier directory validates codes, contacts and optimistic edits',async()=>{
 const data={code:'SUP-ERP',name:'Fournisseur fictif ERP',contact:'Contact synthétique',email:'erp@example.test',phone:'0000000000',city:'Ville fictive',leadDays:4,active:true,notes:'Données de test'};
 const payload={action:'supplier-save',operationId:crypto.randomUUID(),data};supplierId=(await op(payload)).supplierId;assert.equal((await op(payload)).replayed,true);
 await op({action:'supplier-save',data:{...data,name:'Autre'}},409);await op({action:'supplier-save',data:{...data,code:'BAD',email:'invalide'}},400);
 await op({action:'supplier-save',supplierId,version:1,data:{...data,leadDays:9}});await op({action:'supplier-save',supplierId,version:1,data},409);
 assert.equal((await stock()).suppliers.find(s=>s.id===supplierId).leadDays,9);
});
await test('fixtures use two lots, exact catalogue identity and distinct stock units',async()=>{
 const p={sku:'ERP-A',title:'Article fictif ERP',category:'medication',unit:'boîtes',minLevel:2,targetLevel:10,unitPrice:20,supplier:'Fournisseur fictif ERP'};
 productId=(await iop({action:'product',data:p})).productId;otherProduct=(await iop({action:'product',data:{...p,sku:'ERP-B',title:'Article fictif sans stock',unit:'flacons'}})).productId;
 lotA=(await iop({action:'receive',reference:'BR-ERP-A',data:{productId,quantity:4,lot:'ERP-A',expiry:future(30),location:'Centrale ERP',unitPrice:20}})).lotId;
 lotB=(await iop({action:'receive',reference:'BR-ERP-B',data:{productId,quantity:8,lot:'ERP-B',expiry:future(120),location:'Centrale ERP',unitPrice:20}})).lotId;
});
await test('service requests preserve account scope, validate units and expose only the requester history',async()=>{
 const payload={action:'request-create',department:'قسم تجريبي',reason:'Besoin fictif',priority:'urgent',hospitalId:'h2',requesterId:'nurse',lines:[{productId,quantity:6}]};
 requestId=(await op(payload,200,'doctor')).requestId;const r=await requestBy(requestId);assert.equal(r.hospitalId,'h1');assert.equal(r.requesterId,(await bootstrap('doctor')).account.id);assert.equal(r.lines[0].unit,'boîtes');
 assert.ok((await call('supplies',{jar:jars.doctor})).requests.some(r=>r.id===requestId));assert.ok(!(await call('supplies',{jar:jars.nurse})).requests.some(r=>r.id===requestId));
 await op({...payload,lines:[{productId,quantity:1.5}]},400,'doctor');await op({...payload,lines:[{productId,quantity:2},{productId,quantity:3}]},400,'doctor');await requestAction(requestId,'request-cancel',{reason:'Autre compte'},403,'nurse');
});
await test('partial FEFO preparation reserves quantities without changing physical stock',async()=>{
 const before=await lotBy(lotA);await requestAction(requestId,'request-reserve',{quantities:[3]});const a=await lotBy(lotA),p=(await inventory()).products.find(p=>p.id===productId);
 assert.equal(a.quantity,4);assert.equal(a.reserved,3);assert.equal(a.free,1);assert.equal(a.version,before.version+1);assert.equal(p.available,9);assert.equal(p.reserved,3);assert.equal(p.blocked,0);assert.equal((await requestBy(requestId)).status,'prepared');
 const catalog=await call('catalog',{jar:jars.doctor});assert.equal(catalog.products.find(p=>p.id===productId).available,9);const boot=await bootstrap('pharmacy');assert.equal(boot.records.find(l=>l.id===lotA).reserved,3);
});
await test('reserved stock is protected from direct issues, transfers, corrections and returns',async()=>{
 const a=await lotBy(lotA);await iop({action:'issue',lotId:lotA,version:a.version,quantity:2,reference:'Service',reason:'Test'},409);await iop({action:'transfer',lotId:lotA,version:a.version,quantity:2,destination:'Autre',reason:'Test'},400);await iop({action:'count',lotId:lotA,version:a.version,quantity:2,reason:'Test'},409);
 await op({action:'remove-stock',lotId:lotA,version:a.version,quantity:2,type:'supplier-return',supplierId,reference:'RET-BLOCK',reason:'Test'},409);
 assert.equal((await lotBy(lotA)).quantity,4);assert.equal((await lotBy(lotA)).reserved,3);
});
await test('dispensing cannot consume reserved quantities through manual or automatic allocation',async()=>{
 let rx=(await create('doctor','prescriptions',{title:'Prescription fictive ERP',date:today(),medications:[{productId,name:'Article fictif ERP',dose:'Scénario',route:'Scénario',frequency:'Scénario',duration:'Scénario',quantity:10,renewals:0}]},'p1')).record;
 rx=(await patch('doctor',rx,{action:'transition',status:'validated'})).record;
 await patch('pharmacy',rx,{action:'transition',status:'dispensed',autoFEFO:true},409);await patch('pharmacy',rx,{action:'transition',status:'dispensed',dispenses:[{stockId:lotA,quantity:10}]},409);
 assert.equal((await record('pharmacy',rx.id)).status,'validated');assert.equal((await lotBy(lotA)).quantity,4);
});
await test('issuing a partial preparation is atomic, traceable and replay safe',async()=>{
 const r=await requestBy(requestId),payload={action:'request-issue',requestId,version:r.version,operationId:crypto.randomUUID()};await op(payload);assert.equal((await op(payload)).replayed,true);
 const next=await requestBy(requestId);assert.equal(next.status,'partial');assert.equal(next.lines[0].issued,3);assert.equal(next.deliveries.length,1);assert.equal((await lotBy(lotA)).quantity,1);assert.equal((await lotBy(lotA)).reserved,0);
 assert.equal((await inventory()).movements.filter(m=>m.reference===requestId&&m.type==='issue').length,1);
});
await test('multi-line shortage leaves every reservation and lot unchanged',async()=>{
 const id=(await op({action:'request-create',department:'Test',reason:'Deux articles',lines:[{productId,quantity:1},{productId:otherProduct,quantity:1}]},200,'nurse')).requestId;
 const before=await lotBy(lotA);await requestAction(id,'request-reserve',{quantities:[1,1]},409);assert.equal((await stock()).reservations.filter(v=>v.request_id===id).length,0);assert.equal((await lotBy(lotA)).version,before.version);assert.equal((await requestBy(id)).status,'requested');
});
await test('a blocked reserved lot requires release and fresh FEFO preparation',async()=>{
 await requestAction(requestId,'request-reserve',{quantities:[3]});assert.equal((await stock()).reservations.filter(v=>v.request_id===requestId).length,2);
 let a=await lotBy(lotA);await iop({action:'status',lotId:lotA,version:a.version,status:'quarantine',reason:'Contrôle fictif'});await requestAction(requestId,'request-issue',{},409);
 assert.equal((await lotBy(lotB)).quantity,8);await requestAction(requestId,'request-release',{reason:'Repréparer les lots utilisables'});assert.equal((await lotBy(lotA)).reserved,0);assert.equal((await lotBy(lotB)).reserved,0);
 await requestAction(requestId,'request-reserve',{quantities:[3]});assert.ok((await stock()).reservations.filter(v=>v.request_id===requestId).every(v=>v.lot_id===lotB));await requestAction(requestId,'request-issue');assert.equal((await requestBy(requestId)).status,'fulfilled');await requestAction(requestId,'request-acknowledge',{},403,'nurse');await requestAction(requestId,'request-acknowledge',{},200,'doctor');assert.equal((await requestBy(requestId)).status,'received');
});
await test('cancellation releases only its own reservations and preserves deliveries',async()=>{
 const make=()=>op({action:'request-create',department:'Service fictif',reason:'Réservation',lines:[{productId,quantity:2}]},200,'nurse');const one=(await make()).requestId,two=(await make()).requestId;
 await requestAction(one,'request-reserve',{quantities:[1]});await requestAction(two,'request-reserve',{quantities:[2]});assert.equal((await lotBy(lotB)).reserved,3);
 await requestAction(one,'request-issue');await requestAction(one,'request-reserve',{quantities:[1]});await requestAction(one,'request-cancel',{reason:'Fin du besoin'},200,'nurse');assert.equal((await lotBy(lotB)).reserved,2);assert.equal((await requestBy(one)).lines[0].issued,1);assert.equal((await requestBy(one)).deliveries.length,1);
 await requestAction(two,'request-cancel',{reason:'Fin du besoin'},200,'nurse');assert.equal((await lotBy(lotB)).reserved,0);
});
await test('returns and waste remove blocked stock while excluding it from consumption',async()=>{
 const before=(await inventory()).products.find(p=>p.id===productId).used28Days,a=await lotBy(lotA),payload={action:'remove-stock',operationId:crypto.randomUUID(),lotId:lotA,version:a.version,quantity:1,type:'supplier-return',supplierId,reference:'RET-ERP',reason:'Retour fictif'};
 const result=await op(payload);assert.equal(result.removal.supplier,'Fournisseur fictif ERP');assert.equal((await op(payload)).replayed,true);assert.equal((await lotBy(lotA)).quantity,0);
 const b=await lotBy(lotB);await op({action:'remove-stock',lotId:lotB,version:b.version,quantity:1,type:'waste',reference:'RETRAIT-ERP',reason:'Perte fictive'});assert.equal((await inventory()).products.find(p=>p.id===productId).used28Days,before);
});
await test('paused suppliers cannot receive new linked purchase orders',async()=>{
 let supplier=(await stock()).suppliers.find(s=>s.id===supplierId);await op({action:'supplier-save',supplierId,version:supplier.version,data:{...supplier,active:false}});
 await iop({action:'purchase',supplier:'Fournisseur fictif ERP',supplierId,expectedDate:future(7),lines:[{productId,quantity:2,unitPrice:20}]},400);
 supplier=(await stock()).suppliers.find(s=>s.id===supplierId);await op({action:'supplier-save',supplierId,version:supplier.version,data:{...supplier,active:true}});
 const order=(await iop({action:'purchase',supplier:'Nom fourni ignoré',supplierId,expectedDate:future(7),lines:[{productId,quantity:2,unitPrice:20}]})).orderId;assert.equal((await inventory()).orders.find(o=>o.id===order).supplier,'Fournisseur fictif ERP');
});
await test('stocktake accepts zero, requires complete counts and separates review from application',async()=>{
 countId=(await op({action:'stocktake-create',title:'Inventaire fictif',location:'Centrale ERP'})).stocktakeId;let s=await countBy(countId);assert.equal(s.lines.length,2);assert.ok(s.lines.every(l=>l.counted===null));
 await stocktakeAction(countId,'stocktake-save',{counts:[{lotId:lotA,counted:0}]});await stocktakeAction(countId,'stocktake-review',{},400);await stocktakeAction(countId,'stocktake-save',{counts:[{lotId:lotB,counted:(await lotBy(lotB)).quantity+2}]});
 const before=(await lotBy(lotB)).quantity;await stocktakeAction(countId,'stocktake-review');assert.equal((await lotBy(lotB)).quantity,before);assert.equal((await countBy(countId)).status,'review');
});
await test('stale stocktake is atomic and reconciliation resets only changed lots',async()=>{
 const b=await lotBy(lotB);await iop({action:'issue',lotId:lotB,version:b.version,quantity:1,reference:'Test inventaire',reason:'Mouvement pendant comptage'});const a=await lotBy(lotA),movements=(await inventory()).movements.length;
 await stocktakeAction(countId,'stocktake-apply',{},409);assert.equal((await lotBy(lotA)).version,a.version);assert.equal((await inventory()).movements.length,movements);
 await stocktakeAction(countId,'stocktake-refresh');let s=await countBy(countId);assert.equal(s.status,'draft');assert.equal(s.lines.find(l=>l.lotId===lotA).counted,0);assert.equal(s.lines.find(l=>l.lotId===lotB).counted,null);await stocktakeAction(countId,'stocktake-review',{},400);
 await stocktakeAction(countId,'stocktake-save',{counts:[{lotId:lotB,counted:(await lotBy(lotB)).quantity}]});await stocktakeAction(countId,'stocktake-review');s=await countBy(countId);const payload={action:'stocktake-apply',operationId:crypto.randomUUID(),stocktakeId:countId,version:s.version};await op(payload);assert.equal((await op(payload)).replayed,true);assert.equal((await countBy(countId)).status,'applied');await stocktakeAction(countId,'stocktake-apply',{},400);
 assert.equal((await inventory()).movements.filter(m=>m.reference===countId&&m.type==='count').length,2);
});
await test('new lots invalidate the stocktake scope and are added for recount',async()=>{
 const id=(await op({action:'stocktake-create',title:'Périmètre',location:'Centrale ERP'})).stocktakeId;let s=await countBy(id);await stocktakeAction(id,'stocktake-save',{counts:s.lines.map(l=>({lotId:l.lotId,counted:l.expected}))});await stocktakeAction(id,'stocktake-review');
 await iop({action:'receive',reference:'BR-NEW',data:{productId,quantity:5,lot:'ERP-NEW',expiry:future(300),location:'Centrale ERP',unitPrice:20}});await stocktakeAction(id,'stocktake-apply',{},409);await stocktakeAction(id,'stocktake-refresh');s=await countBy(id);assert.equal(s.lines.length,3);assert.equal(s.lines.filter(l=>l.counted===null).length,1);
});
await test('stocktake cannot erase reservations and requires reconciliation after release',async()=>{
 const r=(await op({action:'request-create',department:'Réserve',reason:'Fictif',lines:[{productId,quantity:1}]},200,'doctor')).requestId;await requestAction(r,'request-reserve',{quantities:[1]});const id=(await op({action:'stocktake-create',title:'Réservations',location:'Centrale ERP'})).stocktakeId;let s=await countBy(id),reserved=(await stock()).reservations.find(v=>v.request_id===r);
 await stocktakeAction(id,'stocktake-save',{counts:s.lines.map(l=>({lotId:l.lotId,counted:l.lotId===reserved.lot_id?0:l.expected}))});await stocktakeAction(id,'stocktake-review');await stocktakeAction(id,'stocktake-apply',{},409);await requestAction(r,'request-release',{reason:'Recompter'});await stocktakeAction(id,'stocktake-apply',{},409);await stocktakeAction(id,'stocktake-refresh');s=await countBy(id);assert.equal(s.lines.find(l=>l.lotId===reserved.lot_id).counted,null);
});
await test('competing reservations are rejected by an atomic lot version guard',async()=>{
 const make=()=>op({action:'request-create',department:'Course',reason:'Concurrence fictive',lines:[{productId,quantity:1}]},200,'doctor'),one=(await make()).requestId,two=(await make()).requestId,r=await requestBy(one);let fired=false;
 const raced={...env,DB:{prepare:(...args)=>DB.prepare(...args),batch:async statements=>{if(!fired){fired=true;await requestAction(two,'request-reserve',{quantities:[1]});}return DB.batch(statements);}}};
 await op({action:'request-reserve',requestId:one,version:r.version,quantities:[1]},409,'pharmacy',{overrideEnv:raced});assert.equal((await requestBy(one)).status,'requested');assert.equal((await stock()).reservations.filter(v=>v.request_id===one).length,0);assert.equal((await requestBy(two)).status,'prepared');
});
await test('hospital boundaries and malformed operations cannot widen stock access',async()=>{
 const all=(await call('stock-operations?hospital=all',{jar:jars.director})),scoped=await call('stock-operations?hospital=h2',{jar:jars.pharmacy});assert.ok(all.requests.length);assert.equal(scoped.hospitalId,'h1');
 const alien={id:'foreign-request',hospitalId:'h2',requesterId:(await bootstrap('doctor')).account.id,status:'requested',lines:[],version:1};await DB.prepare('INSERT INTO sahati_supply_requests(id,hospital_id,data,version) VALUES(?,?,?,1)').bind(alien.id,'h2',JSON.stringify(alien)).run();await op({action:'request-reserve',requestId:alien.id,version:1,quantities:[]},404);assert.ok(!(await call('supplies',{jar:jars.doctor})).requests.some(r=>r.id===alien.id));await op({action:'unknown'},400);await op({action:'request-create',operationId:'bad',lines:[]},400,'doctor');
});
console.log(`\n${passed} stock ERP workflow scenarios passed.`);sqlite.close();
