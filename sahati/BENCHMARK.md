# SAHATI — Références publiques et décisions

Sources consultées le 14 octobre 2026. Les descriptions publiques renseignent des fonctions ; elles ne constituent pas une comparaison indépendante de performance. Les choix SAHATI ci-dessous sont des déductions de conception, pas une copie de code ou d’interface.

| Référence | Enseignement public retenu | Décision originale pour SAHATI |
|---|---|---|
| [Epic / MyChart](https://www.epic.com/epic/post/patients-control-sharing-medical-record/) | Résultats, médicaments, visites et partage contrôlé | Accueil par prochaines étapes et dossier patient lisible ; mandats futurs explicites |
| [Oracle Health](https://www.oracle.com/health/clinical-suite/) | Données et documents intégrés aux tâches cliniques | Lier arrivée, consultation, prescription et examens |
| [MEDITECH Expanse](https://ehr.meditech.com/ehr-solutions/expanse-ambulatory-care) | Mobilité et coordination | Patients/campus mobiles et tâches professionnelles contextualisées |
| [InterSystems TrakCare](https://www.intersystems.com/products/trakcare/medication-management/) | Prescription, administration et pharmacie reliées | Circuit prescription/lot/délivrance ; futur référentiel pharmacologique validé |
| [Dedalus ORBIS U](https://www.dedalus.com/uki/our-products/orbis-u/) | Workflows cliniques, infirmiers et administratifs configurables | Modules par établissement, avec procédures locales |
| [OpenMRS](https://openmrs.org/) | Plateforme modulaire et APIs d’interopérabilité | Domaine séparé des vues et adaptateurs explicites |
| [OpenEMR](https://www.open-emr.org/wiki/index.php/OpenEMR_7.0_Users_Guide) | Portail, documents, rendez-vous et prescriptions | Actions simples et document effectivement téléchargeable |
| [Bahmni](https://www.bahmni.org/), [PACS](https://www.bahmni.org/pacs-integration) | Enregistrement, clinique, investigations et intégrations hospitalières | Scénarios synthétiques continus et connecteurs séparés |
| [DHIS2](https://dhis2.org/overview/) | Données individuelles/agrégées et organisation sanitaire | Agrégats autorisés, définition des KPI et qualité des remontées |
| [OHIF 3.11](https://docs.ohif.org/3.11/configuration/datasources/dicom-web/) | Visualisation et sources DICOMweb configurées | Futur visualiseur derrière une autorisation serveur |
| [Orthanc DICOMweb](https://orthanc.uclouvain.be/book/plugins/dicomweb.html) | QIDO/WADO/STOW et capacités documentées | PACS autonome sécurisé ; fantôme local clairement distinct |
| [OpenELIS dans Bahmni](https://bahmni.atlassian.net/wiki/spaces/BAH/pages/32014358/Laboratory) | Demandes et laboratoire reliés à l’identité | Source, échantillon, traitement et validation séparés |

## Standards, versions et conditions

- [OMS : stratégie 2020–2027](https://www.who.int/publications/i/item/9789240116870) et [extension décidée en 2025](https://www.who.int/news/item/23-05-2025-world-health-assembly-endorses-extension-of-the-global-digital-health-strategy-to-2027) : gouvernance et moyens humains/organisationnels accompagnent la technologie.
- [FHIR R5 5.0.0](https://www.hl7.org/fhir/index.html), [licence](https://www.hl7.org/fhir/license.html) et [R4 4.0.1](https://hl7.org/fhir/R4/license.html) : choisir une version selon le partenaire ; la spécification ouverte n’équivaut pas à une conformité implémentée. Le prototype exporte un sous-ensemble inspiré de R5.
- [DICOM PS3.18 2026d](https://dicom.nema.org/medical/dicom/current/output/html/part18.html) : les services Web sont à tester selon les capacités du PACS. Le prototype ne fournit aucun endpoint DICOMweb.
- [IHE ITI, profil MHD](https://profiles.ihe.net/ITI/TF/Volume1/ch-45.html) : échange documentaire et cohérence de métadonnées à examiner au pilote, sans certification IHE annoncée.
- [LOINC, licence actualisée en août 2026](https://loinc.org/kb/license/) : vérifier redistribution, notices et contenus tiers. Aucun catalogue LOINC n’est livré ici.
- [SNOMED International](https://www.snomed.org/licensing) : analyser le territoire et le contrat avant utilisation ; les usages dans un territoire non membre peuvent nécessiter licence et déclaration annuelle.
- [OMS ICD/CIM](https://www.who.int/standards/classifications/classification-of-diseases), [licence ICD-11](https://icd.who.int/icdapi/docs2/license/) : version et conditions à figer au pilote ; aucun codage réglementaire algérien n’est supposé.
- [Loi 18-07](https://www.joradp.dz/FTP/JO-FRANCAIS/2018/F2018034.pdf), [modification 25-11](https://www.joradp.dz/FTP/JO-FRANCAIS/2025/F2025048.pdf) : données, responsabilités et obligations à instruire avec les établissements et les juristes.

Les composants propriétaires ne sont ni copiés ni embarqués. Orthanc, OHIF, QR, SQL.js, fontes et dépendances doivent conserver leurs licences lors des distributions. La démo ne déclare pas de bibliothèque pharmacologique certifiée ou de connecteur national autorisé.
