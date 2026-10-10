export type Envelope={format:'sahati-vault-1';salt:string;iv:string;ciphertext:string};
export type AccessConfig={format:'sahati-access-2';secondary:Envelope;vaultSalt:string;legacySalt:string};
export function accessPassword(first:string,second:string){return JSON.stringify(['sahati-access-2',first,second]);}
export const iterations=600000;
export function base64(bytes:Uint8Array) {let result='';for(let i=0;i<bytes.length;i+=24576)result+=String.fromCharCode(...bytes.subarray(i,i+24576));return btoa(result);}
export function unbase64(text:string) {return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
export async function deriveKey(password:string,salt:string) {
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:unbase64(salt),iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(value:unknown,key:CryptoKey,salt:string):Promise<Envelope> {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('sahati-vault-1')},key,new TextEncoder().encode(JSON.stringify(value)));
  return {format:'sahati-vault-1',salt,iv:base64(iv),ciphertext:base64(new Uint8Array(cipher))};
}
export async function open(envelope:Envelope,key:CryptoKey) {
  if(envelope?.format!=='sahati-vault-1'||typeof envelope.salt!=='string'||typeof envelope.iv!=='string'||typeof envelope.ciphertext!=='string')throw new Error('Sauvegarde SAHATI invalide.');
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(envelope.iv),additionalData:new TextEncoder().encode(envelope.format)},key,unbase64(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function vaultStorage() {
  let connection:Promise<IDBDatabase>|undefined;
  function database() {return connection||=new Promise((resolve,reject)=>{const r=indexedDB.open('sahati-github',1);r.onupgradeneeded=()=>r.result.createObjectStore('vault');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Le stockage local est indisponible. Autorisez le stockage de ce site.'));r.onblocked=()=>reject(new Error('Fermez les autres onglets SAHATI puis réessayez.'));});}
  return {
    async read():Promise<Envelope|undefined> {const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('vault','readonly'),r=tx.objectStore('vault').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});},
    async write(value:Envelope) {const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('vault','readwrite');tx.objectStore('vault').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('Sauvegarde locale impossible. Vérifiez l’espace disponible.'));tx.onabort=()=>reject(new Error('Sauvegarde locale interrompue.'));});}
  };
}
