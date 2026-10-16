let runtime,shelter;
self.onmessage=async({data:code})=>{try{
 if(!runtime){const {WebR}=await import('https://webr.r-wasm.org/v0.4.4/webr.mjs');runtime=new WebR();await runtime.init();shelter=await new runtime.Shelter();}
 const result=await shelter.captureR(code,{withAutoprint:true,captureStreams:true,captureConditions:true});self.postMessage({output:result.output.map(x=>typeof x.data==='string'?x.data:JSON.stringify(x.data)).join('\n')||'✓'});await shelter.purge();
}catch(e){self.postMessage({output:String(e)});}};
