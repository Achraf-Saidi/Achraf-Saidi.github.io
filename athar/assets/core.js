// ATHAR public demonstration engine. Deterministic; no AI, voice or external service.
export const SCHEMAS = {
  inspection: { label: 'Inspection · traitement d’eau', code: 'INS-EAU-04', required: ['circuit','pressure','temperature','filter'] },
  maintenance: { label: 'Maintenance · pompe industrielle', code: 'MNT-PMP-07', required: ['circuit','pressure','filter'] },
  qualite: { label: 'Contrôle qualité · installation', code: 'QLT-INST-02', required: ['circuit','temperature','filter'] }
};
export const FIELD_META = [
  {id:'circuit',label:'Équipement / circuit',unit:'',hint:'Zone ou installation inspectée'},
  {id:'pressure',label:'Pression relevée',unit:'bar',hint:'Mesure instrumentale'},
  {id:'temperature',label:'Température',unit:'°C',hint:'Mesure instrumentale'},
  {id:'filter',label:'État visuel du filtre',unit:'',hint:'Observation terrain'},
  {id:'photo',label:'Preuve photographique',unit:'',hint:'Référence déclarée, fichier non téléversé'},
  {id:'replacement',label:'Dernier remplacement',unit:'',hint:'Date non fournie = valeur inconnue'}
];
export const PRESETS = [
  {id:'pressure',title:'Pression',text:'La pression du circuit secondaire est de 2,8 bars.'},
  {id:'temperature',title:'Température',text:'La température mesurée est de 24 degrés.'},
  {id:'filter',title:'Inspection du filtre',text:'Le filtre présente un léger encrassement visuel.'},
  {id:'photo',title:'Photographie',text:'J’ai pris une photo du filtre.'},
  {id:'replacement',title:'Information absente',text:'Je ne peux pas confirmer la dernière date de remplacement.'}
];
const candidate=(value, quote, method)=>({value,origin:quote,method,status:'candidate',reason:'Proposition issue d’une règle explicite ; à vérifier.'});
export function parseObservation(text){
  const t = String(text ?? '').trim();
  const detected={};
  const pressure=t.match(/\bpression\b[^.\n]{0,65}?\b(\d{1,3}(?:[,.]\d{1,2})?)\s*(?:bars?\b)/i) || t.match(/\b(\d{1,3}(?:[,.]\d{1,2})?)\s*bars?\b/i);
  const temperature=t.match(/\btemp[eé]rature\b[^.\n]{0,65}?\b(\d{1,3}(?:[,.]\d{1,2})?)\s*(?:°\s*c|degr[eé]s?\b|celsius\b)/i) || t.match(/\b(\d{1,3}(?:[,.]\d{1,2})?)\s*(?:°\s*c|degr[eé]s?\b)/i);
  if(/circuit\s+secondaire/i.test(t)) detected.circuit=candidate('Circuit secondaire','circuit secondaire','Référence exacte');
  if(/circuit\s+principal/i.test(t)) detected.circuit=candidate('Circuit principal','circuit principal','Référence exacte');
  if(pressure) detected.pressure=candidate(pressure[1].replace(',','.'),pressure[0],'Nombre + unité bar');
  if(temperature) detected.temperature=candidate(temperature[1].replace(',','.'),temperature[0],'Nombre + unité température');
  if(/\b(?:encrass[eé]|encrassement)\b/i.test(t)) detected.filter=candidate('Encrassement visuel signalé',t.match(/[^.]*encrass[^.]*/i)?.[0]?.trim()||t,'Mot-clé métier');
  else if(/\bfiltre\b[^.\n]{0,60}\b(?:propre|sans anomalie)\b/i.test(t)) detected.filter=candidate('Aucune anomalie visuelle déclarée',t.match(/[^.]*filtre[^.]*/i)?.[0]?.trim()||t,'Expression métier');
  if(/\b(?:photo|photographie)\b/i.test(t)) detected.photo=candidate('Photographie déclarée — fichier non joint',t.match(/[^.]*\bphoto(?:graphie)?\b[^.]*/i)?.[0]?.trim()||t,'Mention déclarative');
  // Never turn unknown or unconfirmed replacement dates into guessed dates.
  if(/(?:date\s+de\s+remplacement|dernier\s+remplacement)/i.test(t)&&/(?:pas|ne\s+peux|impossible|inconnue?|aucune|non\s+confirm)/i.test(t)) detected.replacement={value:null,status:'missing',origin:t,method:'Déclaration d’incertitude',reason:'Date explicitement non confirmée.'};
  const mentionsSupported=Object.keys(detected).length>0;
  return {detected,unparsed:!mentionsSupported,mode:'local-deterministic'};
}
export function emptyFields(){ return Object.fromEntries(FIELD_META.map(x=>[x.id,{value:null,status:'empty',origin:null,method:null,reason:'Aucune information fournie',sourceId:null}])); }
export function mergeField(existing, proposal, sourceId){
  if(proposal.status==='missing') return {...existing,...proposal,sourceId,status:existing.status==='human'?existing.status:'missing'};
  if(existing.value!=null && String(existing.value)!==String(proposal.value)) return {...existing,status:'conflict',pending:proposal.value,reason:`Deux valeurs incompatibles : ${existing.value} / ${proposal.value}.`,sourceId};
  if(existing.status==='human') return {...existing,sourceId};
  return {...proposal,sourceId};
}
export function completeness(fields, schema='inspection'){
  const required=SCHEMAS[schema]?.required??SCHEMAS.inspection.required;
  return {required:required.length,filled:required.filter(key=>fields[key]?.value!=null).length,confirmed:required.filter(key=>fields[key]?.status==='human').length};
}
export function canApprove(fields,schema='inspection'){
  const req=SCHEMAS[schema]?.required??SCHEMAS.inspection.required;
  return req.every(k=>fields[k]?.value!=null&&fields[k]?.status==='human') && !Object.values(fields).some(f=>f.status==='conflict');
}
export function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
