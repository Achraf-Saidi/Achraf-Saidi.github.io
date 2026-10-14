# SAHATI — Architecture et frontières

## Version Pages 0.2

`React → adaptateur local → moteur métier → SQLite WASM → coffre AES-GCM / IndexedDB`.

L’adaptateur `github/runtime.ts` sérialise les opérations et transmet des métadonnées de session au moteur, sans requête vers une API hospitalière. Web Locks coordonne les onglets lorsqu’il est disponible ; sans cette API, la sérialisation porte sur un seul onglet. Le coffre est relu avant chaque opération. Une sauvegarde chiffrée permet de transférer manuellement le scénario.

| Couche | Fichiers principaux | Responsabilité |
|---|---|---|
| Interface | `components/workspace.tsx`, `patient-space.tsx`, `learning.tsx`, vues et formulaires | Navigation et tâches selon le rôle |
| Domaine | `lib/engine.ts`, `policy.ts`, `validation.ts` | Périmètre, transitions, contrôle de version et transactions |
| Documents | `clinical.ts`, `document-export.ts`, `document-reader.tsx` | Passages sources, PDF et glossaire |
| Formation | `education.ts`, table `sahati_learning_attempts` | Cas séparés, évaluation et historique personnel |
| Pilotage / recherche | `reporting.ts` | Indicateurs définis, descriptif et Kaplan-Meier |
| Imagerie pédagogique | `dicom-demo.ts`, `public/imaging` | Fichier synthétique limité, sans PACS |
| Persistance | `github/sqlite.ts`, `vault.ts`, migrations `drizzle` | Transactions et chiffrement local |
| Livraison | `scripts/build-github.mjs` | Entrées Pages et chunks PDF chargés à la demande |

La génération PDF est différée. Les fontes sont servies par GitHub Pages. Aucune donnée personnelle n’est envoyée à une IA. Le préchargement d’un fichier statique synthétique ne constitue pas une acquisition DICOMweb.

## Données et relations

Les entités existantes conservent leur identifiant, `kind`, établissement, patient, version, auteur et statut. La consultation peut référencer un rendez-vous arrivé. Prescription et demande d’examen peuvent référencer la consultation. Une hospitalisation référence un lit. Un résultat peut contenir des observations, un échantillon, un auteur de validation et un horodatage de publication.

Les mutations et les versions avant/après sont dans la même transaction. Une concurrence détectée par numéro de version échoue. Créneaux et ressources sont protégés par index unique ; admissions actives et quantités de stock possèdent aussi des contraintes. La publication et la validation sont distinctes. Une consultation validée ne se réédite pas ; une correction clinique structurée après validation reste à concevoir.

Les ajouts de démonstration sont idempotents. Les dossiers synthétiques initiaux ne sont enrichis que s’ils n’ont pas été modifiés. La migration ne réinitialise ni comptes, ni documents, ni fichiers du coffre. Les sauvegardes anciennes suivent la migration d’accès existante.

## Interopérabilité : état réel

L’export actuel est **inspiré de FHIR R5**, avec Patient et MedicationRequest. Il n’a pas passé un validateur complet et ne constitue pas un serveur FHIR ou un profil national. Avant un pilote, choisir R4/R4B/R5 selon les systèmes partenaires, définir des profils, identifiants, terminologies, provenance et tests de conformité.

Prévoir Patient, Encounter, Appointment, AllergyIntolerance, Condition, Observation, DiagnosticReport, MedicationRequest, MedicationDispense, DocumentReference, ImagingStudy, Consent, AuditEvent et Provenance. Prévoir une passerelle HL7 v2 pour les systèmes existants. LOINC, UCUM, CIM et SNOMED CT demandent des mappings revus et des licences vérifiées ; aucun catalogue certifié n’est embarqué.

Le fichier DICOM de démonstration est un Secondary Capture 8 bits, Explicit VR Little Endian. Le décodeur n’accepte que ce scénario. Un futur PACS doit fournir DICOMweb QIDO-RS, WADO-RS et STOW-RS selon ses capacités ; OHIF serait configuré derrière un proxy d’accès et non exposé sans autorisation. Les UID ne remplacent pas le rapprochement des patients.

## Cible pilote proposée

Un monolithe modulaire avec API, base PostgreSQL et stockage d’objets convient à un premier pilote. Isoler les établissements par `tenant_id` obligatoire et protections en base ; associer rôle, relation de soins, unité, finalité et contexte. Utiliser un fournisseur d’identité adapté, MFA pour les comptes sensibles, révocation, journaux indépendants et sauvegardes restaurées en exercice.

Une archive PACS, un connecteur laboratoire et les extractions de recherche constituent des services séparés lorsque le besoin le justifie. Le chercheur travaille dans un espace minimisé ; une clé de rapprochement reste distincte. Les échanges interétablissements exigent des accords et une politique d’identité.

La production demande pagination, normalisation, indexation, supervision, résolution des doublons, tests de charge et restauration. Le moteur actuel charge au maximum 3 000 entités pour le scénario ; il ne convient pas à la volumétrie hospitalière nationale. GitHub Pages héberge uniquement des ressources publiques synthétiques.

Le code territorial du répertoire de démonstration est un identifiant à deux chiffres, sans liste nationale embarquée ni plafond historique à 58. Les codes et périmètres institutionnels doivent être repris depuis un référentiel officiel versionné avant le pilote.
