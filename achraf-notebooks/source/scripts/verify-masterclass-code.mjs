// Run the authored Python snippets in subprocesses rather than trusting prose assertions.
// GitHub CI installs projects/requirements.txt before invoking this script.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {execFileSync} from "node:child_process";
const scripts=[17,18,19,20,21,22,23];
const env={};env.window=env;vm.createContext(env);
for(const n of scripts){
 const file=path.resolve("public/academy/fr/content-"+n+".js");
 vm.runInContext(fs.readFileSync(file,"utf8"),env,{timeout:2000,filename:file});
}
const lessons=env.ACHRAF_DEEP.fr;
for(const id of ["G4","I2","D3","D9","B1","F2","H2"]){
 const code=lessons[id]?.code;
 if(typeof code!=="string"||code.length<700)throw Error("Missing code "+id);
 try{
  const output=execFileSync("python",["-c",code],{encoding:"utf8",timeout:40000,
   env:{...process.env,OPENBLAS_NUM_THREADS:"1",OMP_NUM_THREADS:"1",MKL_NUM_THREADS:"1"}});
  console.log("PASS "+id+" "+output.trim().replaceAll("\n"," | "));
 }catch(error){
  console.error("FAIL "+id+" "+(error.stderr?.toString()||error.message));
  process.exitCode=1;
 }
}
