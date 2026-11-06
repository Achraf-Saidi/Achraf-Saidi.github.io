# BALEYETTE · FIGHT TOGETHER

Application web mobile-first pour les entraînements en sports de combat et le sparring encadré, réservée aux adultes (18+) et aux lieux sportifs autorisés.

**URL prévue :** https://achraf-saidi.github.io/baleyette/

## Statut actuel

Le front-end est publié dans le sous-dossier indépendant baleyette/ du dépôt GitHub Pages. L'application s'ouvre immédiatement en **mode démonstration** : six séances fictives et trois communautés fictives, clairement indiquées. Les créations, inscriptions, profils et messages en mode démo sont stockés **uniquement dans le navigateur (localStorage)**. Il n'y a aucune synchronisation entre utilisateurs tant que Supabase n'est pas configuré.

## Fonctionnalités

- MMA, boxe, kickboxing, JJB, muay thaï, judo, grappling et lutte.
- Séances techniques et sparring supervisé : date, niveau, catégories de poids, nombre de places, encadrant, arbitre/superviseur et équipement.
- Carte OpenStreetMap/Leaflet, recherche par distance et géolocalisation sur demande explicite. Épingles indicatives au centre des villes.
- Création et inscription aux sessions, annulation, gestion des communautés et messagerie réservée aux membres.
- Authentification et base de données sécurisée par Row-Level Security via Supabase si configuré.
- Signalement des événements, avec processus de modération humaine à créer avant tout lancement réel.
- Web app responsive, manifeste installable et service worker pour l'interface hors ligne.

## Activer le vrai mode multiutilisateur

1. Créer un projet dédié sur https://supabase.com (plan gratuit disponible selon les conditions).
2. Ouvrir SQL Editor et exécuter le contenu de schema.sql dans ce projet.
3. Dans les paramètres API du projet, copier l'URL de projet et sa clé PUBLIQUE publishable (ou ancienne clé anon).
4. Dans config.js, renseigner url et anonKey. Ne JAMAIS renseigner de clé service_role ni de secret administrateur dans le front-end.
5. Configurer l'authentification e-mail et les URL de redirection autorisées pour GitHub Pages.
6. Vérifier la connexion avec deux comptes de test distincts : sessions, inscriptions, poids, communautés et messages.
7. Avant un lancement public : organiser la vérification des coachs et lieux, la modération, les signalements, la conformité RGPD, les CGU, les assurances et un protocole d'incident.

La clé publique Supabase est par nature exposée côté client ; la sécurité repose sur les politiques RLS de schema.sql, pas sur le secret de cette clé. L'âge, le poids, les qualifications sportives et l'encadrement sont déclarés par les utilisateurs et ne sont pas vérifiés automatiquement. Les sessions en ligne ne sont pas homologuées par Baleyette.

## Exécution locale

Dans le dossier baleyette, lancer un serveur statique : python -m http.server 8080

Ouvrir http://localhost:8080 — ne pas utiliser file:// pour tester le service worker.

## Structure

- index.html : application et navigation
- style.css : design system responsive
- app.js : fonctionnalités, stockage local, Supabase et carte
- config.js : configuration publique facultative du backend
- schema.sql : tables, contraintes, fonctions et RLS
- manifest.webmanifest, sw.js, favicon.svg : installation PWA et identité

## Charte sportive

Baleyette n'organise ni combats de rue ni affrontements violents hors de tout cadre sportif. Aucune séance ne doit avoir lieu sur la voie publique ou dans une adresse privée improvisée. Consentement, encadrement qualifié, équipement adapté, compatibilité de niveau/poids, règles et arrêt immédiat de la séance sont essentiels. Les pratiquants doivent vérifier les obligations légales, médicales et assurantielles avant toute activité.

Ce dépôt est un prototype fonctionnel d'interface, pas une certification de sécurité sportive.
