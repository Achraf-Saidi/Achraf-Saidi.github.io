import {MODULE_INDEX,SCHOOL_INDEX} from "./module-index.mjs";
// Editorial truth: only the Statistical Inference pilot has authored, server-graded exams.
// Other specializations are visible roadmaps, NOT certificate-eligible yet.
export const SPECIALIZATIONS=[
{id:"statistical-inference",name:{fr:"Inférence statistique et Bayes",en:"Statistical inference and Bayes"},description:{fr:"Probabilités jointes, intervalles, régression logistique et MCMC.",en:"Joint probability, confidence intervals, logistic regression and MCMC."},modules:["D3","D6","D9","D13"],level:"intermediate",hours:46,assessment:"pilot",certificateEligible:true},
{id:"mathematical-foundations",name:{fr:"Mathématiques pour l'IA",en:"Mathematics for AI"},description:{fr:"Raisonnement, dérivées, intégration, algèbre et optimisation.",en:"Reasoning, derivatives, integration, algebra and optimization."},modules:["A1","A2","A7","A9","A10","B1","B2","B7","B8","B9"],level:"foundation",hours:120,assessment:"in-development",certificateEligible:false},
{id:"machine-learning",name:{fr:"Machine learning de A à Z",en:"Machine learning A–Z"},description:{fr:"Validation, inférence, clustering, PCA et modèles supervisés.",en:"Validation, inference, clustering, PCA and supervised models."},modules:["C2","C3","D2","D3","D6","D8","D9","F2","F4","F5","F6","F7","F8","F9","F11"],level:"intermediate",hours:156,assessment:"in-development",certificateEligible:false},
{id:"deep-learning-llm",name:{fr:"Deep learning, Transformers et LLM",en:"Deep learning, Transformers and LLMs"},description:{fr:"Différentiation, réseaux profonds, attention, tokenisation et adaptation.",en:"Differentiation, deep networks, attention, tokenization and adaptation."},modules:["G2","G3","G4","G5","G7","G9","H2","H4","H5","H7","H14"],level:"advanced",hours:172,assessment:"in-development",certificateEligible:false},
{id:"reinforcement-optimization",name:{fr:"Décision, optimisation et RL",en:"Decision, optimization and RL"},description:{fr:"Optimisation convexe, MDP, Bellman, acteurs-critiques et contrôle.",en:"Convex optimization, MDPs, Bellman, actor-critic and control."},modules:["B7","B8","B9","I2","I3","I6","I8","M5","M8"],level:"advanced",hours:125,assessment:"in-development",certificateEligible:false},
{id:"biomedical-research-ai",name:{fr:"IA biomédicale et recherche",en:"Biomedical AI and research"},description:{fr:"Survie, haute dimension, graphes et protocoles scientifiques.",en:"Survival, high dimensionality, graph learning and research methods."},modules:["D3","D6","D13","D16","J1","J3","K4","L7","L9"],level:"advanced",hours:142,assessment:"in-development",certificateEligible:false},
{id:"robotics-embodied",name:{fr:"Robotique et IA incarnée",en:"Robotics and embodied AI"},description:{fr:"Cinématique, commande, capteurs, SLAM, ROS 2 et robots autonomes.",en:"Kinematics, control, sensing, SLAM, ROS 2 and autonomous robots."},modules:["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M13","M14","M15"],level:"advanced",hours:190,assessment:"in-development",certificateEligible:false}
];
export const PILOT_SEQUENCE=["D3","D6","D9","D13"];
export const PILOT_TRACK="statistical-inference";
export function examSpec(id){
 if(PILOT_SEQUENCE.includes(id))return {id,kind:"module",modules:[id],questionCount:10,durationMinutes:35,minScore:80,perModuleMin:0};
 if(id==="statistical-inference-final")return {id,kind:"final",modules:[...PILOT_SEQUENCE],questionCount:24,durationMinutes:70,minScore:85,perModuleMin:50};
 return null;
}
export function examPrerequisites(id){
 if(id==="statistical-inference-final")return [...PILOT_SEQUENCE];
 const i=PILOT_SEQUENCE.indexOf(id);
 return i>0?[PILOT_SEQUENCE[i-1]]:[];
}
// Content depth is not scientific approval; all remain independently unreviewed drafts.
const EXTENDED_DRAFT_IDS=new Set(["B1","B7","D3","D6","D9","D13","F2","G3","G4","H2","H4","I2"]);
export function serializeCatalog(lang="fr"){
 const l=lang==="en"?"en":"fr";
 return {asOf:"2026-11-12",moduleCount:Object.keys(MODULE_INDEX).length,schools:SCHOOL_INDEX.map(s=>({id:s.id,title:s.title[l],moduleCount:s.moduleCount})),modules:Object.values(MODULE_INDEX).map(m=>({...m,title:m.title[l],depthStatus:EXTENDED_DRAFT_IDS.has(m.id)?"extended-draft":m.expandedDraft?"expanded-draft":"outline"})),notice:l==="fr"?
  "Les 92 chapitres académiques sont des brouillons originaux. Seule l'inférence statistique dispose actuellement d'examens pilotes, sans surveillance d'identité.":
  "The 92 authored chapters are original drafts. Only statistical inference currently has pilot exams, without proctored identity verification.",
  specializations:SPECIALIZATIONS.map(s=>({...s,title:s.name[l],summary:s.description[l],name:undefined,description:undefined,
   moduleTitles:s.modules.map(id=>MODULE_INDEX[id]?.title[l]||id)}))};
}
