import {readFile,writeFile,mkdir,rm,cp,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),esbuild=require(createRequire(require.resolve('drizzle-kit')).resolve('esbuild'));
const root=process.cwd(),temp=path.join(root,'.sites-runtime/github'),out=path.join(root,'dist/github');
await rm(temp,{recursive:true,force:true});await rm(out,{recursive:true,force:true});await mkdir(temp,{recursive:true});await mkdir(out,{recursive:true});
for(const file of ['main.tsx','runtime.ts','vault.ts','sqlite.ts']) {
 let text=await readFile(path.join(root,'github',file),'utf8');text=text.replaceAll("from '../components/","from './components/").replaceAll("from '../lib/","from './lib/");await writeFile(path.join(temp,file),text);
}
await cp('lib',temp+'/lib',{recursive:true});await cp('components',temp+'/components',{recursive:true});
for(const file of ['gate','landing','login','workspace','sahati-ui','record-detail','views','record-form','patient-editor','verification']) {
 const target=temp+'/components/'+file+'.tsx';let text=await readFile(target,'utf8');
 text=text.replace(/(["'])\/brand\//g,'$1/sahati/brand/').replace(/(["'])\/connexion/g,'$1/sahati/connexion/').replace(/(["'])\/espace/g,'$1/sahati/espace/').replace(/(["'])\/verifier/g,'$1/sahati/verifier/').replace(/href="\/"/g,'href="/sahati/"');
 text=text.replace("window.location.reload();","goTo(location.pathname+location.search);").replace("location.href='/sahati/espace/';","goTo('/sahati/espace/');").replace("location.href='/sahati/connexion/';","goTo('/sahati/connexion/');").replace("location.href=lock?'/':'/sahati/connexion/';","goTo(lock?'/sahati/':'/sahati/connexion/');");
 text=text.replace('Accès vérifié par le serveur','Accès local chiffré').replace('التحقق من الوصول على الخادم','دخول محلي مشفر').replace('Droits distincts. Accès serveur. Données fictives.','14 métiers. Stockage local chiffré. Données fictives.').replace('Stockage serveur','Stockage local · sans synchronisation').replace('حفظ على الخادم','حفظ محلي · بدون مزامنة').replace('Connexion au serveur interrompue','Accès aux données locales interrompu').replace('انقطع الاتصال بالخادم','تعذر الوصول إلى البيانات المحلية');
 text=text.replace('Aucun dossier réel. Connexions hospitalières à déployer et valider.','Données fictives enregistrées sur cet appareil. Les connexions hospitalières nécessitent un serveur.')
  .replace('Enregistré sur le serveur · droits vérifiés pour chaque action.','Enregistré localement · permissions métier de démonstration.')
  .replace('Stockage serveur D1, pièces jointes R2, contrôles de rôle et de périmètre.','Base SQLite et pièces jointes chiffrées sur cet appareil. Les permissions locales simulent les rôles ; un serveur reste nécessaire pour un usage partagé et des données réelles.')
  .replace('Parcours de démonstration reliés, rôles vérifiés côté serveur, base persistante, QR protégé, impressions, fichiers, audit et autorisations de recherche.','Parcours fictifs reliés, permissions métier locales, base chiffrée, QR vérifiable sur cet appareil, impressions, fichiers, audit et autorisations de recherche simulées.');
 if(file==='sahati-ui') {const from=text.indexOf('export async function api('),to=text.indexOf('\nexport function Empty',from);text=text.slice(0,from)+'export const api=localApi;'+text.slice(to);text="import {localApi} from '../runtime';\n"+text;}
 if(['gate','landing','login','workspace'].includes(file))text="import {navigate as goTo} from '../runtime';\n"+text;
 if(file==='landing')text=text.replace(/location\.href='\/'/g,"goTo('/sahati/')");
 if(file==='record-detail') {
  text=text.replace("import {useState}","import {useState,useEffect}");
  text="import {resource} from '../runtime';\n"+text;
  text=text.replace("src={'/api/sahati/qr/'+e.id}","src={qrURL}").replace("Vérification protégée","Vérification sur cet appareil");
  text=text.replace('target="_blank" rel="noreferrer"','');
  text=text.replace("href={'/api/sahati/files/'+f.id}","href=\"#\" onClick={async ev=>{ev.preventDefault();try{const url=await resource('files/'+f.id);const link=document.createElement('a');link.href=url;link.download=f.file_name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(err){setError((err as Error).message);}}}");
  const pos=text.indexOf('\n async function action');
  text=text.slice(0,pos)+"\n const [qrURL,setQrURL]=useState('');useEffect(()=>{if(e.kind!=='prescriptions')return;let active=true,url='';resource('qr/'+e.id).then(value=>{url=value;if(active)setQrURL(value);else URL.revokeObjectURL(value);}).catch(err=>{if(active)setError(err.message);});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[e.id,e.version]);"+text.slice(pos);
 }
 await writeFile(target,text);
}
let engine=await readFile(temp+'/lib/engine.ts','utf8');engine=engine.replace("origin+'/verifier?reference='","origin+'/sahati/verifier/?reference='");await writeFile(temp+'/lib/engine.ts',engine);
const sql=[];for(const file of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())sql.push(await readFile('drizzle/'+file,'utf8'));
await writeFile(temp+'/schema.ts','export const schema='+JSON.stringify(sql.join('\n'))+';');
let css=await readFile('app/globals.css','utf8');css=css.replaceAll('/fonts/','/sahati/fonts/');
css+='\n.local-storage-button{position:fixed;bottom:24px;right:24px;z-index:35;display:flex;align-items:center;gap:8px;padding:12px 16px;background:#174f43;color:white;border:1px solid #fff8;border-radius:999px;box-shadow:0 5px 20px #123b3520;font-size:12px;cursor:pointer}.global-error{padding:12px;text-align:center}@media(max-width:760px){.local-storage-button{bottom:83px;right:12px;padding:12px}.local-storage-button span{display:none}}@media print{.local-storage-button{display:none}}';
await writeFile(temp+'/styles.css',css);
await esbuild.build({entryPoints:[temp+'/main.tsx'],outdir:out+'/assets',entryNames:'sahati-[hash]',bundle:true,format:'esm',platform:'browser',target:['es2022'],jsx:'automatic',minify:true,external:['/sahati/*'],tsconfigRaw:{compilerOptions:{baseUrl:temp,paths:{'@/*':['./*']}}},metafile:true,logLevel:'info'});
const assets=await readdir(out+'/assets'),js=assets.find(x=>x.endsWith('.js')),style=assets.find(x=>x.endsWith('.css'));
await cp('public/brand',out+'/brand',{recursive:true});await cp('public/fonts',out+'/fonts',{recursive:true});await mkdir(out+'/vendor');
await cp('node_modules/sql.js/dist/sql-wasm-browser.js',out+'/vendor/sql-wasm-browser.js');await cp('node_modules/sql.js/dist/sql-wasm-browser.wasm',out+'/vendor/sql-wasm-browser.wasm');await cp('node_modules/sql.js/LICENSE',out+'/vendor/SQLJS-LICENSE.txt');
await cp('github/vault-bootstrap.json',out+'/vault-bootstrap.json');
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#174f43"><title>SAHATI — Le soin, relié.</title><meta name="description" content="SAHATI, plateforme hospitalière de démonstration. 14 métiers, une expérience reliée. Données fictives et stockage local chiffré."><link rel="icon" href="/sahati/brand/logo.png"><link rel="stylesheet" href="/sahati/assets/${style}"><script defer src="/sahati/vendor/sql-wasm-browser.js"></script><script type="module" src="/sahati/assets/${js}"></script></head><body><div id="root"><div class="workspace-loading"><img src="/sahati/brand/logo.png" width="64" alt="SAHATI"><h1>SAHATI</h1><p role="status">Ouverture de votre espace…</p></div></div><noscript>Activez JavaScript pour ouvrir votre espace SAHATI.</noscript></body></html>`;
await writeFile(out+'/index.html',html);for(const page of ['connexion','espace','verifier']){await mkdir(out+'/'+page);await writeFile(out+'/'+page+'/index.html',html);}
await writeFile(out+'/.nojekyll','');
console.log('SAHATI GitHub build ready: '+out);
