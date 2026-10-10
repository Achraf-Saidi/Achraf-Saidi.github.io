export type Role = 'admin'|'director'|'doctor'|'resident'|'nurse'|'reception'|'lab'|'radiology'|'pharmacy'|'finance'|'logistics'|'researcher'|'student'|'patient';
export type Kind = 'patients'|'appointments'|'encounters'|'prescriptions'|'orders'|'admissions'|'beds'|'care'|'emergencies'|'surgeries'|'stock'|'invoices'|'staff'|'equipment'|'studies'|'requests'|'messages'|'incidents'|'documents'|'consents';
export interface Account { id:string; name:string; email:string; role:Role; hospitalId:string; patientId?:string; active:boolean; specialty?:string; }
export interface Entity { id:string; kind:Kind; hospitalId:string; patientId?:string; version:number; [key:string]:any; }
export const roles: {id:Role;label:string;ar:string;subtitle:string;icon:string;email:string}[] = [
 {id:'doctor',label:'Médecin',ar:'طبيب',subtitle:'Consultations & prescriptions',icon:'Stethoscope',email:'medecin@sahati.demo'},
 {id:'resident',label:'Résident',ar:'طبيب مقيم',subtitle:'Formation & contre-validation',icon:'GraduationCap',email:'resident@sahati.demo'},
 {id:'nurse',label:'Soins infirmiers',ar:'التمريض',subtitle:'Transmissions & constantes',icon:'HeartPulse',email:'infirmier@sahati.demo'},
 {id:'reception',label:'Accueil & admissions',ar:'الاستقبال',subtitle:'Identité, rendez-vous & lits',icon:'CalendarDays',email:'accueil@sahati.demo'},
 {id:'lab',label:'Laboratoire',ar:'المخبر',subtitle:'Prélèvements & résultats',icon:'FlaskConical',email:'laboratoire@sahati.demo'},
 {id:'radiology',label:'Radiologie',ar:'الأشعة',subtitle:'Examens & comptes rendus',icon:'ScanLine',email:'radiologie@sahati.demo'},
 {id:'pharmacy',label:'Pharmacie',ar:'الصيدلية',subtitle:'Délivrances & lots',icon:'Pill',email:'pharmacie@sahati.demo'},
 {id:'patient',label:'Patient & famille',ar:'المريض والأسرة',subtitle:'Mon parcours de soins',icon:'UserRound',email:'patient@sahati.demo'},
 {id:'researcher',label:'Chercheur',ar:'باحث',subtitle:'Protocoles & cohortes',icon:'Microscope',email:'chercheur@sahati.demo'},
 {id:'student',label:'Étudiant',ar:'طالب',subtitle:'Recherche & ressources',icon:'BookOpen',email:'etudiant@sahati.demo'},
 {id:'director',label:'Direction',ar:'الإدارة',subtitle:'Pilotage & qualité',icon:'ChartNoAxesCombined',email:'direction@sahati.demo'},
 {id:'finance',label:'Finances',ar:'المالية',subtitle:'Facturation en DZD',icon:'Wallet',email:'finance@sahati.demo'},
 {id:'logistics',label:'Logistique',ar:'الخدمات اللوجستية',subtitle:'Stocks & maintenance',icon:'Package',email:'logistique@sahati.demo'},
 {id:'admin',label:'Administration',ar:'إدارة النظام',subtitle:'Accès, réseau & gouvernance',icon:'ShieldCheck',email:'admin@sahati.demo'},
];
export const hospitals = [
 {id:'h1',name:'El Amal',city:'Alger',wilaya:'16',type:'Pôle hospitalier pilote',services:8,beds:20},
 {id:'h2',name:'Les Oliviers',city:'Oran',wilaya:'31',type:'Pôle hospitalier pilote',services:6,beds:8},
 {id:'h3',name:'Les Cèdres',city:'Constantine',wilaya:'25',type:'Pôle hospitalier pilote',services:5,beds:8},
];
export const services=['Médecine interne','Pédiatrie','Gynécologie','Chirurgie','Cardiologie','Urgences','Radiologie','Laboratoire'];
export const statuses:Record<string,string>={draft:'Brouillon',pending:'À valider',validated:'Validée',dispensed:'Délivrée',cancelled:'Annulée',scheduled:'Programmé',arrived:'Arrivé',done:'Terminé',requested:'Demandé',collected:'Prélevé',in_progress:'En cours',published:'Publié',occupied:'Occupé',available:'Disponible',cleaning:'Bionettoyage',maintenance:'Maintenance',admitted:'Hospitalisé',discharged:'Sorti',waiting:'En attente',active:'Actif',approved:'Approuvé',rejected:'Refusé',paid:'Payée',unpaid:'À régler',resolved:'Résolu',open:'Ouvert',submitted:'Soumis',acknowledged:'Lecture confirmée'};
export const today=()=>new Date().toISOString().slice(0,10);
export function age(birth:string){const d=new Date(birth);return Math.max(0,new Date().getFullYear()-d.getFullYear()-(new Date().getMonth()<d.getMonth()||(new Date().getMonth()===d.getMonth()&&new Date().getDate()<d.getDate())?1:0));}
