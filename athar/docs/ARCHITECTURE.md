# ATHAR — Architecture et système de conception

## 1. Choix du site vitrine

Site statique à **ES modules natifs, CSS et SVG**. Ce choix diffère du couple React/TypeScript envisagé initialement : il supprime le build externe, toutes les dépendances et les risques de rupture liés à un dépôt GitHub Pages déjà utilisé par un autre site. Le démonstrateur est riche grâce à une couche d'état unique, un modèle de données normalisé et un moteur déterministe indépendant de la vue. La cible SaaS peut ensuite adopter React/TypeScript sans modifier les concepts métier. Une version industrielle demandera des composants, une gestion d'état testable et des tests E2E exhaustifs.

Navigation par fragments `#/` ; chemins relatifs ; `sessionStorage` uniquement ; contenus rendus localement ; zéro backend ; aucun secret. Les handlers d'événements sont délégués. Le dossier est publié tel quel depuis `/athar/` dans le dépôt GitHub Pages utilisateur, sans toucher à la page d'accueil existante.

## 2. Modèle SaaS cible

Entités : Tenant/Organization → Team/Site/User/Role; Mission → Assignment/Equipment; Mission → Observation → Source/Evidence; Template → TemplateVersion → FieldDefinition; Observation → FieldProposal → ReviewDecision; Document → DocumentRevision → Approval; AuditEvent pour chaque action sensible.

Relations explicitement versionnées et contraignantes :

```text
Organization
 ├─ Users / Roles / Permissions
 ├─ Sites / Equipment
 ├─ Template ─ TemplateVersion ─ FieldDefinition
 └─ Mission ─ Observation ─ Source / Evidence
                └─ FieldProposal ─ ReviewDecision
                   └─ Document ─ DocumentRevision ─ Approval
```

**Serveur cible :** API avec authentification OIDC/SAML, autorisations tenant-aware, service missions, stockages objet versionnés de fichiers, base transactionnelle relationnelle, queue métier, worker documentaire/PDF, service revue et signature selon niveau de preuve, analytics d'événements, connecteurs via webhooks idempotents. Architecture modulaire et monolithe structuré privilégié avant microservices, afin de réduire l'overhead initial. Stockage objet de preuves lié à des checksums et ACL côté serveur. Tout traitement IA est isolé du périmètre d'autorisation.

**Idempotence/concurrence :** événements avec `eventId`, `aggregateVersion`, gestion optimistic-lock des révisions ; les décisions ne doivent pas accepter une version périmée ; assurer des séquences cohérentes hors ligne avec conflits explicites.

**Document :** une nouvelle `DocumentRevision` capture versions du modèle, des valeurs confirmées et des preuves référencées. Le rendu PDF est déterministe. La signature/approbation porte sur cette version figée et l'identité vérifiée. Toute modification après approbation entraîne une révision distincte.

## 3. Sécurité et gouvernance prévues, non réalisées

Multi-tenancy testé, isolation au niveau API et BD (RLS si approprié), authentification multifactorielle, minimisation des données personnelles, encryption transit/rest, sauvegarde et restauration testées, audit immuable ou append-only, rétention configurable, registre d'accès aux preuves, contrôle MIME/magic bytes des imports, anti-malware adapté, protections de génération PDF, scan des fichiers, politique d'injection documentaire, supervision, procédures de suppression et export, DPA et RGPD. Éviter les affirmations « conforme RGPD » ou « signature qualifiée » tant que les éléments légaux et techniques nécessaires ne sont pas établis.

## 4. Design system

| Élément | Choix |
|---|---|
| Fond principal | blanc minéral `#F5F5F0` |
| Fonds forts | vert-noir `#102025`, profond `#0A171B` |
| Secondaire | sauge `#D5E9DB` et métallique `#D9E0DF` |
| Action/structure | vert technique `#38665F` |
| Accent de traçage | cuivre `#B77E46` utilisé avec parcimonie |
| Typographie | Manrope en titres ; DM Sans en corps, fallback système |
| Grille | largeur utile 1450 px, marges fluides clamp |
| Statuts | neutre / proposé / contradiction / confirmation humaine |
| Bordures | lignes fines, peu de rayons, pas de glassmorphism massif |
| Animations | apparition discrète, pulse uniquement sur le trajet d'information |
| Accessibilité | focus visible, labels, alt SVG, réduction des animations |

Signatures visuelles : **fil de preuve**, **document vivant**, **carte d'état par champ**, **timeline de mission**, **panneau BASIRA**, **Studio de modèles**, **connexions observation–preuve–révision**. Le logo géométrique reprend une information qui traverse deux zones documentaires.

## 5. Roadmap sans dates garanties

**MVP** : tenants, rôles, modèles, mission, capture texte/photo, extraction basique explicitée, document PDF versionné, revue et trace source. **V1** : synchronisation terrain, validations multicouches, éditeur de champs, audit, recherche de preuve, notifications. **V2** : intégrations ERP/GMAO, analytics de qualité, traitement audio multilingue, moteur de confiance calibré. **Après validation terrain** : règles avancées, nouveaux domaines métier, méthodes de signature tierce, orchestration complexe.

## 6. Limites du démonstrateur

Une session unique côté navigateur ne représente pas une application multi-utilisateurs. Aucune gestion de véritables permissions, stockage résilient, téléversement, reconnaissance vocale, IA, signature, envoi de contact, backend ou compliance n'est livrée ici. Ces éléments figurent dans la conception pour une implémentation ultérieure.
