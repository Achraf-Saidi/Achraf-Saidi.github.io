import {useEffect,useRef,useState} from 'react';
import {sinaReply,sinaMedicalGuard,type SinaContext,type SinaReply} from '@/lib/sina';
import {requestSinaAI,sinaAI,SinaAIError,type AITurn} from '@/lib/sina-ai';
import {translate,type Language} from '@/lib/i18n';
export type SinaMessage={id:number;from:'user'|'sina';text?:string;reply?:SinaReply;source:'local'|'ai'|'safety';truncated?:boolean};
export type SinaMode='local'|'ai';
const errorLabels={
 'rate-limit':'Le quota anonyme est atteint. Patientez avant de réessayer.',
 network:'La connexion à OVHcloud a échoué. Vérifiez votre connexion puis réessayez.',
 timeout:'Le service met trop de temps à répondre. Vous pouvez réessayer.',
 unavailable:'Le service gratuit n’est pas disponible pour le moment.',
 'invalid-response':'La réponse reçue n’est pas exploitable. Réessayez plus tard.',
 'invalid-input':'Écrivez un message de 1 à 1 000 caractères.'
};
export function useSinaChat(context:SinaContext|undefined,lang:Language){
 const [mode,setMode]=useState<SinaMode>('local'),[messages,setMessages]=useState<SinaMessage[]>([]),[responding,setResponding]=useState(false),[failure,setFailure]=useState<{prompt:string;error:SinaAIError}>(),[notice,setNotice]=useState(''),[cooldown,setCooldown]=useState(0),[connection,setConnection]=useState<'ready'|'success'|'unavailable'>('ready');
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),active=useRef<AbortController|undefined>(undefined),sequence=useRef(0),serial=useRef(0),history=useRef<AITurn[]>([]),deadline=useRef(0),inFlight=useRef(false);
 function cancel(){sequence.current++;clearTimeout(timer.current);active.current?.abort();active.current=undefined;inFlight.current=false;setResponding(false);}
 function clear(){cancel();history.current=[];setMessages([]);setFailure(undefined);setNotice('');setConnection('ready');}
 function changeMode(value:SinaMode){if(value===mode)return;clear();setMode(value);}
 useEffect(()=>{clear();},[context?.data.account.id,lang]);
 useEffect(()=>()=>{sequence.current++;clearTimeout(timer.current);active.current?.abort();},[]);
 useEffect(()=>{if(!cooldown)return;const tick=setInterval(()=>setCooldown(Math.max(0,Math.ceil((deadline.current-Date.now())/1000))),500);return()=>clearInterval(tick);},[cooldown>0]);
 function wait(seconds:number){deadline.current=Math.max(deadline.current,Date.now()+seconds*1000);setCooldown(Math.ceil((deadline.current-Date.now())/1000));}
 async function ask(raw:string,retry=false){
  const text=raw.trim(),medical=sinaMedicalGuard(text);if(inFlight.current||!text||mode==='ai'&&!medical&&Date.now()<deadline.current)return;
  setFailure(undefined);setNotice('');const local=mode==='local'||!!medical,source=local?(medical&&mode==='ai'?'safety':'local'):'ai';
  if(!retry)setMessages(m=>[...m.slice(-38),{id:++serial.current,from:'user',text,source}]);
  const current=++sequence.current;inFlight.current=true;setResponding(true);
  if(local){const reply=sinaReply(text,context,lang);timer.current=setTimeout(()=>{if(sequence.current!==current)return;setMessages(m=>[...m,{id:++serial.current,from:'sina',reply,source}]);setResponding(false);inFlight.current=false;},350);return;}
  const controller=new AbortController();active.current=controller;wait(sinaAI.cooldownSeconds);
  try{
   const result=await requestSinaAI(text,lang,history.current,controller.signal);if(current!==sequence.current||controller.signal.aborted)return;
   history.current=[...history.current,{role:'user',content:text},{role:'assistant',content:result.text}].slice(-8) as AITurn[];
   setMessages(m=>[...m,{id:++serial.current,from:'sina',reply:{title:translate('Réponse IA',lang),body:result.text,actions:[]},source:'ai',truncated:result.truncated}]);setConnection('success');
  }catch(e){if(current!==sequence.current||controller.signal.aborted)return;const error=e instanceof SinaAIError?e:new SinaAIError('network');if(error.code==='rate-limit')wait(error.retryAfterSeconds);setFailure({prompt:text,error});setConnection('unavailable');}
  finally{if(current===sequence.current){setResponding(false);inFlight.current=false;active.current=undefined;}}
 }
 function stop(){cancel();setNotice(translate('La réponse a été interrompue.',lang));}
 return {mode,changeMode,messages,responding,ask,clear,stop,cooldown,connection,failure,notice,errorText:failure?translate(errorLabels[failure.error.code],lang):'',retry:()=>failure&&ask(failure.prompt,true)};
}
