# Achraf Notebooks — concurrentiel, prix étudiants et stratégie de lancement (12 novembre 2026)

**Statut : étude de marché documentaire et hypothèses de gestion, pas enquête de demande ni décision commerciale.** Les tarifs proposés sur la vitrine sont des simulations désactivées, non les produits Stripe actifs. Aucune offre payante ne doit être proposée tant que des parcours réellement terminés et des services certifiants valides ne sont pas prêts.

## 1. Le marché à concurrencer

Les tarifs ci-dessous sont ceux affichés par les éditeurs à la date de recherche. Ils varient selon la promotion, la région, la devise, la plateforme et les taxes : il ne faut pas afficher des devises différentes comme si elles étaient directement comparables.

| Acteur | Tarif affiché | Proposition de valeur et limites de comparaison |
| --- | --- | --- |
| DataCamp Premium | 35 USD/mois hors promo ; page annuelle promotionnelle 11 USD/mois **facturés annuellement** | Catalogue de 810+ cours, pratique navigateur, parcours carrières, certifications. Source : https://www.datacamp.com/pricing et https://www.datacamp.com/pricing?period=monthly |
| DataCamp Student | 24 USD/mois ou 164 USD/an, sous vérification étudiante | La plateforme offre une véritable réduction aux étudiants; offre observable, pas une moyenne de marché. Source : https://www.datacamp.com/pricing/student |
| Coursera Plus | 59 USD/mois ou 399 USD/an | Large catalogue de partenaires institutionnels et certificats reconnus de ces partenaires; certaines promotions ponctuelles ne sont plus valables. Source : https://www.coursera.org/courseraplus |
| 365 Data Science | 36 USD/mois, 29 USD/mois facturés annuellement | 136 cours, 51 projets, certificats et plans métier selon la page éditeur. Source : https://365datascience.com/pricing/ |
| Google ML Crash Course | Gratuit | Référence gratuite offrant vidéos, visualisations et exercices. Source : https://developers.google.com/machine-learning/crash-course |
| Hugging Face LLM Course | Gratuit | Très bons contenus pratiques sur Transformers, Datasets et Tokenizers, disponibles en français. Source : https://huggingface.co/learn/llm-course/fr/chapter1/1 |
| fast.ai Practical Deep Learning | Gratuit | Formation pratique réputée pour développeurs, avec vidéos, projets et livre. Source : https://course.fast.ai/ |

**Conclusion :** le prix n'est pas une barrière suffisante. Des acteurs gratuits établis ont déjà un contenu excellent, et DataCamp a un avantage massif sur la profondeur de son système d'exercices. Les comparaisons « meilleur que Coursera / DataCamp » seraient actuellement injustifiées. Notre différenciation à prouver est la progression **mathématique explicite → mise en pratique → visualisation → projet rigoureux → examen relu → suivi lisible** dans des spécialisations IA complémentaires. Il s'agit d'une hypothèse de positionnement, non d'un résultat déjà mesuré.

## 2. L'offre cible, clairement séparée de l'existant

| Segment | Tarif envisagé pour la Belgique | Ce qui existe | Ce qui doit exister avant de facturer |
| --- | --- | --- | --- |
| Free | 0 € | 151 modules cartographiés; 92 chapitres originaux enrichis **encore en brouillon**; labo public et quiz de pratique | Navigation, pédagogie, maintien de l'accès libre |
| Campus (étudiant vérifié) | 4,90 €/mois **ou 49 €/an payé d'avance** | Concept tarifaire seulement | Vérification réellement opérationnelle, nouvelles expériences privées, examens sérieusement relus, suivi et droits |
| Academy standard | 9,90 €/mois **ou 89 €/an payé d'avance** | Concept tarifaire seulement | Contenus et services additionnels réellement disponibles, catalogue de prix Stripe configuré, facturation et support |
| Revue humaine de projet | Non chiffrée pour le lancement | Barème et circuit de revue en prototype | Évaluateurs disponibles, qualité et capacité, politique de délivrance, éventuel tarif distinct publié à l'avance |

**L'accès Free ne doit jamais devenir un produit d'appel trompeur.** Les chapitres publics et les parties sous licence ouverte doivent rester gratuits. Les fonctionnalités premium doivent être nouvelles, réellement distinctes et livrables. Les nouveaux prix Campus et Academy ne correspondent pas encore aux produits backend legacy \`foundations\` et \`pro_monthly\` : **aucun Checkout ne peut être activé** avant migration maîtrisée vers un catalogue serveur compatible.

La réduction Campus impose une vérification du statut étudiant, idéalement avec un fournisseur spécialisé ou un mécanisme anti-fraude étudié. Ne pas simplement accepter n'importe quelle chaîne terminée par \`.edu\`. Prévoir une alternative pour les étudiants des pays où les institutions ne délivrent pas d'adresse académique.

## 3. Coût variable et contribution unitaire : calcul de sensibilité

**Hypothèses illustratives, pas comptabilité réelle :**
- Prix supposés TTC en Belgique avec une TVA de 21 % pour la simulation. Le taux réellement applicable à certains services éducatifs peut différer; un fiscaliste doit examiner le produit et l'entreprise.
- Paiement par carte EEE standard : frais Stripe Payments 1,5 % du montant facturé + 0,25 € par transaction, selon https://stripe.com/en-be/pricing.
- Stripe Billing en paiement à l'utilisation : 0,7 % du montant facturé selon https://stripe.com/fr-be/billing/pricing.
- Coût variable supposé d'infrastructure, support standard et outils : 0,80 €/étudiant Campus et 1,20 €/compte Academy et par mois. **Ces coûts ne sont pas mesurés.**
- Aucun coût d'acquisition, de rédaction, de relecture humaine, de direction, de remboursement, d'impôt sur le bénéfice ou frais supplémentaires (Stripe Tax, emails, banque, cartes internationales) n'est inclus.

Formule pour un paiement brut P d'une période de m mois :

    contribution_par_mois =
        (P/1.21 - (0.015*P+0.25) - 0.007*P)/m
        - cout_variable_mensuel

| Tarif / fréquence | TVA incluse dans le paiement | Payments | Billing | Contribution mensuelle illustrative avant frais fixes |
| --- | ---: | ---: | ---: | ---: |
| Campus 4,90 €/mois | 0,85 € | 0,32 € | 0,03 € | **2,89 €** |
| Academy 9,90 €/mois | 1,72 € | 0,40 € | 0,07 € | **6,51 €** |
| Campus 49 €/an | 8,50 €/an | 0,98 €/an | 0,34 €/an | **2,46 €** |
| Academy 89 €/an | 15,45 €/an | 1,58 €/an | 0,62 €/an | **4,75 €** |

Illustration : avec **60 % Campus mensuel et 40 % Academy mensuel**, la contribution variable pondérée serait d'environ **4,34 € par abonné et par mois**. Il faudrait donc **environ 923 abonnés actifs** pour obtenir 4 000 € de contribution brute mensuelle *avant* frais fixes, rémunération de l'équipe, acquisition et impôts. Il ne s'agit en aucun cas de 4 000 € de revenu net personnel. Si davantage de clients choisissent l'annuel, la contribution mensuelle amortie diminue (mais l'encaissement initial augmente). Une consommation d'API IA sans plafond peut rendre ces prix déficitaires : la première version doit limiter ou exclure les services IA coûteux.

Une revue humaine de 30 minutes au coût chargé fictif de 24 €/heure représente déjà **12 €**. Il serait irréaliste de promettre des corrections humaines illimitées dans Campus à 4,90 €. Il faut un quota, un produit séparé, des partenariats enseignants ou une part de revenue dédiée à la revue, sans contourner l'intégrité académique.

## 4. Proposition produit qui peut gagner des étudiants

Persona initial A : étudiant licence ou master voulant comprendre les démonstrations, non seulement répéter des commandes. Il veut savoir d'où viennent le gradient, la loi de Student, Bellman et l'attention.

Persona B : développeur ou ingénieur voulant passer du code à la recherche. Il cherche des contre-exemples, des implémentations de référence et une méthode rigoureuse d'évaluation.

Persona C : étudiant d'une formation à ressources financières limitées, bénéficiant d'un cours de qualité ouvert, éventuellement avec une option Campus abordable.

Le système d'apprentissage doit rester lisible : **cours non commencé → étudié (déclaration) → exercices réalisés → examen réussi (en base) → projet soumis → projet relu → certificat indépendant**. Il ne faut pas attribuer une qualification à partir du temps passé sur une page ou d'un seul quiz public. Le dashboard doit montrer le **prochain cours faisable selon les prérequis**, les progrès réels et un mode concentration, sans pression de séries de connexion artificielles.

## 5. Acquisition et validation du prix

**Ne pas lancer une grosse publicité payante avant une cohorte pilote de qualité.** Le premier parcours réellement achevable peut être l'inférence statistique, car la matière existe et peut être auditée avec des experts.

1. Interviewer 15 à 25 étudiants de profils variés, sans orienter les réponses. Demander ce qu'ils utilisent, leurs difficultés et ce qu'ils paient *réellement*, pas seulement ce qu'ils déclarent être prêts à payer.
2. Observer 8 à 12 sessions de navigation sur la landing page, le dashboard et une leçon (avec consentement), puis corriger les blocages. Mesurer la réussite du parcours « trouver puis ouvrir une leçon », les contrastes et la compréhension des statuts.
3. Faire apprendre un chapitre à une cohorte bêta gratuite. Mesurer : compréhension avant/après avec questions indépendantes, abandon, temps réel, bonnes réponses aux questions de transfert et taux de retour volontaire. Ne pas appeler ces chiffres « certificats ».
4. Seulement lorsque l'offre payante existe, tester deux formulations honnêtes de prix, par cohortes comparables, avec transparence de la facturation annuelle. Ne pas prétendre à une significativité statistique sur quelques dizaines de prospects.
5. Distribution : associations étudiantes, réseaux d'universités, GitHub, démonstrations visuelles sur LinkedIn, vidéos d'équations originales, SEO sur questions pédagogiques précises et challenges de laboratoire gratuits. Aucune prospection abusive et aucun témoignage inventé.

**Objectifs expérimentaux initiaux** (seuils de décision à fixer, non benchmarks prouvés) : au moins 80 % de réussite de la tâche « retrouver mon cours », au moins 70 % d'exécution autonome d'un laboratoire, amélioration mesurable entre questions de pré/post-test et problèmes de transfert, retours qualitatifs substantiels sur le niveau du cours. Mesurer l'accessibilité clavier, écran mobile, format des mathématiques et charge cognitive, pas seulement le taux de clic.

## 6. Obligations et garde-fous

- Avant facturation : contrôle juridique TVA belge et ventes numériques européennes, droit de rétractation, garanties, informations précontractuelles, remboursements, factures et privacy policy. Sources institutionnelles : https://finances.belgium.be/fr/entreprises/tva/assujettissement-tva/taux-et-calcul/taux-tva et https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en.
- Conserver le serveur de paiement **désactivé par défaut**; ne pas mettre de clé de production dans GitHub, GitHub Pages ou un bundle. Une nouvelle grille exige une migration documentée de \`billing.mjs\`, des clés Stripe et des droits.
- Pas de certificat accrédité, pas de certification d'identité surveillée sans dispositif de vérification, et aucun résultat de test sans vraie banque d'examen privée évaluée indépendamment.
- Prévoir RGPD : minimisation des traces, consentement facultatif pour la publication du nom, export et suppression des données, configuration des cookies, accès par rôles et sauvegardes.
- Ne pas annoncer la supériorité sur Coursera/DataCamp avant une comparaison par étude avec mesures pédagogiques. Les concurrents disposent de ressources et certifications que ce produit n'offre pas encore.

### Décision de produit proposée

Maintenir **Free 0 €** généreux et permanent; préparer **Campus 4,90 €/mois ou 49 €/an** et **Academy 9,90 €/mois ou 89 €/an**, sans les encaisser aujourd'hui. Commencer par terminer **une spécialisation excellente**, banc d'examen secret relu et projet final validé, et construire une petite cohorte qui réussit effectivement le cursus. Développer les autres spécialisations ensuite. Faire mieux sur la qualité mesurée et la pédagogie plutôt que simplement multiplier les cartes de modules.
