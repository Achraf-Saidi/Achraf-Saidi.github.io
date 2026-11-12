import {randomUUID} from "node:crypto";
import {SPECIALIZATIONS,PILOT_SEQUENCE,PILOT_TRACK,examSpec,serializeCatalog} from "./catalog.mjs";
import {prepareExam,scoreExam,examAccess,issueCandidate,validLanguage,isUuid} from "./assessment.mjs";

const modules=new Set(SPECIALIZATIONS.flatMap(s=>s.modules));
const langOf=req=>validLanguage(req.query?.lang||req.body?.lang);
function failure(res,error,status=400,extra={}){return res.status(status).json({error,...extra});}
const sanitizeName=name=>typeof name==="string"&&
 name.trim().length>=2&&name.trim().length<=90&&
 !/[\x00-\x1f<>]/.test(name)?name.trim():null;

export function mountLearningRoutes(app,{db,session,assertSameOrigin}){
 app.get("/api/learning/catalog",(_req,res)=>res.json(serializeCatalog(langOf(_req))));

 app.get("/api/me/learning",session,async(req,res)=>{
  try{
   const [events,passes,attempts,certificates,reviews]=await Promise.all([
    db.query("SELECT module_id,self_reported_completed,updated_at FROM learning_events WHERE user_id=$1",[req.currentUser.id]),
    db.query("SELECT exam_id,best_score,passed_at FROM assessment_passes WHERE user_id=$1",[req.currentUser.id]),
    db.query("SELECT id,exam_id,state,score,started_at,expires_at FROM assessment_attempts WHERE user_id=$1 ORDER BY started_at DESC LIMIT 30",[req.currentUser.id]),
    db.query("SELECT public_id,track_id,recipient_display_name,assessment_score,issued_at,revoked_at FROM academy_certificates WHERE user_id=$1",[req.currentUser.id]),
    db.query("SELECT track_id,status,evidence_verified,updated_at FROM capstone_reviews WHERE user_id=$1",[req.currentUser.id])
   ]);
   res.json({selfReported:events.rows,passed:passes.rows,attempts:attempts.rows,
    certificates:certificates.rows,reviews:reviews.rows});
  }catch{failure(res,"learning_unavailable",503);}
 });

 app.post("/api/me/learning/modules/:id",assertSameOrigin,session,async(req,res)=>{
  if(!modules.has(req.params.id)||typeof req.body?.completed!=="boolean")
   return failure(res,"invalid_module");
  try{
   await db.query("INSERT INTO learning_events(user_id,module_id,self_reported_completed) VALUES($1,$2,$3) ON CONFLICT(user_id,module_id) DO UPDATE SET self_reported_completed=EXCLUDED.self_reported_completed,updated_at=now()",
    [req.currentUser.id,req.params.id,req.body.completed]);
   res.json({moduleId:req.params.id,selfReportedCompleted:req.body.completed,
    notice:"Self-reported study is not exam mastery."});
  }catch{failure(res,"learning_unavailable",503);}
 });

 app.post("/api/exams/:id/start",assertSameOrigin,session,async(req,res)=>{
  const spec=examSpec(req.params.id);
  if(!spec)return failure(res,"unknown_exam",404);
  const lang=langOf(req);
  const conn=await db.connect().catch(()=>null);
  if(!conn)return failure(res,"exam_unavailable",503);
  try{
   await conn.query("BEGIN");
   // All exam-start requests for one user serialize on their own identity row.
   await conn.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[req.currentUser.id]);
   const passes=await conn.query("SELECT exam_id FROM assessment_passes WHERE user_id=$1",[req.currentUser.id]);
   const gate=examAccess(spec.id,passes.rows.map(r=>r.exam_id));
   if(gate.status!==200){await conn.query("ROLLBACK");return failure(res,gate.error,gate.status,{missing:gate.missing});}
   const previous=await conn.query("SELECT id,public_questions,expires_at FROM assessment_attempts WHERE user_id=$1 AND exam_id=$2 AND state='started' FOR UPDATE",[req.currentUser.id,spec.id]);
   if(previous.rowCount){
    const p=previous.rows[0];
    if(new Date(p.expires_at).getTime()>Date.now()){
     await conn.query("COMMIT");
     return res.json({attemptId:p.id,examId:spec.id,questions:p.public_questions,
       expiresAt:p.expires_at,passThreshold:spec.minScore,continued:true});
    }
    await conn.query("UPDATE assessment_attempts SET state='expired' WHERE id=$1",[p.id]);
   }
   const count=await conn.query("SELECT COUNT(*)::integer AS n FROM assessment_attempts WHERE user_id=$1 AND exam_id=$2 AND started_at>now()-interval '24 hours'",[req.currentUser.id,spec.id]);
   if(count.rows[0].n>=3){await conn.query("ROLLBACK");return failure(res,"exam_daily_limit",429);}
   const bank=await conn.query("SELECT * FROM assessment_questions WHERE module_id=ANY($1::text[]) AND approved=TRUE AND active=TRUE",[spec.modules]);
   const {publicQuestions,answerKey}=prepareExam(spec,bank.rows,lang);
   if(publicQuestions.length!==spec.questionCount)throw Error("exam_length_mismatch");
   const attemptId=randomUUID(),endsAt=new Date(Date.now()+spec.durationMinutes*60_000);
   await conn.query("INSERT INTO assessment_attempts(id,user_id,exam_id,locale,public_questions,answer_key,expires_at,item_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [attemptId,req.currentUser.id,spec.id,lang,JSON.stringify(publicQuestions),JSON.stringify(answerKey),endsAt,spec.questionCount]);
   await conn.query("COMMIT");
   res.status(201).json({attemptId,examId:spec.id,questions:publicQuestions,
    expiresAt:endsAt,passThreshold:spec.minScore,continued:false});
  }catch(err){
   await conn.query("ROLLBACK").catch(()=>{});
   if(["bank_insufficient","bank_duplicate","bank_too_easy"].includes(err.message))
    return failure(res,"exam_not_yet_reviewed",503);
   console.error("Assessment start failure",err.message);
   failure(res,"exam_unavailable",503);
  }finally{conn.release();}
 });

 app.post("/api/exams/:id/submit",assertSameOrigin,session,async(req,res)=>{
  const spec=examSpec(req.params.id),attemptId=req.body?.attemptId;
  if(!spec||!isUuid(attemptId))return failure(res,"invalid_attempt");
  const conn=await db.connect().catch(()=>null);
  if(!conn)return failure(res,"exam_unavailable",503);
  try{
   await conn.query("BEGIN");
   const q=await conn.query("SELECT * FROM assessment_attempts WHERE id=$1 AND user_id=$2 AND exam_id=$3 FOR UPDATE",
    [attemptId,req.currentUser.id,spec.id]);
   if(q.rowCount!==1){await conn.query("ROLLBACK");return failure(res,"attempt_not_found",404);}
   const attempt=q.rows[0];
   if(attempt.state!=="started"){await conn.query("ROLLBACK");return failure(res,"attempt_already_closed",409);}
   if(new Date(attempt.expires_at).getTime()<Date.now()){
    await conn.query("UPDATE assessment_attempts SET state='expired' WHERE id=$1",[attemptId]);
    await conn.query("COMMIT");return failure(res,"exam_time_expired",410);
   }
   let grade;
   try{grade=scoreExam(spec,attempt.answer_key,req.body?.responses);}
   catch{await conn.query("ROLLBACK");return failure(res,"invalid_answers",400);}
   await conn.query("UPDATE assessment_attempts SET state=$2,score=$3,correct_count=$4,responses=$5,submitted_at=now(),answer_key='[]'::jsonb WHERE id=$1",
    [attemptId,grade.passed?"passed":"failed",grade.score,grade.correct,JSON.stringify(req.body.responses)]);
   if(grade.passed){
    await conn.query("INSERT INTO assessment_passes(user_id,exam_id,best_score) VALUES($1,$2,$3) ON CONFLICT(user_id,exam_id) DO UPDATE SET best_score=GREATEST(assessment_passes.best_score,EXCLUDED.best_score)",
     [req.currentUser.id,spec.id,grade.score]);
   }
   await conn.query("COMMIT");
   res.json({examId:spec.id,attemptId,score:grade.score,passed:grade.passed,
    correct:grade.correct,total:grade.total,byModule:grade.byModule,review:grade.details,
    notice:"Automatic assessment is unproctored; the final credential also requires a reviewed capstone."});
  }catch(err){
   await conn.query("ROLLBACK").catch(()=>{});
   console.error("Assessment submit failure",err.message);
   failure(res,"exam_unavailable",503);
  }finally{conn.release();}
 });

 app.post("/api/certificates/claim",assertSameOrigin,session,async(req,res)=>{
  const trackId=req.body?.trackId,publicConsent=req.body?.publicConsent;
  const displayName=sanitizeName(req.body?.displayName);
  if(trackId!==PILOT_TRACK||publicConsent!==true||!displayName)
   return failure(res,"explicit_public_name_consent_required",400);
  const conn=await db.connect().catch(()=>null);
  if(!conn)return failure(res,"certificate_unavailable",503);
  try{
   await conn.query("BEGIN");
   await conn.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[req.currentUser.id]);
   const [passed,capstone]=await Promise.all([
    conn.query("SELECT exam_id,best_score FROM assessment_passes WHERE user_id=$1",[req.currentUser.id]),
    conn.query("SELECT status,evidence_verified,reviewed_by FROM capstone_reviews WHERE user_id=$1 AND track_id=$2",[req.currentUser.id,trackId])
   ]);
   if(!issueCandidate(passed.rows.map(x=>x.exam_id),capstone.rows[0])){
    await conn.query("ROLLBACK");
    return failure(res,"certificate_requirements_incomplete",409,{
     requirements:["4 passing module exams","passing final exam","independently reviewed capstone project"]});
   }
   const finalScore=passed.rows.find(x=>x.exam_id===PILOT_TRACK+"-final").best_score;
   const certificateId=randomUUID();
   await conn.query("INSERT INTO academy_certificates(public_id,user_id,track_id,recipient_display_name,assessment_score,publicly_verifiable) VALUES($1,$2,$3,$4,$5,TRUE) ON CONFLICT(user_id,track_id) DO NOTHING",
    [certificateId,req.currentUser.id,trackId,displayName,finalScore]);
   const result=await conn.query("SELECT public_id,track_id,recipient_display_name,assessment_score,issued_at,revoked_at FROM academy_certificates WHERE user_id=$1 AND track_id=$2",
    [req.currentUser.id,trackId]);
   await conn.query("COMMIT");
   res.json({certificate:result.rows[0],verificationUrl:"/certificates/"+result.rows[0].public_id});
  }catch{
   await conn.query("ROLLBACK").catch(()=>{});
   failure(res,"certificate_unavailable",503);
  }finally{conn.release();}
 });

 app.get("/api/certificates/verify/:id",async(req,res)=>{
  if(!isUuid(req.params.id))return failure(res,"not_found",404);
  try{
   const r=await db.query("SELECT public_id,track_id,recipient_display_name,assessment_score,issued_at,revoked_at FROM academy_certificates WHERE public_id=$1 AND publicly_verifiable=TRUE",[req.params.id]);
   if(r.rowCount!==1)return failure(res,"not_found",404);
   const c=r.rows[0];
   return res.json({credentialId:c.public_id,trackId:c.track_id,recipient:c.recipient_display_name,
    finalExamScore:c.assessment_score,issuedAt:c.issued_at,status:c.revoked_at?"revoked":"valid",
    type:"Independent unaccredited achievement certificate; unproctored exam plus reviewed capstone"});
  }catch{failure(res,"verification_unavailable",503);}
 });
}
