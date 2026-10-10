'use client';
import {useState} from 'react';
import {AccessControls,Brand,CreatorCredit,Icon,api,usePrefs} from './sahati-ui';
export default function Gate(){
 const {t}=usePrefs();
 const [step,setStep]=useState(1),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function enter(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
   const result=await api(step===1?'gate':'gate-confirm','POST',step===1?{password}:{secondPassword:password});
   setPassword('');setVisible(false);
   if(result.requiresSecondCode){setStep(2);setBusy(false);return;}
   window.location.reload();
  }catch(err){setError((err as Error).message);setBusy(false);}
 }
 async function back(){setBusy(true);setError('');try{await api('gate-reset','POST');setStep(1);setPassword('');setVisible(false);}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 return <div className="gate-page">
  <header className="site-header"><Brand/><AccessControls/></header>
  <main className="gate-main">
   <div className="gate-ornament" aria-hidden="true"><span/><span/><span/></div>
   <div className="gate-card">
    <span className="eyebrow"><i/>{step===1?t('ACCÈS PRIVÉ · SAHATI','دخول خاص · صحتي'):t('ACCÈS DIRECTION · SAHATI','دخول الإدارة · صحتي')}</span>
    <div className="gate-lock"><Icon name={step===1?'LockKeyhole':'ShieldCheck'} size={29}/></div>
    <h1>{step===1?<>{t('Un espace','مساحة')}<br/><em>{t('de confiance.','ثقة.')}</em></>:<>{t('Accès','دخول')}<br/><em>{t('direction.','الإدارة.')}</em></>}</h1>
    <p>{step===1?t('La plateforme SAHATI est en accès privé. Entrez votre premier code pour poursuivre.','منصة صحتي خاصة. أدخل الرمز الأول للمتابعة.'):t('Premier code validé. Saisissez maintenant le code spécial de la direction pour ouvrir SAHATI.','تم التحقق من الرمز الأول. أدخل الآن الرمز الخاص بالإدارة لفتح صحتي.')}</p>
    <div className="access-steps" aria-label={t('Connexion en deux étapes','دخول على مرحلتين')}><span className={step===1?'current':'complete'} aria-current={step===1?'step':undefined}><i>{step===2?<Icon name="Check" size={13}/>:1}</i>{t('Accès privé','دخول خاص')}</span><b aria-hidden="true"/><span className={step===2?'current':''} aria-current={step===2?'step':undefined}><i>2</i>{t('Direction','الإدارة')}</span></div>
    <form onSubmit={enter}>
     <label htmlFor="private-password">{step===1?t('Premier code d’accès','رمز الدخول الأول'):t('Code spécial de la direction','الرمز الخاص بالإدارة')}</label>
     <div className="password-field"><input key={step} id="private-password" type={visible?'text':'password'} inputMode="numeric" autoComplete="off" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" maxLength={256} autoFocus={step===2}/><button type="button" className="icon-button" aria-label={visible?t('Masquer le code','إخفاء الرمز'):t('Afficher le code','إظهار الرمز')} onClick={()=>setVisible(!visible)}><Icon name={visible?'EyeOff':'Eye'} size={19}/></button></div>
     {error&&<p className="form-error" role="alert">{error}</p>}
     <button className="button button-dark button-full" disabled={busy}>{busy?t('Vérification…','جارٍ التحقق…'):step===1?t('Continuer','متابعة'):t('Entrer dans SAHATI','الدخول إلى صحتي')}<Icon name="ArrowRight" size={18}/></button>
    </form>
    {step===2&&<button className="gate-back text-link" disabled={busy} onClick={back}><Icon name="ArrowLeft" size={15}/>{t('Revenir à la première étape','العودة إلى المرحلة الأولى')}</button>}
    <div className="gate-foot"><Icon name="ShieldCheck" size={16}/>{t('Deux codes pour protéger votre accès','رمزان لحماية الدخول')}</div>
   </div>
  </main>
  <footer className="gate-footer"><div className="gate-footer-meta"><span>SAHATI · صحتي</span><span>{t('Pensé pour les soins en Algérie.','مصممة للرعاية في الجزائر.')}</span></div><CreatorCredit/></footer>
 </div>;
}
