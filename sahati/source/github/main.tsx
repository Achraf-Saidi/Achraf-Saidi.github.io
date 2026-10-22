import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PreferencesProvider,CreatorCredit,Icon,Modal,download,usePrefs} from '../components/sahati-ui';
import {SinaProvider} from '../components/sina';
import Gate from '../components/gate';
import Landing from '../components/landing';
import Login from '../components/login';
import Workspace from '../components/workspace';
import Verification from '../components/verification';
import {localApi,navigate,backup,restore} from './runtime';
import './styles.css';
function StorageTools() {
 const {t}=usePrefs();
  const [show,setShow]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[file,setFile]=useState<File|null>(null);
  async function save() {setBusy(true);setError('');try{download(await backup(),'sahati-sauvegarde-'+new Date().toISOString().slice(0,10)+'.json');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function importFile() {if(!file)return;setBusy(true);setError('');try{await restore(await file.text());}catch(e){setError('Restauration impossible : vérifiez le fichier et vos deux codes privés.');setBusy(false);}}
  return <><button className="local-storage-button no-print" onClick={()=>setShow(true)} aria-label={t('Sauvegarde et stockage local')}><Icon name="Database" size={17}/><span>{t('Mes sauvegardes')}</span></button>{show&&<Modal title={t('Vos données sur cet appareil')} onClose={()=>setShow(false)}><p>{t('Cette version utilise une base locale chiffrée. Les modifications et pièces jointes restent dans ce navigateur, sans synchronisation entre appareils.','تستخدم هذه النسخة قاعدة محلية مشفرة. تبقى التغييرات والمرفقات في هذا المتصفح دون مزامنة بين الأجهزة.','This version uses an encrypted local database. Changes and attachments stay in this browser, without device synchronisation.','Lqem-a yesqdec taffa tadigant yettwawgel. Ibeddilen d yisemliyen qqimen deg yiminig-a, ulac amtawi gar wallalen.')}</p><p>{t('Utilisez des données fictives pour explorer les métiers.','استخدم بيانات تجريبية لاستكشاف الأدوار.','Use synthetic data to explore the roles.','Seqdec isefka n tmeskant i wakken ad tissineḍ imahilen.')}</p><button className="button button-dark button-full" disabled={busy} onClick={save}><Icon name="Download" size={18}/>{t('Exporter une sauvegarde chiffrée')}</button><p className="help-text">{t('Conservez le fichier et vos deux codes privés. Effacer les données du navigateur efface aussi les dossiers locaux.','احتفظ بالملف ورمزيك الخاصين. حذف بيانات المتصفح يحذف الملفات المحلية أيضًا.','Keep the file and both private codes. Clearing browser data also removes local records.','Ḥrez afaylu d snat n tengalin-ik tufrin. Tukksa n yisefka n yiminig tekkes daɣen ikaramen idiganen.')}</p><hr/><label>{t('Restaurer une sauvegarde')}<input type="file" accept="application/json,.json" onChange={e=>{setFile(e.target.files?.[0]||null);setError('');}}/></label>{file&&<><div className="notice notice-warning"><Icon name="AlertTriangle" size={18}/><p>{t('La restauration remplacera les données présentes sur cet appareil et verrouillera SAHATI. Exportez d’abord votre sauvegarde actuelle.','الاستعادة تستبدل بيانات هذا الجهاز وتقفل صحتي. صدّر نسختك الحالية أولًا.','Restoring replaces the data on this device and locks SAHATI. Export your current backup first.','Arra ad ibeddel isefka deg wallal-a, ad isekker SAHATI. Suffeɣ aḥraz-ik atrar send-is.')}</p></div><button className="button button-dark" disabled={busy||file.size>50000000} onClick={importFile}>{t('Remplacer les données avec ce fichier')}</button></>}{error&&<p className="form-error" role="alert">{error}</p>}</Modal>}</>;
}
function App() {
  const [gate,setGate]=useState(false),[route,setRoute]=useState(location.pathname),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    async function update() {setRoute(location.pathname);try{const s:any=await localApi('status');setGate(s.gate);setError('');}catch(e){setError((e as Error).message);setGate(false);}finally{setLoading(false);}}
    function click(e:MouseEvent) {const a=(e.target as Element)?.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.hasAttribute('download')||a.target==='_blank')return;const href=a.getAttribute('href')||'';if(href.startsWith('#'))return;const url=new URL(a.href,location.href);if(url.origin===location.origin&&url.pathname.startsWith('/sahati/')&&!url.pathname.includes('/assets/')){e.preventDefault();navigate(url.pathname+url.search+url.hash);}}
    window.addEventListener('sahati-route',update);window.addEventListener('sahati-unlocked',update);window.addEventListener('popstate',update);document.addEventListener('click',click);
    void update();const timer=setInterval(update,60000);
    return()=>{clearInterval(timer);window.removeEventListener('sahati-route',update);window.removeEventListener('sahati-unlocked',update);window.removeEventListener('popstate',update);document.removeEventListener('click',click);};
  },[]);
  let content:React.ReactNode;
  if(!gate)content=<Gate/>;
  else if(route.includes('/connexion'))content=<Login/>;
  else if(route.includes('/espace'))content=<Workspace/>;
  else if(route.includes('/verifier'))content=<Verification/>;
  else content=<Landing/>;
  return <>{error&&<p className="form-error global-error" role="alert">{error}</p>}{loading?<p role="status">Ouverture de SAHATI…</p>:content}{gate&&/\/(connexion|espace|verifier)/.test(route)&&<footer className={`site-credit no-print ${route.includes('/espace')?'site-credit-workspace':''}`}><CreatorCredit/></footer>}{gate&&<StorageTools/>}</>;
}
createRoot(document.getElementById('root')!).render(<PreferencesProvider><SinaProvider><App/></SinaProvider></PreferencesProvider>);
