import {PILOT_SEQUENCE} from "./catalog.mjs";
import {verifyQuestion} from "./assessment.mjs";
export const MIN_BANK_ITEMS=16;
export const MIN_NUMERIC_ITEMS=4;
export const MIN_ADVANCED_ITEMS=8;
export function validatePrivateQuestionSet(items){
 if(!Array.isArray(items)||items.length>5000)throw Error("question_set_invalid");
 const ids=new Set();
 const counts={};
 for(const module of PILOT_SEQUENCE)counts[module]={total:0,numeric:0,advanced:0};
 for(const row of items){
  if(!verifyQuestion(row))throw Error("invalid_question_structure");
  if(!PILOT_SEQUENCE.includes(row.module_id))throw Error("unknown_pilot_module");
  if(ids.has(row.id))throw Error("duplicate_question_id");
  ids.add(row.id);
  if(!row.id.startsWith(row.module_id+"."))throw Error("question_id_must_match_module");
  if(typeof row.explanation_fr!=="string"||row.explanation_fr.length<40||
     typeof row.explanation_en!=="string"||row.explanation_en.length<40)
    throw Error("missing_explanation");
  if(row.kind==="choice"&&
     (new Set(row.options_fr).size!==row.options_fr.length||
      new Set(row.options_en).size!==row.options_en.length))
    throw Error("duplicate_distractors");
  const count=counts[row.module_id];
  count.total++;
  count.numeric+=Number(row.kind==="number");
  count.advanced+=Number(row.difficulty>=3);
 }
 for(const [module,c] of Object.entries(counts)){
  if(c.total<MIN_BANK_ITEMS)throw Error("insufficient_items_"+module);
  if(c.numeric<MIN_NUMERIC_ITEMS)throw Error("insufficient_numeric_"+module);
  if(c.advanced<MIN_ADVANCED_ITEMS)throw Error("insufficient_advanced_"+module);
 }
 return {count:items.length,modules:counts};
}
