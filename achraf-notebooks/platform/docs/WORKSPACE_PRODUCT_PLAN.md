# Achraf’s Notebook — plateforme d’apprentissage et studio éditorial

Version du 18 novembre 2026. Mise en œuvre sur la branche `feature/notebook-learning-workspace-20261118`, à partir de la branche Academy existante. Les 151 modules historiques et leurs sources sont conservés. Aucun déploiement VPS ni paiement réel n’est effectué par cette modification.

## 1. Le produit à construire

La promesse : comprendre les sciences de l’IA avec un parcours lisible, des ressources approfondies et une progression dont les preuves sont explicites. La différenciation ne repose pas sur un catalogue artificiellement immense ou une affirmation de supériorité à Coursera : elle repose sur la continuité entre intuition, mathématiques, code, exercices, retour sur erreur et projet.

Public initial recommandé : étudiants francophones de licence/master en informatique, statistiques et data science. Première spécialisation commercialisable à démontrer : inférence statistique et Bayes. Les autres parcours restent explorables avec leur statut éditorial réel.

Le premier objectif utilisateur est toujours visible : **que travailler maintenant ?** Le dashboard présente ensuite le cap, la progression, les révisions et les notes. Les fonctions d’édition et de business sont regroupées dans le studio, protégé côté serveur.

## 2. Expérience mise en œuvre

| Espace | Comportement |
|---|---|
| Inscription | Prénom/nom, e-mail, mot de passe ; bascule connexion ; affichage du mot de passe ; lien de vérification ; renvoi de lien ; demande et finalisation de réinitialisation |
| Onboarding | Trois étapes : objectif, point de départ, rythme et jours préférés ; changement ultérieur sans effacement des notes |
| Tableau de bord | Prochaine notion, cap choisi, modules étudiés, moyenne des tentatives, temps déclaré sur sept jours, révisions dues et notes récentes |
| Roadmap | Ordre topologique des prérequis réels du catalogue ; distinction entre fondations ajoutées et modules visés ; explication du choix ; durée indicative |
| Catalogue | Recherche par identifiant, titre et thèmes ; filtre de discipline ; statut du contenu ; prérequis ; accès aux 151 modules |
| Espace de travail | Leçons publiées dans le studio ; lien vers le Notebook historique ; notes ; session déclarée ; révisions ; mode concentration |
| Résultats | Historique des tentatives, score, statut, courbe, meilleurs résultats ; connexion au service d’examen existant |
| Carnet | Notes par module, édition et sauvegarde explicite, contrôle de version, export JSON |
| Révisions | Liste à échéance et à venir ; rappel actif ; quatre appréciations ajustant l’intervalle |
| Assistant | Question contextualisée au module ; recherche dans les textes publiés autorisés ; ressources citées avec version ; état « IA non activée » |
| Profil | Rythme, objectif, export des données chargées dans l’espace, déconnexion et accès aux offres |
| Studio | Création, édition, aperçu, publication et historique de leçons ; ressources ; formations ; questions privées ; apprenants ; offres ; simulation économique |

Principes UI : fond clair calme, contraste vert profond, titres éditoriaux, navigation stable, recherche rapide au clavier, actions principales explicites, interface responsive, thème sombre, mouvement réduit. Pas de classement humiliant ni de série quotidienne punitive. Les données d’exemple n’apparaissent que dans l’aperçu identifié comme démonstration.

### Trois états qui ne doivent jamais être confondus

1. **Étudié** : l’apprenant déclare avoir lu/travaillé le module.
2. **Révisé** : l’apprenant déclare avoir essayé de restituer la notion, et estime sa facilité.
3. **Validé** : un examen corrigé côté serveur a été réussi.

Le pourcentage de lecture et le temps déclaré ne donnent aucun droit à un certificat. Un niveau « avancé » choisi à l’inscription ne supprime pas automatiquement des prérequis. La durée des modules vient du catalogue existant : certaines sont grossières et doivent être affinées avec les premiers apprenants. Pour un lecteur expérimenté, les fondations peuvent être relues puis déclarées étudiées ; cela ne constitue pas une validation de maîtrise.

## 3. Évaluations et passage aux étapes suivantes

Le pilote existant comporte D3, D6, D9, D13 puis un final. Les autres spécialisations ne doivent pas être affichées comme certifiantes tant que leurs examens ne sont pas écrits et validés.

- Examen de module : 10 questions, 35 minutes, seuil de 80 %.
- Final : 24 questions, 70 minutes, seuil de 85 %, plancher de 50 % dans chaque domaine.
- Tirage par domaine avec au moins un tiers de questions numériques.
- **Amélioration de cette version** : la moitié au minimum des items effectivement tirés est de difficulté 3 ou supérieure. Vérifier seulement la difficulté de la banque disponible ne suffisait pas.
- Ordre et propositions aléatoires ; réponses privées conservées côté serveur.
- Limite existante de trois départs par examen sur 24 heures, reprise d’une tentative active, échéance et correction côté serveur.
- Les versions de questions sont conservées dans le snapshot de tentative ; une modification ultérieure de banque ne réécrit pas l’épreuve déjà commencée.
- Le certificat existant nécessite aussi un projet versionné relu par une personne identifiée. L’interface de revue de projet n’est pas ajoutée dans ce lot : le workflow de validation existant reste séparé.

### Règles de rédaction de la banque

Prévoir au moins 16 questions relues par module pilote, dont au moins 4 numériques et 8 de difficulté ≥3. Pour chaque item : objectif mesuré, énoncé autonome, hypothèses explicites, distracteurs représentant des erreurs plausibles, explication du corrigé, traduction vérifiée. La publication d’un item dans le studio engage le relecteur connecté.

La banque réelle doit être écrite séparément des exemples publics. Les fixtures des tests de logiciel ne sont pas une banque de formation. Une épreuve doit refuser de démarrer si la banque ne respecte pas ses contraintes.

### Extension pédagogique suivante (non implémentée dans ce lot)

- Diagnostic initial à faible enjeu par notion, sans certificat.
- Quiz formatifs illimités avec indices, puis nouvelle variante après retour sur erreur.
- Examens validants séparés, avec difficulté comparable et sans indice IA pendant la tentative.
- Exercices de transfert et projets reproductibles évalués sur un barème visible.
- Analyse de qualité des items : taux de réussite, discrimination, distracteurs et ambiguïtés, après effectif suffisant.
- Aménagements de durée documentés et accessibilité des épreuves.

## 4. Studio administrateur

### Leçons et médias

Une leçon est rattachée à un module. L’éditeur compose des blocs : titres, texte, encadrés, code affiché, liens HTTPS, données de graphique, fichiers PDF et images PNG/JPEG. Les blocs sont réordonnables. Le panneau de droite montre le rendu apprenant.

Les fichiers sont limités à 8 Mo, leur signature est vérifiée et leur accès requiert une session. Un fichier associé uniquement à un brouillon reste réservé à l’admin. Les images sont affichables dans les leçons et les PDF sont proposés en téléchargement. Le stockage binaire en PostgreSQL est un choix de lancement simple ; un stockage objet privé avec contrôle d’accès et analyse de fichiers sera préférable si les volumes augmentent.

Chaque sauvegarde crée une version. Reprendre une version ancienne la charge dans l’éditeur, puis demande un nouvel enregistrement ; cela ne détruit pas l’historique. Les modifications concurrentes renvoient un conflit au lieu d’écraser silencieusement le travail d’un autre onglet.

Les cours historiques restent gérés par leurs sources Astro/MDX. Le studio ajoute des leçons et des regroupements ; il ne réécrit pas automatiquement ces fichiers historiques. Une migration éditoriale complète de ces sources pourra suivre après validation du schéma de blocs.

### Formations

Cours, parcours et ateliers disposent d’un titre, d’une description, de modules choisis et d’un état brouillon/publié. Le catalogue apprenant présente les regroupements publiés. Les types et regroupements éditoriaux ne changent pas les règles du moteur d’examens.

### Questions et apprenants

Le studio permet de créer/modifier une question bilingue à choix ou numérique, son corrigé, sa difficulté et son approbation. La banque ne peut être lue que par les identifiants admin configurés au serveur. La liste paginée des apprenants présente identité, objectif, modules étudiés et examens réussis, sans donner accès aux notes personnelles.

Le journal retrace les changements éditoriaux, les fichiers et les offres. L’accès admin ne peut jamais être attribué par l’écran d’inscription ou un champ envoyé par le navigateur.

## 5. Préparation du tuteur IA

**Cette version ne connecte aucun modèle génératif et ne prétend pas en simuler un.** L’interface et le service de sélection de contexte sont opérationnels. Les réponses indiquent clairement leur état et affichent les ressources du module.

Le service actuel ne consulte que `notebook_lessons` publié. Il ne lit ni les brouillons, ni les notes d’un autre apprenant, ni la banque d’examens. Le contenu historique du Notebook n’est pas encore indexé : son lien est fourni explicitement.

Contrat de l’intégration suivante :

1. Authentifier le compte et contrôler les droits et le quota côté serveur.
2. Récupérer des passages autorisés, identifiés par leçon, bloc et version ; l’index ne doit pas effacer les règles d’accès.
3. Séparer clairement consignes du tuteur et texte des documents, qui constitue une source non fiable d’instructions.
4. Proposer trois modes : **expliquer**, **donner un indice**, **me faire pratiquer**.
5. Exiger des citations vers les passages fournis ; signaler l’absence de preuve plutôt qu’inventer une réponse.
6. Ne jamais transmettre de clé API au navigateur ni de corrigé privé au modèle.
7. Imposer budget de tokens, limite de requêtes et plafond de coût mensuel. Montrer les quotas réellement disponibles, sans promesse d’illimité.
8. Tester la justesse scientifique, les références, la résistance aux instructions présentes dans les documents et la séparation entre comptes.
9. Retirer les conversations devenues inutiles selon une politique explicite ; aucune conversation persistante n’est créée dans ce lot.

L’approche de tutorat sera évaluée contre des questions réelles d’étudiants. Une IA plus bavarde n’est pas nécessairement un meilleur apprentissage : mesurer la réussite ultérieure sans aide et la capacité à transférer une méthode.

## 6. Tarification proposée et marché

Vérification des pages publiques le 18 novembre 2026. Les prix affichés varient avec la région, les promotions, la devise et la période de facturation ; les montants ci-dessous ne sont pas des devis belges garantis.

| Offre observée | Repère public | Interprétation |
|---|---:|---|
| DataCamp Premium | Offre promotionnelle affichée à 11 USD/mois avec facturation annuelle | La concurrence peut descendre sensiblement lors des promotions |
| DataCamp étudiant | 164 USD/an ou 24 USD/mois sur la page consultée | Le rabais étudiant n’est pas toujours le tarif le plus bas face à une promotion générale |
| Coursera Plus | 59 USD/mois sur la page consultée | Catalogue et certificats très étendus ; comparaison imparfaite avec un jeune spécialiste |
| OpenClassrooms | Cours en libre accès gratuits avec compte | On ne peut pas être moins cher que le gratuit ; la valeur doit venir de l’expérience et de l’accompagnement |
| OpenClassrooms diplômant | 300–1 200 EUR/mois selon le programme sur sa page financement | Accompagnement et titres : autre catégorie que l’autoformation du Notebook |

Sources primaires :
- https://www.datacamp.com/pricing
- https://www.datacamp.com/pricing/student
- https://support.datacamp.com/en-us/articles/17598779-understanding-datacamp-s-billing-options-and-installment-payments
- https://www.coursera.org/courseraplus
- https://openclassrooms.com/fr/offers
- https://openclassrooms.com/en/funding/student

### Offres de départ, modifiables dans le studio

| Offre | Mensuel envisagé | Annuel envisagé | Positionnement |
|---|---:|---:|---|
| Découverte | Gratuit | Gratuit | Cours ouverts, exploration et orientation |
| Campus | 4,90 € | 49 € en une fois | Espace personnel, progression, notes, révisions ; 30 messages IA/mois envisagés après activation |
| Academy | 9,90 € | 89 € en une fois | Services Campus, projets et quota de 150 messages IA/mois envisagé après activation |

Ces montants sont des **hypothèses TTC**, pas des offres contractuelles. Les quotas sont également des propositions : ils ne sont pas appliqués à une IA payante inexistante. Le changement d’un prix éditorial ne modifie pas les produits Stripe ni les abonnements existants. Le prix annuel complet est affiché, sans dissimuler un paiement annuel sous une mensualité.

À ces niveaux de prix, ne pas inclure de mentorat individuel illimité, de corrections humaines illimitées ou d’usage IA illimité. Les cours publics ouverts restent ouverts. Le nom Campus n’attribue pas automatiquement un tarif sur preuve de statut étudiant : une vérification de ce statut, si nécessaire au lancement, n’est pas implémentée.

## 7. Modèle économique à tester

Le studio contient un calculateur utilisant les prix enregistrés. Les paramètres incluent nombre d’abonnés, répartition Campus/Academy, abonnements annuels, hypothèse TVA, frais de transaction, coût IA, coût de support, coûts fixes, attrition et coût d’acquisition.

Pour un revenu mensuel brut normalisé `P`, une hypothèse de taxe `t`, des coûts variables `v` et des coûts fixes `F` :

- Revenu normalisé net de taxe supposée : `P / (1+t)`.
- Contribution avant acquisition : `m = P/(1+t) - frais de paiement - coût IA - coût de support`.
- Seuil de couverture des coûts fixes : `ceil(F/m)` si `m > 0`.
- Dépense mensuelle de remplacement du churn : `abonnés × attrition mensuelle × CAC`.
- Solde illustratif : `abonnés × m - F - coût de remplacement`.

La valeur vie simplifiée `m / churn` suppose une attrition constante et ne tient compte ni d’actualisation ni d’hétérogénéité ; ce n’est pas une valorisation d’entreprise. Le modèle ne représente pas les besoins de trésorerie annuels. Il exclut rémunération du fondateur, temps de rédaction, impôts sur le bénéfice, remboursements et coûts d’acquisition de croissance. Le taux de 21 % du scénario par défaut est une hypothèse de calcul, pas une qualification fiscale de la formation.

### Stratégie de lancement

1. Constituer une cohorte pilote volontaire de 15 à 30 étudiants ; aucun recrutement n’est effectué par ce travail.
2. Observer l’onboarding, le choix de parcours, la première session et le retour après une semaine.
3. Achever et relire une spécialisation pilote, sa banque d’items et son projet avant d’étendre les promesses commerciales.
4. Produire des démonstrations pédagogiques ouvertes : une notion, une visualisation, un exercice et un résultat reproductible.
5. Tester deux propositions de valeur, pas seulement deux prix : « réussir ses bases » et « devenir autonome en raisonnement scientifique ».
6. Mesurer les usages et les résultats avant achat média. Ne pas supposer qu’un prix bas crée automatiquement une acquisition rentable.
7. Proposer ensuite des groupes universitaires ou associations avec volume minimum et coût d’accompagnement explicite, sans promesse préalable de diplôme reconnu.

### Indicateurs utiles (à instrumenter, non fabriqués dans le dashboard)

| Indicateur | Définition |
|---|---|
| Activation | Objectif enregistré + première activité réelle dans les sept jours |
| Rétention S4 | Au moins une session d’apprentissage dans la quatrième semaine |
| Progression sans aide | Réussite d’une variante nouvelle d’évaluation, hors assistance IA |
| Retour après erreur | Nouvelle tentative après révision ciblée, pas simple répétition immédiate |
| Coût IA | Coût total et percentile 95 par apprenant actif |
| Conversion | Comptes éligibles ayant souscrit, avec cohorte et fenêtre explicites |
| Churn | Résiliations sur la base payante exposée au début de période |
| Contribution | Recettes après frais et coûts variables observés, hors faux « revenu net personnel » |

## 8. État technique et validation

### Implémenté dans le code

- Frontend sans framework supplémentaire, routes de l’espace personnel et studio.
- Sessions vérifiées par Better Auth existant ; toutes les écritures exigent même origine et utilisateur vérifié.
- Routes d’administration protégées par `NOTEBOOK_ADMIN_IDS`, liste serveur d’identifiants de compte.
- Migration 006 : préférences, notes, révisions, sessions, leçons, ressources, formations, offres, journal et historique.
- Contrôle optimiste de version pour notes, préférences, leçons, formations, prix et questions.
- Métadonnées du catalogue chargées séparément du corps des leçons ; le texte du module est chargé à son ouverture.
- HTML utilisateur jamais injecté ; textes rendus avec DOM/textContent, URLs HTTPS validées, images/PDF typés, politique CSP conservée.
- Tarifs provisoires et paiements non activés.
- Démonstration locale isolée, refusant de démarrer avec `NODE_ENV=production`.

### Vérification

`npm run check` contrôle la syntaxe des modules serveur et des interfaces. `npm test` couvre les règles de facturation existantes, l’évaluation, les nouvelles roadmaps et les routes de l’espace personnel. Les tests d’intégration exécutent les six migrations sur un PostgreSQL embarqué PGlite, puis des requêtes HTTP réelles contre Express : isolation entre comptes, accès refusés, conflits de version, publication, fichiers, sources du tuteur, offres et banque de questions.

Ce test ne remplace pas un PostgreSQL de production concurrent, le flux d’e-mail Better Auth, les paiements ou une recette de déploiement VPS. L’aperçu navigateur utilise exclusivement des données et une identité de démonstration, clairement signalées. Les routes d’authentification réelles ne sont jamais remplacées dans `src/server.mjs`.

### Non activé ou restant à faire

- Configuration et recette de la base, d’e-mails et du compte administrateur sur le serveur cible.
- Déploiement de cette branche : elle n’est pas fusionnée dans le site public.
- IA générative, indexation du corpus historique et quotas facturés.
- Produits de paiement Campus/Academy et contrôle de leurs droits commerciaux.
- Relecture scientifique complète du contenu et banque d’examens réelle.
- Éditeur de questions et examens hors pilote statistique ; revue de projet dans le studio.
- Autosauvegarde hors ligne et fusion de conflits ; les formulaires actuels avertissent avant sortie et proposent une sauvegarde explicite.
- Analytique d’apprentissage, suppression/export exhaustif de compte et politique de conservation (l’export courant porte sur les données chargées, avec les limites d’historique de l’API).
- Tests utilisateur avec vrais étudiants et audit d’accessibilité complet.

## 9. Mise en service ultérieure

Conserver les instructions du README pour Better Auth, PostgreSQL et l’hébergement à origine unique. Appliquer 006 après 001–005. Créer/vérifier le compte du propriétaire, relever son identifiant exact dans le système d’authentification et le configurer dans `NOTEBOOK_ADMIN_IDS` côté serveur. Ne pas remplacer ce contrôle par une adresse e-mail saisie ou un rôle stocké dans le navigateur.

Le studio est accessible à `/admin`, le tableau de bord à `/dashboard`, l’inscription à `/join`. Le mode local `npm run dev` est une démonstration pour travailler l’UX ; le vrai serveur reste `npm start` avec ses variables configurées. Le mode démonstration ne doit pas être publié comme une plateforme multiutilisateur.
