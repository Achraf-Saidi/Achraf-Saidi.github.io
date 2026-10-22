# ATHAR — Product Requirements Document

**Promesse :** « Du terrain à la preuve. »  
**Positionnement :** plateforme d'intelligence opérationnelle reliant capture terrain, structure documentaire, revue humaine et traçabilité.  
**Périmètre actuel :** expérience de démonstration frontend. **Périmètre projeté :** plateforme SaaS B2B multi-organisations.

## 1. Jobs to be done

Le responsable souhaite que les consignes, formulaires et validations d'une inspection soient prêts avant le passage sur site. L'intervenant veut pouvoir travailler en mobilité, noter une mesure et ne jamais la ressaisir. Le validateur doit identifier immédiatement la provenance d'une valeur, les éléments manquants et les raisons d'une correction. L'administrateur souhaite gérer les modèles, les règles et les droits dans les différents sites.

## 2. Acteurs et rôles

- Responsable de mission : crée des missions, affecte, suit, traite les blocages.
- Intervenant terrain : effectue les contrôles, enregistre les faits, propose des éléments de preuve.
- Validateur : examine les propositions, confirme, refuse ou renvoie en correction.
- Administrateur : configure les organisations, les modèles et les permissions.

Les rôles peuvent se cumuler. Les futurs droits sont appliqués par action, champ, document, organisation et site, pas seulement par navigation de page.

## 3. Domaines fonctionnels

| Espace | Responsabilité | Objet métier |
|---|---|---|
| Studio | Construire les modèles versionnés, règles et conditions | TemplateVersion, FieldDefinition |
| Missions | Planifier, affecter, suivre et escalader | Mission, Assignment |
| Terrain | Capturer texte, voix, mesure et pièce jointe | Observation, Source |
| BASIRA | Extraire, mapper, détecter contradiction, s'abstenir | FieldProposal, RuleDecision |
| Evidence | Relier et retrouver les sources et preuves | Evidence, ProvenanceLink |
| Review | Corriger, confirmer, demander précision | ReviewAction, Issue |
| Sign | Figer la version et organiser l'approbation | DocumentRevision, Approval |
| Insights | Mesurer retards, qualité de complétude et goulots | KPI, EventStream |
| Connect | Exports et interopérabilité future | Integration, Webhook |

## 4. Parcours principal

1. Importer / versionner un modèle et décrire ses champs requis, règles et sources attendues.
2. Créer une mission sur un site, lier équipement et intervenant, définir échéance.
3. Capturer des observations horodatées et des pièces attachées à la mission.
4. Normaliser et rapprocher des candidats avec le bon champ, en conservant les segments sources.
5. Montrer les valeurs proposées, contradictions, éléments manquants et les questions qui s'ensuivent.
6. Permettre correction et confirmation humaine champ par champ ; toute correction crée une trace.
7. Générer une révision du document à partir d'un instantané des champs validés.
8. Approuver une version figée, avec une politique correspondant au risque métier, et archiver.

## 5. Invariants métier

- Ne jamais fabriquer silencieusement une valeur absente.
- Ne pas transformer une mention de photographie en preuve de fichier réellement attaché.
- Ne pas assimiler confiance automatique et validation humaine.
- Conserver source, auteur, instant d'acquisition, version du modèle et de l'extracteur.
- Contradiction non résolue ⇒ pas d'approbation.
- Champs obligatoires non confirmés ⇒ pas d'approbation dans le scénario standard.
- Une validation porte sur une version immuable du document ; une modification ultérieure entraîne une nouvelle révision et peut invalider l'approbation.
- Un retour en correction relance le processus à l'étape pertinente sans réécrire les décisions anciennes.

## 6. Interfaces de référence

Tableau de bord, liste et détail de mission, Studio des modèles, téléphone terrain, compte rendu, moteur BASIRA, document vivant, registre de provenance, file de revue, approbation, calendrier de missions, gestion des équipes, gestion des exceptions. Le site illustre le fonctionnement des zones prioritaires plutôt que de prétendre livrer quinze applications distinctes.

## 7. Exigences non fonctionnelles

Mobile prioritaire sur site industriel, grandes zones tactiles, dégradations réseau prises en compte lors du futur SaaS, accessibilité WCAG AA ciblée, auditabilité, latence compatible avec intervention, résidence des données à décider, permissionnement serveur, RGPD, gestion documentaire et cycle de vie des preuves.

## 8. Mesure de réussite du futur produit

- Temps médian par type d'intervention de la dernière observation au document approuvé.
- Taux de valeurs finalement confirmées, corrigées, refusées et inconnues.
- Part des valeurs reliées à au moins une source vérifiable.
- Erreurs d'extraction détectées avant et après revue, par classe de champ et site.
- Taux de collecte achevée sans double saisie ; frictions mobiles et reprise hors ligne.
- Taux de contradiction résolue avant émission finale.

La démo ne présente aucun de ces indicateurs comme mesuré chez des clients.
