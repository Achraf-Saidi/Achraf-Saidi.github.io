# Vérification de la refonte

- Génération réussie des pages FR, EN, NL, DE et de la page d’accueil française ; clés de traduction cohérentes et aucun jeton de modèle non résolu.
- Syntaxe JavaScript vérifiée avec Node ; CSS analysée avec CSSOM, y compris les règles responsive et la réduction des animations.
- Vérifications DOM dans les quatre langues : identifiants uniques, un seul titre principal, six offres, trois aperçus, liens d’ancre et ressources locales valides.
- Studio : progression manuelle, lecture, interruption lors du changement de scénario, reprise jusqu’à la fin, annulation par le curseur et lecture sans animation avec la préférence de réduction des mouvements.
- Aperçus : données et colonnes du tableau de bord actualisées selon la période, ouverture/fermeture de la synthèse, ajout de deux produits avec total exact de 134 €, panier vidé.
- Palette : analyse des couleurs CSS, cuivre/or/ivoire sans bleu dominant ; contraste de la couleur principale calculé avec le blanc.
- Navigation : menu mobile, fermeture avec Échap, sélection des onglets, flèches clavier, Home/End et état de focus.
- Contact : refus d’un formulaire invalide, présélection du besoin, création d’un brouillon contenant les champs facultatifs, encodage exact du lien mailto, copie, retour au formulaire et conservation des valeurs.
- Les valeurs saisies sont affichées avec textContent ; un nom contenant une balise script reste du texte et ne produit aucun élément script.
- Ouverture/fermeture des mentions de confidentialité et retour du focus.
- Aucun lien vers un dépôt dans les aperçus ou ailleurs dans la navigation de la vitrine.

**Limite :** aucun contrôle de navigateur n’est disponible dans l’environnement de cette refonte. Pas de capture visuelle actuelle ni de mesure d’overflow sur appareil. Le CSS prévoit les dimensions téléphone, tablette et ordinateur, mais la recette visuelle réelle reste à faire. Le calendrier externe et la délivrabilité de la messagerie n’ont pas été testés ; aucun message ou rendez-vous de test n’a été envoyé.
