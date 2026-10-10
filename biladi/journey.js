import {BY_ID} from './content.js';
export const COST_PRESETS={budget:{room:5500,food:1800,activity:700,sahara:14000,domestic:12000,mobility:750,roadHour:1800},balanced:{room:11000,food:3200,activity:1200,sahara:19000,domestic:15000,mobility:1200,roadHour:2300},premium:{room:24000,food:6000,activity:2000,sahara:29000,domestic:19000,mobility:2300,roadHour:3200}};
export const CURRENCIES=['EUR','USD','GBP','CHF','CAD','AED','DZD'];
export const DEFAULT_PLAN={start:'2026-11-01',days:20,departure:'Bruxelles',nationality:'BE',people:2,interests:['sea','antiquity','desert','tradition'],inspirations:[],style:'balanced',currency:'EUR',rateMode:'personal',rate:278,international:250,visa:50,costs:{...COST_PRESETS.balanced}};
const allowedInterests=['sea','antiquity','desert','mountain','tradition','food'];
const allowedInspirations=['italy','greece','japan','norway','jordan'];
const num=(n,def,min,max)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):def;
export function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
export function addDays(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function normalizePlan(raw={}){
 const style=Object.hasOwn(COST_PRESETS,raw.style)?raw.style:'balanced';
 const currency=CURRENCIES.includes(raw.currency)?raw.currency:'EUR';
 const rateMode=raw.rateMode==='official'&&currency==='EUR'?'official':'personal';
 const nationality=/^[A-Z]{2}$/.test(String(raw.nationality||'').toUpperCase())?String(raw.nationality).toUpperCase():'OTHER';
 const costs={};for(const [k,v] of Object.entries(COST_PRESETS[style]))costs[k]=num(raw.costs?.[k],v,0,k==='room'?200000:100000);
 return {start:validDate(raw.start)?raw.start:DEFAULT_PLAN.start,days:Math.round(num(raw.days,20,3,30)),departure:String(raw.departure||'Bruxelles').trim().slice(0,80),nationality,people:Math.round(num(raw.people,2,1,12)),interests:(Array.isArray(raw.interests)?raw.interests:DEFAULT_PLAN.interests).filter(x=>allowedInterests.includes(x)),inspirations:(Array.isArray(raw.inspirations)?raw.inspirations:[]).filter(x=>allowedInspirations.includes(x)),style,currency,rateMode,rate:currency==='DZD'?1:rateMode==='official'&&currency==='EUR'?150.413:num(raw.rate,278,.01,100000),international:num(raw.international,250,0,100000),visa:num(raw.visa,50,0,20000),costs};
}
function affinities(p){const scores=Object.fromEntries(allowedInterests.map(k=>[k,p.interests.includes(k)?3:0]));for(const i of p.inspirations){for(const k of ({italy:['antiquity','food','sea'],greece:['antiquity','sea'],japan:['tradition','mountain'],norway:['mountain','sea'],jordan:['desert','antiquity']}[i]||[]))scores[k]+=1;}return scores;}
export function distanceKm(a,b){const r=Math.PI/180;const dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r;const q=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;return Math.round(6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)));}
const roadTimes={'alger:bejaia':5,'alger:constantine':6.5,'alger:oran':5.5,'alger:tipasa':1.5,'alger:cherchell':2,'alger:kabylie':3.5,'bejaia:jijel':2.5,'bejaia:constantine':4,'jijel:constantine':3,'constantine:timgad':3,'constantine:djemila':3,'timgad:djemila':2.5,'oran:tlemcen':2.5,'bejaia:kabylie':3,'alger:djemila':4.5,'alger:ghardaia':8};
export function transfer(from,to){
 const a=BY_ID[from],b=BY_ID[to];if(!a||!b||from===to)return null;
 const key=from+':'+to,reverse=to+':'+from;const roadHours=roadTimes[key]??roadTimes[reverse];
 if(roadHours!==undefined&&roadHours<=6.5)return {from,to,mode:'road',hours:roadHours,km:Math.round(distanceKm(a,b)*1.3),legs:0,estimated:true};
 const longSahara=a.sahara||b.sahara||['timimoun','ghardaia','el-oued'].includes(from)||['timimoun','ghardaia','el-oued'].includes(to);
 if(!longSahara&&distanceKm(a,b)<360)return {from,to,mode:'road',hours:Math.round((distanceKm(a,b)*1.35/60+.5)*2)/2,km:Math.round(distanceKm(a,b)*1.35),legs:0,estimated:true};
 const legs=a.airport==='ALG'||b.airport==='ALG'?1:2;
 return {from,to,mode:'flight',hours:legs===1?5:10,hourRange:legs===1?'4–7':'8–14',via:legs===2?'ALG':null,fromAirport:a.airport,toAirport:b.airport,legs,estimated:true};
}
export function createJourney(raw){
 const plan=normalizePlan(raw),scores=affinities(plan);const months=Array.from({length:plan.days},(_,i)=>Number(addDays(plan.start,i).slice(5,7)));
 const summer=months.some(m=>m>=6&&m<=9);
 const desertWanted=scores.desert>0;const desertAllowed=desertWanted&&!summer;
 let candidates;
 if(scores.mountain>scores.antiquity&&scores.mountain>=scores.sea)candidates=['kabylie','bejaia','constantine'];
 else if(scores.food>scores.antiquity&&scores.sea>0)candidates=['oran','tlemcen'];
 else if(scores.antiquity>scores.sea)candidates=['constantine','timgad','djemila','bejaia'];
 else candidates=['bejaia','jijel','constantine'];
 if(!plan.interests.length&&!plan.inspirations.length)candidates=['bejaia','constantine'];
 if(scores.desert>Math.max(scores.sea,scores.antiquity,scores.mountain)){candidates=desertAllowed?(plan.days>=18?['ghardaia','timimoun','djanet']:plan.days>=10?['djanet']:['ghardaia']):['alger','bejaia','constantine'].filter(x=>x!=='alger');}
 else if(desertAllowed&&plan.days>=12){candidates=candidates.filter(x=>x!=='jijel').slice(0,2);candidates.push('ghardaia');if(plan.days>=18)candidates.push('djanet');}
 if(plan.days<=5)candidates=['tipasa'];
 const nightTotal=plan.days-1;
 let blocks;
 if(plan.days===3){blocks=[{id:'alger',nights:2}];}
 else {
  const startNights=2,finalNights=1,available=nightTotal-startNights-finalNights;
  const chosen=[];let used=0;
  for(const id of candidates){
   const n=BY_ID[id].minNights;const previous=chosen.length?chosen[chosen.length-1].id:'alger';
   // Do not assume two domestic flights connect on the same day: reserve a hub night.
   const connection=transfer(previous,id)?.via==='ALG'?1:0;
   if(used+n+connection<=available&&!chosen.some(b=>b.id===id)){
    if(connection)chosen.push({id:'alger',nights:1,connection:true});
    chosen.push({id,nights:n});used+=n+connection;
   }
  }
  if(!chosen.length){blocks=[{id:'alger',nights:nightTotal}];}
  else {let remainder=available-used;let i=0;const stays=chosen.filter(b=>!b.connection);while(remainder-->0){stays[i%stays.length].nights++;i++;}blocks=[{id:'alger',nights:startNights},...chosen,{id:'alger',nights:finalNights}];}
 }
 const days=[];let dayIndex=0;
 for(let b=0;b<blocks.length;b++){
  const block=blocks[b],destination=BY_ID[block.id];
  for(let n=0;n<block.nights;n++){
   const leg=n===0&&b>0?transfer(blocks[b-1].id,block.id):null;
   days.push({number:dayIndex+1,date:addDays(plan.start,dayIndex),destination:block.id,photo:destination.photo,kind:dayIndex===0?'arrival':leg?'transfer':'explore',transfer:leg,experienceIndex:n,sahara:!!destination.sahara});dayIndex++;
  }
 }
 days.push({number:plan.days,date:addDays(plan.start,plan.days-1),destination:'alger',kind:'departure',transfer:null,experienceIndex:0,sahara:false});
 const flights=days.reduce((s,d)=>s+(d.transfer?.legs||0),0);
 const roadHours=days.reduce((s,d)=>s+(d.transfer?.mode==='road'?d.transfer.hours:0),0);
 const saharaNights=blocks.filter(b=>BY_ID[b.id].sahara).reduce((s,b)=>s+b.nights,0);
 const rooms=Math.ceil(plan.people/2),nonSaharaNights=nightTotal-saharaNights,localDays=plan.days-saharaNights;
 const local={lodging:nonSaharaNights*rooms*plan.costs.room,meals:localDays*plan.people*plan.costs.food,transfers:plan.people*(flights*plan.costs.domestic+localDays*plan.costs.mobility)+roadHours*plan.costs.roadHour*Math.ceil(plan.people/4),guide:saharaNights*plan.people*plan.costs.sahara,activities:localDays*plan.people*plan.costs.activity};
 const subtotalDZD=Object.values(local).reduce((a,b)=>a+b,0),contingencyDZD=subtotalDZD*.15;
 const foreign={international:plan.international*plan.people,visas:plan.visa*plan.people};
 const total=(subtotalDZD+contingencyDZD)/plan.rate+foreign.international+foreign.visas;
 return {plan,blocks,days,nightTotal,flights,roadHours,saharaNights,summer,desertExcluded:summer&&desertWanted,budget:{local,subtotalDZD,contingencyDZD,foreign,total,perPerson:total/plan.people,low:total*.85,high:total*1.25},generated:'2026-10-10'};
}
export function calendarFile(journey,label){
 const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BILADI//Journey//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const d of journey.days){lines.push('BEGIN:VEVENT',`UID:biladi-${d.date}-${d.number}-${journey.plan.people}@biladi.local`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${d.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${addDays(d.date,1).replaceAll('-','')}`,`SUMMARY:${escape(label(d))}`,`DESCRIPTION:${escape('BILADI — suggested itinerary; travel and opening times to confirm. Itinéraire indicatif ; trajets et ouvertures à confirmer.')}`,'END:VEVENT');}
 lines.push('END:VCALENDAR');
 // RFC 5545 lines are folded at 75 UTF-8 octets, never inside a multibyte character.
 const encoder=new TextEncoder();const folded=lines.map(line=>{let out='',chunk='',bytes=0;for(const char of line){const n=encoder.encode(char).length;if(bytes+n>74){out+=chunk+'\r\n ';chunk='';bytes=1;}chunk+=char;bytes+=n;}return out+chunk;});
 return folded.join('\r\n')+'\r\n';
}
