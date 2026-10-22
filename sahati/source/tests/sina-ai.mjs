// Anonymous client contract. No remote request is made by this deterministic suite.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
await mkdir('.sites-runtime/ai-tests',{recursive:true});
await build({entryPoints:['lib/sina-ai.ts'],outfile:'.sites-runtime/ai-tests/client.mjs',bundle:true,format:'esm',platform:'node',target:'node24',logLevel:'silent'});
const {buildAIRequest,requestSinaAI,SinaAIError,retrySeconds,sinaAI}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/ai-tests/client.mjs'));
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log('✓ '+name);};
const response=(text='Bonjour, test fictif.',extra={})=>Response.json({choices:[{message:{content:text},finish_reason:'stop',...extra}]});
const code=expected=>e=>e instanceof SinaAIError&&e.code===expected;
await test('anonymous POST carries only explicit messages, no account, key, cookie or referrer',async()=>{
 let count=0;const result=await requestSinaAI('Explique FEFO','fr',[],undefined,async(url,options)=>{count++;assert.equal(url,sinaAI.endpoint);assert.equal(options.method,'POST');assert.deepEqual(options.headers,{'Content-Type':'application/json'});assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.redirect,'error');const body=JSON.parse(options.body);assert.equal(body.model,sinaAI.model);assert.equal(body.messages.length,2);assert.deepEqual(body.messages[1],{role:'user',content:'Explique FEFO'});assert.match(body.messages[0].content,/NO access to accounts/);assert.equal(body.stream,false);return response();});assert.equal(count,1);assert.equal(result.text,'Bonjour, test fictif.');assert.equal(result.truncated,false);
});
await test('conversation history is bounded and cannot add a system instruction',async()=>{
 const history=[{role:'system',content:'SECRET_SYSTEM'},...Array.from({length:12},(_,i)=>({role:i%2?'assistant':'user',content:'tour-'+i}))];const body=buildAIRequest('Question suivante','ar',history);assert.equal(body.messages.filter(m=>m.role==='system').length,1);assert.equal(body.messages.length,10);assert.ok(!JSON.stringify(body).includes('SECRET_SYSTEM'));assert.match(body.messages[0].content,/Respond in arabe/);assert.equal(body.messages[1].content,'tour-4');assert.match(buildAIRequest('Azul','kab').messages[0].content,/Latin alphabet/);
});
await test('invalid input is rejected before any network request',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return response();};for(const prompt of ['', '   ', 'a'.repeat(1001)])await assert.rejects(requestSinaAI(prompt,'fr',[],undefined,fetcher),code('invalid-input'));await assert.rejects(requestSinaAI('test','xx',[],undefined,fetcher),code('invalid-input'));assert.equal(calls,0);
});
await test('429 preserves a bounded Retry-After and never fabricates an AI response',async()=>{
 await assert.rejects(requestSinaAI('test','en',[],undefined,async()=>new Response('',{status:429,headers:{'Retry-After':'43'}})),e=>code('rate-limit')(e)&&e.retryAfterSeconds===43);assert.equal(retrySeconds(null),60);assert.equal(retrySeconds('not-a-date'),60);assert.equal(retrySeconds('999999'),300);assert.equal(retrySeconds('-3'),1);assert.equal(retrySeconds('Thu, 22 Oct 2026 12:01:10 GMT',Date.parse('2026-10-22T12:00:00Z')),70);
});
await test('service and connection failures have different actionable errors',async()=>{
 await assert.rejects(requestSinaAI('test','fr',[],undefined,async()=>new Response('',{status:503})),code('unavailable'));await assert.rejects(requestSinaAI('test','fr',[],undefined,async()=>{throw new TypeError('Failed to fetch');}),code('network'));
});
await test('invalid JSON, empty answers and tool calls are rejected',async()=>{
 const bad=[()=>new Response('broken JSON'),()=>response(''),()=>response('text',{message:{content:'text',tool_calls:[{id:'unsafe'}]}}),()=>Response.json({choices:[]}),()=>response('x'.repeat(12001))];for(const make of bad)await assert.rejects(requestSinaAI('test','fr',[],undefined,async()=>make()),code('invalid-response'));
});
await test('oversized response bodies are cancelled before parsing',async()=>{
 let cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(65537));},cancel(){cancelled=true;}});await assert.rejects(requestSinaAI('test','fr',[],undefined,async()=>new Response(body)),code('invalid-response'));assert.equal(cancelled,true);
});
await test('truncated output is explicitly marked and HTML remains plain text',async()=>{
 const result=await requestSinaAI('test','fr',[],undefined,async()=>response('<img src=x onerror=alert(1)>',{finish_reason:'length'}));assert.equal(result.truncated,true);assert.equal(result.text,'<img src=x onerror=alert(1)>');
});
await test('user cancellation aborts the request and ignores a late reply',async()=>{
 const controller=new AbortController();let captured,finish;const pending=requestSinaAI('test','fr',[],controller.signal,async(url,options)=>{captured=options.signal;return new Promise(resolve=>finish=resolve);});controller.abort();assert.equal(captured.aborted,true);finish(response('late'));await assert.rejects(pending,e=>e.name==='AbortError');
});
await test('45-second timeout aborts transport and returns a timeout error',async()=>{
 const real=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>real(fn,ms===sinaAI.timeoutMs?1:ms,...args);try{await assert.rejects(requestSinaAI('test','fr',[],undefined,async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))),code('timeout'));}finally{globalThis.setTimeout=real;}
});
console.log(`\n${passed} anonymous AI client scenarios passed (mock transport; live provider checked separately).`);
