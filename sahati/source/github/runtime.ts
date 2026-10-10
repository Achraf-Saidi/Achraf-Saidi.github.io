import {handleAPI,type ApplicationRequest} from '../lib/engine';
import {sqliteDatabase} from './sqlite';
import {base64,unbase64,deriveKey,seal,open,vaultStorage,type Envelope} from './vault';
import {schema} from './schema';
declare global {interface Window {initSqlJs:(options:any)=>Promise<any>;}}
const base='/sahati/',storage=vaultStorage(),cookies:Record<string,string>={};
let SQL:any,key:CryptoKey|undefined,salt='',gateHash='',chain:Promise<any>=Promise.resolve();
let vault:{database:string;files:Record<string,string>}|undefined;
function exclusive<T>(fn:()=>Promise<T>):Promise<T> {
  const next:Promise<T>=chain.catch(()=>{}).then(async()=>navigator.locks?await navigator.locks.request('sahati-local-vault',async()=>await fn()):await fn());chain=next;return next;
}
export function navigate(path:string) {history.pushState(null,'',path);window.dispatchEvent(new Event('sahati-route'));window.scrollTo(0,0);}
function clear() {key=undefined;gateHash='';vault=undefined;Object.keys(cookies).forEach(k=>delete cookies[k]);window.dispatchEvent(new Event('sahati-unlocked'));}
async function unlock(password:string) {
  if(!crypto.subtle)throw new Error('Ouvrez SAHATI en HTTPS dans un navigateur récent.');
  const response=await fetch(base+'vault-bootstrap.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Configuration SAHATI indisponible. Réessayez après le déploiement.');
  const bootstrap:Envelope=await response.json();
  let candidate:CryptoKey,config:any;
  try {candidate=await deriveKey(password,bootstrap.salt);config=await open(bootstrap,candidate);}catch {throw new Error('Mot de passe incorrect.');}
  const persisted=await storage.read();
  const data=persisted?await open(persisted,candidate):undefined;
  SQL||=await window.initSqlJs({locateFile:()=>base+'vendor/sql-wasm-browser.wasm'});
  const db=new SQL.Database(data?unbase64(data.database):undefined);
  if(!data)db.run(schema);
  // Sessions are tab-local; refresh always asks for the private password again.
  key=candidate;salt=bootstrap.salt;gateHash=config.gateHash;
  vault={database:base64(db.export()),files:data?.files||{}};db.close();
}
export async function localResponse(path:string,method='GET',body?:any):Promise<Response> {
  return exclusive(async()=>{
    const route=path.split('?')[0];
    if(route==='gate'&&method==='POST'&&!key)await unlock(String(body?.password||''));
    if(!key||!vault)return Response.json(route==='status'?{gate:false,account:null}:{error:'L’accès privé est verrouillé.'},{status:route==='status'?200:401});
    // Read the newest transaction when another tab has saved changes.
    const persisted=await storage.read();if(persisted)vault=await open(persisted,key);
    const db=new SQL.Database(unbase64(vault!.database));
    const files={...vault!.files};
    const DB=sqliteDatabase(db) as unknown as D1Database;
    const BUCKET={async put(k:string,b:Uint8Array){files[k]=base64(b);},async delete(k:string){delete files[k];},async get(k:string){return files[k]?{body:unbase64(files[k])}:null;}} as unknown as R2Bucket;
    const url=new URL(base+'api/'+path,location.origin);
    // Origin and local sessions are application metadata. Keep them outside
    // Fetch Request/Response headers, where browser guards would discard them.
    const payload=new Request(url,{method,headers:body instanceof FormData?undefined:body?{'Content-Type':'application/json'}:undefined,...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});
    const headers=new Headers(payload.headers);headers.set('Origin',url.origin);headers.set('Cookie',Object.entries(cookies).map(([k,v])=>k+'='+v).join('; '));
    const request:ApplicationRequest={url:payload.url,method:payload.method,headers,text:()=>payload.text(),formData:()=>payload.formData()};
    const sessionChanges:string[]=[];
    try {
      const response=await handleAPI(request,url.pathname.slice((base+'api/').length).split('/'),{DB,BUCKET,SAHATI_GATE_HASH:gateHash,onSessionCookie:value=>sessionChanges.push(value)});
      const state={database:base64(db.export()),files};
      await storage.write(await seal(state,key,salt));vault=state;
      for(const value of sessionChanges){const match=/^(__Host-sahati-(?:gate|account))=([^;]*)/.exec(value);if(match){if(match[2])cookies[match[1]]=match[2];else delete cookies[match[1]];}}
      if(route==='gate'&&response.ok)window.dispatchEvent(new Event('sahati-unlocked'));
      if(route==='lock'&&response.ok)clear();
      if(route==='status') {const state:any=await response.clone().json();if(!state.gate)clear();}
      return response;
    } finally {db.close();}
  });
}
export async function localApi(path:string,method='GET',body?:any):Promise<any> {const r=await localResponse(path,method,body),data:any=await r.json();if(!r.ok)throw new Error(data.error||'Action impossible.');return data;}
export async function resource(path:string) {const r=await localResponse(path);if(!r.ok){const error:any=await r.json();throw new Error(error.error);}return URL.createObjectURL(await r.blob());}
export async function backup() {return exclusive(async()=>{if(!key)throw new Error('Déverrouillez SAHATI.');const value=await storage.read();if(!value)throw new Error('Aucune donnée à sauvegarder.');return JSON.stringify(value);});}
export async function restore(text:string) {return exclusive(async()=>{
  if(!key)throw new Error('Déverrouillez SAHATI.');
  const envelope:Envelope=JSON.parse(text),value=await open(envelope,key);
  const db=new SQL.Database(unbase64(value.database));
  try {if(!db.exec('SELECT count(*) FROM sahati_metadata')[0])throw new Error('Base invalide.');db.run('DELETE FROM sahati_sessions');value.database=base64(db.export());}finally{db.close();}
  if(!value.files||typeof value.files!=='object')throw new Error('Sauvegarde invalide.');
  await storage.write(await seal(value,key,salt));clear();navigate(base);
});}
