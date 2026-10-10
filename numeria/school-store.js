// Local-only persistence. No password, token, personal record or file is sent to a server.
import { seedSchool, validateSchool, applyCommand, TEMPLATE_COURSES } from './school-core.js?v=cf0edce1d5';
import { courses, resources, products, byId, copy, L } from './catalog.js?v=cf0edce1d5';

const DATABASE='numeria-school-demo-v1';
let db=null,cached=null,opening=null,mode='loading';
const listeners=new Set(),memoryFiles=new Map();
let channel;
if(typeof BroadcastChannel!=='undefined'&&typeof window!=='undefined')channel=new BroadcastChannel('numeria-school-demo');
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Lecture locale impossible.'));});
const finish=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Sauvegarde locale impossible.'));tx.onabort=()=>reject(tx.error||Error('Sauvegarde annulée.'));});
export const storageMode=()=>mode;
export const getSchool=()=>cached;
export const newId=prefix=>`${prefix}-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}`;
export const siteCopy=(key,lang,fallback)=>cached?.site?.[key]?.[lang]||fallback;
export function subscribeSchool(callback){listeners.add(callback);return()=>listeners.delete(callback);}
function announce(external=false){for(const callback of listeners)callback(cached,external);if(!external){channel?.postMessage({revision:cached.revision});try{localStorage.setItem('numeria.school.changed',String(Date.now()));}catch{/* BroadcastChannel remains available. */}}}
export function initSchool(){
  if(opening)return opening;
  opening=(async()=>{
    try{
      if(!globalThis.indexedDB)throw Error('IndexedDB indisponible.');
      db=await new Promise((resolve,reject)=>{const req=indexedDB.open(DATABASE,1);req.onupgradeneeded=()=>{req.result.createObjectStore('records');req.result.createObjectStore('files',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Fermez les anciens onglets pour ouvrir la sauvegarde locale.'));});
      db.onversionchange=()=>{db.close();mode='memory';};
      const tx=db.transaction('records','readwrite'),done=finish(tx),store=tx.objectStore('records');
      const saved=await request(store.get('school'));
      cached=saved?validateSchool(saved):seedSchool();if(!saved)store.put(cached,'school');await done;mode='persistent';
    }catch(error){db?.close();db=null;cached=seedSchool();mode='memory';console.warn('NUMERIA: sauvegarde locale indisponible. Les modifications resteront temporaires.',error?.message);}
    return cached;
  })();return opening;
}
async function refresh(){if(!db)return;try{const saved=await request(db.transaction('records').objectStore('records').get('school'));if(saved&&saved.revision!==cached.revision){cached=validateSchool(saved);announce(true);}}catch{ /* The UI will report a failed write instead of pretending to save it. */ }}
channel?.addEventListener('message',refresh);
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key==='numeria.school.changed')refresh();});

export async function validatePDF(file){
  if(!file||!file.name?.toLowerCase().endsWith('.pdf')||file.size<8||file.size>5*1024*1024)throw Error('Choisissez un PDF non vide de 5 Mo maximum.');
  const magic=new TextDecoder('ascii').decode(await file.slice(0,5).arrayBuffer());if(magic!=='%PDF-')throw Error('Ce fichier ne possède pas une signature PDF valide.');
  return {id:newId('pdf'),name:file.name.slice(0,180),blob:new Blob([file],{type:'application/pdf'}),size:file.size};
}
export async function dispatch(actorId,command,file=null){
  await initSchool();
  const fileRecord=file?await validatePDF(file):null;
  const cmd=fileRecord?{...command,payload:{...command.payload,fileId:fileRecord.id,fileName:fileRecord.name,size:fileRecord.size}}:command;
  if(!db){cached=applyCommand(cached,actorId,cmd);if(fileRecord)memoryFiles.set(fileRecord.id,fileRecord);announce();return cached;}
  const tx=db.transaction(['records','files'],'readwrite'),done=finish(tx);done.catch(()=>{});
  try{
    const previous=await request(tx.objectStore('records').get('school'));const next=applyCommand(previous||cached,actorId,cmd);
    if(fileRecord)tx.objectStore('files').put(fileRecord);
    const before=new Set((previous||cached).resources.filter(r=>r.fileId).map(r=>r.fileId)),after=new Set(next.resources.filter(r=>r.fileId).map(r=>r.fileId));
    for(const id of before)if(!after.has(id))tx.objectStore('files').delete(id);
    tx.objectStore('records').put(next,'school');await done;cached=next;announce();return next;
  }catch(error){try{tx.abort();}catch{}throw Error(error?.message||'Sauvegarde impossible. Votre modification n’a pas été enregistrée.');}
}
export async function getFile(id){await initSchool();return db?request(db.transaction('files').objectStore('files').get(id)):memoryFiles.get(id);}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function downloadResource(id,actor=null){
  const resource=cached.resources.find(r=>r.id===id);if(!resource)throw Error('Ressource introuvable.');
  // Role filtering is also performed in school-app. Public downloads are explicitly published excerpts.
  if(!actor&&(!resource.public||resource.status!=='published'))throw Error('Cette ressource n’est pas publiée.');
  if(resource.fileId){const file=await getFile(resource.fileId);if(!file)throw Error('Le PDF manque dans cette sauvegarde. Ajoutez-le de nouveau depuis l’administration.');downloadBlob(file.blob,file.name);}
  else{const a=document.createElement('a');a.href=`samples/${resource.sampleFile}`;a.download=resource.sampleFile;document.body.append(a);a.click();a.remove();}
}
const bytesToBase64=buffer=>{const bytes=new Uint8Array(buffer);let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
export async function exportBackup(actorId){
  if(cached.users.find(u=>u.id===actorId&&u.active)?.role!=='admin')throw Error('Export réservé à l’administration.');
  const snapshot=JSON.parse(JSON.stringify(cached)),files=[];let total=0;
  for(const id of new Set(snapshot.resources.filter(r=>r.fileId).map(r=>r.fileId))){const file=await getFile(id);if(!file)throw Error('Un PDF est manquant. Rétablissez-le avant l’export.');total+=file.size;if(total>20*1024*1024)throw Error('La sauvegarde complète est limitée à 20 Mo de PDF. Téléchargez les fichiers séparément.');files.push({id,name:file.name,data:bytesToBase64(await file.blob.arrayBuffer())});}
  return {format:'numeria-school-demo',version:1,state:snapshot,files};
}
export async function importBackup(actorId,input){
  if(cached.users.find(u=>u.id===actorId&&u.active)?.role!=='admin')throw Error('Import réservé à l’administration.');
  if(input?.format!=='numeria-school-demo'||input.version!==1||!Array.isArray(input.files)||input.files.length>200)throw Error('Format de sauvegarde invalide.');
  const next=validateSchool(input.state),ids=new Set(),records=[];let total=0;
  for(const item of input.files){if(!item||typeof item.data!=='string'||item.data.length>7*1024*1024||typeof item.id!=='string'||ids.has(item.id)||!next.resources.some(r=>r.fileId===item.id)||typeof item.name!=='string')throw Error('Fichier de sauvegarde invalide.');let binary;try{binary=atob(item.data);}catch{throw Error('Encodage PDF invalide.');}const file=new File([Uint8Array.from(binary,c=>c.charCodeAt(0))],item.name,{type:'application/pdf'});const checked=await validatePDF(file);total+=checked.size;if(total>20*1024*1024)throw Error('Les PDF dépassent 20 Mo.');records.push({...checked,id:item.id});ids.add(item.id);}
  if(next.resources.some(r=>r.fileId&&!ids.has(r.fileId)))throw Error('La sauvegarde ne contient pas tous les PDF.');
  for(const r of next.resources.filter(r=>r.fileId))if(records.find(f=>f.id===r.fileId).size!==r.size)throw Error('La taille d’un PDF ne correspond pas à sa ressource.');
  next.revision=Math.max(cached.revision,next.revision)+1;
  if(db){const tx=db.transaction(['records','files'],'readwrite'),done=finish(tx);tx.objectStore('files').clear();for(const file of records)tx.objectStore('files').put(file);tx.objectStore('records').put(next,'school');await done;}
  else{memoryFiles.clear();for(const file of records)memoryFiles.set(file.id,file);}
  cached=next;announce();return cached;
}
export async function resetSchool(actorId){
  if(cached.users.find(u=>u.id===actorId&&u.active)?.role!=='admin')throw Error('Réinitialisation réservée à l’administration.');
  const next=seedSchool();next.revision=cached.revision+1;
  if(db){const tx=db.transaction(['records','files'],'readwrite'),done=finish(tx);tx.objectStore('records').put(next,'school');tx.objectStore('files').clear();await done;}else memoryFiles.clear();
  cached=next;announce();return cached;
}

const originalCourses=JSON.parse(JSON.stringify(courses)),originalResources=JSON.parse(JSON.stringify(resources));
export function syncPublicCatalog(){
  if(!cached)return;
  const updated=cached.courses.map(c=>{
    const template=originalCourses.find(t=>t.id===c.source)||TEMPLATE_COURSES[0];
    const custom=!originalCourses.some(t=>t.id===c.id),resource=custom?`r-${c.id}`:template.resource;
    const next={...JSON.parse(JSON.stringify(template)),id:c.id,title:c.title,description:c.description,price:c.price,weeks:c.weeks,live:c.live,practice:c.practice,resource,modules:{fr:c.modules.map(m=>[m.title,m.text]),en:c.source===c.id?template.modules.en:c.modules.map(m=>[m.title,m.text]),ar:c.source===c.id?template.modules.ar:c.modules.map(m=>[m.title,m.text])},kind:'course'};
    if(custom){next.short=L('Un parcours préparé par l’équipe Numeria.','A programme prepared by the Numeria team.','مسار أعده فريق نوميريا.');const r=originalResources.find(r=>r.id===template.resource);byId[resource]={...JSON.parse(JSON.stringify(r)),id:resource,course:c.id,title:c.title,price:0,kind:'resource',custom:true};}
    byId[c.id]=next;return {...next,status:c.status};
  });
  courses.splice(0,courses.length,...updated.filter(c=>c.status==='published'));
  products.splice(0,products.length,...Object.values(byId));
}
