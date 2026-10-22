# SAHATI 0.5 — Validation de livraison

Vérification du 22 octobre 2026. Exécution locale sur les sources de la version GitHub Pages, données entièrement synthétiques.

| Contrôle | Résultat | Portée |
|---|---|---|
| Tests métier existants | 23 scénarios réussis | Rôles, établissement, validation, stock, lits, calendrier, recherche, fichiers, audit |
| Coffre GitHub | 13 scénarios réussis | Deux codes, migrations, IndexedDB chiffré, sauvegardes, restauration, sessions et persistance des opérations de stock |
| Parcours reliés supplémentaires | 13 scénarios réussis | Patient jusqu’au document, labo, radiologie, lit, campus, recherche et exports |
| Nouveaux parcours 0.3 | 19 scénarios réussis | Catalogue, réceptions, FEFO, refus atomique, rappel, transfert, comptages, commandes, concurrence, coûts, carnet, ICS et Sina |
| Opérations de stock 0.4 | 19 scénarios réussis | Réservations, dotations partielles, protections de quantité, retours, fournisseurs, inventaires, rapprochements et concurrence |
| Client IA anonyme 0.5 | 10 scénarios réussis | POST sans clé, historique borné, validation, quota, panne, JSON invalide, taille, texte brut, annulation et timeout |
| Interactions React / DOM | 21 scénarios réussis | 16 précédents + choix explicite IA, absence de dossiers dans les requêtes, historique et changement de compte, arrêt et réponse tardive, quota/repli local, arabe RTL et HTML échappé |
| TypeScript GitHub | Réussi | Point d’entrée, domaine et composants utilisés |
| Build statique | Réussi | Pages avec chemins `/sahati/`, SQLite WASM et PDF différé |
| PDF français / arabe | Rendus et inspectés | A4, fonte, accents, ordre arabe, pagination et lisibilité |
| PDF institutionnel | 4 pages rendues et inspectées | Logo, contenu, espacements, pieds de page |
| QR du PDF | Décodé indépendamment avec ZXing | URL exacte avec référence opaque et version |
| DICOM synthétique | Relu indépendamment avec pydicom | Syntaxe, identité fictive, StudyInstanceUID, SOPClassUID, dimensions et pixels |
| Application dans Chrome | Inspectée | Patient, pharmacie, dotation de la demande à la délivrance, inventaire avec écart, glissement à la souris, anglais, arabe et Sina |
| Viewport mobile 390 px | Inspecté dans un iframe Chrome | Carnet patient, navigation, stocks et Sina en arabe ; aucun téléphone physique ni safari mobile testé |
| Système serveur / PACS réel | Non effectué | Aucun système de production connecté |

**118 scénarios automatisés distincts** passent. Ce nombre n’inclut pas les relectures PDF/QR/DICOM ni le typage/build. Il ne constitue pas un nombre de validations cliniques ou une certification.

## Commandes reproductibles

Depuis `sahati/source`, installer les dépendances verrouillées avec pnpm, puis exécuter `pnpm test:all`. Le script compile le site, teste les transactions SQLite WASM, le coffre, les nouveaux parcours, les interactions DOM et le typage. `node tests/workflows.mjs` permet aussi le chemin SQLite natif sous Node 24.

La vérification indépendante PDF/DICOM utilise Poppler, ZXing et pydicom dans l’environnement de QA ; ces outils ne sont pas des dépendances de l’application. La présentation se reconstruit avec `python scripts/create-institutional-pdf.py` et ReportLab. Les fichiers de contrôle sont temporaires, distincts des dossiers utilisateurs. Les contrôles indépendants PDF/QR/DICOM ont été effectués lors de la livraison 0.2 ; les tests de génération ont été rejoués en 0.3 puis en 0.4 et 0.5. La fixture visuelle est isolée et non publiée : elle n’ouvre pas le coffre de l’utilisateur et ne remplace pas la suite chiffrée, qui utilise les vrais primitives et codes synthétiques de test.

## Points à vérifier avant démonstration officielle

Inspecter les pages sur 320, 360, 390 et 430 px, une tablette et un écran hospitalier : débordement, menu, focus, claviers, tableaux et téléchargement. Tester un coffre existant sur l’appareil de présentation, une connexion lente et le retour depuis un PDF. Faire relire cas, lexique, documents et procédures par des professionnels. Pour les données réelles, appliquer les conditions de `SECURITY_AND_COMPLIANCE.md`.

Le bordereau de sortie 0.4 a été généré dans Chrome et son lien PDF local inspecté. Le connecteur du navigateur de contrôle n’a pas confirmé la récupération du téléchargement ; ce contrôle reste à compléter dans un navigateur utilisateur. Les tests de génération A4 et de fonte passent.


## Vérification IA 0.5

Le 22 octobre 2026, le catalogue OVHcloud a exposé `Mistral-Small-3.2-24B-Instruct-2506`. Le préflight CORS et un POST sans Authorization depuis un client avec l’origine GitHub Pages ont obtenu HTTP 200 et `Access-Control-Allow-Origin: *`. Une conversation réelle depuis Chrome dans la fixture SAHATI a ensuite reçu une explication FEFO de Mistral, affichée comme **Réponse IA**, sans clé ni compte fournisseur. La fixture visuelle ne charge que des données synthétiques jetables ; elle utilise le vrai client IA de livraison.

Les dix tests client sont déterministes avec transport simulé. Les cinq nouveaux scénarios DOM contrôlent le flux React avec réponses simulées ; ils ne prouvent ni disponibilité future, ni qualité clinique ou linguistique du modèle. Le contrôle distant réel est séparé. `test:all` inclut ces tests. Le fournisseur peut modifier modèle, quota, conditions ou accès anonyme ; le guide local reste disponible.

Une seconde réponse distante en arabe a été reçue dans un iframe de 390 × 850 px : sens RTL, formulaire visible, largeur du panneau 390 px, largeur interne et défilement horizontal tous deux 388 px. Captures : `docs/SAHATI_sina_ai_20261022.jpg` et `docs/SAHATI_sina_ai_ar_20261022.jpg`. Ce contrôle de rendu n’est pas une validation linguistique spécialisée ni un essai sur téléphone physique.
