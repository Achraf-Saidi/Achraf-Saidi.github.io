import type {Entity} from './model';
export function median(values:number[]){const s=values.filter(Number.isFinite).sort((a,b)=>a-b);return s.length?s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2:null;}
export function kaplanMeier(rows:{followUpDays:number;event:number}[]){
 const valid=rows.filter(r=>Number.isFinite(r.followUpDays)&&r.followUpDays>=0&&[0,1].includes(r.event));let survival=1;
 return [...new Set(valid.map(r=>r.followUpDays))].sort((a,b)=>a-b).map(time=>{const atRisk=valid.filter(r=>r.followUpDays>=time).length,events=valid.filter(r=>r.followUpDays===time&&r.event===1).length,censored=valid.filter(r=>r.followUpDays===time&&r.event===0).length;survival*=1-events/atRisk;return {time,atRisk,events,censored,survival};});
}
export function cohortSummary(rows:any[]){return {n:rows.length,events:rows.filter(r=>r.event===1).length,censored:rows.filter(r=>r.event===0).length,medianFollowUp:median(rows.map(r=>r.followUpDays)),missing:rows.filter(r=>!Number.isFinite(r.followUpDays)||![0,1].includes(r.event)).length,km:kaplanMeier(rows)};}
export function operationalIndicators(records:Entity[],hospitals:any[],filter={hospital:'all',wilaya:'all',service:'all'}){
 const facilities=hospitals.filter(h=>(filter.hospital==='all'||h.id===filter.hospital)&&(filter.wilaya==='all'||h.wilaya===filter.wilaya));
 const scoped=records.filter(e=>facilities.some(h=>h.id===e.hospitalId)&&(filter.service==='all'||e.service===filter.service));
 const beds=scoped.filter(e=>e.kind==='beds'),occupied=beds.filter(e=>e.status==='occupied').length,operable=beds.filter(e=>e.status!=='maintenance').length;
 const openOrders=scoped.filter(e=>e.kind==='orders'&&!['published','acknowledged','cancelled'].includes(e.status));
 const admissions=scoped.filter(e=>e.kind==='admissions'&&e.status==='admitted');
 const completed=scoped.filter(e=>e.kind==='admissions'&&e.status==='discharged'&&e.dischargedAt);
 const duration=median(completed.map(e=>(Date.parse(e.dischargedAt)-Date.parse(e.admittedAt||e.createdAt))/86400000));
 return {beds:beds.length,occupied,operable,available:beds.filter(e=>e.status==='available').length,cleaning:beds.filter(e=>e.status==='cleaning').length,maintenance:beds.filter(e=>e.status==='maintenance').length,occupancy:operable?100*occupied/operable:null,admissions:admissions.length,pendingOrders:openOrders.length,critical:scoped.filter(e=>e.kind==='orders'&&e.critical&&e.status!=='acknowledged'&&e.status!=='cancelled').length,medianStay:duration,facilities:facilities.map(h=>({...h,beds:scoped.filter(e=>e.kind==='beds'&&e.hospitalId===h.id).length,occupied:scoped.filter(e=>e.kind==='beds'&&e.hospitalId===h.id&&e.status==='occupied').length})),updatedAt:new Date().toISOString()};
}
export const kpiDefinitions=[
 {key:'occupancy',title:'Occupation des lits opérationnels',formula:'100 × lits occupés / lits hors maintenance',source:'États des lits de la base locale',unit:'%',decision:'Préparer les capacités disponibles. Les lits en bionettoyage restent au dénominateur.'},
 {key:'available',title:'Lits prêts',formula:'Nombre de lits avec statut disponible',source:'États des lits',unit:'lits',decision:'Orienter une admission vers une unité adaptée.'},
 {key:'pendingOrders',title:'Examens avant diffusion',formula:'Demandés + prélevés + en cours + validés non publiés',source:'Demandes de laboratoire et radiologie',unit:'examens',decision:'Répartir le travail et repérer les comptes rendus à publier.'},
 {key:'critical',title:'Résultats critiques sans lecture confirmée',formula:'Résultats marqués critiques par le professionnel, non annulés, non acquittés',source:'Signalements manuels et statuts des demandes',unit:'résultats',decision:'Vérifier la transmission au prescripteur selon le protocole local.'},
 {key:'medianStay',title:'Durée médiane des séjours terminés',formula:'Médiane (sortie − admission) en jours ; absent si aucun séjour terminé',source:'Horodatages des hospitalisations sorties',unit:'jours',decision:'Observer les séjours terminés. Le faible effectif limite les comparaisons.'}
];
