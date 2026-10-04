// CV Match Lab — no external dependencies, no user text leaves the browser.
// To activate voluntary support, paste your Ko-fi / Buy Me a Coffee / crowdfunding URL below.
// GitHub Pages permits donation/crowdfunding links, but not a site primarily built for e-commerce.
const SUPPORT_URL = "";

const $ = (id) => document.getElementById(id);
let language = "en";
let lastResult = null;

const stopwords = new Set((
"the a an and or but if then else when while of to in on at by for from with without as is are was were be been being " +
"this that these those it its you your we our they their he she his her not no yes can could should would may might must will " +
"de la le les un une des du et ou mais si alors dans sur sous avec sans pour par en au aux ce cette ces il elle ils elles " +
"nous vous votre vos notre nos leur leurs est sont était étaient être été comme qui que quoi dont où ne pas plus moins très"
).split(/\s+/));

const actionVerbs = new Set((
"achieved analyzed built created delivered designed developed drove engineered established executed generated implemented improved increased launched led managed optimized owned produced reduced researched solved streamlined transformed automated coordinated deployed evaluated mentored negotiated planned programmed scaled secured shipped tested trained " +
"analyse analysé construit créé livré conçu développé dirigé ingénierie établi exécuté généré implémenté amélioré augmenté lancé mené géré optimisé produit réduit recherché résolu automatisé coordonné déployé évalué formé négocié planifié programmé sécurisé testé"
).split(/\s+/));

const translations = {
  en:{
    eyebrow:"Free · Private · No signup",heroTitle:"See how well your CV matches a job description.",
    heroCopy:"Paste both texts and get a transparent heuristic match score, missing keywords, strengths and concrete improvements. Your text never leaves your browser.",
    privacy:"100% local processing — nothing is uploaded.",cvTitle:"Your CV",jobTitle:"Job description",
    cvPlaceholder:"Paste your CV text here…",jobPlaceholder:"Paste the job description here…",sample:"Load example",analyze:"Analyze match",clear:"Clear",
    keywordCoverage:"Keyword coverage",keywordCoverageDesc:"Important terms from the job description found in your CV",
    semanticOverlap:"Text similarity",semanticOverlapDesc:"TF-IDF cosine similarity between both texts",actionStrength:"Action language",
    actionStrengthDesc:"Detected action verbs in your CV",missingTitle:"Missing high-value terms",missingDesc:"Only add terms that genuinely describe your experience.",
    matchedTitle:"Matched terms",matchedDesc:"These relevant terms already appear in your CV.",suggestionsTitle:"What to improve",copyResult:"Copy summary",share:"Share tool",
    support:"Support this free tool",howEyebrow:"How it works",howTitle:"Useful signal, not fake certainty.",how1Title:"Extract relevant terms",
    how1Text:"The tool removes common stopwords, weighs repeated job-specific terms and keeps the most informative keywords.",
    how2Title:"Measure overlap",how2Text:"It combines keyword coverage with TF-IDF cosine similarity and several CV quality signals.",
    how3Title:"Explain the result",how3Text:"Instead of pretending to reproduce a recruiter’s ATS, it shows exactly what was matched and what was missing.",
    faq1q:"Is this an official ATS score?",faq1a:"No. ATS products use different ranking rules. This is a transparent heuristic diagnostic designed to help you tailor a CV, not predict a recruiter’s exact score.",
    faq2q:"Do you store my CV?",faq2a:"No. The analysis is performed locally in your browser. This site has no CV upload endpoint and no account system.",
    faq3q:"Should I copy every missing keyword?",faq3a:"No. Only use terminology that truthfully reflects your skills and experience. Keyword stuffing can make a CV worse.",
    footer:"A small privacy-first project by Achraf Saidi."
  },
  fr:{
    eyebrow:"Gratuit · Privé · Sans inscription",heroTitle:"Mesure l’adéquation entre ton CV et une offre d’emploi.",
    heroCopy:"Colle les deux textes et obtiens un score heuristique transparent, les mots-clés manquants, tes points forts et des améliorations concrètes. Tes données ne quittent jamais ton navigateur.",
    privacy:"Traitement 100 % local — rien n’est envoyé.",cvTitle:"Ton CV",jobTitle:"Offre d’emploi",
    cvPlaceholder:"Colle le texte de ton CV ici…",jobPlaceholder:"Colle l’offre d’emploi ici…",sample:"Charger un exemple",analyze:"Analyser",clear:"Effacer",
    keywordCoverage:"Couverture des mots-clés",keywordCoverageDesc:"Termes importants de l’offre retrouvés dans ton CV",
    semanticOverlap:"Similarité des textes",semanticOverlapDesc:"Similarité cosinus TF-IDF entre les deux textes",actionStrength:"Verbes d’action",
    actionStrengthDesc:"Verbes d’action détectés dans ton CV",missingTitle:"Termes importants manquants",missingDesc:"Ajoute uniquement les termes qui décrivent réellement ton expérience.",
    matchedTitle:"Termes retrouvés",matchedDesc:"Ces termes pertinents apparaissent déjà dans ton CV.",suggestionsTitle:"Ce que tu peux améliorer",copyResult:"Copier le résumé",share:"Partager l’outil",
    support:"Soutenir cet outil gratuit",howEyebrow:"Méthode",howTitle:"Un signal utile, sans fausse certitude.",how1Title:"Extraire les termes pertinents",
    how1Text:"L’outil retire les mots courants, pondère les termes spécifiques répétés et conserve les mots-clés les plus informatifs.",
    how2Title:"Mesurer le recouvrement",how2Text:"Il combine la couverture des mots-clés, une similarité cosinus TF-IDF et plusieurs signaux de qualité du CV.",
    how3Title:"Expliquer le résultat",how3Text:"Au lieu de prétendre reproduire l’ATS d’un recruteur, l’outil montre précisément ce qui correspond et ce qui manque.",
    faq1q:"Est-ce un vrai score ATS ?",faq1a:"Non. Les ATS utilisent des règles différentes. C’est un diagnostic heuristique transparent pour adapter un CV, pas la prédiction exacte d’un recruteur.",
    faq2q:"Mon CV est-il stocké ?",faq2a:"Non. L’analyse se fait localement dans ton navigateur. Le site n’a aucun système d’upload de CV ni de compte utilisateur.",
    faq3q:"Dois-je copier tous les mots-clés manquants ?",faq3a:"Non. Utilise seulement les termes qui correspondent réellement à tes compétences et expériences. Le bourrage de mots-clés peut dégrader un CV.",
    footer:"Un petit projet respectueux de la vie privée par Achraf Saidi."
  }
};

function normalize(text){
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9+#.\-\s]/g," ")
    .replace(/\s+/g," ").trim();
}
function words(text){ return normalize(text).split(" ").filter(w=>w.length>1); }
function wordCount(text){ return text.trim() ? text.trim().split(/\s+/).length : 0; }
function terms(text){
  return words(text).filter(w => !stopwords.has(w) && (w.length>2 || ["r","c","ai","ml"].includes(w)));
}
function frequencies(arr){
  const f={}; arr.forEach(x=>f[x]=(f[x]||0)+1); return f;
}
function extractKeywords(text, limit=28){
  const f=frequencies(terms(text));
  return Object.entries(f)
    .map(([term,count])=>({term,count,score:count*(1+Math.log(1+term.length))}))
    .sort((a,b)=>b.score-a.score || b.count-a.count)
    .slice(0,limit);
}
function cosineTfIdf(a,b){
  const A=frequencies(terms(a)), B=frequencies(terms(b));
  const vocab=[...new Set([...Object.keys(A),...Object.keys(B)])];
  if(!vocab.length) return 0;
  let dot=0,na=0,nb=0;
  for(const t of vocab){
    const df=(A[t]?1:0)+(B[t]?1:0);
    const idf=Math.log((2+1)/(df+1))+1;
    const va=(A[t]||0)*idf, vb=(B[t]||0)*idf;
    dot+=va*vb; na+=va*va; nb+=vb*vb;
  }
  return na && nb ? dot/(Math.sqrt(na)*Math.sqrt(nb)) : 0;
}
function detectedActions(text){
  return terms(text).filter(t=>actionVerbs.has(t)).length;
}
function hasNumbers(text){ return /\b\d+(?:[.,]\d+)?\s?(?:%|x|k|m|€|\$)?\b/i.test(text); }
function hasSections(text){
  const n=normalize(text);
  const sectionHints=["experience","education","skills","projects","summary","formation","competences","projets","profil"];
  return sectionHints.filter(s=>n.includes(s)).length;
}
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }

function analyze(){
  const cv=$("cvText").value.trim(), job=$("jobText").value.trim();
  if(wordCount(cv)<40 || wordCount(job)<30){
    toast(language==="fr" ? "Ajoute un CV et une offre un peu plus complets." : "Add a fuller CV and job description first.");
    return;
  }
  const jobKeywords=extractKeywords(job,30);
  const cvSet=new Set(terms(cv));
  const matched=jobKeywords.filter(k=>cvSet.has(k.term));
  const missing=jobKeywords.filter(k=>!cvSet.has(k.term));
  const totalWeight=jobKeywords.reduce((s,k)=>s+k.score,0)||1;
  const matchedWeight=matched.reduce((s,k)=>s+k.score,0);
  const coverage=matchedWeight/totalWeight;
  const similarity=cosineTfIdf(cv,job);
  const actions=detectedActions(cv);
  const actionScore=clamp(actions/12,0,1);
  const structureScore=clamp(hasSections(cv)/4,0,1);
  const evidenceScore=hasNumbers(cv)?1:.35;
  const lengthScore=wordCount(cv)>=250 && wordCount(cv)<=900 ? 1 : .65;
  const score=Math.round(100*(.45*coverage+.30*similarity+.10*actionScore+.07*structureScore+.05*evidenceScore+.03*lengthScore));
  const finalScore=clamp(score,0,100);

  const labels = language==="fr"
    ? finalScore>=80?["Très forte correspondance","Ton CV couvre bien le vocabulaire et le contenu de l’offre."]:finalScore>=65?["Bonne base","La correspondance est solide, mais quelques termes ou preuves peuvent être renforcés."]:finalScore>=45?["Correspondance moyenne","Plusieurs éléments importants de l’offre ne sont pas encore visibles dans ton CV."]:["Faible correspondance","Le CV et l’offre utilisent actuellement des contenus assez différents."]
    : finalScore>=80?["Strong match","Your CV covers the role’s language and content well."]:finalScore>=65?["Good base","The match is solid, with room to strengthen a few terms or proof points."]:finalScore>=45?["Moderate match","Several important elements from the role are not yet visible in your CV."]:["Low match","Your CV and the job description currently emphasize rather different content."];

  $("scoreRing").style.setProperty("--score",finalScore);
  $("scoreValue").textContent=finalScore;
  $("scoreLabel").textContent=labels[0];
  $("scoreExplanation").textContent=labels[1];
  $("coverageValue").textContent=Math.round(coverage*100)+"%";
  $("similarityValue").textContent=Math.round(similarity*100)+"%";
  $("actionValue").textContent=actions;
  $("missingCount").textContent=missing.length;
  $("matchedCount").textContent=matched.length;
  $("missingKeywords").innerHTML=missing.slice(0,18).map(k=>'<span class="chip">'+escapeHtml(k.term)+'</span>').join("") || '<span class="muted">'+(language==="fr"?"Aucun terme majeur détecté.":"No major missing term detected.")+'</span>';
  $("matchedKeywords").innerHTML=matched.slice(0,18).map(k=>'<span class="chip">'+escapeHtml(k.term)+'</span>').join("") || '<span class="muted">'+(language==="fr"?"Aucun terme majeur retrouvé.":"No major matched term yet.")+'</span>';

  const suggestions=[];
  if(coverage<.65) suggestions.push(language==="fr"
    ?["Mieux refléter le vocabulaire du poste","Reformule certaines expériences avec les termes de l’offre uniquement lorsqu’ils sont vrais pour toi."]
    :["Mirror the role’s language","Rephrase relevant experience using the job’s terminology only when it truthfully applies to you."]);
  if(!hasNumbers(cv)) suggestions.push(language==="fr"
    ?["Quantifier l’impact","Ajoute des résultats mesurables : %, volumes, délais, utilisateurs, revenus, précision ou gains de performance."]
    :["Quantify impact","Add measurable outcomes: %, volume, time saved, users, revenue, accuracy or performance gains."]);
  if(actions<6) suggestions.push(language==="fr"
    ?["Renforcer les verbes d’action","Commence davantage de puces par des verbes précis comme développé, optimisé, conçu, automatisé ou dirigé."]
    :["Use stronger action verbs","Start more bullets with precise verbs such as built, optimized, designed, automated or led."]);
  if(hasSections(cv)<3) suggestions.push(language==="fr"
    ?["Clarifier la structure","Utilise des sections explicites comme Expérience, Compétences, Projets et Formation."]
    :["Clarify structure","Use explicit sections such as Experience, Skills, Projects and Education."]);
  if(wordCount(cv)>900) suggestions.push(language==="fr"
    ?["Raccourcir le CV","Ton texte est long. Supprime les éléments faibles ou peu liés au poste et privilégie les réalisations."]
    :["Tighten the CV","Your text is long. Remove weak or unrelated detail and prioritize achievements."]);
  if(wordCount(cv)<220) suggestions.push(language==="fr"
    ?["Ajouter du contexte utile","Ton CV semble très court. Ajoute davantage de réalisations concrètes et de compétences pertinentes."]
    :["Add useful context","Your CV looks very short. Add more concrete achievements and role-relevant skills."]);
  if(suggestions.length<3) suggestions.push(language==="fr"
    ?["Faire une dernière relecture humaine","Vérifie la lisibilité, la vérité des affirmations et l’adéquation réelle avec les responsabilités du poste."]
    :["Do a human final pass","Check readability, factual accuracy and genuine alignment with the responsibilities of the role."]);

  $("suggestionsList").innerHTML=suggestions.slice(0,5).map((s,i)=>
    '<div class="suggestion"><div class="icon">'+(i+1)+'</div><div><strong>'+escapeHtml(s[0])+'</strong><p>'+escapeHtml(s[1])+'</p></div></div>'
  ).join("");

  lastResult={score:finalScore,coverage:Math.round(coverage*100),similarity:Math.round(similarity*100),actions,missing:missing.slice(0,10).map(x=>x.term)};
  $("results").classList.remove("hidden");
  $("results").scrollIntoView({behavior:"smooth",block:"start"});
}
function escapeHtml(s){ return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }
function updateCounts(){
  $("cvCount").textContent=wordCount($("cvText").value)+" "+(language==="fr"?"mots":"words");
  $("jobCount").textContent=wordCount($("jobText").value)+" "+(language==="fr"?"mots":"words");
}
function setLanguage(lang){
  language=lang; document.documentElement.lang=lang; $("langBtn").textContent=lang==="en"?"FR":"EN";
  document.querySelectorAll("[data-i18n]").forEach(el=>{ const k=el.dataset.i18n; if(translations[lang][k]) el.textContent=translations[lang][k]; });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{ const k=el.dataset.i18nPlaceholder; if(translations[lang][k]) el.placeholder=translations[lang][k]; });
  updateCounts();
}
function loadExample(){
  if(language==="fr"){
    $("cvText").value="DATA SCIENTIST\nProfil\nData scientist avec expérience en Python, machine learning et visualisation de données.\n\nExpérience\nDéveloppé des modèles de classification en Python et scikit-learn. Optimisé un pipeline de préparation de données et réduit le temps de traitement de 35 %. Créé des dashboards et présenté les résultats aux équipes métier.\n\nCompétences\nPython, SQL, pandas, scikit-learn, statistiques, machine learning, Git, Power BI.\n\nFormation\nMaster en Data Science.";
    $("jobText").value="Nous recherchons un Data Scientist maîtrisant Python, SQL, machine learning et les méthodes statistiques. Le candidat devra développer et déployer des modèles prédictifs, travailler avec des pipelines de données, utiliser Docker et des services cloud, suivre la performance des modèles et communiquer avec les parties prenantes. Une expérience de scikit-learn, Git, visualisation, A/B testing et MLOps est appréciée.";
  }else{
    $("cvText").value="DATA SCIENTIST\nSummary\nData scientist with experience in Python, machine learning and data visualization.\n\nExperience\nDeveloped classification models in Python and scikit-learn. Optimized a data preparation pipeline and reduced processing time by 35%. Created dashboards and presented findings to business teams.\n\nSkills\nPython, SQL, pandas, scikit-learn, statistics, machine learning, Git, Power BI.\n\nEducation\nMSc in Data Science.";
    $("jobText").value="We are hiring a Data Scientist with strong Python, SQL, machine learning and statistical modeling skills. You will develop and deploy predictive models, work with data pipelines, Docker and cloud services, monitor model performance and communicate with stakeholders. Experience with scikit-learn, Git, visualization, A/B testing and MLOps is preferred.";
  }
  updateCounts();
}
function toast(msg){
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200);
}
function activateSupport(){
  if(!SUPPORT_URL) return;
  ["supportTop","supportBottom"].forEach(id=>{ const el=$(id); el.href=SUPPORT_URL; el.classList.remove("hidden"); });
}

$("analyzeBtn").addEventListener("click",analyze);
$("sampleBtn").addEventListener("click",loadExample);
$("clearBtn").addEventListener("click",()=>{ $("cvText").value=""; $("jobText").value=""; $("results").classList.add("hidden"); updateCounts(); });
$("cvText").addEventListener("input",updateCounts);
$("jobText").addEventListener("input",updateCounts);
$("langBtn").addEventListener("click",()=>setLanguage(language==="en"?"fr":"en"));
$("copyBtn").addEventListener("click",async()=>{
  if(!lastResult) return;
  const txt=(language==="fr"?"CV Match Lab — score ":"CV Match Lab — score ")+lastResult.score+"/100 · "+lastResult.coverage+"% keywords · "+lastResult.similarity+"% similarity"+(lastResult.missing.length?" · "+(language==="fr"?"termes à examiner: ":"terms to review: ")+lastResult.missing.join(", "):"");
  try{ await navigator.clipboard.writeText(txt); toast(language==="fr"?"Résumé copié.":"Summary copied."); }catch{ toast(txt); }
});
$("shareBtn").addEventListener("click",async()=>{
  const data={title:"CV Match Lab",text:language==="fr"?"Un analyseur CV/offre gratuit et privé.":"A free, privacy-first CV/job match checker.",url:location.href};
  try{ if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); toast(language==="fr"?"Lien copié.":"Link copied."); }}catch{}
});
activateSupport();
setLanguage("en");
updateCounts();
