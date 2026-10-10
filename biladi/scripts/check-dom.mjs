import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {LANGS} from '../i18n.js';
import {DESTINATIONS} from '../content.js';
const jsdom=process.env.BILADI_JSDOM_PATH?pathToFileURL(process.env.BILADI_JSDOM_PATH).href:'jsdom';
const {JSDOM,VirtualConsole}=await import(jsdom);
const root=resolve(import.meta.dirname,'..');
const errors=[];
const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(await readFile(resolve(root,'index.html'),'utf8'),{url:'https://biladi.example/',pretendToBeVisual:true,runScripts:'outside-only',virtualConsole});
const {window}=dom;
for(const key of ['document','location','localStorage','HTMLElement','HTMLDialogElement','FormData'])globalThis[key]=window[key];
globalThis.window=window;
Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
window.CSS={escape:s=>String(s).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)};globalThis.CSS=window.CSS;
window.scrollTo=()=>{};window.print=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.matchMedia=window.matchMedia;
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
const opened=[];window.open=(url)=>{opened.push(url);return null;};
let clipboard='';Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async s=>{clipboard=s;}}});
globalThis.fetch=async url=>{
 const f=resolve(root,String(url).replace(/^\.\//,''));assert.ok(f.startsWith(root+'/'));
 try{return new Response(await readFile(f),{status:200});}catch{return new Response('',{status:404});}
};
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const click=s=>{const node=typeof s==='string'?$(s):s;assert.ok(node,'Missing click target '+s);node.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));};
const change=(s,value)=>{const node=$(s);assert.ok(node,s);node.value=value;node.dispatchEvent(new window.Event('change',{bubbles:true}));};
const input=(s,value)=>{const node=$(s);assert.ok(node,s);node.value=value;node.dispatchEvent(new window.Event('input',{bubbles:true}));};
const navigate=async hash=>{location.hash=hash;await delay(15);};
const seenAssets=new Set();
let pages=0;
async function checkPage(){
 assert.ok($('#main').textContent.trim(),'Empty route '+location.hash);
 assert.equal(all('#main [data-action=reload]').length,0,'Boot error');
 const ids=all('[id]').map(n=>n.id);assert.equal(new Set(ids).size,ids.length,'Duplicate DOM id at '+location.hash);
 for(const img of all('img')){assert.ok(img.hasAttribute('alt'));const src=img.getAttribute('src');if(src.startsWith('./')&&!seenAssets.has(src)){await access(resolve(root,src));seenAssets.add(src);}}
 pages++;
}
const app=await import('../app.js');await app.bootPromise;
assert.equal($('#main h1').textContent,'Un pays.Mille ailleurs.');await checkPage();
click('.skip-link');assert.notEqual(location.hash,'#main');
click('[data-action=hero][data-index="1"]');assert.ok($('.hero-photo').src.endsWith('/assets/bejaia.webp'));
await navigate('atlas');assert.equal(all('.atlas-map path[role=button]').length,69);
const last=$('.atlas-map path[data-code="69"]');last.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
assert.ok($('#atlas-selected').textContent.includes('El Abiodh Sidi Cheikh'));
change('#wilaya-select','06');assert.ok($('#atlas-selected').textContent.includes('Béjaïa'));
input('#wilaya-search','Bejaia');assert.equal(all('#all-wilayas a').length,1);
await checkPage();
for(let code=1;code<=69;code++){await navigate('wilaya/'+String(code).padStart(2,'0'));assert.ok($('.wilaya-main-title'));assert.ok($('.wilaya-banner>img'),'Missing province photo '+code);await checkPage();}
for(const route of ['home','destinations','atlas','history','culture','food','practical','sources','notebook','directory','planner']){await navigate(route);await checkPage();}
for(const d of DESTINATIONS){await navigate('destination/'+d.id);assert.ok($('#main h1'));await checkPage();}
const editorial=JSON.parse(await readFile(resolve(root,'data/editorial.json'),'utf8'));
for(const a of [...editorial.articles,...editorial.supporting_articles,...editorial.culture_profiles]){await navigate('article/'+a.id);assert.ok($('#main h1'));await checkPage();}
// Exercise every language on the main features, including Arabic direction.
for(const lang of LANGS){change('.lang-picker',lang.id);await delay(5);assert.equal(document.documentElement.lang,lang.id);assert.equal(document.documentElement.dir,lang.id==='ar'?'rtl':'ltr');for(const route of ['home','atlas','culture','food','planner','article/cleopatra-juba-cherchell']){await navigate(route);await checkPage();}}
change('.lang-picker','fr');await delay(5);
await navigate('destinations');click('[data-action=favourite]');const favourites=JSON.parse(localStorage.getItem('biladi-favourites'));assert.ok(favourites.length===1);
await navigate('notebook');assert.equal(all('.destination-card').length,1);
await navigate('directory');assert.equal(all('.poi-card').length,30);click('[data-action=directory-more]');assert.equal(all('.poi-card').length,60);
click('[data-action=directory-filter][data-filter=airports]');assert.equal(all('.poi-card').length,30);assert.ok($('.record-count').textContent.startsWith('36 '));
click('[data-action=directory-more]');assert.equal(all('.poi-card').length,36);
click('[data-action=poi]');assert.ok($('#detail-dialog').open);assert.ok($('#detail-dialog').textContent.includes('IATA'));click('[data-action=close-detail]');assert.ok(!$('#detail-dialog').open);
await navigate('home');document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));await delay(10);assert.ok($('#search-dialog').open);
input('#global-search','Tipaza');await delay(120);assert.ok(all('.search-result').length>0);click('[data-action=close-search]');assert.ok(!$('#search-dialog').open);
await navigate('planner?preset=antiquity');assert.equal($('#trip-days').value,'10');assert.ok($('input[name=inspirations][value=italy]').checked);
await navigate('home');await navigate('planner?preset=sea');assert.equal($('#trip-days').value,'14');assert.ok($('input[name=interests][value=sea]').checked);
change('#trip-currency','USD');assert.equal($('#trip-rate').value,'');assert.ok($('#trip-rate-mode option[value=official]').disabled);assert.ok(!$('#planner-form').checkValidity());
input('#trip-rate','135');assert.ok($('#planner-form').checkValidity());
change('#trip-currency','EUR');change('#trip-rate-mode','official');assert.equal($('#trip-rate').value,'150.4130');assert.ok($('#trip-rate').readOnly);
change('#trip-rate-mode','personal');assert.equal($('#trip-rate').value,'278');
input('#trip-days','20');input('#trip-start','2026-11-01');change('#trip-style','premium');assert.equal($('#cost-room').value,'24000');
$('#planner-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await delay(20);assert.equal(all('.route-day').length,20);assert.ok($('.budget-total').textContent.includes('€'));
click('[data-action=save-trip]');assert.equal(JSON.parse(localStorage.getItem('biladi-trip')).days,20);
click('[data-action=share]');await delay(5);assert.equal(clipboard,location.href);
await navigate('notebook');assert.ok($('.saved-trip-card'));click('.saved-trip-card a');await delay(20);assert.equal(all('.route-day').length,20);
click('[data-action=edit-trip]');await delay(20);assert.ok($('#planner-form'));input('#trip-start','2027-07-01');all('input[name=interests]').forEach(n=>n.checked=n.value==='desert');$('#planner-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await delay(20);assert.ok($('.trip-note.summer'));assert.equal(all('.route-day h3').filter(n=>/Djanet|Tamanrasset|Timimoun/.test(n.textContent)).length,0);
await navigate('food');input('#food-city','Oran');$('#food-search-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.ok(opened.at(-1).includes('Oran'));
await navigate('planner?trip='+encodeURIComponent(JSON.stringify({days:7,nationality:'<img src=x>',departure:'<script>alert(1)</script>',currency:'USD',rate:135})));assert.equal(all('.route-day').length,7);assert.equal(all('#main script').length,0);await checkPage();
assert.deepEqual(errors,[],'JSDOM reported unhandled errors');
console.log(JSON.stringify({status:'passed',pagesChecked:pages,languages:LANGS.length,atlasKeyboardControls:69,localAssets:seenAssets.size,formBudgetNotebookSearch:'passed',method:'DOM simulation; no visual browser verification'},null,2));
dom.window.close();
