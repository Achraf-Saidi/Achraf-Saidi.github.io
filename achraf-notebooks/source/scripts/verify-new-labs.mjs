import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const root = path.resolve('public/academy/fr');
const env = {};env.window=env;vm.createContext(env);
for(const fileName of fs.readdirSync(root).filter(f=>/^content-\d+\.js$/.test(f)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]))){
  const file=fs.readFileSync(path.join(root,fileName),'utf8');
  vm.runInContext(file,env,{timeout:3000,filename:fileName});
}
const ids=JSON.parse(fs.readFileSync('curriculum/academy-new-labs.json','utf8')).moduleIds;
let failed=0;
for(const id of ids){
  const lesson=env.ACHRAF_DEEP.fr[id];
  assert.ok(lesson, 'Missing lesson '+id);
  const result=spawnSync(process.env.PYTHON||'python',['-c',lesson.code],{
    encoding:'utf8',timeout:40000,maxBuffer:1024*1024,env:{...process.env,PYTHONHASHSEED:'0'}
  });
  if(result.status!==0){
    failed++;
    console.error('[FAIL]',id,'exit=',result.status,'error=',result.error?.message||'',
      '\\n'+(result.stderr||'').slice(-3000));
  }else{
    console.log('[PASS]',id,(result.stdout||'').trim().split('\\n').slice(-1)[0]);
  }
}
if(failed){console.error(failed+' Python labs failed');process.exitCode=1;}
else console.log(ids.length+' Python labs completed successfully');
