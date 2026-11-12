import {randomInt,randomUUID} from "node:crypto";
import {examSpec,examPrerequisites,PILOT_SEQUENCE,PILOT_TRACK} from "./catalog.mjs";

export const DEFAULT_LOCALE="fr";
export const examDurationMs = spec => spec.durationMinutes*60000;
export function validLanguage(s){return s==="en"?"en":"fr";}
export function cleanResponse(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const keys=Object.keys(input);
 if(keys.length>100)return null;
 for(const k of keys){
  if(!/^[A-Za-z0-9_.-]{1,100}$/.test(k))return null;
  if(typeof input[k]!=="number"&&typeof input[k]!=="string")return null;
  if(typeof input[k]==="string"&&input[k].length>80)return null;
 }
 return input;
}
export function verifyQuestion(q){
 if(!q||!q.id||!q.module_id||typeof q.prompt_fr!=="string"||typeof q.prompt_en!=="string")return false;
 if(q.prompt_fr.length<40||q.prompt_en.length<40)return false;
 if(!Number.isInteger(q.difficulty)||q.difficulty<1||q.difficulty>5)return false;
 if(q.kind==="choice")return Array.isArray(q.options_fr)&&q.options_fr.length>=3&&
  Array.isArray(q.options_en)&&q.options_en.length===q.options_fr.length&&
  q.options_fr.every(x=>typeof x==="string"&&x.length>=1)&&
  q.options_en.every(x=>typeof x==="string"&&x.length>=1)&&
  Number.isInteger(q.secret_answer?.value)&&q.secret_answer.value>=0&&q.secret_answer.value<q.options_fr.length;
 if(q.kind==="number")return typeof q.secret_answer?.value==="number"&&Number.isFinite(q.secret_answer.value)&&
  typeof q.secret_answer?.absoluteTolerance==="number"&&q.secret_answer.absoluteTolerance>=0&&
  q.secret_answer.absoluteTolerance<=1&&
  (q.options_fr==null||q.options_fr.length===0);
 return false;
}
function secureShuffle(items){
 const r=[...items];
 for(let i=r.length-1;i>0;i--){
  const j=randomInt(i+1);
  [r[i],r[j]]=[r[j],r[i]];
 }
 return r;
}
function drawModule(rows,count){
 const number=secureShuffle(rows.filter(q=>q.kind==="number"));
 const choice=secureShuffle(rows.filter(q=>q.kind==="choice"));
 // One third of questions must require a computed numerical answer.
 const numericTarget=Math.ceil(count/3);
 if(number.length<numericTarget||choice.length<count-numericTarget)throw new Error("bank_insufficient");
 return secureShuffle([...number.slice(0,numericTarget),...choice.slice(0,count-numericTarget)]);
}
export function prepareExam(spec,rows,locale=DEFAULT_LOCALE){
 if(!spec||!Array.isArray(rows))throw Error("bad_exam");
 const lang=validLanguage(locale);
 const perModule=spec.kind==="final"?6:10;
 const result=[];
 for(const module of spec.modules){
  const available=rows.filter(q=>q.module_id===module && q.approved===true && q.active===true);
  if(available.length<perModule+2||!available.every(verifyQuestion))throw Error("bank_insufficient");
  if(new Set(available.map(q=>q.id)).size!==available.length)throw Error("bank_duplicate");
  if(available.filter(q=>q.difficulty>=3).length<Math.ceil(perModule/2))throw Error("bank_too_easy");
  result.push(...drawModule(available,perModule));
 }
 const list=secureShuffle(result);
 const publicQuestions=[],answerKey=[];
 for(const row of list){
  const common={id:row.id,moduleId:row.module_id,kind:row.kind,
   prompt:row["prompt_"+lang],difficulty:row.difficulty};
  if(row.kind==="choice"){
   const original=row["options_"+lang];
   const indices=secureShuffle(original.map((_,i)=>i));
   publicQuestions.push({...common,options:indices.map(i=>original[i])});
   answerKey.push({id:row.id,moduleId:row.module_id,kind:"choice",value:indices.indexOf(row.secret_answer.value),
    explanation:row["explanation_"+lang]});
  }else{
   publicQuestions.push({...common,unit:row.unit||null});
   answerKey.push({id:row.id,moduleId:row.module_id,kind:"number",value:row.secret_answer.value,
    tolerance:row.secret_answer.absoluteTolerance,explanation:row["explanation_"+lang]});
  }
 }
 return {publicQuestions,answerKey};
}
export function scoreExam(spec,key,responses){
 const input=cleanResponse(responses);
 if(!input||!Array.isArray(key)||key.length!==spec.questionCount)throw Error("invalid_submission");
 if(Object.keys(input).length!==key.length)throw Error("missing_answers");
 let correct=0;
 const byModule=Object.fromEntries(spec.modules.map(m=>[m,{correct:0,total:0}]));
 const details=[];
 for(const item of key){
  const response=input[item.id];
  if(response===undefined)throw Error("missing_answers");
  let ok=false;
  if(item.kind==="choice")ok=Number.isInteger(response)&&response===item.value;
  else if(item.kind==="number"){
   const number=typeof response==="string"&&response.trim()!==""?Number(response):response;
   ok=typeof number==="number"&&Number.isFinite(number)&&
     Math.abs(number-item.value)<=item.tolerance+1e-10;
  }
  if(ok){correct++;byModule[item.moduleId].correct++;}
  byModule[item.moduleId].total++;
  details.push({id:item.id,correct:ok,expected:item.value,explanation:item.explanation});
 }
 const score=Math.round(correct*100/key.length);
 const domainOk=spec.modules.every(m=>100*byModule[m].correct/byModule[m].total>=spec.perModuleMin);
 return {score,correct,total:key.length,passed:score>=spec.minScore&&domainOk,
  byModule,details};
}
export function nextExam(passedIds){
 const set=new Set(passedIds);
 return PILOT_SEQUENCE.find(id=>!set.has(id))||
  (!set.has(PILOT_TRACK+"-final")?PILOT_TRACK+"-final":null);
}
export function examAccess(id,passedIds){
 const spec=examSpec(id);
 if(!spec)return {status:404,error:"unknown_exam"};
 const passed=new Set(passedIds);
 const missing=examPrerequisites(id).filter(p=>!passed.has(p));
 return missing.length?{status:409,error:"prerequisites_missing",missing}:{status:200,spec};
}
export function issueCandidate(passedIds,review,submission){
 const set=new Set(passedIds);
 return PILOT_SEQUENCE.every(x=>set.has(x))&&set.has(PILOT_TRACK+"-final")&&
  !!submission&&Number.isInteger(submission.version)&&submission.version>=1&&
  !!review&&review.status==="approved"&&review.evidence_verified===true&&
  review.submission_version===submission.version&&
  Number.isInteger(review.score)&&review.score>=85&&
  typeof review.reviewed_by==="string"&&review.reviewed_by.length>0;
}
export function isUuid(s){
 return typeof s==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
export {randomUUID};
