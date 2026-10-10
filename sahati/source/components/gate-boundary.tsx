import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {session} from '@/lib/engine';
import Gate from './gate';
export default async function GateBoundary({children}:{children:React.ReactNode}){const h=await headers();if(!env.DB)return <Gate/>;let unlocked=false;try{unlocked=!!await session(env.DB,new Request('https://sahati.internal',{headers:{cookie:h.get('cookie')||''}}),'gate');}catch{}return unlocked?children:<Gate/>;}
