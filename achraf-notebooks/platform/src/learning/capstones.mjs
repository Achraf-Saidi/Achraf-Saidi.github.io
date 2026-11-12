// Capstone designs are educational blueprints. Only statistical-inference is open to submission.
// These are original assignments, not borrowed from Coursera, DataCamp or universities.
const rubric=[
{id:"design",weight:20,label:{fr:"Question et plan d'étude",en:"Research question and study design"}},
{id:"mathematics",weight:20,label:{fr:"Justification mathématique",en:"Mathematical derivation"}},
{id:"implementation",weight:25,label:{fr:"Implémentation vérifiable",en:"Verifiable implementation"}},
{id:"validation",weight:25,label:{fr:"Validation, incertitude et limites",en:"Validation, uncertainty and limitations"}},
{id:"reproducibility",weight:10,label:{fr:"Reproductibilité et présentation",en:"Reproducibility and communication"}}
];
export const CAPSTONES=[
{id:"statistical-inference",title:{fr:"Prédire et calibrer un risque avec incertitude",en:"Predict and calibrate risk with uncertainty"},
 status:"pilot",expectedHours:24,
 objective:{fr:"Concevoir une expérience de prédiction binomiale rigoureuse. Simuler des cohortes avec risque conditionnel connu, effectuer une régression logistique pénalisée, comparer des intervalles fréquentistes et une analyse bayésienne, puis mesurer la calibration sur un test indépendant.",
 en:"Design a rigorous binary-risk study. Simulate cohorts with known conditional risk, fit regularized logistic regression, contrast frequentist intervals with Bayesian inference and evaluate probability calibration on untouched data."},
 requirements:{
 fr:["Définir explicitement la cible et l'estimand; documenter le mécanisme de données manquantes, les exclusions et les hypothèses d'indépendance.",
 "Dériver les gradients de la vraisemblance Bernoulli et les vérifier avec une différence finie; ne jamais ajuster la standardisation sur le test.",
 "Comparer un modèle nul, une régression logistique et une variante régularisée sous validation croisée sur les seules données de développement.",
 "Construire une analyse bayésienne simple avec un prior annoncé, un échantillonnage MCMC reproductible, et des diagnostics multi-chaînes avec ESS et R-hat.",
 "Rapporter Brier score, log loss, discrimination, calibration par groupe, intervalles, erreurs en fonction du shift et au moins trois limites identifiées."],
 en:["Define target and estimand; document missingness, exclusions and independence assumptions.",
 "Derive Bernoulli-likelihood gradients and check finite differences; fit standardization only on development folds.",
 "Compare a null model, logistic regression and a penalized model using cross-validation confined to development data.",
 "Provide a simple Bayesian analysis with an explicit prior, reproducible MCMC and diagnostics from multiple chains using ESS and R-hat.",
 "Report Brier score, log loss, discrimination, groupwise calibration, uncertainty intervals, shift-related errors and at least three limitations."]},
 deliverables:{fr:["Dépôt GitHub contenant README, code Python, environment verrouillé et tests automatisés","Rapport scientifique PDF ou Markdown avec hypothèses, équations, figures et tableaux","Fichier de métriques JSON, données synthétiques et graines documentées","Journal des erreurs, analyses d'ablation et limites éthiques"],
 en:["GitHub repository with README, Python code, pinned environment and automated tests","Scientific PDF or Markdown report with assumptions, equations, figures and tables","Metrics JSON, synthetic data and documented random seeds","Error log, ablation analyses and ethical limitations"]},
 rubric},
{id:"mathematical-foundations",title:{fr:"Un solveur d'optimisation numérique de zéro",en:"Build a numerical optimizer from first principles"},status:"planned",expectedHours:30,
 objective:{fr:"Dériver les gradients, comparer des solveurs et vérifier les conditions d'optimalité de problèmes convexes et contraints.",en:"Derive gradients, compare solvers and verify optimality conditions for convex and constrained problems."},
 requirements:{fr:["Implémenter descente de gradient, Newton et projetée avec vérification des gradients","Étudier conditionnement, choix du pas et cas d'échec","Comparer à SciPy/HiGHS sur un problème explicite"],en:["Implement gradient descent, Newton and projected methods with gradient checks","Study conditioning, step sizes and failure cases","Benchmark against SciPy/HiGHS on an explicit problem"]},rubric},
{id:"machine-learning",title:{fr:"Pipeline ML avec dérive de distribution",en:"A machine-learning pipeline under distribution shift"},status:"planned",expectedHours:35,
 objective:{fr:"Concevoir des baselines, des pipelines sûrs et une évaluation sous décalage de covariables et de concept.",en:"Build honest baselines, leakage-safe pipelines and evaluation under covariate and concept shift."},
 requirements:{fr:["Séparer développement, validation et test selon une chronologie connue","Effectuer les sélections de variables dans chaque pli","Comparer modèles simples et ensembles avec intervalles et analyses de dérive"],en:["Separate development, validation and test using known chronology","Nest feature selection within cross-validation","Compare simple and ensemble models with uncertainty and drift diagnostics"]},rubric},
{id:"deep-learning-llm",title:{fr:"Mini-Transformer interprétable et vérifié",en:"A tested and interpretable tiny Transformer"},status:"planned",expectedHours:45,
 objective:{fr:"Implémenter un modèle causal sur un corpus synthétique libre de droits, vérifier la rétropropagation et évaluer les limites.",en:"Implement a causal model on a rights-safe synthetic corpus, validate gradients and benchmark limitations."},
 requirements:{fr:["Définir la tokenisation et les objectifs de prédiction","Prouver l'absence de fuite du futur via les masques","Comparer décodage glouton, température et top-k","Mesurer mémoire, temps, perplexité et erreurs"],en:["Specify tokenization and next-token objectives","Test that causal masks exclude future-token leakage","Compare greedy decoding, temperature and top-k","Measure memory, latency, perplexity and failure cases"]},rubric},
{id:"reinforcement-optimization",title:{fr:"Planification MDP et énergie sous contraintes",en:"MDP planning and constrained energy dispatch"},status:"planned",expectedHours:34,
 objective:{fr:"Construire un environnement contrôlable et étudier la robustesse entre modèle de transition estimé et réel.",en:"Build a controlled MDP and examine robustness to mismatch between estimated and actual transitions."},
 requirements:{fr:["Formuler espaces d'état et d'action, récompenses et contraintes","Dériver Bellman et coder l'itération de valeur","Comparer une politique de référence à une stratégie optimisée","Mesurer la robustesse et les échecs hors distribution"],en:["Define states, actions, rewards and constraints","Derive Bellman and code value iteration","Compare baseline and optimized policies","Test robustness and out-of-distribution failures"]},rubric},
{id:"biomedical-research-ai",title:{fr:"Risque clinique sous censure et changement de pratique",en:"Clinical risk under censoring and practice changes"},status:"planned",expectedHours:40,
 objective:{fr:"Évaluer un modèle de temps-à-événement avec censure, évolution de traitement et validation temporelle, sur données simulées.",en:"Evaluate censored time-to-event prediction with treatment changes and temporal validation on synthetic data."},
 requirements:{fr:["Simuler T et C sous deux régimes de censure","Comparer Kaplan–Meier et modèles de survie","Préciser l'estimand horizon et les hypothèses IPCW","Tester la calibration et les erreurs après changement de prise en charge"],en:["Simulate event and censoring times under distinct censoring regimes","Compare Kaplan–Meier and survival models","Define horizon estimands and IPCW assumptions","Evaluate calibration after changes in clinical practice"]},rubric},
{id:"robotics-embodied",title:{fr:"Robot mobile autonome en simulation",en:"An autonomous mobile robot in simulation"},status:"planned",expectedHours:55,
 objective:{fr:"Faire évoluer un robot en simulation avec estimation d'état, planification A*, asservissement et gestion d'échecs.",en:"Build a simulated robot with state estimation, A* planning, feedback control and failure handling."},
 requirements:{fr:["Dériver la cinématique et vérifier les unités","Implémenter A* et des trajectoires sans collisions","Simuler capteurs et filtrage de Kalman","Tester commandes et arrêts sûrs sous bruit et panne de capteur"],en:["Derive kinematics and check units","Implement A* and collision-free trajectories","Simulate sensors and Kalman filtering","Test safe control and stopping under noise and sensor failures"]},rubric}
];
export function publicCapstones(lang="fr"){
 const l=lang==="en"?"en":"fr";
 return CAPSTONES.map(c=>({id:c.id,title:c.title[l],status:c.status,expectedHours:c.expectedHours,
  objective:c.objective[l],requirements:c.requirements[l],deliverables:c.deliverables?.[l]||[],
  rubric:c.rubric.map(r=>({id:r.id,weight:r.weight,label:r.label[l]}))}));
}
