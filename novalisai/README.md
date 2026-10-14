# Novalis AI — édition 2.0

Vitrine existante améliorée, publiée depuis ce dépôt sur `https://achraf-saidi.github.io/novalisai/`. Le logo, la palette cuivre/ivoire, les polices locales, la sculpture interactive et le configurateur sont conservés. L’application observée sur `www.novalisai.com` est distincte ; sa bascule n’a pas été effectuée.

## Construire et modifier

```sh
python3 build.py
```

`content.json` porte les contenus de l’accueil ; `extension.json` les nouvelles pages et démonstrations ; `template.html` la composition. `extensions.py` génère 13 pages éditoriales dans FR, EN, NL et DE. Le sitemap inclut les pages construites. Aucun framework n’est nécessaire pour servir la vitrine.

Pour préparer une copie destinée au domaine : `python3 build.py --site-url https://www.novalisai.com`. Cette commande ajuste les canoniques ; elle ne déploie pas, ne modifie pas les DNS et ne remplace pas la version du domaine.

L’offre est harmonisée sur une première heure gratuite et sans engagement, suivie d’une première note de cadrage. Le bouton permet actuellement d’en faire la demande par e-mail. Un calendrier d’une heure est implémenté dans le backend, prêt à être raccordé après déploiement.

## Démonstrations et catalogue

- Sculpture contrôlable, adaptée aux mouvements réduits, avec arrêt hors écran et densité limitée.
- Configurateur existant : trois univers, modules, création et approbation de demandes avec état distinct par univers.
- Exploration de quatre rôles : informations et décisions adaptées, actions limitées à la démonstration.
- Calculateur d’automatisation : volume, durée et part automatisable ; formule affichée et résultats présentés comme hypothèses.
- Réseau de compétences : pôles interactifs ; aucun total de salariés ou de profils disponibles inventé.
- `products.json` reste le catalogue extensible des SaaS. Son état vide n’annonce pas de produit commercial lancé.
- Portfolio : BILADI, Code32 et Numeria sont des exemples publics en évolution, pas des références clients livrées. Aucun dépôt privé ni résultat commercial confidentiel n’est publié.

## Contact, rendez-vous et portail

Le contact institutionnel est `contact@novalisai.com` ; `achraf@novalisai.com` est réservé à la direction technique. Le formulaire prépare un brouillon d’e-mail tant que `runtime-config.json` contient des valeurs nulles. Il ne prétend pas enregistrer une demande dans le CRM.

Après qualification de Novalis OS, définir `api_origin` et `portal_url`. Le formulaire enregistrera alors les demandes dans le CRM et permettra de choisir les créneaux publiés. Il affiche un succès uniquement après la réponse positive du serveur. Les erreurs conservent le formulaire rempli. Une réservation ne prétend pas qu’un e-mail en attente a déjà été transmis.

Le backend et son interface figurent dans `../novalis-os`. Voir le [journal de livraison](../novalis-os/docs/progress.md) pour les limites exactes.

## Contrôles

```sh
npm ci --prefix qa
NOVALIS_JSDOM_MODULE="$(pwd)/qa/node_modules/jsdom" node qa/verify.cjs
NOVALIS_JSDOM_MODULE="$(pwd)/qa/node_modules/jsdom" node qa/v2.cjs
node qa/sculpture-check.cjs
```

Les tests couvrent les comportements DOM, l’échappement, les liens, les éditions, le calcul et l’accusé de réception serveur simulé. Ils ne constituent pas une recette visuelle ni un score Lighthouse. `qa/responsive.html` prépare la revue des largeurs 320, 360, 390 et 430 pixels ; aucun contrôle visuel de ces largeurs n’a été exécuté ici.

Les informations institutionnelles du site conservé doivent être confrontées à un extrait BCE ou aux statuts avant activation des opérations réglementaires. Les chiffres de ressources annoncés n’ont pas été publiés faute de validation de leur disponibilité et de leur recouvrement.
