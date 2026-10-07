# Novalis AI

Vitrine claire et responsive en **français, anglais, néerlandais et allemand**, indépendante de Code32 et du portfolio personnel. Chaque langue possède sa propre page HTML complète : les textes et métadonnées ne dépendent pas d’une traduction chargée dans le navigateur.

## Consulter

- Site : https://achraf-saidi.github.io/novalisai/
- Français : `fr/` — English : `en/` — Nederlands : `nl/` — Deutsch : `de/`
- Aperçu de la vitrine : [qa/preview.jpg](qa/preview.jpg).
- Revue des formats : `qa/responsive.html` (page de contrôle, non indexée et absente de la navigation publique).

## Modifier

`content.json` contient les quatre versions rédactionnelles. `template.html` porte la structure commune. `assets/styles.css` et `assets/app.js` portent l’identité visuelle et les interactions.

Après une modification des contenus ou du modèle :

```sh
python3 build.py
```

Le générateur utilise uniquement la bibliothèque standard de Python 3.12 ou ultérieur. Les pages HTML générées sont suivies dans Git : aucune installation ni compilation n’est nécessaire pour les servir.

## Contact et rendez-vous

La version GitHub Pages prépare un **e-mail vers achraf@novalisai.com**. Le visiteur vérifie son message puis l’envoie avec son application de messagerie. Un bouton permet également de copier le texte. Le site n’annonce jamais un envoi automatique et ne collecte pas les demandes sur un serveur.

Le formulaire reste masqué sans JavaScript ; un lien e-mail direct est alors disponible. Il ne doit pas se rabattre sur une soumission GET contenant les coordonnées dans l’URL.

La réservation réutilise le lien déjà publié sur le site d’origine : https://www.cal.eu/novalisai/30min. La page a été ouverte et identifiée comme la réunion de 30 minutes de NovalisAI, avec Cal Video. La disponibilité, les invitations et le lien vidéo restent gérés par la configuration Cal.eu existante. Aucun rendez-vous de test n’a été créé.

Un envoi direct depuis le formulaire nécessitera un service d’envoi ou une configuration serveur lors du passage sur Hostinger. Aucun compte de service tiers n’est créé et aucune adresse n’y est activée par cette vitrine. Le DNS, le site actuel et la messagerie du domaine restent à configurer dans une étape distincte.

## Passage ultérieur sur Hostinger

1. Générer les pages avec l’URL définitive :

   ```sh
   python3 build.py --site-url https://www.novalisai.com
   ```

2. Copier les **fichiers générés** `index.html`, `fr/`, `en/`, `nl/`, `de/`, `assets/` et `sitemap.xml` dans le dossier public du domaine. Ne pas exposer les fichiers de développement ou la page de revue si elle n’est pas utile.
3. Tester les pages, les polices et les liens de langue sur le domaine avant de basculer la vitrine. Adapter la mention d’hébergement dans les quatre langues puis régénérer.
4. Raccorder ensuite un traitement serveur pour l’envoi direct. Les identifiants SMTP doivent rester côté serveur, jamais dans Git ou JavaScript. Mettre à jour le parcours de contact et la politique de confidentialité pour correspondre au traitement réellement actif.

Les liens internes et les assets utilisent des chemins relatifs. La vitrine fonctionne aussi bien dans le sous-dossier GitHub qu’à la racine du domaine après régénération des métadonnées.

## Direction éditoriale

- Audit des usages, proposition cadrée, développement puis accompagnement.
- Équipe modulable et prix compétitifs expliqués par le périmètre et l’organisation, sans associer un pays à une main-d’œuvre « bon marché ».
- Présentation sobre d’**Achraf Saidi**, chercheur en IA et entrepreneur, sans photo ; son nom renvoie vers son GitHub.
- Les projets antérieurs d’Achraf sont identifiés comme tels. METABRIC reste un projet académique et de recherche. Aucune promesse clinique, statistique de ROI, certification, citation de client ou recommandation d’institution n’est inventée.
- Les expériences sectorielles et le réseau de développement reprennent le contexte fourni par le propriétaire. Les détails confidentiels, noms de clients non autorisés et logos d’anciens employeurs ne sont pas exposés.

## Sources et assets

- Logo original et favicon : https://www.novalisai.com/ — copies du logo existant, optimisation de taille uniquement. `logo.webp` est une version réduite du logo transparent. Le monogramme existant est conservé comme favicon.
- Image de présentation sociale existante : `assets/novalis_og.png`, reprise du site d’origine, sans création de nouvelle carte.
- Visuel d’accueil : une composition originale HTML/CSS/SVG autour du monogramme du logo, reliant documents, logiciels et équipes. Le logo original est simplement cadré dans la mise en page ; son fichier et ses couleurs sont préservés. Les deux états du flux sont illustratifs.
- Palette claire : blanc chaud, abricot, cuivre et graphite. Une typographie Manrope affirmée, un en-tête flottant, des illustrations de projets, des cartes d’expertise et un parcours de méthode vertical donnent des compositions différentes à chaque section.
- Les quatre illustrations de projets sont produites en SVG par `build.py`. Elles sont identifiées comme illustrations ; ce ne sont ni des captures d’applications livrées ni des résultats de clients. Elles ne chargent aucun service ou image distante.
- Espace SaaS : explicitement en construction, sans faux produit, prix, date de lancement ou inscription.
- Manrope : Google Fonts, hébergée localement, licence SIL Open Font License conservée. L’ancienne police Instrument Serif et sa licence restent archivées parmi les assets, sans être chargées par la page.
- Identité de l’entreprise, adresse et numéro : https://clusters.wallonie.be/tweed/home/membres/memberList/novalis-ai.html et https://rewan.be/en/profiles/novalis-ai/
- Expérience : https://achraf-saidi.github.io/projects/
- METABRIC : https://github.com/Achraf-Saidi/METABRIC-Dashboard
- Capi : https://www.novalisai.com/en/projects/capi
- Équipe de développement : https://jetnext.jethings.com/

## Accessibilité et fonctionnement

Navigation clavier, onglets avec touches fléchées, éléments `details` natifs, labels de formulaire, lien d’évitement et fenêtre de confidentialité native. Les animations d’entrée se jouent une seule fois ; les effets au survol et les révélations respectent `prefers-reduced-motion`. Les contenus restent lisibles si les animations ou JavaScript sont absents. Aucun tracker publicitaire, outil d’analyse d’audience ou police distante ne se charge sur la page.
