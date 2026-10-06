/*
  CATALOGUE CODE32
  ----------------
  Pour ajouter un produit : duplique un objet ci-dessous et change ses champs.
  Quand ton produit Payhip est prêt, colle son lien direct dans checkoutUrl.
  Tant que checkoutUrl est vide, le site affiche automatiquement « Bientôt en vente ».
*/
window.CODE32_PRODUCTS = [
  {
    id: "fonctions-pack",
    title: "Pack Fonctions — entraînement complet",
    subtitle: "58 exercices + 4 problèmes d’examen",
    category: "Secondaire",
    tags: ["Secondaire", "CESS", "Mathématiques"],
    level: "4e → 6e secondaire",
    price: "8,90 €",
    type: "Exercices + corrigés",
    badge: "Premier pack",
    featured: true,
    description: "Lecture de graphes, domaine et image, transformations, composition, limites, dérivées, variations, convexité, optimisation, logarithmes et primitives.",
    bullets: [
      "Progression du rappel de base aux questions d’examen",
      "Exercices de lecture de f, f′ et f″",
      "Problèmes de reconstruction, optimisation et logarithmes",
      "Corrigés et pistes de résolution"
    ],
    pages: [
      { label: "APERÇU 01", title: "Le plan de travail", body: "Un parcours progressif : comprendre le vocabulaire, lire un graphe, calculer, interpréter, puis résoudre sans aide." },
      { label: "APERÇU 02", title: "Exercice type", body: "À partir du graphe de f′, dresser les variations de f et identifier ses extrema. Justifier chaque intervalle." },
      { label: "SUITE DU PDF", title: "Contenu réservé", body: "Les exercices suivants, problèmes d’examen et corrigés sont débloqués après achat.", locked: true }
    ],
    checkoutUrl: ""
  },
  {
    id: "cess-analyse",
    title: "CESS Maths — analyse & fonctions",
    subtitle: "Méthodes, pièges et exercices ciblés",
    category: "CESS",
    tags: ["CESS", "Secondaire", "Mathématiques"],
    level: "Préparation CESS",
    price: "12,90 €",
    type: "Pack examen",
    badge: "À venir",
    description: "Un pack orienté examen : reconnaître rapidement la méthode à utiliser, éviter les erreurs classiques et enchaîner des exercices représentatifs.",
    bullets: ["Fiche réflexe par type de question", "Exercices chronométrés", "Erreurs fréquentes expliquées", "Mini-examens de synthèse"],
    pages: [
      { label: "APERÇU 01", title: "La méthode", body: "Chaque chapitre commence par les signaux qui permettent d’identifier la bonne stratégie en quelques secondes." },
      { label: "APERÇU 02", title: "Question minute", body: "On te donne une fonction et son graphique : quelles informations peux-tu obtenir sans calcul ?" },
      { label: "SUITE DU PDF", title: "Contenu réservé", body: "Le pack complet sera disponible au lancement de cette ressource.", locked: true }
    ],
    checkoutUrl: ""
  },
  {
    id: "r-fonctions",
    title: "R — fonctions, apply & manipulation",
    subtitle: "Comprendre ce que le code fait vraiment",
    category: "Université",
    tags: ["Université", "Programmation", "R"],
    level: "Débutant → intermédiaire",
    price: "5,90 €",
    type: "Fiche + exercices",
    badge: "À venir",
    description: "Arguments par défaut, fonctions anonymes, apply, pipes, data.frame, setNames et raisonnement pas à pas sur des exercices de synthèse.",
    bullets: ["Fonctions et portée des arguments", "apply sans magie", "Pipes natifs et enchaînement", "Exercices de synthèse corrigés"],
    pages: [
      { label: "APERÇU 01", title: "Lire avant d’exécuter", body: "On apprend à prédire la sortie d’un petit bloc R avant de lancer le code." },
      { label: "APERÇU 02", title: "apply décomposé", body: "Que représente x à chaque itération ? Pourquoi MARGIN = 1 traite les lignes ?" },
      { label: "SUITE DU PDF", title: "Contenu réservé", body: "La fiche complète sera débloquée après achat.", locked: true }
    ],
    checkoutUrl: ""
  },
  {
    id: "bayes-proba",
    title: "Probabilités & Bayes — exercices essentiels",
    subtitle: "Passer de la formule au raisonnement",
    category: "Université",
    tags: ["Université", "Statistiques", "Bayes"],
    level: "Bachelier / Master",
    price: "7,90 €",
    type: "Exercices + méthodes",
    badge: "À venir",
    description: "Probabilités conditionnelles, indépendance, formule de Bayes, lois classiques et réflexes de modélisation avec des exercices progressifs.",
    bullets: ["Arbres et probabilités conditionnelles", "Bayes expliqué sans raccourci", "Lois usuelles", "Exercices corrigés étape par étape"],
    pages: [
      { label: "APERÇU 01", title: "Le bon dénominateur", body: "Avant Bayes, identifier l’événement conditionnant et écrire clairement ce que l’on cherche." },
      { label: "APERÇU 02", title: "Exercice type", body: "Un test possède une sensibilité et une spécificité données : calculer la probabilité postérieure après un résultat positif." },
      { label: "SUITE DU PDF", title: "Contenu réservé", body: "Les autres exercices et corrigés seront accessibles après achat.", locked: true }
    ],
    checkoutUrl: ""
  },
  {
    id: "ml-core",
    title: "Machine Learning — le socle qui compte",
    subtitle: "Pipeline, validation, features et modèles",
    category: "Data & IA",
    tags: ["Data & IA", "Université", "Machine Learning"],
    level: "Université / autoformation",
    price: "9,90 €",
    type: "Guide + exercices",
    badge: "À venir",
    description: "Construire un pipeline propre : preprocessing, séparation des données, cross-validation, sélection de variables, métriques et comparaison de modèles.",
    bullets: ["Train / validation / test sans fuite", "Feature selection", "Cross-validation", "Choix des métriques et interprétation"],
    pages: [
      { label: "APERÇU 01", title: "Le pipeline correct", body: "Tout ce qui apprend des données doit être ajusté uniquement sur le train dans chaque fold." },
      { label: "APERÇU 02", title: "Question de diagnostic", body: "Un score CV est excellent mais le test s’effondre : quelles fuites ou erreurs vérifier en premier ?" },
      { label: "SUITE DU PDF", title: "Contenu réservé", body: "Le guide complet sera disponible au lancement.", locked: true }
    ],
    checkoutUrl: ""
  },
  {
    id: "deep-learning",
    title: "Deep Learning — réseaux de neurones de zéro",
    subtitle: "Intuition, maths et entraînement",
    category: "Data & IA",
    tags: ["Data & IA", "Université", "Deep Learning"],
    level: "Université / autoformation",
    price: "9,90 €",
    type: "Guide + exercices",
    badge: "À venir",
    description: "Des neurones à la rétropropagation : fonctions d’activation, loss, gradient, optimisation, régularisation et lecture d’une architecture.",
    bullets: ["Forward pass", "Backpropagation", "Optimiseurs et learning rate", "Overfitting et régularisation"],
    pages: [
      { label: "APERÇU 01", title: "Un neurone", body: "Une combinaison linéaire, un biais, puis une non-linéarité : le bloc fondamental avant de parler de réseau profond." },
      { label: "APERÇU 02", title: "Le gradient", body: "Comprendre ce que la dérivée indique à chaque paramètre et pourquoi la chaîne de dérivées apparaît." },
      { label: "SUITE DU PDF", title: "Contenu réservé", body: "Le contenu complet sera débloqué après achat.", locked: true }
    ],
    checkoutUrl: ""
  }
];