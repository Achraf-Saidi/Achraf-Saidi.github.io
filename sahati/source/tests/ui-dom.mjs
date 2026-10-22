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
await esbuild.build({stdin:{contents:`export {SinaProvider,useSina} from './.sites-runtime/github/components/sina';export {default as PatientCompanion} from './.sites-runtime/github/components/patient-companion';export {default as Inventory} from './.sites-runtime/github/components/inventory';export {AccessControls,PreferencesProvider} from './.sites-runtime/github/components/sahati-ui';export {default as PatientSpace} from './.sites-runtime/github/components/patient-space';export {default as Learning} from './.sites-runtime/github/components/learning';export {default as DocumentReader} from './.sites-runtime/github/components/document-reader';export {default as ImagingSchedule} from './.sites-runtime/github/components/imaging-schedule';export {default as RecordForm} from './.sites-runtime/github/components/record-form';export {seedRecords,seedAccounts} from './lib/seed';export {demoExtras} from './lib/clinical';export {clinicalCases,casePublic,gradeCase} from './lib/education';`,resolveDir:process.cwd(),loader:'tsx'},outfile:'.sites-runtime/ui-tests/shared.mjs',bundle:true,format:'esm',platform:'node',target:'node24',jsx:'automatic',packages:'external',tsconfigRaw:{compilerOptions:{baseUrl:'.sites-runtime/github',paths:{'@/*':['./*']}}},plugins:[{name:'mock-local-api',setup(build){build.onResolve({filter:/\/runtime$/},args=>({path:args.path,namespace:'api-mock'}));build.onLoad({filter:/.*/,namespace:'api-mock'},()=>({contents:'export const localApi=(...args)=>globalThis.__testApi(...args);export const resource=async()=>"blob:synthetic";export const navigate=()=>{};',loader:'js'}));}}],logLevel:'silent'});
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
await test('English and Tamaziɣt selectors persist language while Arabic sets RTL',async()=>{
 localStorage.clear();function Screen(){return React.createElement(React.Fragment,null,React.createElement(app.AccessControls),React.createElement(app.PatientSpace,props));}await render(Screen);let select=document.querySelector('.language-select select');await act(async()=>{select.value='en';select.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(document.documentElement.lang,'en');assert.ok(document.body.textContent.includes('Your entire care journey'));assert.equal(JSON.parse(localStorage.getItem('sahati-preferences')).lang,'en');await act(async()=>{select.value='kab';select.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(document.documentElement.dir,'ltr');assert.ok(document.body.textContent.includes('Abrid-ik n lɛilaj'));await act(async()=>{select.value='ar';select.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(document.documentElement.dir,'rtl');localStorage.clear();
});
await test('Sina opens, answers locally and navigates with the current account context',async()=>{
 function Fixture(){const {publish}=app.useSina();React.useEffect(()=>{publish({...props,view:'dashboard'});return()=>publish(undefined);},[publish]);return null;}function Screen(){return React.createElement(app.SinaProvider,null,React.createElement(Fixture));}await render(Screen);await click(document.querySelector('.sina-launcher'));assert.ok(document.querySelector('.sina-panel'));await click(button('Mon prochain rendez-vous'));await act(async()=>new Promise(r=>setTimeout(r,400)));assert.ok(document.querySelector('.sina-message-sina'));assert.ok(document.body.textContent.includes('Sans IA connectée'));await click([...document.querySelectorAll('.sina-answer-actions button')].find(b=>b.textContent==='Mon quotidien'));assert.equal(routes.at(-1),'daily');assert.equal(document.querySelector('.sina-panel'),null);
});
await test('personal reminder form saves through the API and completion updates the same task',async()=>{
 const previous=globalThis.__testApi;let stored={tasks:[],questions:[],journal:[],preparation:{},contact:{name:'',phone:'',relationship:'',notes:''}},version=0;globalThis.__testApi=async(path,method,body)=>{if(path!=='patient-tools')return previous(path,method,body);if(method==='PATCH'){assert.equal(body.version,version);stored=body.data;version++;}return {data:stored,version};};await render(app.PatientCompanion,props);const input=document.querySelector('.reminder-form input');await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,'Apporter mes résultats QA');input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>document.querySelector('.reminder-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(stored.tasks[0].title,'Apporter mes résultats QA');await click(document.querySelector('.personal-tasks input'));assert.equal(stored.tasks[0].done,true);globalThis.__testApi=previous;
});
await test('pharmacy reception modal submits a real inventory operation and closes on success',async()=>{
 const previous=globalThis.__testApi;let operation;const snap={products:[{id:'qa-product',title:'Article fictif',sku:'QA-UI',unit:'unités',unitPrice:10,available:5,minLevel:1,targetLevel:10}],lots:[],orders:[],movements:[],metrics:{value:50,low:0,expiring:0,blocked:0}};globalThis.__testApi=async(path,method,body)=>{if(path.startsWith('inventory')){if(method==='POST'){operation=body;return {ok:true};}return snap;}return previous(path,method,body);};await render(app.Inventory,{...props,hospital:'all',data:{...data,account:{...data.account,role:'pharmacy'}}});await click(button('Réceptionner'));assert.ok(document.querySelector('.modal-panel'));const fields=[...document.querySelectorAll('.modal-body input')];async function fill(input,value){await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}for(const input of fields){const text=input.closest('label').textContent;if(text.includes('Numéro de lot'))await fill(input,'UI-LOT');if(text.includes('Péremption'))await fill(input,'2030-01-01');if(text.includes('Bon de réception'))await fill(input,'UI-BR');}await act(async()=>document.querySelector('.modal-body form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(operation.action,'receive');assert.equal(operation.data.lot,'UI-LOT');assert.equal(operation.reference,'UI-BR');assert.ok(operation.operationId.length>=8);assert.equal(document.querySelector('.modal-panel'),null);globalThis.__testApi=previous;
});
await act(async()=>root.unmount());console.log(`\n${passed} DOM interaction scenarios passed. Layout is covered separately by browser QA, not by this DOM suite.`);dom.window.close();
