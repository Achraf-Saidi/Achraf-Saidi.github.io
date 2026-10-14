# Architecture et décisions — 14 octobre 2026

La vitrine existante reste dans `novalisai` : générateur Python, HTML indépendant, CSS/JavaScript et polices locales. Son logo, sa palette cuivre/ivoire, sa sculpture et son configurateur sont conservés. L’extension ajoute 13 pages dans chacune des quatre langues, deux démonstrations et le raccordement optionnel à l’API.

Novalis OS est un monolithe modulaire Flask/Python 3.12. Modules : identité, CRM/rendez-vous, projets/temps/communication, documents, suivi financier et file SMTP. L’interface utilise HTML/CSS/JavaScript, sans bundle de framework supplémentaire. Elle est servie par l’application et consomme la même API utilisée par les tests.

## Pourquoi SQLite pour cette première version

Pour un déploiement interne sur une machine, avec une petite équipe et une charge encore inconnue, SQLite réduit les services nécessaires et reste une base transactionnelle persistante. WAL, clés étrangères, délais de contention et transactions `BEGIN IMMEDIATE` protègent les mutations. Les opérations critiques utilisent également des contraintes d’unicité et des versions optimistes.

Cette décision est limitée à **une instance applicative sur un seul stockage local**. Ne pas partager la base sur NFS, lancer des replicas sur plusieurs machines ou extrapoler les performances sans mesure. PostgreSQL devient la prochaine migration si la contention, le volume ou le besoin de haute disponibilité le justifient. Le SQL et les modules sont séparés pour rendre cette évolution explicite. Aucun test de charge VPS n’a encore été exécuté.

## Données et autorisations

L’organisation Novalis possède les collaborateurs, les prospects et les clients. Chaque projet appartient à un client et possède un responsable de compte ; ses membres techniques sont affectés explicitement. Les utilisateurs clients sont rattachés à une organisation cliente. Toutes les autorisations sont contrôlées au serveur.

| Profil | Périmètre livré |
|---|---|
| Direction | Clients, CRM, projets, équipe, finances, journal et connexions de son organisation |
| Responsable | Prospects attribués, projets confiés, équipe projet, revues, communication et propositions |
| Développeur | Projets auxquels il est affecté, tâches personnelles, échanges internes, documents internes et propre temps |
| Client | Projets de son organisation, jalons, documents et échanges externes, propositions partagées et factures enregistrées |
| Finance | Suivi financier et informations projet nécessaires, sans accès aux conversations ou documents techniques |
| Administration système | Gestion limitée des comptes et état des connexions, sans accès aux projets et finances ; ne peut créer ou suspendre les rôles sensibles |

La direction peut exercer le rôle d’interlocuteur : ses autorisations couvrent la coordination. Les combinaisons arbitraires de rôles et permissions personnalisées ne sont pas encore livrées.

## Fiabilité métier

- Une réservation prend un créneau d’une heure dans une transaction ; une contrainte unique empêche deux réunions réservées sur ce même créneau. Les horaires sont stockés en UTC avec fuseau explicite.
- Une conversion commerciale crée le client et le projet et conserve le lien avec le prospect. Elle nécessite une proposition/négociation, l’accord confirmé et la version attendue.
- Une tâche passe par réalisation, revue puis approbation. Le développeur ne peut pas approuver son propre travail. Le progrès du projet pondère les tâches approuvées par leur effort prévu.
- Les canaux `internal` et `external` possèdent des autorisations distinctes. Un développeur ne peut écrire au client ni lire ses échanges externes. Une demande client est qualifiée avant de devenir une tâche.
- La livraison finale suit les validations des tâches et des jalons, puis l’approbation du client. Archivage et maintenance restent des états distincts.
- Les montants sont des entiers en centimes ; TVA en points de base et arrondi par ligne. Les règlements bancaires ont une clé d’idempotence et un contrôleur identifié.

## Frontières commerciales et réglementaires

La gestion financière enregistre des brouillons et des références de factures déjà émises par un outil externe. Elle ne constitue pas un point d’accès Peppol, un logiciel de comptabilité certifié ou une intégration bancaire. Aucun bouton de retour de paiement ne marque une facture payée. Les factures enregistrées sont protégées contre les réécritures applicatives silencieuses.

Le devis versionné et sa décision client sont tracés ; ils ne constituent pas une signature électronique qualifiée. Les contrats, avenants complets, notes de crédit, échéanciers automatiques, coûts horaires, marges, Gantt, capacité, connecteurs de calendrier, base de connaissances et support avancé restent à développer.

## Hébergement proposé, pas encore effectué

Application et API sur `app.novalisai.com` afin de conserver des cookies limités à un hôte. La vitrine publique garde `www.novalisai.com`. Un domaine API supplémentaire n’est pas nécessaire pour cette version. Caddy gère TLS ; Gunicorn sert l’application ; un worker traite les rappels et les e-mails configurés. La base, les documents et les sauvegardes sont hors du dépôt et de la racine web.

Hostinger restreint l’accès depuis le navigateur distant : CPU/RAM/disque, services, domaine et accès SSH du VPS n’ont pas été inspectés. Docker et Caddy ne sont pas disponibles localement. La construction de l’image Docker a été validée dans la CI GitHub ; aucun service n’a été démarré ou déployé sur le KVM. Les images de base devront être figées par digest lors de la qualification de production.
