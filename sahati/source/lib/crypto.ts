const encoder=new TextEncoder();
export function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function sha(text:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
function unhex(s:string){return new Uint8Array(s.match(/.{2}/g)!.map(c=>parseInt(c,16)));}
export async function hashPassword(password:string,salt=randomToken().slice(0,32)){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-256'},key,256);
 return `pbkdf2$100000$${salt}$${[...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('')}`;
}
export async function verifyPassword(password:string,hash:string){if(!hash||password.length>256)return false;const parts=hash.split('$');if(parts.length!==4||parts[0]!=='pbkdf2'||parts[1]!=='100000'||!/^[a-f0-9]{32}$/.test(parts[2])||!/^[a-f0-9]{64}$/.test(parts[3]))return false;const got=await hashPassword(password,parts[2]);let diff=0;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^got.charCodeAt(i);return diff===0;}
