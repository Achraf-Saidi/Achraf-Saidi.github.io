// React interaction checks in jsdom. No browser layout or mobile viewport claim.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),esbuild=require('esbuild');
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://achraf-saidi.github.io/sahati/espace/'});
for(const k of ['window','document','location','history','localStorage','HTMLElement','Element','MouseEvent','Event','KeyboardEvent','DOMParser'])globalThis[k]=dom.window[k];
globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=()=>{};
await mkdir('.sites-runtime/ui-tests',{recursive:true});
const React=await import('react'),{act}=React,{createRoot}=await import('react-dom/client');
await esbuild.build({stdin:{contents:`export {PreferencesProvider} from './.sites-runtime/github/components/sahati-ui';export {default as PatientSpace} from './.sites-runtime/github/components/patient-space';export {default as Learning} from './.sites-runtime/github/components/learning';export {default as DocumentReader} from './.sites-runtime/github/components/document-reader';export {default as ImagingSchedule} from './.sites-runtime/github/components/imaging-schedule';export {default as RecordForm} from './.sites-runtime/github/components/record-form';export {seedRecords,seedAccounts} from './lib/seed';export {demoExtras} from './lib/clinical';export {clinicalCases,casePublic,gradeCase} from './lib/education';`,resolveDir:process.cwd(),loader:'tsx'},outfile:'.sites-runtime/ui-tests/shared.mjs',bundle:true,format:'esm',platform:'node',target:'node24',jsx:'automatic',packages:'external',tsconfigRaw:{compilerOptions:{baseUrl:'.sites-runtime/github',paths:{'@/*':['./*']}}},plugins:[{name:'mock-local-api',setup(build){build.onResolve({filter:/\/runtime$/},args=>({path:args.path,namespace:'api-mock'}));build.onLoad({filter:/.*/,namespace:'api-mock'},()=>({contents:'export const localApi=(...args)=>globalThis.__testApi(...args);export const resource=async()=>"blob:synthetic";export const navigate=()=>{};',loader:'js'}));}}],logLevel:'silent'});
const app=await import(pathToFileURL(process.cwd()+'/.sites-runtime/ui-tests/shared.mjs'));
let root=createRoot(document.getElementById('root')),passed=0,opened=[],created=[],routes=[],attempts=[];
const records=[...app.seedRecords(),...app.demoExtras()],account=app.seedAccounts().find(a=>a.role==='patient'),data={account,records:records.filter(e=>e.id==='p1'||e.patientId==='p1'),accounts:app.seedAccounts(),hospitals:[{id:'h1',name:'El Amal'}],attachments:[]};
globalThis.__testApi=async(path,method,body)=>{if(path==='learning'&&method==='POST'){const result=app.gradeCase(body.caseId,body.answers);attempts.unshift({...result,date:new Date().toISOString()});return result;}if(path==='learning')return {cases:app.clinicalCases.map(app.casePublic),attempts};if(path==='my-access')return {rows:[]};return {ok:true};};
async function render(Component,props={}){await act(async()=>{root.unmount();document.getElementById('root').innerHTML='';root=createRoot(document.getElementById('root'));root.render(React.createElement(app.PreferencesProvider,null,React.createElement(Component,props)));});}
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
async function click(element){assert.ok(element,'interaction target exists');await act(async()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})));}
async function test(name,fn){await fn();passed++;console.log('✓ '+name);}
const props={data,onOpen:e=>opened.push(e.id),onCreate:(kind,id)=>created.push({kind,id}),navigate:id=>routes.push(id),refresh:async()=>{},notify:()=>{}};
await test('patient home exposes own documents, structured graph and real primary actions',async()=>{
 await render(app.PatientSpace,props);assert.ok(document.body.textContent.includes('Tout votre parcours'));assert.ok(document.querySelector('.observation-chart svg'));
 await click(button('Prendre rendez-vous'));assert.equal(created[0].kind,'appointments');assert.equal(created[0].id,'p1');
 await click(button('Mon dossier'));assert.equal(routes.at(-1),'my-record');
 await click(document.querySelector('.patient-event'));assert.ok(opened.length);
});
await test('patient dossier tabs show longitudinal entries, summary and sharing controls',async()=>{
 await render(app.PatientSpace,{...props,record:true});assert.ok(document.querySelector('.patient-timeline'));
 await click(button('Ma synthèse'));assert.ok(document.body.textContent.includes('Antécédents familiaux'));assert.ok(document.body.textContent.includes('Vaccinations'));
 await click(button('Mes mesures'));assert.ok(document.querySelector('.measure-table'));
 await click(button('Mes accès'));assert.ok(button('Donner mon accord'));assert.ok(document.body.textContent.includes('Historique applicatif local'));
});
await test('document reader expands and shows exact source values without invented range',async()=>{
 let exported=false;await render(app.DocumentReader,{record:app.demoExtras()[0],onExport:()=>{exported=true;}});
 await click(button('Comprendre ce document'));assert.ok(document.body.textContent.includes('observations[0]'));assert.ok(document.body.textContent.includes('12.1 g/dL'));assert.ok(document.body.textContent.includes('Intervalle non fourni'));
 await click(button('Télécharger le résumé PDF'));assert.equal(exported,true);
});
await test('campus opens a case, reveals information, grades and keeps personal progression',async()=>{
 await render(app.Learning);await click(button('Reprendre mon apprentissage'));assert.ok(document.body.textContent.includes('Votre raisonnement'));
 await click(button('Vérifier deux traits'));assert.ok(document.body.textContent.includes('La personne confirme le dossier A'));
 const groups=document.querySelectorAll('.case-question');for(const group of groups)await click(group.querySelectorAll('input')[1]);
 await click(button('Voir la correction'));assert.ok(document.body.textContent.includes('100 %'));assert.equal(attempts.length,1);
 await click(button('Mon campus'));assert.ok(document.body.textContent.includes('1 / 3'));assert.ok(document.querySelector('.learning-history'));
});
await test('Arabic navigation selects RTL and retains original measured source content',async()=>{
 localStorage.setItem('sahati-preferences',JSON.stringify({lang:'ar'}));await render(app.DocumentReader,{record:app.demoExtras()[0],onExport:()=>{}});assert.equal(document.documentElement.dir,'rtl');await click(button('فهم هذه الوثيقة'));assert.ok(document.body.textContent.includes('12.1 g/dL'));assert.ok(document.body.textContent.includes('قياس مسجل'));localStorage.clear();
});
await test('imaging schedule emits a resource reservation instead of a placeholder action',async()=>{
 let value;await render(app.ImagingSchedule,{record:{kind:'orders',category:'radiology',status:'requested'},role:'radiology',save:v=>value=v,busy:false});await click(button('Réserver 20 minutes'));assert.equal(value.action,'schedule-imaging');assert.equal(value.duration,20);
});
await test('prescription form exposes presentation, DCI, instructions and renewals',async()=>{
 const physician={...data,account:app.seedAccounts().find(a=>a.role==='doctor'),records};await render(app.RecordForm,{kind:'prescriptions',data:physician,patientId:'p1',onClose:()=>{},onSaved:()=>{}});for(const label of ['DCI (si connue)','Présentation','Renouvellements autorisés','Consignes de prise','Consultation associée'])assert.ok(document.body.textContent.includes(label),label);
});
await test('responsive rules declare narrow layouts and do not rely on a fixed patient width',async()=>{
 const css=await readFile('app/globals.css','utf8');assert.match(css,/@media\(max-width:360px\)/);assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/\.patient-home-grid,\.patient-summary-grid,\.case-workspace\{grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/\.patient-tabs\{overflow:auto/);assert.ok(!css.includes('minmax(min(100%,190px),1fr)))'));
});
await act(async()=>root.unmount());console.log(`\n${passed} DOM interaction scenarios passed. Browser layout was not tested.`);dom.window.close();
