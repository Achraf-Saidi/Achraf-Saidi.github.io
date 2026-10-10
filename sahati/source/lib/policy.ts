import type {Account,Entity,Kind,Role} from './model';
const reads:Record<Role,Kind[]>={
 doctor:['patients','appointments','encounters','prescriptions','orders','admissions','beds','care','emergencies','surgeries','documents','consents','messages','incidents'],
 resident:['patients','appointments','encounters','prescriptions','orders','admissions','beds','care','emergencies','surgeries','documents','consents','messages'],
 nurse:['patients','appointments','prescriptions','orders','admissions','beds','care','emergencies','surgeries','documents','messages','incidents'],
 reception:['patients','appointments','admissions','beds','messages'],lab:['patients','orders','messages','incidents'],radiology:['patients','orders','messages','incidents'],
 pharmacy:['patients','prescriptions','stock','messages','incidents'],finance:['patients','invoices','messages'],logistics:['beds','stock','equipment','messages','incidents'],
 researcher:['studies','requests','messages'],student:['studies','requests','messages'],patient:['patients','appointments','prescriptions','orders','documents','messages','consents'],
 director:['beds','stock','equipment','staff','studies','requests','incidents','messages'],admin:['beds','stock','equipment','staff','studies','requests','incidents','messages'],
};
const writes:Record<Role,Kind[]>={doctor:['patients','encounters','prescriptions','orders','admissions','care','emergencies','surgeries','documents','incidents','messages'],resident:['encounters','prescriptions','orders','care','messages'],nurse:['beds','care','incidents','messages'],reception:['patients','appointments','admissions','beds','messages'],lab:['orders','incidents','messages'],radiology:['orders','incidents','messages'],pharmacy:['prescriptions','stock','incidents','messages'],finance:['invoices','messages'],logistics:['beds','stock','equipment','incidents','messages'],researcher:['studies','requests','messages'],student:['requests','messages'],patient:['appointments','consents','messages'],director:['requests','studies','incidents','staff','messages'],admin:['beds','requests','studies','staff','incidents','equipment','messages']};
export const kinds:Kind[]=['patients','appointments','encounters','prescriptions','orders','admissions','beds','care','emergencies','surgeries','stock','invoices','staff','equipment','studies','requests','messages','incidents','documents','consents'];
export function canRead(a:Account,kind:Kind){return reads[a.role].includes(kind);}
export function canWrite(a:Account,kind:Kind){return writes[a.role].includes(kind);}
export function inScope(a:Account,e:Entity,patients:Entity[]){
 if(!canRead(a,e.kind))return false;
 if(e.kind==='messages')return e.hospitalId===a.hospitalId&&(e.recipientId===a.id||e.authorId===a.id||(e.recipientId==='team'&&a.role!=='patient'));
 if(a.role==='patient')return e.patientId===a.patientId||(e.kind==='patients'&&e.id===a.patientId);
 if(['admin','director'].includes(a.role))return true;
 if(e.hospitalId!==a.hospitalId)return false;
 if(e.kind==='requests')return e.authorId===a.id;
 if(e.kind==='studies')return e.authorId===a.id||(e.members||[]).includes(a.id);
 const p=e.kind==='patients'?e:patients.find(p=>p.id===e.patientId);
 if(['doctor','resident'].includes(a.role)&&p)return (p.careTeam||[]).includes(a.id);
 if(e.kind==='orders'&&a.role==='lab')return e.category==='lab';
 if(e.kind==='orders'&&a.role==='radiology')return e.category==='radiology';
 return true;
}
export function redact(a:Account,e:Entity):Entity{
 const out={...e};
 if(e.kind==='beds'&&a.role==='logistics')delete out.patientId;
 if(e.kind==='patients'&&['reception','finance'].includes(a.role)) {const allowed=['id','kind','hospitalId','version','firstName','lastName','birthDate','sex','phone','address','city','identifier','guardian','insurance','createdAt',...(a.role==='reception'?['careTeam','service']:[])];return Object.fromEntries(allowed.filter(k=>k in e).map(k=>[k,e[k]])) as Entity;}
 if(e.kind==='patients'&&['lab','radiology','pharmacy'].includes(a.role)){const allowed=['id','kind','hospitalId','version','firstName','lastName','birthDate','sex','identifier','allergies'];return Object.fromEntries(allowed.filter(k=>k in e).map(k=>[k,e[k]])) as Entity;}
 if(a.role==='patient'&&e.kind==='orders')delete out.internalNotes;
 return out;
}
const flows:Partial<Record<Kind,Record<string,string[]>>>= {
 appointments:{scheduled:['arrived','cancelled'],requested:['scheduled','cancelled'],arrived:['done','cancelled']},
 encounters:{draft:['pending','validated'],pending:['validated','draft'],validated:[]},
 prescriptions:{draft:['pending','validated','cancelled'],pending:['validated','draft','cancelled'],validated:['dispensed','cancelled'],dispensed:[]},
 orders:{requested:['collected','in_progress','cancelled'],collected:['in_progress','cancelled'],in_progress:['validated'],validated:['published'],published:['acknowledged']},
 care:{pending:['done','cancelled']},emergencies:{waiting:['in_progress'],in_progress:['done']},
 surgeries:{scheduled:['in_progress','cancelled'],in_progress:['done']},admissions:{admitted:['discharged']},
 invoices:{unpaid:['paid']},requests:{pending:['approved','rejected']},studies:{draft:['submitted'],submitted:['approved','rejected']},
 equipment:{active:['maintenance'],maintenance:['active']},incidents:{open:['in_progress'],in_progress:['resolved']},documents:{draft:['published']}
 ,beds:{cleaning:['available'],maintenance:['available'],available:['maintenance']}
};
export function allowedTransition(a:Account,e:Entity,next:string){
 if(!canWrite(a,e.kind)||(flows[e.kind]?.[e.status]||[]).includes(next)===false)return false;
 if(['encounters','prescriptions'].includes(e.kind)&&next==='validated')return a.role==='doctor';
 if(e.kind==='prescriptions'&&a.role==='pharmacy')return next==='dispensed';
 if(e.kind==='prescriptions'&&next==='dispensed')return a.role==='pharmacy';
 if(e.kind==='prescriptions'&&next==='cancelled')return ['doctor','resident'].includes(a.role)&&(['doctor'].includes(a.role)||e.authorId===a.id);
 if(e.kind==='beds')return e.status==='cleaning'?['nurse','reception','logistics','admin'].includes(a.role):['logistics','admin'].includes(a.role);
 if(e.kind==='prescriptions'&&next==='pending')return ['doctor','resident'].includes(a.role);
 if(e.kind==='orders'&&['collected','in_progress','validated','published'].includes(next))return (a.role==='lab'&&e.category==='lab')||(a.role==='radiology'&&e.category==='radiology');
 if(e.kind==='orders'&&next==='acknowledged')return a.role==='doctor';
 if(['requests','studies'].includes(e.kind)&&['approved','rejected'].includes(next))return ['admin','director'].includes(a.role)&&a.id!==e.authorId;
 if(e.kind==='admissions'&&next==='discharged')return a.role==='doctor';
 if(e.kind==='encounters'&&a.role==='resident'&&next==='draft')return false;
 return true;
}
export function patientPublished(a:Account,e:Entity){return a.role!=='patient'||!['prescriptions','orders','documents'].includes(e.kind)||(e.kind==='prescriptions'?['validated','dispensed']:e.kind==='orders'?['published','acknowledged']:['published']).includes(e.status);}
export function nextStatuses(a:Account,e:Entity){return (flows[e.kind]?.[e.status]||[]).filter(s=>allowedTransition(a,e,s));}
