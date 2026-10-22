# SAHATI — Vision produit

SAHATI relie les tâches du patient et des équipes à un dossier de soins longitudinal. Sa valeur doit se mesurer à la continuité de l’information, au temps de travail réellement économisé et à la capacité des utilisateurs à accomplir une tâche. Le prototype 0.2 est une démonstration synthétique ; il n’est pas validé pour des soins.

## Usages et proposition de valeur

| Utilisateur | Besoin prioritaire | Réponse produit |
|---|---|---|
| Patient | Retrouver une prochaine étape, un document et une équipe | Accueil mobile, rendez-vous, dossier, PDF, explication fidèle et messagerie institutionnelle |
| Médecin / résident | Comprendre le contexte et produire une consultation fiable | Synthèse, brouillon structuré, historique, prescription et demandes d’examens reliées |
| Infirmier | Savoir ce qui reste à réaliser et transmettre | Tâches, constantes, transmissions et mouvements du patient |
| Laboratoire / radiologie | Suivre une demande jusqu’à sa diffusion | Identifiants, files de travail, étapes de validation et communication des observations critiques |
| Pharmacie | Délivrer la prescription avec une trace | Lots, quantité, péremption et mouvement atomique |
| Accueil | Éviter les doublons et organiser les passages | Traits d’identité, calendrier, confirmation et admission |
| Étudiant / enseignant | Apprendre sans ouvrir les dossiers réels | Cas pédagogiques, correction, progression et futurs stages supervisés |
| Chercheur | Analyser uniquement les données autorisées | Protocole, décision indépendante, accès personnel expirant et dictionnaire minimal |
| Direction / autorité habilitée | Comprendre des capacités et une activité documentées | Agrégats, définition des indicateurs et qualité des remontées |

## Principes de conception

1. Une action modifie un état partagé du scénario. Le rendez-vous, la consultation et les documents ne sont pas des pages indépendantes.
2. Le patient reçoit une information publiée et contextualisée. L’accès étudiant est distinct de l’accès clinique.
3. Une information absente reste absente. Un résultat n’est pas transformé automatiquement en diagnostic.
4. Les interfaces professionnelles mettent les tâches avant les compteurs ; les interfaces patient et campus favorisent des actions courtes et une lecture mobile.
5. L’identité, les habilitations, la correction et la traçabilité sont des éléments du produit, pas une décoration de sécurité.
6. Les modules futurs sont déclarés comme tels. Aucune adoption institutionnelle ou intégration officielle n’est suggérée.

## Adaptation algérienne

Préparer des configurations pour CHU, EHU, EPH, EPSP, EHS, polycliniques, structures privées et laboratoires. Chaque établissement définit ses unités, calendriers, ressources et protocoles. La monnaie de démonstration est le dinar ; aucune tarification universelle n’est supposée. CNAS/CASNOS doivent être traitées comme des interfaces futures autorisées, avec étude des procédures et contrats.

Les identifiants actuels sont locaux. Un rapprochement national demanderait une gouvernance de l’identité, une procédure de revue humaine et des accords ; aucun identifiant national de santé n’est inventé. Le répertoire de wilayas doit être versionné depuis une source institutionnelle lors du pilote.

Le français couvre les parcours de démonstration. L’arabe couvre la navigation, plusieurs parcours patients et les explications déterministes ; certains formulaires professionnels et les cas restent en français. Le RTL et les PDF arabes sont préparés, sans revendication de traduction intégrale. Tamazight et anglais sont des étapes futures après validation terminologique.

## Valeur à évaluer lors du pilote

Mesurer la durée médiane des tâches, les erreurs d’identité détectées, les dossiers incomplets, les résultats non transmis, la compréhension patient par reformulation, l’accessibilité sur téléphone et les incidents de confidentialité. Établir une période de référence avant toute affirmation d’amélioration. Les indicateurs du prototype ne constituent pas une mesure de performance réelle.

La trajectoire privilégie un service volontaire et quelques workflows complets, puis les modules supplémentaires justifiés par le terrain. Les recommandations d’architecture et de gouvernance s’inspirent de références publiques documentées dans `BENCHMARK.md` ; elles constituent des choix de conception originaux.


## Incrément livré — 22 octobre 2026

Le patient gagne un espace quotidien pour préparer ses visites, garder ses questions et exporter son agenda. Sina sert de guide permanent avec des scénarios locaux. La pharmacie gère le cycle article → commande → réception → lot → délivrance, avec comptages, emplacements et rappels. L’interface s’ouvre au français, à l’arabe RTL, à l’anglais et à Tamaziɣt latin. Ces ajouts approfondissent la démonstration persistante ; le passage à un service hospitalier partagé reste soumis aux exigences de pilote.
