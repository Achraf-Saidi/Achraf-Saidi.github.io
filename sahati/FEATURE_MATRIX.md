# SAHATI — Matrice fonctionnelle 0.2

**Fonctionnel local** signifie une action persistante dans le même navigateur, sur des données synthétiques. **Limité** signifie un sous-ensemble opérationnel. **Prévu** signifie qu’aucune fonctionnalité de production n’est livrée.

| Module | Utilisateurs | Statut réel | Limites et priorité suivante |
|---|---|---|---|
| Accès à deux codes et comptes | Tous | Fonctionnel local | Pas d’authentification serveur ou de synchronisation ; P0 pilote |
| Accueil patient | Patient | Fonctionnel local | Actions et documents propres au dossier |
| Dossier longitudinal | Patient, cliniciens habilités | Limité | Historique, synthèse, documents, mesures ; normalisation des antécédents/vaccins P0 |
| Rendez-vous | Patient, accueil | Fonctionnel local | Création, reprogrammation, conflits, confirmation, arrivée, annulation |
| Consultation | Médecin, résident | Fonctionnel local | Brouillon, sauvegarde, validation senior, lien rendez-vous ; correction après validation P0 |
| Ordonnance | Médecin, résident, patient, pharmacie | Fonctionnel local | DCI/presentation manuelles, PDF, QR local, lots ; référentiel pharmacologique P0 |
| Résultats biologiques | Médecin, laboratoire, patient | Limité | Échantillon, mesures et validation/publication ; codes-barres, automates et contrôle qualité P1 |
| Lecture simplifiée | Patient, cliniciens | Fonctionnel local | Passages structurés et glossaire ; pas d’OCR ni d’IA clinique ; validation des textes P0 |
| Radiologie | Médecin, radiologue, patient | Limité | Programmation, rapport, fantôme DICOM réel ; pas de PACS ni de séries cliniques ; P1 |
| Lits et hospitalisation | Accueil, médecins, infirmiers, direction | Fonctionnel local | Admission, sortie, nettoyage et indicateurs cohérents ; transferts interservices P1 |
| Urgences et bloc | Cliniciens | Limité, conservé | Triage manuel et checklist ; protocoles locaux, transmissions et ressources complètes P1 |
| Pharmacie et stocks | Pharmacie, logistique | Fonctionnel local | Lots, dates, réception, délivrance atomique ; inventaire, rappel et FEFO P1 |
| Finance et RH | Finance, direction, admin | Limité, conservé | Scénarios DZD et affectations ; comptabilité, tarifs et plannings complexes P2 |
| Pilotage institutionnel | Direction, admin | Fonctionnel local | 5 KPI définis, filtres et rapports ; aucune donnée nationale |
| Campus médical | Étudiant, résident, médecin | Fonctionnel local | 3 cas fictifs, 9 questions, historique ; cours, stages et supervision P1 |
| Recherche | Chercheur, étudiant autorisé, direction | Limité | Permis personnel, cohorte synthétique, descriptif, CSV/PDF ; plateforme statistique complète P1 |
| Messagerie | Comptes autorisés | Fonctionnel local, conservé | Messages dans le coffre ; aucun envoi externe, aucune notification push |
| Communauté, blogs, bibliothèque | Professionnels, enseignants, étudiants | Prévu | Éditeur, revue, modération et droits de contenu ; P2 |
| Mandats familiaux et mineurs | Patient, représentants habilités | Prévu | Le champ représentant légal n’octroie pas un accès ; P0 avant soins réels |
| PDF A4 | Rôles autorisés | Fonctionnel local | Accents, arabe, pagination, QR pour prescription ; pas de signature qualifiée |
| CSV | Recherche, direction | Fonctionnel local | UTF-8 et protection des exports institutionnels contre l’injection de formules |
| Classeur Excel structuré | Rôles autorisés | Prévu | Aucun CSV renommé en XLSX ; typage, feuilles et validation P1 |
| IA documentaire contrôlée | Cliniciens, patient | Architecture proposée | Pas de service IA connecté ni de diagnostic autonome |
| FHIR / HL7 / organismes payeurs | Systèmes partenaires | Préparé, non conforme en production | Export JSON partiel ; contrats et validation nécessaires |
| PWA, hors ligne distribué, notifications | Tous | Prévu | Stockage local ne signifie pas fonctionnement hors ligne de l’application |
| Anglais, tamazight, arabe intégral | Tous | Prévu / arabe partiel | Validation linguistique et documentaire nécessaire |

## Matrice des responsabilités et accès

| Rôle | Périmètre de lecture | Actions majeures | Restrictions |
|---|---|---|---|
| Patient | Son dossier et documents publiés | Demande, annulation, reprogrammation avant arrivée, consentement fictif, message | Pas de publication, dossier d’un proche ou brouillon clinique |
| Médecin | Patients de son équipe, établissement | Consultation, prescription, validation, demandes, sortie, synthèse | Pas de validation de protocole de recherche |
| Résident | Patients attribués, établissement | Brouillons et demandes ; campus | Pas de validation senior |
| Infirmier | Patients de l’établissement, données nécessaires | Soins, transmissions, nettoyage, incidents | Pas de prescription ou validation médicale |
| Accueil | Identité administrative, rendez-vous et lits | Création/correction démographique, admission, agenda | Données cliniques retirées de la projection |
| Laboratoire | Identité minimale et demandes de biologie | Prélèvement, résultats, validation et publication | Pas de dossiers complets ou radiologie |
| Radiologie | Identité minimale et demandes d’imagerie | Créneau, étude synthétique, rapport et diffusion | Pas de demandes de biologie |
| Pharmacie | Identité minimale, ordonnance et stock | Délivrance et réception | Pas de validation de prescription |
| Finance | Identité administrative et factures | Factures et règlements fictifs | Pas de dossier clinique |
| Logistique | Équipements, lots et lits | Stock, maintenance, nettoyage | Identité retirée des lits |
| Chercheur | Études dont il est membre et ses demandes | Protocole, demande, cohorte après autorisation | Jamais de dossier nominatif |
| Étudiant | Campus, études autorisées et ses demandes | Cas, progression et cohortes autorisées | Jamais de dossier clinique nominatif |
| Direction | Agrégats, réseau et dossiers de gestion | Décisions de recherche, affectations, incidents | Pas de dossier clinique nominatif ni d’autoapprobation |
| Admin | Comptes, réseau, gestion et audit | Habilitations et configuration | Pas de dossier clinique nominatif par défaut |

Ces règles sont exécutées par le moteur **dans le navigateur**. Elles ne protègent pas les données contre le propriétaire de l’appareil. Les périmètres infirmiers et spécialisés devront être affinés selon les affectations effectives au pilote.
