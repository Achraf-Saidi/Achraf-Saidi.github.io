# ATHAR — Du terrain à la preuve.

Site vitrine français et démonstrateur interactif de la plateforme d'intelligence opérationnelle ATHAR. BASIRA désigne son futur moteur intelligent de compréhension documentaire. Ce dépôt contient **une expérience interactive côté navigateur**, pas le SaaS métier ni le futur moteur d'IA.

## Parcourir l'expérience

- Accueil, Plateforme, BASIRA, Explorer ATHAR, Cas d'usage, Méthode & confiance, Vision produit, Contact.
- Six étapes liées par un dossier de démonstration : préparer → terrain → structurer → document → réviser → approuver (illustration).
- Interprétation locale limitée à des règles explicites dans `assets/core.js` ; contradictions détectées ; valeurs inconnues conservées ; champs requis à confirmer ; provenance accessible par clic.
- Maquette Studio configurable dans le navigateur ; export JSON de démonstration ; impression / enregistrement PDF via boîte de dialogue du navigateur ; préparation d'un message de contact à copier, sans envoi de données.

## Démarrage local

Sans installation de dépendances :

```bash
cd athar-project
python3 -m http.server 4173
```

Ouvrir `http://localhost:4173/#/`. Les pages utilisent des routes par fragment (`#/...`) compatibles GitHub Pages et un routage entièrement local.

Vérification :

```bash
npm run check
npm test
```

Aucune dépendance npm externe, aucune API payante, aucun backend, aucune clé secrète.

## Publication GitHub Pages

**Option privilégiée si votre site existant est déjà publié depuis la racine d’un dépôt `username.github.io` :** copier ce dossier dans `<racine>/athar/`. Le site est accessible sur `https://username.github.io/athar/#/`. Les fichiers du site personnel à la racine ne sont pas modifiés.

**Dépôt de projet séparé :** placer les fichiers directement à la racine d'un dépôt `athar`, ouvrir Settings → Pages → Deploy from a branch, branche `main`, dossier `/ (root)`. Adresse attendue : `https://username.github.io/athar/#/`. Les chemins d'assets sont relatifs, donc adaptés aux deux modes.

Le projet est livré en statique prêt à publier. Aucun workflow de build n'est nécessaire à son fonctionnement ; dans un dépôt dont la configuration Pages utilise GitHub Actions, publier le dossier tel quel comme artifact via `actions/upload-pages-artifact` et `actions/deploy-pages` sans changer la configuration du site personnel existant.

## Personnalisation

- Texte, pages, modules, parcours : `assets/app.js`
- Règles métier de la démo : `assets/core.js`
- Direction visuelle : `assets/styles.css`
- Logo et diagrammes : `assets/icon.svg`, `assets/og-athar.svg`, `assets/plant.svg`
- Les coordonnées commerciales ne sont **pas** renseignées : page Contact prépare un message à copier. Brancher un canal officiel seulement lorsque ses coordonnées et son consentement ont été validés.

## Fichiers de conception

- `docs/PRD.md` — besoins, utilisateurs, modules, parcours, critères de succès.
- `docs/BASIRA.md` — architecture future, schéma de données, règles, évaluation.
- `docs/ARCHITECTURE.md` — modèle SaaS futur, sécurité, design system, roadmap.
- `docs/QA.md` — bilan du réalisable, limites, tests, non-affirmations.

## Portée réelle

- Site et démo fonctionnent uniquement dans le navigateur ; l'état est conservé en `sessionStorage` dans la session d'onglet courante.
- Une photographie mentionnée dans la note n'est pas une preuve photographique téléchargée : l'interface l'indique.
- La « confirmation » est une action du visiteur et non une vérification externe.
- L'approbation est illustrative, sans signature électronique ni horodatage indépendant.
- Les données, noms de mission et équipements sont fictifs.
- Les visuels industriels sont des schémas SVG originaux, et non des photographies de sites clients.

© ATHAR — documentation de conception.
