# Novalis — identité engineering et reprise du suivi

## Parcours de suivi

Une référence et l’e-mail de la demande permettent désormais de consulter uniquement son étape générale. Cela fonctionne pour les références existantes et après expiration du lien privé. La réponse ne contient ni jeton, ni identifiant interne, ni historique daté, ni e-mail, ni description, ni document, ni accès au projet. Ce parcours n’est pas une authentification de compte : il minimise volontairement les informations accessibles. POST, origine autorisée, absence de cache et limite de huit tentatives par IP sur quinze minutes sont appliqués.

Sur le même navigateur, les cinq derniers liens privés peuvent être repris depuis la page Suivi. Seuls référence, jeton et expiration sont conservés localement ; aucune coordonnée. Les entrées expirées ou invalides sont exclues de la liste, l’utilisateur peut l’effacer et un échec de stockage est annoncé sans faux succès. Le lien privé garde sa limite de 90 jours. Le suivi général n’en dépend plus et reste consultable tant que la demande est conservée dans Novalis OS.

Cette correction ne dépend pas du SMTP. Les e-mails externes ne sont toujours pas annoncés comme envoyés sans fournisseur configuré.

## Nouvelle direction

L’accroche française et anglaise suit le texte approuvé du brief du 15 octobre. Manrope est conservée comme famille technique sans serif éditoriale, avec annotations monospace limitées. Le logo est conservé. Surfaces neutres, ardoise et cuivre remplacent l’univers ivoire/mode de la version précédente. Les pages secondaires utilisent la même coque, les mêmes polices et les mêmes contrôles.

Le hero est une interface HTML/CSS native : données lisibles, projection simple, assistant guidé et optimisation réellement calculée. Le modèle énumère les allocations entières entre A et B, respecte leurs capacités, couvre la demande et inclut les frais fixes de B. Une capacité insuffisante masque les résultats comparatifs ; aucune économie n’est annoncée pour une demande non satisfaite. Les coûts appartiennent au scénario opérationnel, jamais à un devis Novalis. La projection est explicitement une moyenne mobile de trois mois, pas une prévision ML entraînée.

Quatre piliers structurent l’accueil et le hub Expertise : ingénierie logicielle, IA/automatisation, data science/optimisation et design/web. Les URL historiques restent disponibles. Sites-web est une nouvelle page distincte de SaaS. La page d’accueil sélectionne quatre concepts ; les filtres et le showroom complet donnent accès aux huit. Novalis Intelligence, le Lab et Novalis Optimize présentent le calcul natif plutôt qu’une image de tableau de bord.

## Vérifications

- 52 tests backend réussis, dont les nouveaux tests de consultation par référence, confidentialité, origines, expiration indépendante et limitation des tentatives.
- Tests DOM des quatre langues, huit concepts, onglets/documents/validations de démonstration et parcours d’envoi existant réussis.
- Nouveau test engineering : cas chiffrés connus, frais fixes qui rendent B inutile, infaisabilité, conservation de la demande, capacités et monotonie de l’optimum ; UI sur quatre langues ; recherche, reprise locale, erreurs 404/429/503, conservation des champs et absence de données personnelles dans le stockage.
- 108 pages hors redirections : un seul h1, langue, liens locaux et assets vérifiés.
- Préparation de publication isolée réussie ; aucune source Python, base ou configuration privée dans les fichiers publics.

## Recette et publication

Source applicative publiée : `1a5255f6bd24ea7d5403bbb4465e6c200768dd54`. Deux CI finales réussies : 38776230795 et 38776222801. Les ajouts de compte rendu après cette source ne changent pas la version applicative en production.

- Chrome : 40 mesures de l’accueil (4 langues × 10 largeurs, de 320 à 1920 px), 16 du suivi (4 langues × 4 largeurs), 6 sur les pages data/web et 4 avec filtre web actif dans le showroom. Les 66 mesures ont leurs styles chargés et n’ont aucun débordement horizontal. Fichier `engineering-responsive-20261015.json`.
- Revue visuelle desktop et mobile du hero, ainsi que du formulaire de suivi. Ajustements réalisés pour la lisibilité des petites annotations, la géométrie du showroom et l’accès au formulaire sans zone vide imposée. À 390 px, le formulaire de suivi commence à environ 338 px et son panneau se termine à environ 784 px dans la vue de recette de 880 px.
- Comparaison native testée dans le navigateur sur la page data : total du scénario de 1 530 € à 1 350 €, cohérent avec la diminution de 180 € du coût d’allocation.
- Préparation isolée, répétition de migration et intégrité SQLite réussies. Les dernières reprises ont réutilisé les 52 tests backend de la première préparation uniquement après comparaison SHA256 de tous les fichiers backend concernés ; les CI finales ont également exécuté la suite entière.
- Publication Hostinger effectuée après sauvegarde cohérente vérifiée. 76 URL comparées au build ; 117 fichiers HTML publiés, dont 9 redirections historiques. Scripts, feuilles de style et nouveaux modules vérifiés sur le serveur.
- Compte et paramètres de sécurité inchangés. Pointage, son contenu, sa configuration et ses processus sont identiques avant/après. Aucun redémarrage de nginx, PostgreSQL ou PM2. Clé SSH temporaire retirée, liste Hostinger vide après publication.
- Accueil public vérifié dans Chrome : nouvelle accroche, styles, données calculées, configuration du formulaire connectée. Aucune demande commerciale ni réunion de test créée en production. La consultation publique d’une référence de recette inexistante renvoie le message attendu et conserve les champs, sans afficher d’ancien résultat.

Preuves : `novalis-engineering-live-20261015.jpg`, `novalis-tracking-live-20261015.jpg`, `engineering-responsive-20261015.json`, `engineering-deployment-20261015.json`.

Les tests DOM et Chrome ne remplacent pas une recette sur appareils physiques, Safari/Firefox, un audit WCAG complet ou des mesures Lighthouse/Core Web Vitals. Les tailles gzip calculées des deux CSS totalisent 15,0 Ko et celles des trois scripts 7,8 Ko ; ce sont des budgets d’assets, pas des mesures de chargement ou de performance vécue. Le hero ne charge plus de grande image de concept.

Restent distincts de cette livraison : fournisseur SMTP, recette marchande Mollie/Bancontact, Peppol et tout modèle IA réellement exécuté côté serveur. Aucun résultat commercial ni taux de conversion n’est garanti.

## Références consultées

- https://linear.app/now/behind-the-latest-design-refresh : hiérarchie, contrôles cohérents et réduction du bruit.
- https://vercel.com/design et https://vercel.com/solutions/design-engineering : articulation conception/ingénierie.
- https://stripe.com/ : démonstration du produit et parcours par besoins.
- https://www.raycast.com/ : interfaces lisibles et démonstrations directes.

La recherche web exacte des signatures proposées n’a pas identifié d’occurrence identique exploitable parmi les résultats obtenus ; cela ne constitue pas une recherche d’antériorité de marque. La signature reste distincte du hero approuvé. Aucun client, diplôme, effectif ou résultat supplémentaire n’est inventé.
