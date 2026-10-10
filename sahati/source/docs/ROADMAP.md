# Faire de SAHATI un produit hospitalier

La version actuelle permet de revoir des parcours complets avec des données fictives. L’objectif national demande des phases de développement, de validation et de déploiement distinctes.

| Phase | Résultats attendus |
| --- | --- |
| Pilote institutionnel | Cartographie des processus, rôles réels, spécialités, identitovigilance et responsabilités avec un établissement partenaire |
| Modèle clinique | Données normalisées, terminologies validées, allergies structurées, médicaments et unités, corrections et provenance, dossier pédiatrique/obstétrical adapté |
| Sécurité & continuité | Identité forte/SSO/MFA, politiques de mots de passe, tests indépendants, cloisonnement, surveillance, sauvegardes/restauration et plan de reprise mesurés |
| Interopérabilité | Profils FHIR documentés et validés, HL7/LIS, PACS et DICOMweb, appareils, référentiels et organismes payeurs réels |
| Circuits avancés | Administration des médicaments, transfusion, banques de sang, dialyse, oncologie, stérilisation, logistique d’achats, comptabilité et ressources humaines complètes |
| Recherche encadrée | Comité d’éthique réel, base légale et permis, catalogues et dictionnaires, minimisation, gestion de ré-identification, environnement d’analyse séparé |
| Accessibilité & terrain | Traduction métier arabe complète, lecteurs d’écran, tests WCAG 2.2, faible connectivité, fonctionnement dégradé et reprise de synchronisation |
| Mise à l’échelle | Pagination et indexation, montée en charge, partitionnement multi-établissement, migrations contrôlées, support et formation |
| Gouvernance | Vérification juridique algérienne et des traitements, hébergement et contrats adaptés, droits des patients, signatures et archivage à valeur probante |

Les domaines cités ici ne sont pas annoncés comme implémentés. Un ERP national ne peut pas être présenté comme « parfait » ou cliniquement prêt après une seule phase de construction.

## Références de conception

- Bahmni : https://www.bahmni.org/feature-list
- MyKanta : https://www.kanta.fi/en/mykanta
- HL7 FHIR R5 MedicationRequest : https://hl7.org/fhir/R5/medicationrequest.html
- AuditEvent et Provenance : https://hl7.org/fhir/R5/auditevent.html et https://hl7.org/fhir/R5/provenance.html
- DICOMweb, Part 18 : https://dicom.nema.org/medical/dicom/current/output/html/part18.html
- Findata, autorisations : https://findata.fi/en/permits/data-permits/
- WCAG 2.2 : https://www.w3.org/TR/WCAG22/
- ANPDP, notice : https://plaintes.anpdp.dz/notice.php

Ces références orientent la conception ; elles n’établissent aucune certification, affiliation ou conformité de SAHATI.
