# Novalis AI — refonte éditoriale et continuité commerciale

La version conserve l’architecture statique Python/HTML/JS de la vitrine et le noyau Flask/SQLite de Novalis OS. Elle ne remplace pas les autres projets du dépôt.

## Direction et contenu

« Le terrain écrit la première ligne. » relie l’écoute des opérations à la conception et au développement. Cuivre, ivoire et vert sombre reprennent la marque ; le showroom introduit des univers visuels distincts plutôt qu’une série de tableaux de bord semblables.

Huit concepts : ERP industriel, boutique de mode, stock/ventes, restaurant/réservation, recherche documentaire, analytics/prévisions, Novalis Food et service client. Les concepts sont nommés comme tels ; aucun client livré, résultat chiffré, avis ou disponibilité commerciale n’est inventé. Quatre nouveaux visuels ont été générés avec l’outil intégré, puis encodés en WebP sans recadrage ; chemins et prompts sont dans `premium-image-prompts.json`. Les quatre premiers concepts sont conservés.

Une démonstration guidée de service client montre réponse, source et relais humain. Elle utilise un scénario local prédéfini, pas un appel à un modèle en production. La démonstration Novalis OS est distincte de l’accès réel et illustre un projet exemple, cinq vues et une validation liée à une version.

Le premier échange offert dure une heure. Les créneaux du calendrier interne ont cette durée et une réservation est transactionnelle. Aucun engagement de réponse sous 24 heures n’est publié faute d’organisation vérifiée pour le tenir.

Achraf Saidi est présenté comme cofondateur et CTO. Le parcours publié est limité à sa formation en sciences des données et à son activité de recherche/enseignement à UCLouvain ; le profil professionnel public confirme le doctorat et la cofondation. Les effectifs 5 frontend, 6 backend et 3 data scientists proviennent de la direction. Les autres noms et biographies ne sont pas inventés.

## Demande réelle et suivi privé

Le formulaire en deux étapes soumet au backend. Une référence et un lien privé de 90 jours sont montrés uniquement après accusé serveur. La clé de requête stable empêche un double enregistrement lors d’une répétition réseau ; un même identifiant associé à un contenu différent est refusé. Le calendrier disponible peut être réservé dans la même transaction.

La page de suivi reçoit son jeton dans le fragment d’URL et le transmet dans le corps d’une requête POST, jamais dans une query string. La base garde son empreinte. Les réponses publiques ne comprennent que référence, étapes, dates, expiration et accès générique au portail après conversion. Elles excluent coordonnées, description, notes, budget, messages et identité du responsable. Les origines autorisées, limites de requêtes et réponses sans cache restent appliquées.

Les transitions du pipeline alimentent le suivi. La conversion en projet ajoute une étape sans créer silencieusement de compte ou donner accès au projet. L’invitation personnelle du client reste une action d’un responsable autorisé. Les notifications internes sont persistées. SMTP reste une intégration distincte : un message placé en file n’est pas annoncé comme envoyé.

## Novalis OS

Le pipeline permet recherche par référence et filtre d’étape ; le responsable peut consulter les étapes publiques. Les documents sont recherchables et versionnés dans une table additive : l’original reste disponible, une seule suite de versions est autorisée, les conflits sont refusés, et une version ne change ni de projet ni de canal. La publication d’une version est réservée à Direction/Coordination. Les clients ne voient que les documents externes. Les projets archivés refusent les nouveaux documents.

La publication d’un document externe notifie les comptes clients concernés ; un ajout client notifie son responsable. Il s’agit de notifications internes. Les paiements Mollie restent dans leur configuration existante, désactivés sans compte marchand ; aucune transaction financière réelle n’a été exécutée.

## Vérifications déjà effectuées

- 49 tests backend réussis : métier existant et 9 nouveaux tests de réception réelle, concurrence, idempotence, suivi privé, autorisations, conversion, réservation, migration et versions documentaires.
- Tests DOM des quatre langues : filtres, huit concepts, agrandissement, focus de fermeture, navigation clavier des onglets, trois aperçus documentaires et validation idempotente de la démonstration.
- Formulaire : validation des étapes, succès uniquement après accusé, conservation des champs en cas d’échec, identifiant stable et erreurs de suivi.
- 100 pages contrôlées pour titres, langues, liens et assets ; redirections historiques exclues du compte.
- Tests DOM existants des six rôles et du paiement/facturation conservés et réussis.
- Préparation isolée de la version Hostinger réussie ; sources Python, base et environnement privés exclus du répertoire public.

La recette visuelle, les contrôles du déploiement et leurs limites seront consignés après revue. Les tests DOM ne prouvent pas le rendu sur appareils réels, ni l’accessibilité complète ou un score de performance.

## Références primaires étudiées

- https://www.metalab.com/ et https://www.metalab.com/work : montrer les interfaces et le rôle du travail.
- https://www.work.co/process/ : participation du client et validation progressive.
- https://linear.app/ : expliquer le produit par des parcours opérationnels.
- https://www.ramotion.com/upstream/ : partir des processus métiers avant les fonctionnalités.
- https://be.linkedin.com/in/achraf-saidi-b141b8247 : vérification du parcours public d’Achraf.

Ces références guident des choix éditoriaux ; aucun taux de conversion n’est promis.
