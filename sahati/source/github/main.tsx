import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PreferencesProvider,Icon,Modal,download} from '../components/sahati-ui';
import Gate from '../components/gate';
import Landing from '../components/landing';
import Login from '../components/login';
import Workspace from '../components/workspace';
import Verification from '../components/verification';
import {localApi,navigate,backup,restore} from './runtime';
import './styles.css';
function StorageTools() {
  const [show,setShow]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[file,setFile]=useState<File|null>(null);
  async function save() {setBusy(true);setError('');try{download(await backup(),'sahati-sauvegarde-'+new Date().toISOString().slice(0,10)+'.json');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function importFile() {if(!file)return;setBusy(true);setError('');try{await restore(await file.text());}catch(e){setError('Restauration impossible : vérifiez le fichier et son mot de passe.');setBusy(false);}}
  return <><button className="local-storage-button no-print" onClick={()=>setShow(true)} aria-label="Sauvegarde et stockage local"><Icon name="Database" size={17}/><span>Mes sauvegardes</span></button>{show&&<Modal title="Vos données sur cet appareil" onClose={()=>setShow(false)}><p>Cette version GitHub utilise une base locale chiffrée. Les modifications et pièces jointes restent dans ce navigateur ; elles ne sont pas partagées automatiquement entre appareils.</p><p>Les comptes et permissions servent à explorer les métiers avec des données fictives. N’y saisissez pas de dossiers médicaux réels.</p><button className="button button-dark button-full" disabled={busy} onClick={save}><Icon name="Download" size={18}/>Exporter une sauvegarde chiffrée</button><p className="help-text">Conservez le fichier et votre mot de passe privé. Effacer les données du navigateur efface aussi les dossiers locaux.</p><hr/><label>Restaurer une sauvegarde<input type="file" accept="application/json,.json" onChange={e=>{setFile(e.target.files?.[0]||null);setError('');}}/></label>{file&&<><div className="notice notice-warning"><Icon name="AlertTriangle" size={18}/><p>La restauration remplacera les données présentes sur cet appareil et verrouillera SAHATI. Exportez d’abord votre sauvegarde actuelle.</p></div><button className="button button-dark" disabled={busy||file.size>50000000} onClick={importFile}>Remplacer les données avec ce fichier</button></>}{error&&<p className="form-error" role="alert">{error}</p>}</Modal>}</>;
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
  return <>{error&&<p className="form-error global-error" role="alert">{error}</p>}{loading?<p role="status">Ouverture de SAHATI…</p>:content}<footer className={`site-credit no-print ${gate&&route.includes('/espace')?'site-credit-workspace':''}`}><span dir="ltr">By Achraf Saidi, Ryan Aouf &amp; 21 others</span></footer>{gate&&<StorageTools/>}</>;
}
createRoot(document.getElementById('root')!).render(<PreferencesProvider><App/></PreferencesProvider>);
