import test from 'node:test';
import assert from 'node:assert/strict';
import { seedSchool, validateSchool, applyCommand, authenticateDemo, DEMO_ACCOUNTS, DEMO_PASSWORD, quizForCourse, learnerIds, courseIds, messageRecipients, visibleResources, metrics, progress } from '../school-core.js';
import { validatePDF } from '../school-store.js';
import { regression, studyPlan } from '../experiences.js';
const NOW=Date.parse('2026-10-10T12:00:00Z');
const seed=()=>seedSchool(NOW);
const cmd=(s,actor,type,id,payload={})=>applyCommand(s,actor,{type,id,payload},NOW);
const coursePayload=c=>({...c});

test('the initial fictional school and every published test account are valid',()=>{
 const s=seed();assert.deepEqual(validateSchool(s),s);
 for(const u of DEMO_ACCOUNTS)assert.equal(authenticateDemo(s,u.email,DEMO_PASSWORD).id,u.id);
 assert.equal(authenticateDemo(s,'etudiant@numeria.dz','wrong'),null);
 assert.equal(authenticateDemo(s,'unknown@numeria.dz',DEMO_PASSWORD),null);
 s.users.find(u=>u.id==='u-student').active=false;assert.equal(authenticateDemo(s,'etudiant@numeria.dz',DEMO_PASSWORD),null);
 assert.ok(!JSON.stringify(s).includes(DEMO_PASSWORD));
});
test('each role sees the correct children, courses, resources and message recipients',()=>{
 const s=seed(),parent=s.users.find(u=>u.role==='parent'),student=s.users.find(u=>u.id==='u-student');
 assert.deepEqual(learnerIds(s,parent),['u-lycee','u-lycee2']);
 assert.deepEqual(courseIds(s,parent).sort(),['math-2as','math-bac','physics-bac']);
 assert.deepEqual(courseIds(s,student).sort(),['python','stats-r']);
 assert.ok(visibleResources(s,student).every(r=>['python','stats-r'].includes(r.courseId)));
 assert.deepEqual(messageRecipients(s,parent).map(u=>u.id),['u-admin','u-teacher']);
 assert.ok(!messageRecipients(s,student).some(u=>u.role==='parent'||u.id==='u-pro'));
});
test('an admin creates accounts, links a parent and enrolls a learner without changing existing data',()=>{
 let s=seed(),previous=JSON.stringify(s);
 s=cmd(s,'u-admin','user.save','u-new',{name:'Compte fictif',email:'NOUVEAU@numeria.dz',role:'student',courses:['python','python'],children:[],active:true});
 assert.equal(s.users.at(-1).email,'nouveau@numeria.dz');assert.equal(s.enrollments.filter(e=>e.userId==='u-new').length,1);
 s=cmd(s,'u-admin','user.save','u-new-parent',{name:'Parent fictif',email:'nouveau-parent@numeria.dz',role:'parent',children:['u-new']});
 assert.deepEqual(s.users.at(-1).children,['u-new']);validateSchool(s);assert.equal(JSON.stringify(seed()),previous);
 assert.throws(()=>cmd(s,'u-admin','user.save','u-duplicate',{name:'Dupliqué',email:'nouveau@numeria.dz',role:'student'}),/déjà/);
 assert.throws(()=>cmd(s,'u-admin','user.save','u-bad',{name:'Fictif',email:'real@example.com',role:'student'}),/@numeria/);
 assert.throws(()=>cmd(s,'u-admin','user.save','u-admin',{...s.users[0],active:false}),/rester actif/);
});
test('all non-admin roles are denied catalogue, account and editorial mutations',()=>{
 const s=seed(),p=coursePayload(s.courses.find(c=>c.id==='python'));
 for(const id of ['u-teacher','u-parent','u-student','u-pro','u-lycee']){
  assert.throws(()=>cmd(s,id,'user.save','u-new',{name:'Fictif',email:'test@numeria.dz',role:'student'}),/administration/);
  assert.throws(()=>cmd(s,id,'course.save','python',p),/administration/);
  assert.throws(()=>cmd(s,id,'site.save','content',{overrides:{heroLead:{fr:'Texte'}}}),/administration/);
 }
 assert.equal(s.revision,0);
});
test('course edits retain relationships, support drafts and reject invalid prices or truncated completed modules',()=>{
 let s=seed(),p=coursePayload(s.courses.find(c=>c.id==='python'));p.title.fr='Python · nouvelle présentation';p.price=16000;
 s=cmd(s,'u-admin','course.save','python',p);assert.equal(s.courses.find(c=>c.id==='python').price,16000);assert.equal(s.enrollments.find(e=>e.courseId==='python').completed.length,2);
 assert.throws(()=>cmd(s,'u-admin','course.save','python',{...p,price:-1}),/entier/);
 assert.throws(()=>cmd(s,'u-admin','course.save','python',{...p,modules:[p.modules[0]]}),/terminés/);
 s=cmd(s,'u-admin','course.save','course-extra',{...p,status:'draft'});assert.equal(s.courses.at(-1).status,'draft');validateSchool(s);
});
test('learner submission, teacher correction and parent report share the same result including zero',()=>{
 let s=seed();s=cmd(s,'u-lycee','assignment.submit','a-math',{text:'Nouvelle démarche détaillée et vérifiée pour ce devoir.'});
 let sub=s.submissions.find(x=>x.assignmentId==='a-math'&&x.userId==='u-lycee');assert.equal(sub.grade,null);
 s=cmd(s,'u-teacher','submission.grade',sub.id,{grade:0,feedback:'Reprendre la dérivée et écrire chaque étape.'});
 assert.equal(metrics(s,s.users.find(u=>u.id==='u-lycee')).grade,0);
 assert.equal(metrics(s,s.users.find(u=>u.role==='parent')).grade,0);validateSchool(s);
 assert.throws(()=>cmd(s,'u-student','assignment.submit','a-math',{text:'Une réponse qui ne correspond pas à mon inscription.'}),/Inscription/);
 assert.throws(()=>cmd(s,'u-parent','submission.grade',sub.id,{grade:20,feedback:'Retour'}),/attribuée/);
 assert.throws(()=>cmd(s,'u-teacher','submission.grade',sub.id,{grade:21,feedback:'Retour'}),/20/);
});
test('teachers cannot grade or upload resources for another assigned teacher',()=>{
 let s=seed();s=cmd(s,'u-admin','user.save','u-teacher2',{name:'Prof fictif 2',email:'prof2@numeria.dz',role:'teacher'});
 const c=s.courses.find(c=>c.id==='python');s=cmd(s,'u-admin','course.save','python',{...c,teacherId:'u-teacher2'});
 assert.throws(()=>cmd(s,'u-teacher','submission.grade','sub-python',{grade:18,feedback:'Retour détaillé'}),/attribuée/);
 assert.throws(()=>cmd(s,'u-teacher','resource.save','res-new',{courseId:'python',title:'Support',status:'published',fileId:'pdf-new',fileName:'test.pdf',size:100}),/attribuée/);
 assert.deepEqual(courseIds(s,s.users.find(u=>u.id==='u-teacher2')),['python']);
});
test('lesson completion requires an enrollment, valid module and a genuinely passing quiz',()=>{
 let s=seed();const c=s.courses.find(c=>c.id==='python'),e=s.enrollments.find(e=>e.courseId==='python'),answers=quizForCourse(c).map(q=>q[2]);
 assert.throws(()=>cmd(s,'u-student','lesson.complete','python',{module:2,answers:[0,2,0]}),/bonnes réponses/);
 assert.throws(()=>cmd(s,'u-student','lesson.complete','python',{module:100,answers}),/entier/);
 assert.throws(()=>cmd(s,'u-lycee','lesson.complete','python',{module:2,answers}),/Inscription/);
 s=cmd(s,'u-student','lesson.complete','python',{module:2,answers});s=cmd(s,'u-student','lesson.complete','python',{module:2,answers});
 const result=s.enrollments.find(e=>e.userId==='u-student'&&e.courseId==='python');assert.equal(result.completed.length,3);assert.equal(result.activity.length,1);assert.equal(result.scores[2],3);assert.ok(progress(s,result)>progress(seed(),e));validateSchool(s);
});
test('attendance changes update the linked parent without accepting unrelated or future records',()=>{
 let s=seed();s=cmd(s,'u-teacher','attendance.save','s-3',{records:{'u-lycee':'present'}});
 assert.equal(metrics(s,s.users.find(u=>u.id==='u-lycee'),NOW).attendance,100);validateSchool(s);
 assert.throws(()=>cmd(s,'u-teacher','attendance.save','s-3',{records:{'u-student':'present'}}),/non inscrit/);
 assert.throws(()=>cmd(s,'u-teacher','attendance.save','s-7',{records:{'u-lycee':'present'}}),/après le début/);
});
test('session planning rejects teacher overlaps, unsafe links and invalid durations',()=>{
 let s=seed();const existing=s.sessions.find(x=>x.id==='s-6'),payload={courseId:'python',title:'Atelier test',start:existing.start,duration:60,meet:''};
 assert.throws(()=>cmd(s,'u-teacher','session.save','s-new',payload),/chevauche/);
 const start=new Date(Date.parse(existing.start)+90*60000).toISOString();s=cmd(s,'u-teacher','session.save','s-new',{...payload,start});
 assert.equal(s.sessions.at(-1).start,start);validateSchool(s);
 assert.throws(()=>cmd(s,'u-teacher','session.save','s-bad',{...payload,start:'2026-10-28T10:00:00Z',meet:'javascript:alert(1)'}),/vrai lien/);
 assert.throws(()=>cmd(s,'u-student','session.save','s-forbidden',{...payload,start:'2026-10-28T10:00:00Z'}),/attribuée/);
});
test('invoice settlements are role scoped, explicit simulations and cannot be counted twice',()=>{
 let s=seed();const invoice=s.invoices.find(i=>i.userId==='u-student'&&i.status==='pending');
 assert.throws(()=>cmd(s,'u-parent','invoice.pay',invoice.id,{method:'cash'}),/accessible/);
 assert.throws(()=>cmd(s,'u-teacher','invoice.pay',invoice.id,{method:'cash'}),/accessible/);
 s=cmd(s,'u-student','invoice.pay',invoice.id,{method:'edahabia'});assert.equal(s.invoices.find(i=>i.id===invoice.id).paidAt,new Date(NOW).toISOString());
 assert.throws(()=>cmd(s,'u-student','invoice.pay',invoice.id,{method:'edahabia'}),/déjà/);validateSchool(s);
});
test('local messaging accepts linked recipients, preserves plain text and marks only received messages read',()=>{
 let s=seed();s=cmd(s,'u-parent','message.send','m-new',{recipientId:'u-teacher',text:'Une question précise sur la dernière séance.'});assert.equal(s.messages.at(-1).senderId,'u-parent');
 assert.throws(()=>cmd(s,'u-student','message.send','m-bad',{recipientId:'u-lycee',text:'Message'}),/Destinataire/);
 s=cmd(s,'u-teacher','message.read','read');assert.ok(s.messages.find(m=>m.id==='m-new').readBy.includes('u-teacher'));assert.ok(!s.messages.find(m=>m.id==='m-1').readBy.includes('u-parent'));validateSchool(s);
});
test('PDF resources retain publication and role rules, remove cleanly and validate their metadata',()=>{
 let s=seed();s=cmd(s,'u-admin','resource.save','res-upload',{courseId:'python',title:'Fiche fictive',description:'PDF de démonstration',status:'published',public:true,fileId:'pdf-upload',fileName:'fiche.pdf',size:100});
 assert.ok(visibleResources(s,s.users.find(u=>u.id==='u-student')).some(r=>r.id==='res-upload'));assert.ok(!visibleResources(s,s.users.find(u=>u.id==='u-lycee')).some(r=>r.id==='res-upload'));
 s=cmd(s,'u-admin','resource.delete','res-upload');assert.ok(!s.resources.some(r=>r.id==='res-upload'));validateSchool(s);
});
test('PDF validation checks extension, size and actual signature, not just a MIME claim',async()=>{
 const good=new File(['%PDF-1.7\nExample\n%%EOF'],'fiche.pdf',{type:'application/pdf'});assert.equal((await validatePDF(good)).size,good.size);
 await assert.rejects(()=>validatePDF(new File(['<html>not PDF</html>'],'fake.pdf',{type:'application/pdf'})),/signature/);
 await assert.rejects(()=>validatePDF(new File(['%PDF-1.7'],'wrong.html')),/PDF/);
 await assert.rejects(()=>validatePDF(new File(['x'.repeat(5*1024*1024+1)],'too-big.pdf')),/5 Mo/);
});
test('editorial content preserves all three languages and cannot introduce unknown fields',()=>{
 const s=cmd(seed(),'u-admin','site.save','content',{overrides:{heroLead:{fr:'Nouvelle introduction',en:'New introduction',ar:'مقدمة جديدة'}}});assert.equal(s.site.heroLead.en,'New introduction');validateSchool(s);
 assert.throws(()=>cmd(s,'u-admin','site.save','content2',{overrides:{constructor:{fr:'Texte'}}}),/modifiable/);
});
test('backup schema rejects broken references, duplicate IDs, unsafe files and implausible metrics',()=>{
 for(const mutate of [s=>s.users.push(s.users[1]),s=>s.users[0].role='student',s=>s.enrollments[0].completed=[100],s=>s.submissions[0].grade=40,s=>s.resources[0].sampleFile='../secret.txt',s=>s.sessions[0].meet='https://evil.example',s=>s.users[2].children=['u-missing'],s=>s.messages[0].recipientId='u-missing']){
  const s=seed();mutate(s);assert.throws(()=>validateSchool(s));
 }
});
test('the regression experiment recalculates least squares and the study plan conserves available hours',()=>{
 assert.deepEqual(regression(10),{slope:2,intercept:0,predict4:8,ys:[2,4,6,8,10]});assert.equal(regression(20).slope,4);assert.equal(regression(20).predict4,12);
 for(let hours=2;hours<=20;hours++){const plan=studyPlan(hours,8);assert.equal(plan.learn+plan.practice+plan.review,hours);assert.equal(plan.total,hours*8);}
 assert.throws(()=>studyPlan(0,8));assert.throws(()=>studyPlan(3,100));
});
