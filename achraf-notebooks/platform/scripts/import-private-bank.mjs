#!/usr/bin/env node
// Import privately, offline from the VPS. NEVER commit real questions + answer keys.
import fs from "node:fs/promises";
import path from "node:path";
import {Pool} from "pg";
import {validatePrivateQuestionSet} from "../src/learning/import-policy.mjs";

const input=process.argv[2];
if(!input||!path.isAbsolute(input)||!process.env.DATABASE_URL){
 console.error("Usage: DATABASE_URL=... node scripts/import-private-bank.mjs /absolute/private/bank.json");
 process.exitCode=2;
}else{
 let pool;
 try{
  const full=path.resolve(input),repoRoot=path.resolve(".");
  if(full===repoRoot||full.startsWith(repoRoot+path.sep))
   throw Error("Private bank files must be outside this public Git checkout.");
  const stat=await fs.stat(full);
  if(!stat.isFile()||stat.size>2_000_000)throw Error("Invalid private file or size > 2 MB.");
  const text=await fs.readFile(full,"utf8");
  const items=JSON.parse(text);
  const summary=validatePrivateQuestionSet(items);
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:2});
  const client=await pool.connect();
  try{
   await client.query("BEGIN");
   for(const row of items){
    const q=await client.query(
     "INSERT INTO assessment_questions (id,module_id,kind,prompt_fr,prompt_en,options_fr,options_en,unit,secret_answer,explanation_fr,explanation_en,difficulty,approved,active,reviewer_id,reviewed_at) "+
     "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,FALSE,FALSE,NULL,NULL) "+
     "ON CONFLICT (id) DO UPDATE SET kind=EXCLUDED.kind,module_id=EXCLUDED.module_id,"+
     "prompt_fr=EXCLUDED.prompt_fr,prompt_en=EXCLUDED.prompt_en,options_fr=EXCLUDED.options_fr,"+
     "options_en=EXCLUDED.options_en,unit=EXCLUDED.unit,secret_answer=EXCLUDED.secret_answer,"+
     "explanation_fr=EXCLUDED.explanation_fr,explanation_en=EXCLUDED.explanation_en,"+
     "difficulty=EXCLUDED.difficulty,approved=FALSE,active=FALSE,reviewer_id=NULL,reviewed_at=NULL,"+
     "content_version=assessment_questions.content_version+1 WHERE assessment_questions.approved=FALSE RETURNING id",
     [row.id,row.module_id,row.kind,row.prompt_fr,row.prompt_en,
      row.options_fr?JSON.stringify(row.options_fr):null,
      row.options_en?JSON.stringify(row.options_en):null,row.unit||null,
      JSON.stringify(row.secret_answer),row.explanation_fr,row.explanation_en,row.difficulty]);
    if(q.rowCount!==1)throw Error("Already approved: "+row.id+". Do not overwrite an approved item; create a new versioned ID.");
   }
   await client.query("COMMIT");
   console.log("Imported "+summary.count+" private questions as UNAPPROVED drafts. Independent review required.");
  }catch(err){await client.query("ROLLBACK").catch(()=>{});throw err;}
  finally{client.release();}
 }catch(err){console.error("Question-bank import failed:",err.message);process.exitCode=1;}
 finally{if(pool)await pool.end();}
}
