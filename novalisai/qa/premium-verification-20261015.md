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

## Recette visuelle et publication réalisées

La version applicative publiée est `a4ee4da420f947bd1faed4dd2ec6e6dadb8b6a06`. La CI de cette version est réussie (run 38740642712). Les ajouts suivants au dépôt concernent uniquement les preuves et ce compte rendu.

- Chrome : 4 langues × 8 largeurs (320, 360, 390, 430, 768, 1024, 1280, 1440), styles effectivement chargés, sans débordement horizontal du document. Mesures dans `premium-responsive-20261015.json`.
- Novalis OS : six rôles × quatre largeurs (320, 390, 768, 1280), sans débordement horizontal. Vues utilisant une fixture clairement étiquetée dans un environnement de revue isolé.
- Revue visuelle des accueils, showroom filtré et ouvert, zoom, navigation mobile, onglets/documents de la démonstration Novalis OS, formulaire étape 2 sans envoi réel, pipeline et documents du manager. La flèche du CTA desktop et le sélecteur de langue à 320 px ont été corrigés pendant la recette.
- Répétition de migration sur copie : versions 1–4, deuxième exécution idempotente, intégrité SQLite et clés étrangères vérifiées. Données actives conservées pendant la revue.
- Publication Hostinger effectuée le 15 octobre 2026, après sauvegarde cohérente vérifiée. Migration additive, conservation des comptes et paramètres de sécurité, vérification de la santé du backend et de la route privée de suivi.
- 48 URL publiques et les principaux scripts, styles et nouveaux visuels ont été comparés aux fichiers préparés. La publication comprend 109 fichiers HTML, dont les redirections historiques ; le contrôle de contenu porte sur 100 pages hors redirections.
- Seuls Novalis OS et son worker ont été redémarrés. La page, la configuration et les processus de Pointage sont identiques avant/après ; nginx, PostgreSQL et PM2 n’ont pas été redémarrés. La clé SSH temporaire a été retirée et la liste Hostinger est vide après l’opération.
- Accueil réel vérifié dans le navigateur après actualisation : nouveau slogan, nouveau CSS, images chargées et formulaire disponible après lecture de la configuration publique. Aucune demande commerciale de test n’a été ajoutée en production.

Preuves : `novalis-premium-live-20261015.jpg` (accueil public), `novalis-os-demo-mobile-20261015.jpg` (revue responsive 390 px), `premium-deployment-20261015.json` (résumé expurgé du contrôle de publication).

## Limites et prochaines intégrations

Les demandes sont réellement enregistrées, suivies dans le pipeline et consultables via leur lien privé ; les notifications internes sont persistées. Les e-mails externes nécessitent encore la configuration et un essai réel du fournisseur SMTP. Le lien de suivi doit être conservé par le visiteur ; il expire après 90 jours et n’est pas un compte client.

La prise de rendez-vous directe exige des créneaux d’une heure créés par l’équipe ; en leur absence, le formulaire précise que l’horaire sera convenu personnellement. La réservation atomique est testée en base isolée, sans réserver un vrai créneau client.

Le paiement en ligne Mollie/Bancontact reste désactivé tant que le compte marchand et ses clés ne sont pas configurés et qu’une recette fournisseur n’est pas terminée. Aucun encaissement réel, envoi SMTP ou flux Peppol n’a été réalisé. La démonstration IA publique reste un scénario guidé local ; les huit concepts ne sont pas présentés comme des projets clients livrés.

La vérification responsive dans Chrome et les tests DOM ne remplacent pas une recette sur iPhone/Android physiques, Safari/Firefox, un audit WCAG complet ou des mesures Lighthouse/Core Web Vitals. Aucun score de performance ni gain de conversion mesuré n’est revendiqué.

## Références primaires étudiées

- https://www.metalab.com/ et https://www.metalab.com/work : montrer les interfaces et le rôle du travail.
- https://www.work.co/process/ : participation du client et validation progressive.
- https://linear.app/ : expliquer le produit par des parcours opérationnels.
- https://www.ramotion.com/upstream/ : partir des processus métiers avant les fonctionnalités.
- https://be.linkedin.com/in/achraf-saidi-b141b8247 : vérification du parcours public d’Achraf.

Ces références guident des choix éditoriaux ; aucun taux de conversion n’est promis.
