# Cahier éditorial des masterclasses — Achraf Notebooks

État au 12 novembre 2026. Les cours sont des **brouillons originaux** en français et anglais. Aucune relecture indépendante, accréditation ou certification scientifique n'est revendiquée.

## Ce qui est effectivement disponible dans cette branche

L'atlas complet contient 151 modules : 92 ont déjà du texte développé de différents niveaux de profondeur ; 59 sont encore des plans guidés. **Le nombre de chapitres enrichis reste 92**, car cette passe approfondit dix d'entre eux sans ajouter de faux cours complets au décompte.

| ID | Objectif du chapitre approfondi | Vérification de laboratoire |
| --- | --- | --- |
| B1 | Théorème du rang, moindres carrés, QR/SVD, PCA, conditionnement | SVD, projection, équations normales, PCA |
| B7 | Convexité, Jensen, dualité, KKT, LASSO et proximal | Optimum projeté, dualité, soft-thresholding |
| D3 | Lois jointes, conditionnelles, Bayes, variance totale, jacobiens, gaussiennes | Probabilités marginales, Bayes, exemple dépendant non corrélé |
| D9 | GLM, famille exponentielle, score/Hessienne logistique, Poisson, calibration | Newton logistique, différences finies, Hessienne PSD |
| F2 | Protocole ML, anti-fuite, CV, sélection, calibrage, shifts | Pipeline scikit-learn, CV et métriques sur test réservé |
| G3 | Graphes de calcul, AD avant/inverse, VJP, gradients partagés | Mini-autodiff Python pur et gradient checks |
| G4 | Backprop scalaire et matricielle, logits stables, gradient checks | MLP NumPy 2→3→1, toutes les dérivées vérifiées |
| H2 | Q/K/V, attention causale multi-têtes, masques, blocs, cache | Attention NumPy avec test de non-fuite future |
| H4 | Température, top-k, nucleus, cache KV, quantification, latence | Sampling NumPy normalisé, seuils et mémoire |
| I2 | MDP, fonctions de valeur, Bellman, contraction, value iteration | Évaluation exacte de politique + résidu et contraction |

Ces dix chapitres sont fournis avec **10 sections théoriques et 4 exercices corrigés** par langue, en plus d'un laboratoire exécutable et du contenu antérieur. D6 (Student et inférence) et D13 (MCMC) avaient déjà reçu des approfondissements séparés de dix sections. Cela ne signifie pas que tous les modules sont finalisés.

## Vérification automatisée

- `npm test` contrôle la structure bilingue, les numéros de chapitre, l'intégrité de l'inventaire et la présence de quatre exercices ouverts par module.
- `node scripts/verify-masterclass-code.mjs` exécute **le code Python réellement affiché aux apprenants** après installation de `projects/requirements.txt`. Ce contrôle fait partie de `.github/workflows/notebooks-verify.yml`.
- Le workflow Chromium ouvre les pages réelles en français et anglais et vérifie le chargement des sections et des corrections.
- Les exercices ouverts publiquement ne sont pas des examens certifiants : leurs réponses figurent dans le navigateur. Les futurs examens de certification passent par une banque **privée** et un serveur contrôlé.

## Barème éditorial à atteindre pour chaque module

Un cours ne peut être marqué comme « revu scientifiquement » sans : (1) objectifs et prérequis exacts, (2) démonstrations vérifiées avec hypothèses, (3) figures originales lisibles et légendées, (4) laboratoire reproductible incluant tests unitaires et contrôle numérique, (5) exercices progressifs et questions de transfert, (6) protocole d'évaluation de compréhension, (7) références originales attribuées, (8) relecture FR/EN et accessibilité, (9) revue indépendante datée et identifiée, (10) mise à jour selon l'évolution scientifique.

**Ce qui reste ouvert :** 59 modules à rédiger réellement ; compléter les modules de la première vague dont les chapitres sont encore courts ; élargir le nombre d'exercices et visualisations ; créer de vraies banques d'examens privées ; organiser l'évaluation humaine des projets ; tester la pédagogie auprès d'étudiants. Aucun de ces objectifs n'est réputé atteint par la seule présence des fichiers sur GitHub.
