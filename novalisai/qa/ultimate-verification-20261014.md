# Novalis AI — refonte interactive, 14 octobre 2026

Version publique préparée : `305dba8ce13071c7ab8858e65f6c917a3174f372`.
Branche : `novalis-ultimate-20261014`. PR : https://github.com/Achraf-Saidi/Achraf-Saidi.github.io/pull/7

## Changements

- Logo et identité cuivre conservés ; compositions ivoire et vert profond.
- Graphe de sept composants, trois scénarios métier, descriptions sélectionnables et disposition spécifique aux téléphones.
- Lab sans API payante ni entraînement : classification kNN réelle, quatre terrains synthétiques, vote par distance, frontière calculée, exemples ajoutables, annulation, indices, objectif, record local, export PNG et partage des seuls exemples fictifs.
- Score calculé sur 128 points distincts des exemples. Le vote kNN ne constitue pas une probabilité calibrée. Les indices utilisent un troisième échantillon, indépendant du jeu de test.
- Optimisation exacte de six tâches par énumération des 64 combinaisons, avec capacité, priorités et comparaison à une sélection séquentielle.
- Extraction documentaire par règles explicites, sans OCR ni LLM : contrôles des champs, total et validation humaine ; toute modification invalide la validation.
- Architecte de solutions : secteur, taille, outils, priorités, budget facultatif et contraintes ; modules et dépendances ; brief téléchargeable et transfert au formulaire sans envoi automatique.
- Mini-ERP sur données fictives : références, quantités, total, contrôle, réservation de stock et retour au brouillon.
- Huit phases de méthode avec livrables et décisions ; six pôles d’équipe et parcours de collaboration.
- Effectifs déclarés par la direction : cinq frontend et six backend à temps plein. Data/analyse et design à temps plein sans effectifs numériques inventés. JetThings et indépendants mobilisables selon la tâche.
- Douze études de cas, quatre pages Lab autonomes et catalogue administrable de NovalisOS, présenté comme produit interne en développement.
- Captures réelles BILADI et Code32 ; aucune capture privée de NovalisOS publiée. Aucun résultat commercial ou client inventé ; Numeria reste hors des liens publics.
- Services enrichis par problèmes et scénarios illustratifs ; éditions française, anglaise, néerlandaise et allemande.

## Vérifications

CI GitHub https://github.com/Achraf-Saidi/Achraf-Saidi.github.io/actions/runs/38563342074 réussie sur la version ci-dessus : génération déterministe, tests métier backend existants, vérifications DOM, comportements de l’interface, image Docker et configurations de déploiement.

`verify.cjs`, `v2.cjs`, `studio.cjs`, `ultimate.cjs` passent dans les quatre langues. 73 pages HTML générées, titres et liens locaux vérifiés. Cas limites algorithmiques, indépendance des échantillons, optimalité, extraction sûre, invalidation des validations et commandes clavier vérifiés.

Revue réelle dans Chrome : cadres de 320, 360, 390, 430, 768 et 1280 pixels pour chacune des quatre langues. Après corrections, `scrollWidth == clientWidth` dans les 24 contrôles. Les barres de défilement desktop occupent 15 pixels : les largeurs utiles sont respectivement 305, 345, 375, 415, 753 et 1265 pixels. Voir `responsive-results-20261014.json`.

Le menu mobile s’ouvre et se ferme avec Échap. Dans le Lab à 390 pixels, l’ajout d’un exemple recalcule réellement le score ; le mode Observer affiche les trois distances des voisins ; la capacité minimale donne un résultat de zéro ; le document fictif donne 326,70 € et autorise la validation uniquement après contrôle. Capture : `screenshots/lab-mobile-390.jpg`.

Calendrier https://www.cal.eu/novalisai/30min inspecté le 14 octobre : compte NovalisAI, rendez-vous de 30 minutes, Cal Video, sélection Europe/Brussels et créneaux réellement affichés. Aucun rendez-vous créé pendant cette vérification. Le diagnostic gratuit d’une heure reste organisé sur demande et n’est pas confondu avec cet événement de 30 minutes. Aucun contexte prospect n’est transmis automatiquement à Cal.eu.

## Limites et informations à compléter

- Revue responsive dans Chrome, pas sur appareils physiques ni Safari/Firefox. Aucun score Lighthouse ou Core Web Vitals annoncé.
- Les effectifs data/design, identités et portraits supplémentaires ne sont pas renseignés.
- Le formulaire utilise l’API existante et confirme seulement une réponse serveur positive. La messagerie automatique reste non raccordée ; les créneaux internes d’une heure ne sont pas publiés. Le calendrier externe vérifié constitue le parcours de réservation disponible.
- Les intégrations avancées de NovalisOS ne sont pas présentées comme terminées. Le Lab est pédagogique et ne prédit pas les résultats d’un projet réel.

## Déploiement et rollback

La préproduction est un paquet statique isolé : https://www.novalisai.com/_review/qa.html. Elle porte `noindex, nofollow`. Son autorisation de cadre se limite aux pages publiques statiques du dossier de revue ; les en-têtes des vhosts publics et de l’application restent inchangés.

Nouvelle release : `/var/www/novalis-ai/releases/ultimate-305dba8ce13071c7ab8858e65f6c917a3174f372`.
Ancienne release conservée : `/var/www/novalis-ai/releases/bc78ee4e44342804e27d4635cfdc716a467e7892-studio-5012a3e6`.

Le changement du lien `/var/www/novalis-ai/current` est atomique. Le script revient à l’ancien lien si la vérification de publication échoue. Aucun changement de base, d’environnement ou de service applicatif. Les scripts de transport sont sur des branches `novalis-hostinger-ops-*` distinctes et révoquent leur clé SSH éphémère à la fin de l’opération.

Retour manuel, uniquement pour un administrateur autorisé :

```python
from pathlib import Path
import os, secrets
root = Path('/var/www/novalis-ai')
rollback = root / ('.rollback-' + secrets.token_hex(6))
rollback.symlink_to(root / 'releases/bc78ee4e44342804e27d4635cfdc716a467e7892-studio-5012a3e6')
os.replace(rollback, root / 'current')
```

Après rollback, contrôler la vitrine, `https://app.novalisai.com/healthz`, l’accès `/os/` et Pointage.

Publication confirmée : les 20 routes principales vérifiées en HTTPS répondent 200 et correspondent octet pour octet à la release. Pointage conserve le même contenu et la même configuration ; les PID Nginx, NovalisOS, Novalis worker, PostgreSQL et PM2 restent identiques. L’ancien lien de vitrine est conservé pour rollback. Les clés SSH éphémères ont été révoquées ; liste finale vide. Résumé : `deployment-results-20261014.json`.

La capture publique après publication est `screenshots/desktop-public.jpg`.
