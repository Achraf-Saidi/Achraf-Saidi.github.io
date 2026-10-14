# SAHATI 0.2 - Démonstration hospitalière reliée

[Ouvrir SAHATI](https://achraf-saidi.github.io/sahati/) · [Guide de démonstration](../DEMO_GUIDE.md) · [Présentation PDF](../docs/SAHATI_Presentation.pdf)

Identité SAHATI conservée. Démonstration autonome GitHub Pages, sans authentification par une plateforme tierce. Deux codes existants, puis comptes par métier. Tous les dossiers, établissements, mesures, cas et images sont synthétiques.

## Ce qui fonctionne

Accueil et dossier patient, rendez-vous modifiables, consultation reliée, ordonnances structurées, téléchargement PDF, QR local, mesures et explications sourcées, circuit laboratoire, programmation radiologique et vrai DICOM synthétique, hospitalisation cohérente, campus avec progression, recherche autorisée et pilotage institutionnel.

Les 14 rôles et les modules existants sont conservés. Le scénario est enregistré dans un coffre local chiffré ; il ne se synchronise pas entre appareils. Le QR nécessite le même coffre et un compte autorisé. Aucune donnée réelle, signature qualifiée, base pharmacologique certifiée ou intégration nationale n’est présente.

## Documentation

- [Audit](../AUDIT.md), [vision produit](../PRODUCT_VISION.md), [benchmark](../BENCHMARK.md)
- [Architecture](../ARCHITECTURE.md), [fonctionnalités et rôles](../FEATURE_MATRIX.md)
- [Parcours](../WORKFLOWS.md), [sécurité et conformité](../SECURITY_AND_COMPLIANCE.md)
- [Roadmap](../ROADMAP.md), [guide](../DEMO_GUIDE.md), [validation](../VALIDATION.md)

54 scénarios automatisés passent, avec build et typage. PDF rendus, QR décodé et fichier DICOM relu indépendamment. Le rendu de l’application sur un navigateur et des téléphones réels n’a pas pu être contrôlé dans l’environnement de livraison.

## Sources et build

Depuis `source/` : Node 24+, `pnpm install --frozen-lockfile`, puis `pnpm test:all`. `pnpm build` produit `dist/github/`. Pour publier, copier ses fichiers vers `sahati/` dans le même dépôt, conserver les sources et ne modifier aucun autre projet.

Les composants, le domaine, les migrations et les tests sont versionnés. Le PDF est chargé à la demande ; ses fontes sont locales. L’ancien point d’entrée serveur est conservé mais n’est pas le serveur de Pages et n’a pas été revalidé dans cette livraison.

By Achraf Saidi, Ryan Aouf & 21 others
