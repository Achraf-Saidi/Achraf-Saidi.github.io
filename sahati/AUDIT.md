# SAHATI — Audit du prototype et évolution 0.2

Audit du 14 octobre 2026. Périmètre exclusif : `sahati/` dans `Achraf-Saidi/Achraf-Saidi.github.io`. Référence initiale du dépôt : `0a5618ee297cfe3d8cd7a5102c55d5709c0fe0c8`. Publication GitHub Pages depuis `main`, à l’adresse https://achraf-saidi.github.io/sahati/.

## Identification et méthode

La version retenue contient trois points d’entrée (`connexion`, `espace`, `verifier`), des assets compilés, les sources React/TypeScript et un moteur métier partagé. L’entrée effectivement publiée est `source/github/main.tsx`, compilée par `source/scripts/build-github.mjs`. Les fichiers Workers/Vinext conservés dans les sources ne constituent pas le serveur du site Pages.

Lecture du routage, des composants métier, des formulaires, des permissions, des données initiales, du moteur, des migrations, des exports, du stockage chiffré et des tests existants. Les composants génériques non importés n’ont pas été assimilés à des fonctionnalités actives. Avant les changements, 23 scénarios métier et 11 scénarios du coffre local passaient.

**Limite de méthode :** le navigateur de contrôle demandé par l’environnement n’est pas disponible. Aucun contrôle visuel réel de l’application sur téléphone, tablette ou ordinateur n’est annoncé. Les tests de DOM et l’examen des règles CSS complètent les tests métier ; ils ne mesurent pas le rendu, les claviers tactiles ou le débordement réel.

## Résultats initiaux

| Domaine | État observé | Décision et réalisation |
|---|---|---|
| Identité | Logo original, couleurs vertes, Manrope et Instrument ; crédit des créateurs | Conservés. Nouveaux composants utilisent les mêmes tokens. |
| Accès | Deux défis chiffrés, SQLite WASM, IndexedDB AES-GCM ; comptes par rôle | Conservés. Les droits demeurent une simulation locale contournable par le propriétaire du navigateur. |
| Patients | Accueil avec compteurs et demandes de rendez-vous ; pas de vue complète de son dossier | Nouvel accueil par actions, dossier longitudinal, mesures, synthèse et journal d’accès spécifique. |
| Rendez-vous | Création, contrôle des chevauchements et transitions ; pas de modification patient | Reprogrammation atomique et demande de confirmation ; refus des modifications après arrivée. |
| Consultation | Formulaire structuré ; pas de modification pratique du brouillon ni lien avec le rendez-vous | Brouillon éditable avec sauvegarde après une pause ; lien explicite avec une arrivée et clôture du rendez-vous à la validation. |
| Ordonnance | Champs essentiels, validation senior, lots et délivrance transactionnelle | Champs DCI, présentation, consignes et renouvellements ajoutés. PDF direct et QR versionné. Aucun moteur pharmacologique certifié. |
| Documents | Impression du navigateur ; pas de téléchargement PDF natif | Génération A4 côté navigateur, fonte intégrée pour accents/arabe, pagination, références et export de résumé. |
| Lecture simplifiée | Préférence d’accessibilité et message général | Explications déterministes reliées à chaque champ original ; glossaire et recherche de terme. Aucun chatbot clinique ou OCR autonome. |
| Laboratoire | Texte libre et transitions de traitement | Mesures numériques typées, source, méthode, intervalle transmis ou absent, identifiant de prélèvement et séparation validation/publication. |
| Radiologie | Demande et compte rendu textuel ; aucune acquisition | Réservation d’équipement synthétique avec conflits, rattachement d’un vrai objet DICOM synthétique, décodage, fenêtre, niveau, zoom et téléchargement. Aucun PACS connecté. |
| Hospitalisation | Admission et lit cohérents ; statut du patient non propagé | Statut patient mis à jour à l’admission et à la sortie ; lits et indicateurs recalculés. |
| Données de départ | Patients « actifs » associés à des lits occupés ; capacités d’Oran/Constantine non matérialisées | Enrichissement des seuls dossiers synthétiques initiaux non modifiés ; 16 lits synthétiques supplémentaires. |
| Historique | Numéro de version et audit d’action, sans copie des versions | Versions avant/après conservées transactionnellement. Les versions non publiées restent masquées au patient. |
| Étudiants | Accès à la recherche uniquement | Campus distinct : trois cas fictifs, neuf questions, exploration d’informations, correction et tentatives personnelles persistantes. |
| Recherche | Protocole, autorisation et cohortes ; export CSV | Statistiques descriptives, Kaplan-Meier avec censure et rapport PDF sur des lignes réautorisées lors de l’export. |
| Direction | Indicateurs sans définition visible | Vue institutionnelle avec cinq définitions, filtres établissement/wilaya/service, horodatage, PDF et CSV. |
| Autres métiers | Stocks, finance, planning, maintenance, urgences, bloc et messages avec des actions | Conservés. Tableaux de bord de tâches pour accueil, infirmiers, laboratoire, radiologie et pharmacie. |

## Écarts qui subsistent

Les données cliniques sont encore des entités JSON génériques ; les référentiels, les relations interétablissements, les mandats familiaux, les mineurs, la facturation réelle, la formation universitaire complète et la modération communautaire ne sont pas opérationnels. La saisie des médicaments reste manuelle. Le DICOM pédagogique ne gère ni séries cliniques, ni géométrie patient, ni mesures anatomiques.

Le coffre ne synchronise pas les appareils. Un QR nécessite le même coffre et un compte autorisé ; son décodage sur un second appareil ne crée pas un registre partagé. Les PDF ne sont pas des signatures électroniques. Le journal local n’est pas inviolable. Les impressions et téléchargements peuvent conserver des copies hors du coffre.

Les anciens assets sont conservés pour permettre un retour arrière. Aucun autre dossier du dépôt n’est modifié. Voir `FEATURE_MATRIX.md`, `SECURITY_AND_COMPLIANCE.md` et `VALIDATION.md` pour les statuts détaillés.


## Livraison complémentaire du 22 octobre 2026

Les limites « un seul lot par traitement », « absence de journal de stock », « absence de commandes/inventaires/rappels », « deux langues seulement » et « absence d’assistant global » ont été traitées dans la version 0.3. Le journal conserve un solde d’ouverture pour les stocks anciens et les nouvelles opérations. Les droits des 14 métiers et les deux codes ne sont pas remplacés. Le contrôle visuel a été étendu à Chrome et à un viewport mobile ; ce contrôle ne constitue pas une validation clinique ou une recette sur téléphones physiques.

Extension 0.4 : le circuit de dotation avec réservations, les inventaires par session et le répertoire fournisseurs/retours sont désormais opérationnels sur données fictives locales. Le doigt/la souris déplacent Sina. Les quantités réservées sont protégées jusque dans le moteur de délivrance. Ces extensions ne constituent pas un ERP hospitalier de production.


Extension 0.5 : Sina dispose d’un mode IA optionnel réel avec Mistral Small 3.2 via l’accès anonyme OVHcloud, vérifié sans compte ni clé le 22 octobre 2026. L’envoi explicite des messages est signalé et les données du coffre ne sont pas jointes. Quota, disponibilité et qualité du fournisseur restent des limites ; aucun usage clinique ni accès documentaire n’est ajouté. Voir `SINA_AI.md`.
