import type {Entity} from './model';
import {today} from './model';
import {UserError,positive,textField,dateField} from './validation';

export type Observation={name:string;value:number;unit:string;date:string;reference:string;method:string;source:string};
export function validateObservations(input:unknown):Observation[]{
 if(input===undefined)return [];
 if(!Array.isArray(input)||input.length>40)throw new UserError('Ajoutez au maximum 40 mesures.');
 return input.map((o:any)=>{if(typeof o?.value!=='number'||!Number.isFinite(o.value))throw new UserError('La valeur doit être un nombre renseigné.');return {name:textField(o.name,'Analyse',160,true),value:positive(o.value,'Valeur',-1000000,1000000),unit:textField(o.unit,'Unité',50,true),date:dateField(o.date),reference:textField(o.reference,'Intervalle du laboratoire',300),method:textField(o.method,'Méthode',200),source:textField(o.source,'Source',300,true)};});
}
const offset=(days:number)=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export function demoExtras():Entity[]{
 const now=new Date().toISOString(),base={hospitalId:'h1',patientId:'p1',version:1,createdAt:now,authorId:'doctor',authorName:'Dr Yasmine Amrani',synthetic:true};
 const records:Entity[]=[];
 for(const [i,value] of [12.1,12.4,12.3].entries()){
  const date=offset(-60+i*30);
  records.push({...base,id:'demo-lab-'+i,kind:'orders',category:'lab',title:'Suivi biologique pédagogique',status:'published',date,priority:'routine',specimenId:'PREL-DEMO-'+i,specimenType:'Échantillon fictif',result:'Hémoglobine : '+value+' g/dL. Intervalle et méthode du laboratoire non fournis dans ce scénario. Aucune conclusion diagnostique.',observations:[{name:'Hémoglobine',value,unit:'g/dL',date,reference:'',method:'Non fournie',source:'Jeu synthétique SAHATI / mesure '+(i+1)}],nextSteps:'Présenter ce document lors du rendez-vous de suivi prévu.',validatedByName:'Dr Inès Rahal',validatedAt:now,publishedAt:now});
 }
 records.push({...base,id:'demo-radiology',kind:'orders',category:'radiology',title:'Étude DICOM synthétique de démonstration',status:'requested',date:today(),priority:'routine',clinicalQuestion:'Test technique du circuit d’imagerie sur un fantôme numérique. Aucun diagnostic.'});
 records.push({...base,id:'demo-letter',kind:'documents',title:'Comprendre mon rendez-vous de suivi',category:'Consignes',status:'published',date:today(),body:'Ce document synthétique réunit les étapes de votre parcours. Les résultats sont des mesures enregistrées ; ils ne suffisent pas à établir un diagnostic. Prochaine étape indiquée : présenter vos documents à la consultation de suivi.',nextSteps:'Présenter vos documents à la consultation de suivi.'});
 return records;
}

export type SourceBlock={label:string;source:string;original:string;explanation:string};
const terms=[
 {term:'Hémoglobine',fr:'Protéine des globules rouges qui transporte l’oxygène. Une valeur isolée ne permet pas de conclure.',ar:'بروتين في خلايا الدم الحمراء ينقل الأكسجين. لا تكفي قيمة منفردة للاستنتاج.'},
 {term:'DCI',fr:'Dénomination commune internationale : nom de la substance active du médicament.',ar:'الاسم الدولي غير التجاري: اسم المادة الفعالة في الدواء.'},
 {term:'Voie',fr:'Façon d’administrer le médicament, indiquée par le prescripteur.',ar:'طريقة إعطاء الدواء التي يحددها الواصف.'},
 {term:'Hypothèse',fr:'Explication envisagée par le professionnel, qui reste à vérifier.',ar:'تفسير محتمل يطرحه المختص ويحتاج إلى التحقق.'},
 {term:'Compte rendu',fr:'Document rédigé par le professionnel pour décrire l’examen et ses conclusions.',ar:'وثيقة يكتبها المختص لوصف الفحص واستنتاجاته.'}
];
export function documentExplanation(e:Entity,ar=false){
 const blocks:SourceBlock[]=[],push=(label:string,source:string,original:any,fr:string,arabic:string)=>{if(original!==undefined&&original!==null&&original!=='')blocks.push({label,source,original:String(original),explanation:ar?arabic:fr});};
 if(e.kind==='prescriptions')for(const [i,m] of (e.medications||[]).entries()){
  push(ar?'الدواء':'Médicament','medications['+i+'].name',m.name,'Nom saisi par le prescripteur.','الاسم الذي أدخله الواصف.');
  for(const [key,label] of [['dose',ar?'الجرعة':'Dose'],['route',ar?'طريقة الإعطاء':'Voie'],['frequency',ar?'التكرار':'Fréquence'],['duration',ar?'المدة':'Durée'],['quantity',ar?'الكمية':'Quantité'],['instructions',ar?'تعليمات':'Instructions']])push(label,`medications[${i}].${key}`,m[key],'Instruction reproduite à l’identique. Aucune dose recalculée.','تعليمات منقولة كما هي. لم يُعَد حساب أي جرعة.');
 }
 for(const [i,o] of (e.observations||[]).entries())push(o.name,`observations[${i}]`,`${o.value} ${o.unit} · ${o.date} · ${o.reference||'Intervalle non fourni'} · ${o.source}`,o.reference?'Mesure enregistrée et intervalle transmis par le laboratoire. L’intervalle seul n’est pas un diagnostic.':'Mesure enregistrée. Aucun intervalle n’est fourni : aucune classification automatique.',o.reference?'قياس مسجل ومجال مرجعي أرسله المختبر. المجال وحده ليس تشخيصًا.':'قياس مسجل. لم يُقدَّم مجال مرجعي: لا يوجد تصنيف تلقائي.');
 push(ar?'الملاحظات':'Observations','objective',e.objective,'Observations consignées par le professionnel.','ملاحظات سجلها المختص.');
 push(ar?'تقييم المختص':'Synthèse du professionnel','assessment',e.assessment,'Conclusion ou hypothèse écrite par le professionnel ; ce texte ne la confirme pas.','استنتاج أو فرضية كتبها المختص؛ هذا النص لا يؤكدها.');
 push(ar?'التقرير الأصلي':'Compte rendu original','result',e.result,'Texte original conservé ; aucune interprétation ajoutée.','النص الأصلي محفوظ؛ لم تُضَف أي تفسيرات.');
 push(ar?'المحتوى الأصلي':'Contenu original','body',e.body,'Le contenu du document est conservé.','محتوى الوثيقة محفوظ.');
 push(ar?'تعليمات':'Consignes','instructions',e.instructions,'Consigne telle qu’elle figure dans le document.','التعليمات كما وردت في الوثيقة.');
 push(ar?'المتابعة المذكورة':'Suivi explicitement indiqué',e.nextSteps?'nextSteps':'plan',e.nextSteps||e.plan,'Étape présente dans le document source. SAHATI n’ajoute pas de conduite à tenir.','خطوة موجودة في الوثيقة المصدر. لا يضيف صحتي خطة علاجية.');
 return {blocks,glossary:terms.filter(term=>JSON.stringify(e).toLocaleLowerCase().includes(term.term.toLocaleLowerCase())).map(term=>({term:term.term,explanation:ar?term.ar:term.fr})),mode:'structured-demo',review:'Contenu pédagogique à faire relire par un professionnel avant usage réel.'};
}
export function clinicalTimeline(records:Entity[]){return records.filter(e=>!['patients','beds','consents','messages'].includes(e.kind)).sort((a,b)=>(b.date||b.createdAt||'').localeCompare(a.date||a.createdAt||''));}
