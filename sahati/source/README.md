# SAHATI — le soin, relié

Plateforme hospitalière algérienne **de démonstration**, conçue pour Achraf Saidi.

**Application privée : https://sahati.ochrecreek8.chatgpt.site**

La vitrine et l’application sont protégées côté serveur. Le mot de passe d’entrée choisi par le propriétaire est configuré comme secret d’hébergement ; il n’est ni dans ce dépôt ni dans le navigateur. Le code source GitHub est public. Les dossiers, établissements et avis éthiques de cette version sont entièrement fictifs.

## Découvrir la plateforme

1. Ouvrir l’application privée avec le compte ChatGPT propriétaire.
2. Déverrouiller la vitrine avec le mot de passe d’entrée personnel.
3. Choisir **Accéder à mon espace**, puis l’un des 14 profils.
4. Les identifiants de démonstration sont proposés dans la page de connexion. Le mot de passe commun de ces comptes fictifs est `SahatiDemo2026!`.
5. Le menu du compte permet de changer de profil ou de verrouiller entièrement le site.

| Domaine | Fonctions reliées et enregistrées |
| --- | --- |
| Identité & dossier | Accueil, contrôle de doublons, coordonnées, équipe autorisée, synthèse clinique, chronologie |
| Rendez-vous | Demande patient, confirmation accueil, arrivée, fin, annulation, réservation des créneaux |
| Consultations | Observations structurées, brouillon, revue du résident, validation médicale |
| Ordonnances | Traitements saisis manuellement, validation senior, QR de vérification, impression/PDF, annulation motivée |
| Pharmacie | Lots, péremption, réception, délivrance par lot, déduction transactionnelle des stocks |
| Laboratoire & radiologie | Demande, prélèvement, compte rendu, résultat critique manuel, validation, publication, accusé de lecture |
| Hospitalisation | Attribution atomique d’un lit, protection contre la double admission, synthèse de sortie, bionettoyage |
| Soins & urgences | Transmissions, constantes saisies, tâches, priorités professionnelles et prise en charge |
| Bloc opératoire | Réservation de salle, contrôles préopératoires, démarrage, comptage, fin |
| Documents | Comptes rendus, pièces jointes PDF/PNG/JPEG, téléchargements authentifiés, impressions |
| Gestion | Factures en DZD, règlements, affectations et horaires, équipements et maintenance, incidents |
| Recherche | Protocoles, revue de direction, permis personnels limités dans le temps, consentement, cohortes fictives minimisées, export CSV tracé |
| Patient | Rendez-vous, ordonnances, résultats publiés, documents, messages, choix de consentement, instructions vocales |
| Réseau & administration | Établissements par wilaya, comptes, révocation des sessions, journal des actions |
| Interface | Mise en page mobile/tablette/ordinateur, navigation français/arabe et RTL, texte agrandi, contraste renforcé, lecture simplifiée |

La traduction arabe couvre la navigation et certains parcours ; les formulaires détaillés restent majoritairement en français. Les données sont limitées à 3 000 enregistrements par chargement dans cette version.

## Développement

React 19, TypeScript, Vinext/Vite, Cloudflare Workers, SQLite D1 et pièces jointes R2. Les styles et composants métier sont dans `app/`, `components/` et `lib/`. Les migrations `drizzle/` créent uniquement le schéma. Les données fictives sont initialisées lors de la première connexion métier.

Node 24 et pnpm sont requis pour la suite de tests SQLite.

```sh
pnpm install
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

L’hébergement utilise les liaisons `DB` (D1), `BUCKET` (R2) et le secret `SAHATI_GATE_HASH`. Voir [architecture](docs/ARCHITECTURE.md), [validation](docs/VALIDATION.md), [identité](docs/BRAND.md) et [suite du produit](docs/ROADMAP.md).

## Périmètre

Cette version est une base fonctionnelle d’ERP, avec stockage serveur et parcours reliés. Elle ne constitue pas un système hospitalier validé pour des patients réels. Les connexions PACS/DICOMweb, automates de laboratoire, annuaires, organismes payeurs et systèmes nationaux restent à réaliser. Le JSON exporté s’inspire de FHIR R5, sans certification de conformité. Le QR est une référence protégée, pas une signature électronique qualifiée.
