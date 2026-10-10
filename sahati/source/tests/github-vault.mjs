// Runtime integration tests with SQLite WASM and a standards-compatible IndexedDB test adapter.
// These tests do not replace visual/browser verification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import 'fake-indexeddb/auto';
const require=createRequire(import.meta.url),esbuild=require(createRequire(require.resolve('drizzle-kit')).resolve('esbuild'));
// Node permits headers that browsers filter. Exercise the documented browser
// request/response guards so the in-process transport cannot rely on them.
const NativeRequest=globalThis.Request,NativeResponse=globalThis.Response;
globalThis.Request=class extends NativeRequest {
 constructor(input,init={}) {
  const headers=new Headers(init.headers||{});for(const name of ['origin','cookie','set-cookie'])headers.delete(name);
  super(input,{...init,headers});
 }
};
globalThis.Response=class extends NativeResponse {
 constructor(body,init={}) {
  const headers=new Headers(init.headers||{});headers.delete('set-cookie');headers.delete('set-cookie2');super(body,{...init,headers});
 }
 static json(data,init={}) {const headers=new Headers(init.headers||{});if(!headers.has('content-type'))headers.set('content-type','application/json');return new this(JSON.stringify(data),{...init,headers});}
};
await esbuild.build({entryPoints:['.sites-runtime/github/runtime.ts','github/vault.ts','lib/crypto.ts','lib/model.ts'],outdir:'.sites-runtime/vault-tests',outbase:'.',bundle:true,format:'esm',platform:'node',target:'node24',logLevel:'silent'});
const {deriveKey,seal,open,base64,vaultStorage}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/vault-tests/github/vault.js'));
const {hashPassword}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/vault-tests/lib/crypto.js'));
const {roles}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/vault-tests/lib/model.js'));
const password='Synthetic-local-vault-test-only!',salt=base64(crypto.getRandomValues(new Uint8Array(16))),key=await deriveKey(password,salt);
const bootstrap=await seal({gateHash:await hashPassword(password)},key,salt);
const bus=new EventTarget();bus.initSqlJs=async options=>{assert.equal(options.locateFile(),'/sahati/vendor/sql-wasm-browser.wasm');return require('sql.js')({wasmBinary:await readFile('dist/github/vendor/sql-wasm-browser.wasm')});};bus.scrollTo=()=>{};
globalThis.window=bus;globalThis.location={origin:'https://achraf-saidi.github.io',pathname:'/sahati/',search:''};
globalThis.history={pushState(_state,_unused,url){location.pathname=url;}};
const requests=[];globalThis.fetch=async url=>{requests.push(String(url));assert.equal(url,'/sahati/vault-bootstrap.json');return Response.json(bootstrap);};
const {localApi,localResponse,backup,restore}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/vault-tests/.sites-runtime/github/runtime.js'));
const storage=vaultStorage();let passed=0;
async function test(name,fn){await fn();passed++;console.log('✓ '+name);}
await test('browser header guards filter Origin, Cookie and Set-Cookie in Fetch objects',async()=>{
 const request=new Request(location.origin,{headers:{Origin:location.origin,Cookie:'session=token'}});
 assert.equal(request.headers.get('origin'),null);assert.equal(request.headers.get('cookie'),null);
 assert.equal(Response.json({ok:true},{headers:{'Set-Cookie':'session=token'}}).headers.get('set-cookie'),null);
});
await test('private access rejects a wrong password and exposes no data while locked',async()=>{
 assert.deepEqual(await localApi('status'),{gate:false,account:null});
 await assert.rejects(localApi('gate','POST',{password:'wrong'}),/Mot de passe incorrect/);
 assert.equal((await localResponse('bootstrap')).status,401);assert.equal(await storage.read(),undefined);
});
await test('unlock, account login and reads run locally without external authentication',async()=>{
 await localApi('gate','POST',{password});assert.equal((await localApi('status')).gate,true);
 await localApi('login','POST',{email:'medecin@sahati.demo',password:'SahatiDemo2026!'});
 const data=await localApi('bootstrap');assert.equal(data.account.role,'doctor');assert.ok(data.records.some(r=>r.id==='p1'));
 for(const role of roles) {
  await localApi('logout','POST');const loggedOut=await localApi('status');assert.equal(loggedOut.gate,true);assert.equal(loggedOut.account,null);
  await localApi('login','POST',{email:role.email,password:'SahatiDemo2026!'});assert.equal((await localApi('bootstrap')).account.role,role.id);
 }
 await localApi('login','POST',{email:'medecin@sahati.demo',password:'SahatiDemo2026!'});
 assert.ok(requests.every(url=>url==='/sahati/vault-bootstrap.json'));
});
let saved;
await test('mutations and attachments persist only inside an encrypted IndexedDB vault',async()=>{
 const data=await localApi('bootstrap'),p=data.records.find(r=>r.id==='p1');
 // A meaningful workflow: doctor creates an encounter, uploads a private PDF and retrieves it.
 const response=await localApi('records','POST',{kind:'encounters',patientId:p.id,data:{title:'Consultation locale',subjective:'Scénario fictif',objective:'Examen de démonstration',assessment:'Aucune décision clinique',plan:'Démonstration'}});
 const form=new FormData();form.set('recordId',response.record.id);form.set('file',new File(['%PDF-1.7\nfictive'],'document.pdf',{type:'application/pdf'}));
 await localApi('upload','POST',form);const updated=await localApi('bootstrap'),file=updated.attachments.find(f=>f.record_id===response.record.id);
 assert.ok(file);assert.match(await (await localResponse('files/'+file.id)).text(),/^%PDF/);
 const envelope=await storage.read(),text=JSON.stringify(envelope);assert.ok(!text.includes('Consultation locale'));assert.ok(!text.includes('%PDF'));assert.ok(!text.includes(password));
 const clear=await open(envelope,key);assert.ok(clear.database.length>1000);assert.equal(Object.keys(clear.files).length,1);
 saved=await backup();assert.equal(JSON.parse(saved).format,'sahati-vault-1');
});
await test('lock drops both sessions and a new unlock retains saved records',async()=>{
 await localApi('lock','POST');assert.equal((await localApi('status')).gate,false);assert.equal((await localResponse('bootstrap')).status,401);
 await localApi('gate','POST',{password});await localApi('login','POST',{email:'medecin@sahati.demo',password:'SahatiDemo2026!'});
 assert.ok((await localApi('bootstrap')).records.some(r=>r.title==='Consultation locale'));
});
await test('tampered backups fail authentication and leave the stored vault intact',async()=>{
 const before=await backup(),tampered=JSON.parse(saved);tampered.ciphertext=(tampered.ciphertext[0]==='A'?'B':'A')+tampered.ciphertext.slice(1);
 await assert.rejects(restore(JSON.stringify(tampered)));assert.equal(await backup(),before);
 const wrongKey=await deriveKey('different-password',salt);await assert.rejects(open(JSON.parse(saved),wrongKey));
});
await test('restoring an encrypted backup preserves records and requires a new login',async()=>{
 await restore(saved);assert.equal((await localApi('status')).gate,false);
 await localApi('gate','POST',{password});assert.equal((await localApi('status')).account,null);
 await localApi('login','POST',{email:'medecin@sahati.demo',password:'SahatiDemo2026!'});assert.ok((await localApi('bootstrap')).records.some(r=>r.title==='Consultation locale'));
});
await test('all published entry points use GitHub paths without a platform redirect',async()=>{
 for(const page of ['index.html','connexion/index.html','espace/index.html','verifier/index.html']) {
  const html=await readFile('dist/github/'+page,'utf8');assert.ok(!/chatgpt|openai|http-equiv\s*=\s*["']refresh/i.test(html));assert.match(html,/\/sahati\/assets\//);
 }
});
console.log(`\n${passed} GitHub vault scenarios passed.`);
