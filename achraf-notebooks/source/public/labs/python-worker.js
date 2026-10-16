let runtime;
self.onmessage=async({data:code})=>{let lines=[];try{
 if(!runtime){const {loadPyodide}=await import('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs');runtime=await loadPyodide({stdout:s=>lines.push(s),stderr:s=>lines.push(s)});}
 runtime.setStdout({batched:s=>lines.push(s)});runtime.setStderr({batched:s=>lines.push(s)});
 const result=await runtime.runPythonAsync(code);if(result!==undefined){lines.push(String(result));if(result?.destroy)result.destroy();}self.postMessage({output:lines.join('\n')||'✓'});
 }catch(e){self.postMessage({output:lines.join('\n')+'\n'+String(e)});}};
