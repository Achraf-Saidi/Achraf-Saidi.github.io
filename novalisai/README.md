# Novalis AI

Site vitrine autonome en français, anglais, néerlandais et allemand, publié à https://achraf-saidi.github.io/novalisai/.

## Construire

```sh
python3 build.py
```

`content.json` contient les textes des quatre langues. `template.html`, `assets/styles.css` et `assets/app.js` portent la structure, le design et les interactions. Le générateur utilise la bibliothèque standard de Python et publie des pages HTML indépendantes. Aucun framework ni serveur applicatif n’est nécessaire pour cette vitrine.

Pour un futur transfert sur le domaine : `python3 build.py --site-url https://www.novalisai.com`. Cette édition ne modifie pas le domaine, le DNS ou la messagerie.

## Direction et contenu

- Fonds ivoire et champagne, bronze foncé, cuivre et or repris du logo, grands titres Manrope et Instrument Serif. Polices locales et licences conservées.
- Accueil avec composition orbitale cuivre, léger relief au pointeur sur ordinateur et trois aperçus HTML : période de tableau de bord sélectionnable, synthèse ouvrable et panier de démonstration calculé localement.
- Studio interactif : trois scénarios (facture, congé, rapport), curseur pour parcourir les étapes, lecture/pause/reprise et résultat à valider. Animation locale déterministe, données fictives, aucune requête IA ou API métier. Aucun gain de productivité n’est inventé.
- Animations interrompues hors écran et à la mise en arrière-plan. Préférence de réduction des animations : transitions neutralisées et lecture terminée immédiatement. Les effets au pointeur sont limités au pointeur fin sur ordinateur ; les démonstrations fonctionnent avec boutons et curseur sur mobile et au clavier.
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
