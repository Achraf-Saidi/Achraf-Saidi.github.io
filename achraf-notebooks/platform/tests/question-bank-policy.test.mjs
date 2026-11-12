import test from "node:test";
import assert from "node:assert/strict";
import {validatePrivateQuestionSet} from "../src/learning/import-policy.mjs";
import {PILOT_SEQUENCE} from "../src/learning/catalog.mjs";
function draft(){
 const q=[];
 for(const module of PILOT_SEQUENCE){
  for(let i=0;i<16;i++){
   const numeric=i<4;
   q.push({
    id:module+"."+i,module_id:module,kind:numeric?"number":"choice",
    prompt_fr:"Calculer et expliquer la conséquence du protocole pour cette observation numéro "+i+".",
    prompt_en:"Compute and explain the consequence of the protocol for this observation number "+i+".",
    options_fr:numeric?null:["A","B","C"],options_en:numeric?null:["A","B","C"],
    secret_answer:numeric?{value:i+1,absoluteTolerance:.001}:{value:1},
    explanation_fr:"On applique la règle et on vérifie les hypothèses mathématiques avant d'interpréter les résultats.",
    explanation_en:"Apply the rule and check mathematical assumptions before interpreting the results.",
    difficulty:i<10?4:2
   });
  }
 }
 return q;
}
test("private exam bank requires 16 items and four numerical questions per module",()=>{
 const items=draft(),quality=validatePrivateQuestionSet(items);
 assert.equal(quality.count,64);
 for(const module of PILOT_SEQUENCE){
  assert.equal(quality.modules[module].total,16);
  assert.equal(quality.modules[module].numeric,4);
 }
 assert.throws(()=>validatePrivateQuestionSet(items.filter(q=>q.id!=="D3.0")),/insufficient_numeric_D3/);
});
test("rejects duplicate items, weak difficulty and missing translations",()=>{
 const items=draft();
 assert.throws(()=>validatePrivateQuestionSet([...items,items[0]]),/duplicate_question_id/);
 assert.throws(()=>validatePrivateQuestionSet(items.map(x=>({...x,difficulty:1}))),/insufficient_advanced/);
 assert.throws(()=>validatePrivateQuestionSet(items.map((x,i)=>i?x:{...x,prompt_fr:""})),/invalid_question_structure/);
});
