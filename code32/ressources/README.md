# Code32 — Ressources

Cette page est la vitrine statique de la boutique de ressources pédagogiques Code32.

## Architecture recommandée

- **GitHub Pages** : catalogue, design, SEO et aperçus.
- **Payhip** : paiement, hébergement privé des PDF, téléchargement après achat et gestion de la TVA numérique UE/UK.
- **Ne jamais placer le PDF payant dans ce dépôt public** : un fichier présent ici serait téléchargeable sans paiement.

## Mettre un produit en vente

1. Créer le PDF final.
2. Créer un produit numérique sur Payhip et y téléverser le PDF.
3. Ajouter si possible un petit fichier d’aperçu sur Payhip.
4. Copier le lien direct de checkout Payhip.
5. Ouvrir `catalog.js`, trouver le produit concerné et coller le lien dans `checkoutUrl`.

Exemple :

```js
checkoutUrl: "https://payhip.com/buy?link=ABCDE"
```

Le bouton passe automatiquement de **Bientôt en vente** à **Acheter**.

## Ajouter un nouveau produit

Dans `catalog.js`, dupliquer un objet de `window.CODE32_PRODUCTS` et modifier :

- `id`
- `title`
- `subtitle`
- `category`
- `tags`
- `level`
- `price`
- `type`
- `description`
- `bullets`
- `pages` (aperçu affiché sur le site)
- `checkoutUrl`

## Prix de départ conseillés

- mini-fiche ultra ciblée : **3,90–4,90 €**
- fiche + exercices : **5,90–7,90 €**
- gros pack d’exercices/corrigés : **8,90–12,90 €**
- pack examen complet : **12,90–16,90 €**
- bundle de plusieurs ressources : **24,90–34,90 €**

Éviter de démarrer à 1–2 € : le coût fixe du paiement devient trop important et le prix communique moins bien la valeur du travail.
