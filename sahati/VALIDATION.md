# SAHATI 0.3 — Validation de livraison

Vérification du 22 octobre 2026. Exécution locale sur les sources de la version GitHub Pages, données entièrement synthétiques.

| Contrôle | Résultat | Portée |
|---|---|---|
| Tests métier existants | 23 scénarios réussis | Rôles, établissement, validation, stock, lits, calendrier, recherche, fichiers, audit |
| Coffre GitHub | 12 scénarios réussis | Deux codes, migrations, IndexedDB chiffré, sauvegardes, restauration, sessions |
| Parcours reliés supplémentaires | 13 scénarios réussis | Patient jusqu’au document, labo, radiologie, lit, campus, recherche et exports |
| Nouveaux parcours 0.3 | 19 scénarios réussis | Catalogue, réceptions, FEFO, refus atomique, rappel, transfert, comptages, commandes, concurrence, coûts, carnet, ICS et Sina |
| Interactions React / DOM | 12 scénarios réussis | Parcours antérieurs + langues, Sina, rappel personnel et réception |
| TypeScript GitHub | Réussi | Point d’entrée, domaine et composants utilisés |
| Build statique | Réussi | Pages avec chemins `/sahati/`, SQLite WASM et PDF différé |
| PDF français / arabe | Rendus et inspectés | A4, fonte, accents, ordre arabe, pagination et lisibilité |
| PDF institutionnel | 4 pages rendues et inspectées | Logo, contenu, espacements, pieds de page |
| QR du PDF | Décodé indépendamment avec ZXing | URL exacte avec référence opaque et version |
| DICOM synthétique | Relu indépendamment avec pydicom | Syntaxe, identité fictive, StudyInstanceUID, SOPClassUID, dimensions et pixels |
| Application dans Chrome | Inspectée | Patient, pharmacie, réception réelle dans la fixture, anglais, arabe et Sina |
| Viewport mobile 390 px | Inspecté dans un iframe Chrome | Carnet patient, navigation et Sina en arabe ; aucun téléphone physique ni safari mobile testé |
| Système serveur / PACS réel | Non effectué | Aucun système de production connecté |

**79 scénarios automatisés distincts** passent. Ce nombre n’inclut pas les relectures PDF/QR/DICOM ni le typage/build. Il ne constitue pas un nombre de validations cliniques ou une certification.

## Commandes reproductibles

Depuis `sahati/source`, installer les dépendances verrouillées avec pnpm, puis exécuter `pnpm test:all`. Le script compile le site, teste les transactions SQLite WASM, le coffre, les nouveaux parcours, les interactions DOM et le typage. `node tests/workflows.mjs` permet aussi le chemin SQLite natif sous Node 24.

La vérification indépendante PDF/DICOM utilise Poppler, ZXing et pydicom dans l’environnement de QA ; ces outils ne sont pas des dépendances de l’application. La présentation se reconstruit avec `python scripts/create-institutional-pdf.py` et ReportLab. Les fichiers de contrôle sont temporaires, distincts des dossiers utilisateurs. Les contrôles indépendants PDF/QR/DICOM ont été effectués lors de la livraison 0.2 ; les tests de génération ont été rejoués en 0.3. La fixture visuelle est isolée et non publiée : elle n’ouvre pas le coffre de l’utilisateur et ne remplace pas la suite chiffrée, qui utilise les vrais primitives et codes synthétiques de test.

## Points à vérifier avant démonstration officielle

Inspecter les pages sur 320, 360, 390 et 430 px, une tablette et un écran hospitalier : débordement, menu, focus, claviers, tableaux et téléchargement. Tester un coffre existant sur l’appareil de présentation, une connexion lente et le retour depuis un PDF. Faire relire cas, lexique, documents et procédures par des professionnels. Pour les données réelles, appliquer les conditions de `SECURITY_AND_COMPLIANCE.md`.
