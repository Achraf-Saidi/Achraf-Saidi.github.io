# SAHATI — le soin, relié.

**Application : https://achraf-saidi.github.io/sahati/**

SAHATI rassemble 14 métiers et 25 espaces autour du parcours hospitalier : dossiers patients, rendez-vous, consultations, ordonnances avec QR, laboratoire, radiologie, pharmacie, admissions et lits, soins, urgences, bloc, stocks, facturation, équipes, équipements, qualité, documents, consentements, recherche et administration.

## Version GitHub

L'application publiée fonctionne entièrement sur GitHub Pages, sans redirection ni compte externe. Elle réutilise le moteur métier dans SQLite WebAssembly. Les données et pièces jointes fictives sont enregistrées dans IndexedDB, chiffrées par AES-256-GCM ; la clé non exportable est dérivée du mot de passe privé par PBKDF2-SHA256 avec 600 000 itérations. Le mot de passe n'est pas inclus dans le dépôt. L'enveloppe initiale contient seulement une configuration chiffrée. La clé et les sessions restent en mémoire ; une recharge complète demande le mot de passe à nouveau.

Les permissions métier sont simulées localement. Elles ne constituent pas une frontière de sécurité contre le propriétaire du navigateur. Le code et les ressources de présentation sont publics. Cette version est destinée uniquement à des données fictives, pas à des dossiers médicaux réels. GitHub Pages ne fournit ni serveur applicatif ni synchronisation entre appareils. Un QR local est vérifiable sur le même appareil ou après restauration de sa sauvegarde.

Le bouton **Mes sauvegardes** exporte et restaure une copie chiffrée comprenant les pièces jointes. Une restauration remplace la base locale et révoque ses sessions. Effacer les données du navigateur supprime les données locales ; conserver une sauvegarde est donc nécessaire.

## Connexion

Le mot de passe privé est celui choisi par le propriétaire. Les 14 comptes fictifs ont le mot de passe de compte **SahatiDemo2026!**, distinct du verrou d'entrée. La connexion propose les rôles directement ; leurs adresses sont définies dans `lib/model.ts`.

## Construire et vérifier

Node 24 et pnpm sont requis.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:github
pnpm exec tsc --noEmit
```

Le build produit `dist/github/` et les pages `connexion/`, `espace/`, `verifier/`, avec les ressources servies sous `/sahati/`. Le dossier `github/` contient le coffre, l'adaptateur SQLite et l'entrée autonome. Le script de construction adapte les composants communs et conserve le moteur métier.

## Serveur pour un futur usage partagé

Le moteur serveur, les API, les contrôles d'accès, les neuf tables et les migrations restent inclus. La configuration indépendante utilise Vinext, Cloudflare Workers, D1 et R2. `pnpm build:server` prépare cette variante ; elle nécessite un hébergement configuré, un identifiant D1 réel, un bucket R2 et un secret `SAHATI_GATE_HASH`. Elle n'est pas exécutée par GitHub Pages. Les connexions PACS, laboratoire, organismes payeurs et systèmes nationaux restent à implémenter et à valider.

## Validation et limites

23 scénarios métier passent sur SQLite natif et sur SQLite WASM. Sept scénarios complémentaires couvrent le coffre, le refus d'accès, les mutations/fichiers persistants, le verrouillage, les sauvegardes modifiées, la restauration et les routes GitHub. TypeScript et le build sont vérifiés. La recette visuelle complète en navigateur et la lecture de QR sur appareil physique restent à effectuer. L'interface prévoit téléphone, RTL, contraste et taille de texte ; la traduction métier arabe n'est pas encore complète.

Cette version ne revendique aucune certification clinique, FHIR, WCAG ni conformité juridique. Voir `docs/ROADMAP.md` pour les étapes de validation hospitalière.
