import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {LANGS,DICT} from '../i18n.js';
import {DESTINATIONS,ARTICLE_IMAGES,DISHES,RESTAURANTS,PRACTICAL} from '../content.js';
import {DEFAULT_PLAN,COST_PRESETS,normalizePlan,createJourney,addDays,calendarFile} from '../journey.js';

const root=resolve(import.meta.dirname,'..');
const read=f=>readFile(resolve(root,f),'utf8');
const json=async f=>JSON.parse(await read('data/'+f));
const [wilayas,photos,editorial,summary,shapes]=await Promise.all(['wilayas.json','photos.json','editorial.json','catalog-summary.json','map-paths.json'].map(json));
const langs=LANGS.map(x=>x.id);
const localized=(obj,label)=>{for(const l of langs)assert.equal(typeof obj[l],'string',label+' / '+l);for(const l of langs)assert.ok(obj[l].trim(),label+' / '+l);};
const ids=items=>assert.equal(new Set(items.map(x=>x.id)).size,items.length,'Duplicate ids');
for(const module of ['app','content','journey','i18n']){
 const p=spawnSync(process.execPath,['--check',resolve(root,''+module+'.js')],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);
}
assert.equal(langs.length,8);
for(const l of langs){assert.deepEqual(Object.keys(DICT[l]),Object.keys(DICT.fr));for(const [k,v] of Object.entries(DICT[l]))assert.ok(v.trim(),l+':'+k);}
const app=await read('app.js');
for(const match of app.matchAll(/\bt\('([A-Za-z]+)'\)/g))assert.ok(DICT.fr[match[1]],'Missing UI text: '+match[1]);
assert.equal(wilayas.length,69);
assert.equal(shapes.length,69);
const svg=await read('assets/algeria-69.svg');
const mapCodes=[...svg.matchAll(/data-code="(\d+)"/g)].map(x=>x[1]);
const expectedCodes=wilayas.map(w=>String(w.code).padStart(2,'0'));
assert.deepEqual([...mapCodes].sort(),[...expectedCodes].sort());
const mapIDs=[...svg.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(mapIDs).size,mapIDs.length);
for(const w of wilayas){const code=String(w.code).padStart(2,'0');assert.ok(svg.includes('data-name-latin="'+w.name_fr+'"'),'Mismatched map label '+code);assert.ok(shapes.some(s=>s.code===code));}
let catalogCount=0;
for(const category of ['attractions','historic','lodging','parks','thermal-springs']){
 const rows=await json(category+'.json');catalogCount+=rows.length;
 for(const p of rows)assert.ok(expectedCodes.includes(String(p.wilaya_code).padStart(2,'0')),'Unknown wilaya '+p.id);
}
assert.equal(catalogCount,4348);
assert.equal(Object.values(summary).flatMap(x=>Object.values(x)).reduce((a,b)=>a+b,0),catalogCount);
assert.equal((await json('airports.json')).length,36);
ids(photos);ids(DESTINATIONS);
for(const p of photos){assert.ok((await stat(resolve(root,'assets/'+p.filename))).size>0);for(const key of ['photographer','license','source_url','license_url'])assert.ok(p[key],p.id+': '+key);new URL(p.source_url);}
for(const d of DESTINATIONS){localized(d.name,d.id+' name');localized(d.lead,d.id+' lead');assert.ok(expectedCodes.includes(d.wilaya));if(d.photo)assert.ok(photos.some(p=>p.id===d.photo),d.id+' photo');}
for(const code of expectedCodes)assert.ok(photos.some(p=>p.id==='wilaya-'+code)||DESTINATIONS.some(d=>d.wilaya===code&&d.photo&&photos.some(p=>p.id===d.photo)),'Missing province photograph '+code);
const articles=[...editorial.articles,...editorial.supporting_articles];ids(articles);
assert.equal(articles.length,26);
for(const a of [...articles,...editorial.culture_profiles]){
 localized(a.title,a.id+' title');localized(a.body,a.id+' body');assert.ok(a.sources.length);
 for(const s of a.sources)assert.ok(new URL(s.url).protocol.startsWith('http'));
 for(const section of a.sections||[]){localized(section.heading,a.id+' section heading');localized(section.body,a.id+' section body');}
 for(const section of a.sections||[])for(const id of section.source_ids||[])assert.ok(editorial.source_registry[id],'Missing section source '+id);
}
for(const a of [...editorial.people,...editorial.companies]){localized(a.summary,a.id+' summary');localized(a.sector,a.id+' sector');}
for(const id of Object.values(ARTICLE_IMAGES))assert.ok(photos.some(p=>p.id===id),id);
for(const d of DISHES){assert.ok(typeof d.name==='string'&&d.name);localized(d.desc,d.name+' description');}
for(const p of PRACTICAL){localized(p.title,p.id+' title');localized(p.body,p.id+' body');}
for(const r of RESTAURANTS)new URL(r.url);
for(const filename of ['map-license.txt','data-license.txt','font-licenses.txt'])assert.ok((await read('data/'+filename)).length>100);
const fonts=await read('fonts.css');for(const m of fonts.matchAll(/url\(['"]?(.+?)['"]?\)/g))assert.ok((await stat(resolve(root,m[1]))).size>0,m[1]);

let cases=0;
const interestSets=[[],['sea'],['antiquity'],['desert'],['mountain'],['food','sea'],['tradition','desert'],DEFAULT_PLAN.interests];
for(let month=1;month<=12;month++)for(let days=3;days<=30;days++)for(const interests of interestSets){
 const j=createJourney({...DEFAULT_PLAN,start:`2027-${String(month).padStart(2,'0')}-20`,days,interests});
 assert.equal(j.days.length,days);assert.equal(j.nightTotal,days-1);assert.equal(j.blocks.reduce((s,b)=>s+b.nights,0),days-1);
 assert.equal(j.days[0].kind,'arrival');assert.equal(j.days.at(-1).kind,'departure');assert.equal(j.days.at(-1).destination,'alger');
 assert.equal(j.days.at(-1).date,addDays(j.plan.start,days-1));
 for(let i=0;i<days;i++){assert.equal(j.days[i].number,i+1);assert.equal(j.days[i].date,addDays(j.plan.start,i));assert.ok(!j.days[i].transfer?.via,'An unverified same-day connection escaped the hub-night rule');}
 assert.ok(Number.isFinite(j.budget.total)&&j.budget.total>=0);assert.ok(j.budget.low<=j.budget.total&&j.budget.high>=j.budget.total);
 if(j.summer)assert.equal(j.saharaNights,0);
 cases++;
}
const single=createJourney({...DEFAULT_PLAN,days:3,people:1,international:0,visa:0});
const triple=createJourney({...DEFAULT_PLAN,days:3,people:3,international:0,visa:0});
assert.equal(triple.budget.local.lodging,single.budget.local.lodging*2,'Rooms must use two-person occupancy');
assert.equal(triple.budget.local.meals,single.budget.local.meals*3);
const rateDouble=createJourney({...single.plan,rate:single.plan.rate*2});assert.equal(rateDouble.budget.total,single.budget.total/2);
const flat=createJourney({...DEFAULT_PLAN,costs:Object.fromEntries(Object.keys(COST_PRESETS.balanced).map(k=>[k,0])),international:0,visa:0});assert.equal(flat.budget.total,0);
assert.equal(normalizePlan({...DEFAULT_PLAN,rateMode:'official',currency:'EUR',rate:278}).rate,150.413);
assert.equal(normalizePlan({...DEFAULT_PLAN,rateMode:'official',currency:'USD'}).rateMode,'personal');
assert.equal(normalizePlan({...DEFAULT_PLAN,currency:'DZD',rate:278}).rate,1);
const hostile=normalizePlan({...DEFAULT_PLAN,days:999,people:-1,start:'2027-02-31',nationality:'<img>',interests:['x','desert'],currency:'INVALID',rate:-4});
assert.equal(hostile.days,30);assert.equal(hostile.people,1);assert.equal(hostile.start,DEFAULT_PLAN.start);assert.equal(hostile.nationality,'OTHER');assert.deepEqual(hostile.interests,['desert']);
const calendar=calendarFile(createJourney(DEFAULT_PLAN),d=>'يوم 旅行, souvenir; '+d.number+' '+('ممتاز美丽 '.repeat(14)));
assert.equal((calendar.match(/BEGIN:VEVENT/g)||[]).length,20);
assert.equal((calendar.match(/DTEND;VALUE=DATE:/g)||[]).length,20);
for(const line of calendar.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75,'Calendar line exceeds RFC 5545 limit');
assert.equal(new Set([...calendar.matchAll(/UID:(.+)/g)].map(x=>x[1])).size,20);
console.log(JSON.stringify({status:'passed',journeyCases:cases,wilayas:wilayas.length,photos:photos.length,articles:articles.length,languages:langs.length,catalogEntries:catalogCount},null,2));
