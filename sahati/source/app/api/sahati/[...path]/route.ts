import {env} from 'cloudflare:workers';
import {handleAPI} from '@/lib/engine';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
async function dispatch(req:Request,context:Context){return handleAPI(req,(await context.params).path,env);}
export const GET=dispatch;export const POST=dispatch;export const PATCH=dispatch;
