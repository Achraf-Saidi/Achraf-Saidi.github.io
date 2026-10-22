# SAHATI — Sécurité et écarts de conformité

État au 14 octobre 2026. Le prototype est exclusivement synthétique. Aucun usage de soins réels n’est autorisé par ce document ; aucune certification, homologation, affiliation publique ou signature qualifiée n’est revendiquée.

## Protections réellement présentes

- Coffre AES-GCM avec dérivation PBKDF2 et deux codes conservés dans le mécanisme existant ; stockage IndexedDB et export chiffré.
- Comptes de démonstration, sessions locales, contrôle de rôle, établissement et relation de soins dans le moteur.
- Projections réduites pour accueil, pharmacie, laboratoire et finance ; aucun accès nominatif par défaut aux chercheurs, étudiants, direction ou admin.
- Vérification de version, transactions SQLite, contraintes de calendrier, d’admission active et de stock.
- Audit d’action et versions avant/après ; données non publiées masquées au patient.
- Références QR opaques ; contrôle de périmètre avant vérification, fichier ou export.
- Validation de taille et signature de format des pièces jointes, texte échappé par React, protection du CSV institutionnel contre l’injection de formules.

## Limites critiques

| Risque | Situation actuelle | Mesure requise avant pilote |
|---|---|---|
| Contournement client | Le navigateur exécute permissions et sessions | Autorisations serveur à chaque opération, séparation des tenants |
| Appareil partagé | Personnes connaissant les deux codes peuvent ouvrir le coffre | Comptes individuels, MFA, verrouillage et politique de poste |
| Confidentialité réseau | Pages sert des ressources publiques | Hébergement adapté, TLS, réseau, gestion des secrets et des clés |
| XSS / poste compromis | Le chiffrement au repos ne protège pas une session ouverte | CSP, durcissement, dépendances auditées et contrôle du poste |
| Traçabilité | Journal et versions peuvent être altérés localement hors API | Journaux indépendants, horodatage, rétention et contrôle d’intégrité |
| Lecture globale | Bootstrap n’attribue pas chaque lecture à chaque dossier | Audit complet de consultation et d’export en production |
| Perte locale | Suppression du navigateur ou manque d’espace | Sauvegardes automatiques, restauration testée et objectifs de reprise |
| Deux appareils | Pas de base partagée ni de registre QR partagé | API et stockage central autorisés |
| PDF exporté | Fichier non chiffré, copie hors du coffre | Politique documentaire, droits d’export et stockage sécurisé |
| Recherche | Consentement et autorisations simulés | Comité d’éthique, fondement légal, accord de données, minimisation |
| Imagerie | Fantôme pédagogique unique | PACS sécurisé, rapprochement d’identité et validation du visualiseur |
| IA | Aucune IA connectée | Évaluation, contrat, hébergement, validation humaine et traçabilité |

## Cadre algérien à instruire

Les sources officielles sont la [loi 18-07, JO n°34 de 2018](https://www.joradp.dz/FTP/JO-FRANCAIS/2018/F2018034.pdf) et la [loi 25-11, JO n°48 du 24 juillet 2025](https://www.joradp.dz/FTP/JO-FRANCAIS/2025/F2025048.pdf). Les données de santé sont sensibles. Le texte de 2025 ajoute notamment délégué, registres et carnets de traitement. Le titre relatif aux traitements pénaux possède un champ particulier : ses dispositions ne sont pas transposées indistinctement aux soins.

Un juriste et les responsables d’établissement doivent préciser fondements légaux, secret professionnel, formalités auprès de l’ANPDP, sous-traitance, hébergement/transferts, information et droits des personnes, mandats des mineurs, conservation et incidents. Le consentement n’est pas supposé être le seul fondement des soins. Les exigences exactes des ordonnances et de la signature électronique demandent une analyse spécifique.

Les références et les propositions de cette section ne constituent pas une attestation de conformité. Les textes d’application et éventuelles évolutions doivent être vérifiés à la date du pilote.

## Architecture de contrôle proposée

Faire dépendre l’accès d’un rôle, d’un établissement, d’une relation de soins et d’une finalité. Un accès d’urgence doit être exceptionnel, justifié, temporaire et revu ; il n’est pas implémenté dans cette version. Les chercheurs reçoivent un espace d’analyse séparé, avec données et durées minimisées. Les membres d’une université ne reçoivent pas automatiquement un accès aux patients.

Définir responsables de traitement, sous-traitants, délégué, référent clinique, responsable de sécurité et comité de données. Formaliser un registre, une analyse de risques/impact adaptée, les procédures d’incident, la rétention, les sauvegardes et les exercices de restauration. Mesurer les accès refusés et les anomalies sans exposer de données dans les logs.

## Terminologies et licences

FHIR est une spécification sous licence ouverte avec marque protégée ; l’export partiel ne signifie pas conformité. LOINC a ses conditions de diffusion et contenus tiers. SNOMED CT nécessite une étude de licence territoriale avant distribution. Les conditions de CIM/ICD et des logiciels PACS doivent être relues. Aucune terminologie propriétaire complète n’est copiée dans le prototype. Voir `BENCHMARK.md`.


## Ajouts locaux du 22 octobre 2026

Sina ne possède pas de clé d’API, n’envoie aucune conversation à un fournisseur et ne fournit pas de décision clinique. Son contexte est supprimé lors de la sortie du compte. L’inventaire et le carnet personnel entrent dans le même coffre chiffré et la même procédure de sauvegarde/restauration. Les clés d’idempotence évitent une double réception lors du rejeu de la même opération ; elles ne remplacent pas un système comptable certifié.

La quarantaine et le rappel sont des états applicatifs de démonstration. Ils n’activent ni rappel réglementaire, ni contact fournisseur, ni message patient. Le carnet personnel ne déclenche pas d’alerte médicale. Les autorisations locales et le chiffrement restent soumis aux limites du navigateur déjà décrites ; une utilisation clinique exige l’architecture serveur et la gouvernance prévues.

Les demandes, réservations, inventaires et fournisseurs de la version 0.4 sont également sauvegardés dans le coffre chiffré. Leurs contrôles de rôle sont une simulation locale ; ils ne créent ni cloisonnement serveur ni approbation indépendante. La revue d’inventaire n’impose pas un second opérateur. Aucun retour fournisseur, retrait ou confirmation ne transmet un message externe. Les bordereaux sont synthétiques et sans valeur réglementaire.
