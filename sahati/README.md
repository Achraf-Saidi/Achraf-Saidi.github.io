# SAHATI 0.3 - Démonstration hospitalière reliée

[Ouvrir SAHATI](https://achraf-saidi.github.io/sahati/) · [Guide de démonstration](DEMO_GUIDE.md) · [Présentation PDF](docs/SAHATI_Presentation.pdf)

Identité SAHATI conservée. Démonstration autonome GitHub Pages, sans authentification par une plateforme tierce. Deux codes existants, puis comptes par métier. Tous les dossiers, établissements, mesures, cas et images sont synthétiques.

## Ce qui fonctionne

Accueil et dossier patient, rendez-vous modifiables, consultation reliée, ordonnances structurées, téléchargement PDF, QR local, mesures et explications sourcées, circuit laboratoire, programmation radiologique et vrai DICOM synthétique, hospitalisation cohérente, campus avec progression, recherche autorisée et pilotage institutionnel.

Nouveautés du 22 octobre 2026 :

- **Sina** : assistant de démonstration disponible dès l’accès privé et dans les espaces métiers, questions libres, réponses contextualisées, raccourcis autorisés, quatre langues. Aucun service d’IA ni abonnement externe.
- **Mon quotidien** : rappels personnels, export agenda `.ics`, préparation de visite, questions, carnet de ressenti et fiche pratique PDF. Aucun suivi médical automatique.
- **Pharmacie** : catalogue avec DCI/présentation/unité, paramètres de réapprovisionnement, lots et emplacements, réceptions, commandes et reliquats, comptages motivés, transferts, sorties de service, quarantaine/rappel, délivrance FEFO multi-lots et journal exportable.
- **Langues** : français, arabe RTL avec police locale, anglais et Tamaziɣt en alphabet latin. Les textes cliniques saisis et les cas pédagogiques gardent leur langue d’origine ; une relecture linguistique spécialisée reste nécessaire.

Les 14 rôles et 29 espaces sont conservés ou étendus. Le scénario est enregistré dans un coffre local chiffré ; il ne se synchronise pas entre appareils. Le QR nécessite le même coffre et un compte autorisé. Aucune donnée réelle, signature qualifiée, base pharmacologique certifiée ou intégration nationale n’est présente.

## Documentation

- [Audit](AUDIT.md), [vision produit](PRODUCT_VISION.md), [benchmark](BENCHMARK.md)
- [Architecture](ARCHITECTURE.md), [fonctionnalités et rôles](FEATURE_MATRIX.md)
- [Parcours](WORKFLOWS.md), [sécurité et conformité](SECURITY_AND_COMPLIANCE.md)
- [Roadmap](ROADMAP.md), [guide](DEMO_GUIDE.md), [validation](VALIDATION.md)

79 scénarios automatisés passent, avec build et typage. Les nouveaux parcours ont aussi été examinés dans Chrome, sur écran large et dans un viewport mobile de 390 px, dont le rendu arabe de Sina. Les téléphones physiques et tous les navigateurs ne sont pas couverts. Les contrôles PDF, QR et DICOM de la version précédente sont documentés dans VALIDATION.md.

## Sources et build

Depuis `source/` : Node 24+, `pnpm install --frozen-lockfile`, puis `pnpm test:all`. `pnpm build` produit `dist/github/`. Pour publier, copier ses fichiers vers `sahati/` dans le même dépôt, conserver les sources et ne modifier aucun autre projet.

Les composants, le domaine, les migrations et les tests sont versionnés. Le PDF est chargé à la demande ; ses fontes sont locales. L’ancien point d’entrée serveur est conservé mais n’est pas le serveur de Pages et n’a pas été revalidé dans cette livraison.

By Achraf Saidi, Ryan Aouf & 21 others
