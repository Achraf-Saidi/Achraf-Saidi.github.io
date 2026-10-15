# Novalis — identité engineering et reprise du suivi

## Parcours de suivi

Une référence et l’e-mail de la demande permettent désormais de consulter uniquement son étape générale. Cela fonctionne pour les références existantes et après expiration du lien privé. La réponse ne contient ni jeton, ni identifiant interne, ni historique daté, ni e-mail, ni description, ni document, ni accès au projet. Ce parcours n’est pas une authentification de compte : il minimise volontairement les informations accessibles. POST, origine autorisée, absence de cache et limite de huit tentatives par IP sur quinze minutes sont appliqués.

Sur le même navigateur, les cinq derniers liens privés peuvent être repris depuis la page Suivi. Seuls référence, jeton et expiration sont conservés localement ; aucune coordonnée. Les entrées expirées ou invalides sont exclues de la liste, l’utilisateur peut l’effacer et un échec de stockage est annoncé sans faux succès. Le lien privé garde sa limite de 90 jours. Le suivi général n’en dépend plus et reste consultable tant que la demande est conservée dans Novalis OS.

Cette correction ne dépend pas du SMTP. Les e-mails externes ne sont toujours pas annoncés comme envoyés sans fournisseur configuré.

## Nouvelle direction

L’accroche française et anglaise suit le texte approuvé du brief du 15 octobre. Manrope est conservée comme famille technique sans serif éditoriale, avec annotations monospace limitées. Le logo est conservé. Surfaces neutres, ardoise et cuivre remplacent l’univers ivoire/mode de la version précédente. Les pages secondaires utilisent la même coque, les mêmes polices et les mêmes contrôles.

Le hero est une interface HTML/CSS/SVG native : données lisibles, projection simple, assistant guidé et optimisation réellement calculée. Le modèle énumère les allocations entières entre A et B, respecte leurs capacités, couvre la demande et inclut les frais fixes de B. Une capacité insuffisante masque les résultats comparatifs ; aucune économie n’est annoncée pour une demande non satisfaite. Les coûts appartiennent au scénario opérationnel, jamais à un devis Novalis. La projection est explicitement une moyenne mobile de trois mois, pas une prévision ML entraînée.

Quatre piliers structurent l’accueil et le hub Expertise : ingénierie logicielle, IA/automatisation, data science/optimisation et design/web. Les URL historiques restent disponibles. Sites-web est une nouvelle page distincte de SaaS. La page d’accueil sélectionne quatre concepts ; les filtres et le showroom complet donnent accès aux huit. Novalis Intelligence, le Lab et Novalis Optimize présentent le calcul natif plutôt qu’une image de tableau de bord.

## Vérifications

- 52 tests backend réussis, dont les nouveaux tests de consultation par référence, confidentialité, origines, expiration indépendante et limitation des tentatives.
- Tests DOM des quatre langues, huit concepts, onglets/documents/validations de démonstration et parcours d’envoi existant réussis.
- Nouveau test engineering : cas chiffrés connus, frais fixes qui rendent B inutile, infaisabilité, conservation de la demande, capacités et monotonie de l’optimum ; UI sur quatre langues ; recherche, reprise locale, erreurs 404/429/503, conservation des champs et absence de données personnelles dans le stockage.
- 108 pages hors redirections : un seul h1, langue, liens locaux et assets vérifiés.
- Préparation de publication isolée réussie ; aucune source Python, base ou configuration privée dans les fichiers publics.

Recette visuelle et déploiement : à consigner après prévisualisation. Les tests DOM ne remplacent pas les mesures de rendu, une recette sur appareils physiques, un audit WCAG complet ou des mesures Core Web Vitals.

## Références consultées

- https://linear.app/now/behind-the-latest-design-refresh : hiérarchie, contrôles cohérents et réduction du bruit.
- https://vercel.com/design et https://vercel.com/solutions/design-engineering : articulation conception/ingénierie.
- https://stripe.com/ : démonstration du produit et parcours par besoins.
- https://www.raycast.com/ : interfaces lisibles et démonstrations directes.

La recherche web exacte des signatures proposées n’a pas identifié d’occurrence identique exploitable parmi les résultats obtenus ; cela ne constitue pas une recherche d’antériorité de marque. La signature reste distincte du hero approuvé. Aucun client, diplôme, effectif ou résultat supplémentaire n’est inventé.
