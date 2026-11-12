import test from "node:test";
import assert from "node:assert/strict";
import {examSpec,examPrerequisites,SPECIALIZATIONS,PILOT_SEQUENCE,serializeCatalog} from "../src/learning/catalog.mjs";
import {prepareExam,scoreExam,examAccess,issueCandidate,cleanResponse,isUuid} from "../src/learning/assessment.mjs";

function fakeBank(){
 const rows=[];
 for(const module of PILOT_SEQUENCE){
  for(let i=0;i<12;i++){
   rows.push({id:module+".choice."+i,module_id:module,kind:"choice",
    prompt_fr:"Quelle explication est correcte pour cet exemple théorique numéro "+i+" ?",
    prompt_en:"Which interpretation is correct for this theoretical example number "+i+" ?",
    options_fr:["une définition","la bonne définition","un distracteur"],
    options_en:["a definition","the correct definition","a distractor"],
    secret_answer:{value:1},explanation_fr:"La deuxième proposition est vraie.",
    explanation_en:"The second option is true.",
    difficulty:i<7?3:2,approved:true,active:true});
  }
  for(let i=0;i<4;i++){
   rows.push({id:module+".numeric."+i,module_id:module,kind:"number",
    prompt_fr:"Calculer la quantité du paramètre numérique pour ce problème numéro "+i+".",
    prompt_en:"Compute the numeric quantity for this estimation problem number "+i+".",
    options_fr:null,options_en:null,secret_answer:{value:42+i,absoluteTolerance:.001},
    explanation_fr:"Le résultat numérique suit le calcul indiqué.",
    explanation_en:"The numeric result follows from the stated formula.",
    difficulty:4,approved:true,active:true});
  }
 }
 return rows;
}
const bank=fakeBank();
test("seven coherent specializations cover their prerequisite roadmaps",()=>{
 assert.equal(SPECIALIZATIONS.length,7);
 assert.equal(new Set(SPECIALIZATIONS.map(s=>s.id)).size,7);
 assert.ok(SPECIALIZATIONS.every(s=>s.modules.length>=4));
 const publicCatalog=serializeCatalog("en");
 assert.equal(publicCatalog.specializations.length,7);
 assert.ok(publicCatalog.specializations.every(s=>s.title&&s.moduleTitles.length===s.modules.length));
 assert.equal(examSpec("statistical-inference-final").questionCount,24);
});
test("a module exam randomizes options and never reveals keys before submission",()=>{
 const spec=examSpec("D3");
 const p=prepareExam(spec,bank,"fr");
 assert.equal(p.publicQuestions.length,10);
 assert.equal(p.answerKey.length,10);
 assert.equal(p.publicQuestions.filter(q=>q.kind==="number").length,4);
 assert.ok(p.publicQuestions.every(q=>!("correct" in q)&&!("answer" in q)&&!("explanation" in q)));
 assert.ok(!JSON.stringify(p.publicQuestions).includes("secret_answer"));
 const responses=Object.fromEntries(p.answerKey.map(q=>[q.id,q.value]));
 const result=scoreExam(spec,p.answerKey,responses);
 assert.equal(result.score,100);
 assert.equal(result.passed,true);
 assert.equal(result.correct,10);
 const failures={...responses};
 for(const item of p.answerKey.slice(0,3))failures[item.id]=item.kind==="number"?1000:(item.value+1)%3;
 const fail=scoreExam(spec,p.answerKey,failures);
 assert.equal(fail.passed,false);
 assert.ok(fail.score<=70);
});
test("final exam tests all domains with independent quotas and a domain floor",()=>{
 const spec=examSpec("statistical-inference-final");
 const paper=prepareExam(spec,bank,"en");
 assert.equal(paper.publicQuestions.length,24);
 const distribution=Object.fromEntries(PILOT_SEQUENCE.map(m=>[m,paper.publicQuestions.filter(q=>q.moduleId===m).length]));
 assert.deepEqual(distribution,{D3:6,D6:6,D9:6,D13:6});
 const responses=Object.fromEntries(paper.answerKey.map(q=>[q.id,q.value]));
 assert.equal(scoreExam(spec,paper.answerKey,responses).passed,true);
 for(const q of paper.answerKey.filter(q=>q.moduleId==="D3").slice(0,4)){
  responses[q.id]=q.kind==="number"?100000:(q.value+1)%3;
 }
 const result=scoreExam(spec,paper.answerKey,responses);
 assert.equal(result.score,83);
 assert.equal(result.passed,false);
});
test("question banks must be independently reviewed, numerically rich and difficult",()=>{
 const spec=examSpec("D6");
 assert.throws(()=>prepareExam(spec,bank.filter(x=>x.module_id!=="D6"),"fr"),/bank_insufficient/);
 assert.throws(()=>prepareExam(spec,bank.map(x=>({...x,approved:false})),"en"),/bank_insufficient/);
 assert.throws(()=>prepareExam(spec,bank.filter(x=>x.kind==="choice"),"fr"),/bank_insufficient/);
});
test("responses are bounded and prerequisites gate exam access",()=>{
 assert.equal(examAccess("D3",[]).status,200);
 assert.equal(examAccess("D6",[]).status,409);
 assert.equal(examAccess("D9",["D3","D6"]).status,200);
 assert.equal(examAccess("statistical-inference-final",PILOT_SEQUENCE).status,200);
 assert.equal(examAccess("statistical-inference-final",["D3"]).status,409);
 assert.equal(cleanResponse({"q1":"0.3",q2:2}).q1,"0.3");
 assert.equal(cleanResponse({q1:["not","a","number"]}),null);
 assert.equal(cleanResponse(Object.fromEntries(Array.from({length:105},(_,i)=>["q"+i,1]))),null);
 assert.throws(()=>scoreExam(examSpec("D3"),[],{}),/invalid_submission/);
});
test("certificates require all examinations and a named, evidence-backed capstone review",()=>{
 const passed=[...PILOT_SEQUENCE,"statistical-inference-final"];
 const review={status:"approved",evidence_verified:true,reviewed_by:"faculty",score:90,submission_version:2};
 assert.equal(issueCandidate(passed,null,{version:2}),false);
 assert.equal(issueCandidate(passed,{...review,evidence_verified:false},{version:2}),false);
 assert.equal(issueCandidate(passed.slice(1),review,{version:2}),false);
 assert.equal(issueCandidate(passed,{...review,score:70},{version:2}),false);
 assert.equal(issueCandidate(passed,review,{version:1}),false);
 assert.equal(issueCandidate(passed,review,{version:2}),true);
 assert.equal(isUuid("00000000-0000-4000-8000-000000000000"),true);
 assert.equal(isUuid("some malicious data"),false);
});
