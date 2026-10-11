# Novalis AI

Site vitrine autonome en français, anglais, néerlandais et allemand, publié à https://achraf-saidi.github.io/novalisai/.

## Construire

```sh
python3 build.py
```

`content.json` contient les textes des quatre langues. `template.html`, `assets/styles.css` et `assets/experience.css` portent le design ; `assets/app.js` gère la navigation et le contact, `assets/experience.js` le configurateur et les filtres produits, `assets/sculpture.js` le rendu cuivré. Le générateur utilise la bibliothèque standard de Python et publie des pages HTML indépendantes. Aucun framework ni serveur applicatif n’est nécessaire pour cette vitrine.

Pour un futur transfert sur le domaine : `python3 build.py --site-url https://www.novalisai.com`. Cette édition ne modifie pas le domaine, le DNS ou la messagerie.

## Direction et contenu

- Fonds ivoire et champagne, bronze foncé, cuivre et or repris du logo, grands titres Manrope et Instrument Serif. Polices locales et licences conservées.
- Sculpture cuivrée originale : maillage de nœud torique projeté en Canvas 2D, lumière et reflets calculés, rotation au doigt/souris/clavier, pause et recentrage. Projection ajustée aux dimensions, densité limitée, arrêt hors écran/arrière-plan et mode statique pour la réduction des mouvements. Fallback visuel si Canvas est indisponible.
- Configurateur de trois univers (commerce, équipes, documents) et trois modules. Création et approbation de demandes locales, états séparés par univers, activation/désactivation de modules et mise à jour des compteurs. Les suggestions sont écrites pour les données fictives de la démo ; aucune API IA n’est appelée.
- Espace **Nos SaaS** indépendant et visible dans la navigation. Le catalogue `products.json` est volontairement vide. Les trois emplacements affichés sont réservés, pas des produits lancés.
- Fiches SaaS préparées : quatre traductions, statut, catégorie, résumé, détails, fonctionnalités, image locale, démonstration et accès. Les accès ne sont affichés que pour un statut disponible ; les filtres apparaissent dès que le catalogue contient un produit.
- Six offres : sites/boutiques/restaurants, logiciels sur mesure, SaaS personnalisables, IA/automatisation, données/reporting, audit/intégration.
- Trois aperçus de solutions illustratifs. Les données sont fictives. Aucun client, résultat financier, témoignage ou réalisation livrée n’est inventé. Aucun aperçu ne mène vers du code ou un projet privé.
- Les bases existantes et prototypes sont des points de départ à évaluer et adapter. Leur présence n’affirme pas une mise en production commerciale préalable. La personnalisation, les intégrations et la validation sont cadrées dans la proposition.
- La méthode explique audit, cadrage chiffré, développement, mise en service, prise en main et suivi. Les prix compétitifs sont expliqués par le dimensionnement de l’équipe et la réutilisation pertinente, sans tarifs commerciaux inventés.
- Achraf Saidi : recherche en IA/statistique à UCLouvain et entrepreneuriat. Réseau Belgique/Europe/Afrique, JetThings/JetNext. L’expérience industrielle en Algérie est attribuée aux intervenants, sans inventer de clients Novalis.

## Contact

Les liens de rendez-vous réutilisent le calendrier existant https://www.cal.eu/novalisai/30min. Aucun rendez-vous de test n’a été envoyé. La disponibilité dépend de ce service externe ; elle n’a pas pu être revérifiée pendant cette refonte.

Le formulaire prépare un e-mail à **achraf@novalisai.com** avec nom, adresse de réponse, entreprise éventuelle, besoin, situation, budget et calendrier éventuels. Le visiteur vérifie le brouillon puis l’envoie depuis sa messagerie. Il peut copier le texte et revenir au formulaire. Aucun service d’envoi ni nouvelle collecte serveur n’est ajouté. Les tranches de budget du formulaire sont des préférences de prospect, pas des tarifs de l’entreprise.

Les clics sur une offre présélectionnent le sujet dans le formulaire. Sur mobile, un bouton de rendez-vous reste accessible et disparaît à l’arrivée dans la zone contact lorsque l’observation du défilement est disponible.

## Vérifications

`qa/verification.md` décrit les contrôles effectués et la limite visuelle. Le script facultatif `qa/verify.cjs` nécessite `jsdom` (`npm install --no-save jsdom`, puis `node qa/verify.cjs`). Ces dépendances ne sont pas nécessaires au site ou au générateur.

La revue `qa/responsive.html` affiche les pages actuelles dans plusieurs dimensions pour une inspection manuelle. Elle n’est pas indexée et n’apparaît pas dans la navigation publique.

## Sources

Le raisonnement sur le marché et les sources officielles sont consignés dans `qa/market-notes.md`. Le site privilégie des offres concrètes plutôt que des statistiques d’adoption ou des engagements réglementaires généraux.

## Ajouter un SaaS

Ajouter un objet à `products.json` puis exécuter `python3 build.py`. Exemple de structure à remplacer par les informations réelles :

```json
{
  "id": "identifiant-du-produit",
  "status": "building",
  "image": "",
  "demo_url": "",
  "access_url": "",
  "content": {
    "fr": {"title": "Nom réel", "category": "Secteur", "summary": "Usage réel", "detail": "Présentation", "features": []},
    "en": {"title": "Actual name", "category": "Sector", "summary": "Actual use", "detail": "Description", "features": []},
    "nl": {"title": "Werkelijke naam", "category": "Sector", "summary": "Werkelijk gebruik", "detail": "Beschrijving", "features": []},
    "de": {"title": "Tatsächlicher Name", "category": "Bereich", "summary": "Tatsächliche Nutzung", "detail": "Beschreibung", "features": []}
  }
}
```

Statuts : `planned`, `building`, `beta`, `live`. L’image, si fournie, doit exister dans `assets/`. Les liens doivent être des pages HTTPS publiques. L’éditeur peut ajouter `image_alt` dans chaque traduction. Le générateur échappe les textes, vérifie les identifiants, les statuts, les ressources et les liens. Aucune interface d’administration ni compte client n’est requis pour gérer ce catalogue dans Git.
