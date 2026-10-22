import type {Entity} from './model';
import {statuses} from './model';
import {qrSvg} from './qr';
import {documentExplanation} from './clinical';

export type ReportSection={title:string;lines:string[]};
const values=(object:any,keys:string[])=>keys.filter(k=>object[k]!==undefined&&object[k]!=='').map(k=>k+' : '+object[k]);
export function recordSections(e:Entity,patient:Entity|undefined,ar=false):ReportSection[]{
 const sections:ReportSection[]=[];
 if(patient)sections.push({title:ar?'هوية تجريبية':'Identité synthétique',lines:[patient.firstName+' '+patient.lastName,patient.identifier+' · '+patient.birthDate]});
 if(e.kind==='prescriptions')for(const [i,m] of (e.medications||[]).entries())sections.push({title:String(i+1).padStart(2,'0')+' · '+m.name,lines:values(m,['dci','presentation','dose','route','frequency','duration','quantity','unit','renewals','instructions'])});
 if(e.kind==='prescriptions'&&e.dispenses?.length)sections.push({title:ar?'الدفعات المصروفة':'Lots délivrés',lines:[e.dispensedBy||'',e.dispensedAt||'',...e.dispenses.map((d:any)=>[d.medication||'',d.lot||d.stockId,String(d.quantity)+' '+(d.unit||''),d.expiry||''].join(' · '))]});
 for(const [k,label] of [['subjective',ar?'سبب الاستشارة':'Motif / anamnèse'],['objective',ar?'الملاحظات':'Examen et observations'],['assessment',ar?'تقييم المختص':'Synthèse du professionnel'],['plan',ar?'المتابعة':'Plan de suivi'],['result',ar?'التقرير الأصلي':'Compte rendu original'],['body',ar?'المحتوى':'Contenu'],['instructions',ar?'تعليمات':'Consignes'],['dischargeSummary',ar?'ملخص الخروج':'Résumé de sortie']])if(e[k])sections.push({title:label,lines:[String(e[k])]});
 if(e.observations?.length)sections.push({title:ar?'القياسات المسجلة':'Mesures enregistrées',lines:e.observations.map((o:any)=>`${o.name} : ${o.value} ${o.unit} (${o.date})\n${ar?'المجال المرجعي':'Intervalle'} : ${o.reference||(ar?'غير مقدم':'Non fourni')}\n${o.method||''} · ${o.source}`)});
 return sections;
}
export async function createReportPDF(title:string,sections:ReportSection[],meta:{reference?:string;status?:string;version?:number;date?:string;author?:string;ar?:boolean;qr?:string;font?:Uint8Array}={}){
 const {jsPDF}=await import('jspdf');
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
 const font=meta.font||Uint8Array.from(atob(await (await fetch('/sahati/fonts/document-sans.ttf.b64')).text()),c=>c.charCodeAt(0));
 let encoded='';for(let i=0;i<font.length;i+=24576)encoded+=String.fromCharCode(...font.subarray(i,i+24576));
 pdf.addFileToVFS('document-sans.ttf',btoa(encoded));pdf.addFont('document-sans.ttf','DocumentSans','normal');pdf.setFont('DocumentSans');
 pdf.setProperties({title,subject:'Démonstration SAHATI - données synthétiques',author:'SAHATI',creator:'SAHATI'});
 let logo='';if(typeof window!=='undefined'){try{const response=await fetch('/sahati/brand/logo.png');if(response.ok){const bytes=new Uint8Array(await response.arrayBuffer());let png='';for(let i=0;i<bytes.length;i+=24576)png+=String.fromCharCode(...bytes.subarray(i,i+24576));logo='data:image/png;base64,'+btoa(png);}}catch{}}
 const ar=!!meta.ar,x=ar?192:18,width=174;let y=42;
 function pageHeader(){pdf.setFillColor('#174f43');pdf.rect(0,0,210,29,'F');pdf.setTextColor('#ffffff');pdf.setFontSize(21);pdf.text('SAHATI',18,15);pdf.setFontSize(8);pdf.text(ar?'الرعاية مترابطة · بيانات تجريبية':'Le soin, relié. · Données synthétiques',18,23);if(logo){pdf.setFillColor('#ffffff');pdf.roundedRect(174,4,22,22,4,4,'F');pdf.addImage(logo,'PNG',176,6,18,18);}pdf.setTextColor('#172e35');}
 function addLines(text:string,size=10,color='#172e35'){
  pdf.setFontSize(size);pdf.setTextColor(color);const lines=pdf.splitTextToSize(String(text),width) as string[];
  for(const line of lines){if(y>265){pdf.addPage();pageHeader();y=42;}pdf.text(line,x,y,{align:ar?'right':'left'});y+=size===14?7:5.4;}
 }
 pageHeader();addLines(title,14);y+=3;
 addLines([meta.date||new Date().toISOString().slice(0,10),meta.reference||'',meta.version?'v'+meta.version:'',meta.status?statuses[meta.status]||meta.status:''].filter(Boolean).join(' · '),8,'#63777b');
 if(meta.author)addLines(meta.author,9);
 y+=7;
 for(const section of sections){if(y>245){pdf.addPage();pageHeader();y=42;}addLines(section.title,12,'#147d70');y+=2;for(const line of section.lines){addLines(line);y+=2;}y+=5;}
 if(meta.qr){if(y>210){pdf.addPage();pageHeader();y=42;}const svg=qrSvg(meta.qr),side=svg.match(/viewBox="0 0 (\d+) (\d+)"/);if(side){const unit=31/Number(side[1]);pdf.setFillColor('#ffffff');pdf.rect(18,y,31,31,'F');pdf.setFillColor('#000000');for(const match of svg.matchAll(/M(\d+),(\d+)h1v1h-1z/g))pdf.rect(18+Number(match[1])*unit,y+Number(match[2])*unit,unit,unit,'F');y+=35;addLines(ar?'مرجع محلي، وليس توقيعًا إلكترونيًا.':'Référence vérifiable sur le même appareil. Ce QR ne constitue pas une signature électronique.',8);}}
 const pages=pdf.getNumberOfPages();for(let p=1;p<=pages;p++){pdf.setPage(p);pdf.setDrawColor('#d9e4df');pdf.line(18,278,192,278);pdf.setFontSize(7);pdf.setTextColor('#63777b');pdf.text(ar?'وثيقة تجريبية · دون قيمة طبية':'DOCUMENT SYNTHÉTIQUE · SANS VALEUR CLINIQUE',18,284);pdf.text(p+' / '+pages,192,284,{align:'right'});}
 return pdf;
}
export async function exportRecordPDF(e:Entity,patient:Entity|undefined,ar=false,simple=false){
 const sections=simple?documentExplanation(e,ar).blocks.map(b=>({title:b.label+' · '+b.source,lines:[b.original,b.explanation]})):recordSections(e,patient,ar);
 const pdf=await createReportPDF((simple?(ar?'قراءة مبسطة · ':'Lecture simplifiée · '):'')+(e.title||'Document SAHATI'),sections,{reference:e.id,status:e.status,version:e.version,date:e.date,author:e.validatedByName||e.authorName,ar,qr:e.kind==='prescriptions'?location.origin+'/sahati/verifier/?reference='+e.verificationToken+'&v='+e.version:undefined});
 pdf.save('sahati-'+e.kind+'-'+e.id+'-v'+e.version+(simple?'-resume':'')+'.pdf');
}
export function csvFile(rows:(string|number|null)[][]){return '\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[=+@\-]/.test(s)&&typeof v!=='number')s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(';')).join('\r\n');}
