import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {simulate,METHODS} from '../engine.mjs';
function runWorker(message){
  return new Promise((resolve,reject)=>{
    const workerURL=new URL('../worker.mjs',import.meta.url).href;
    const source=[
      "const {parentPort}=await import('node:worker_threads');",
      'globalThis.self={postMessage:data=>parentPort.postMessage(data)};',
      'await import('+JSON.stringify(workerURL)+');',
      "parentPort.on('message',data=>self.onmessage({data}));",
    ].join('\n');
    const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)));
    const progress=[];
    worker.on('error',reject);
    worker.on('message',data=>{
      if(data.type==='error'){worker.terminate();reject(new Error(data.message));return;}
      if(data.type==='progress'||data.type==='audit-progress'){progress.push(data);return;}
      worker.terminate();resolve({data,progress});
    });
    worker.postMessage(message);
  });
}
test('module worker returns the same full trajectory as the pure engine',async()=>{
  const config={n:100,seed:112};
  const {data}=await runWorker({type:'simulate',config});
  assert.equal(data.type,'simulation');assert.deepEqual(data.result,simulate(config));
});
test('Monte-Carlo null/current arms, seeds, counts and completion progress are consistent',async()=>{
  const {data,progress}=await runWorker({type:'mc',config:{n:100,seed:889,eventShift:-1.5,censorRho:.6},reps:20,arm:'both'});
  assert.equal(data.type,'mc');assert.equal(data.result.results.length,2);
  assert.equal(data.result.raw.length,40);assert.equal(progress.at(-1).completed,40);
  const nullArm=data.result.results[0];assert.equal(nullArm.rho,0);assert.equal(nullArm.isAlternative,false);
  assert.equal(data.result.results[1].isAlternative,true);
  const nullRows=data.result.raw.filter(r=>r.arm==='null');
  assert.equal(new Set(nullRows.map(r=>r.seed)).size,20);
  for(const arm of data.result.results)for(const k of METHODS){
    const raw=data.result.raw.filter(r=>r.arm===arm.arm);
    assert.equal(arm.methods[k].hits,raw.filter(r=>r[k]!==null).length);
    assert.equal(arm.methods[k].rate,arm.methods[k].hits/20);
  }
});
test('audit Worker runs the 13 remedies and returns all completed paired replications',async()=>{
  const {data,progress}=await runWorker({type:'audit',options:{reps:2,scenarios:['homogeneous'],settings:{n:100}}});
  assert.equal(data.type,'audit');
  assert.equal(data.result.results.length,1);assert.equal(data.result.raw.length,2);
  assert.equal(Object.keys(data.result.results[0].methods).length,13);
  assert.equal(progress.at(-1).completed,2);
});

