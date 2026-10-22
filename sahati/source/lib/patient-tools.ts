import type {Account} from './model';
import {textField,dateField,UserError} from './validation';
export const patientToolsSchema='CREATE TABLE IF NOT EXISTS sahati_patient_tools(account_id TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1)';
export const emptyTools=()=>({tasks:[] as any[],questions:[] as any[],journal:[] as any[],preparation:{} as Record<string,string[]>,contact:{name:'',phone:'',relationship:'',notes:''}});
export async function patientTools(db:D1Database,a:Account,input?:any){
 if(a.role!=='patient'||!a.patientId)throw new UserError('Espace personnel du patient requis.',403);
 const row=await db.prepare('SELECT data,version FROM sahati_patient_tools WHERE account_id=?').bind(a.id).first<any>();
 if(!input)return {data:row?JSON.parse(row.data):emptyTools(),version:row?.version||0};
 if(input.version!==(row?.version||0))throw new UserError('Votre carnet a changé. Actualisez avant de poursuivre.',409);
 const d=input.data;if(!d||typeof d!=='object')throw new UserError('Carnet invalide.');const clean=emptyTools();
 const list=(value:any,max:number)=>{if(!Array.isArray(value)||value.length>max)throw new UserError('Liste trop longue ou invalide.');const ids=new Set();return value.map(v=>{const id=textField(v.id,'Identifiant',80,true);if(ids.has(id))throw new UserError('Élément en double.');ids.add(id);return {...v,id};});};
 clean.tasks=list(d.tasks,100).map(v=>{const time=textField(v.time,'Heure',5);if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new UserError('Heure invalide.');return {id:v.id,title:textField(v.title,'Rappel',200,true),date:dateField(v.date),time,done:v.done===true};});
 clean.questions=list(d.questions,100).map(v=>({id:v.id,text:textField(v.text,'Question',1000,true),done:v.done===true}));
 clean.journal=list(d.journal,180).map(v=>{if(!Number.isInteger(v.feeling)||v.feeling<1||v.feeling>5)throw new UserError('Ressenti invalide.');return {id:v.id,date:dateField(v.date),feeling:v.feeling,text:textField(v.text,'Note personnelle',1500,true)};});
 if(d.preparation&&typeof d.preparation==='object'&&!Array.isArray(d.preparation)){const entries=Object.entries(d.preparation);if(entries.length>100)throw new UserError('Trop de préparations.');for(const [id,items] of entries){if(!Array.isArray(items)||items.some(i=>!['documents','questions','travel','history'].includes(i)))throw new UserError('Préparation invalide.');clean.preparation[textField(id,'Rendez-vous',80,true)]=[...new Set(items)] as string[];}}
 const c=d.contact||{};clean.contact={name:textField(c.name,'Contact',200),phone:textField(c.phone,'Téléphone',60),relationship:textField(c.relationship,'Lien',100),notes:textField(c.notes,'Note',1000)};
 const version=(row?.version||0)+1;try{if(row){const r=await db.prepare('UPDATE sahati_patient_tools SET data=?,version=version+1 WHERE account_id=? AND version=?').bind(JSON.stringify(clean),a.id,row.version).run();if(!r.meta.changes)throw new UserError('Carnet modifié. Actualisez.',409);}else await db.prepare('INSERT INTO sahati_patient_tools(account_id,data,version) VALUES(?,?,1)').bind(a.id,JSON.stringify(clean)).run();}catch(e){if(/UNIQUE constraint/.test(String(e)))throw new UserError('Carnet modifié. Actualisez.',409);throw e;}
 return {data:clean,version};
}
function icsText(s:string){return s.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;').replaceAll('\r','');}
export function calendarFile(items:{id:string;title:string;date:string;time?:string;description?:string;duration?:number}[]){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SAHATI//Personal calendar//FR','CALSCALE:GREGORIAN'];
 for(const item of items){dateField(item.date);const date=item.date.replaceAll('-','');lines.push('BEGIN:VEVENT','UID:'+icsText(item.id)+'@sahati.demo','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'SUMMARY:'+icsText(item.title),'DESCRIPTION:'+icsText(item.description||'Démonstration SAHATI'));
  if(item.time&&/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)){const start=new Date(item.date+'T'+item.time+':00+01:00'),end=new Date(start.getTime()+(item.duration||20)*60000),stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');lines.push('DTSTART:'+stamp(start),'DTEND:'+stamp(end));}
  else lines.push('DTSTART;VALUE=DATE:'+date);lines.push('END:VEVENT');
 }lines.push('END:VCALENDAR');
 // RFC 5545 folding at UTF-8 octet boundaries, preserving non-ASCII labels.
 return lines.map(line=>{let out='',part='',bytes=0;for(const ch of line){const n=new TextEncoder().encode(ch).length;if(bytes+n>73){out+=part+'\r\n ';part='';bytes=1;}part+=ch;bytes+=n;}return out+part;}).join('\r\n')+'\r\n';
}
