# Mise en service réelle de Numeria

L’espace livré est un prototype local utilisable. Il définit les écrans, relations et règles métier ; il ne fournit pas une sécurité serveur, des comptes réels ou des paiements réels.

## Contrat des données

`school-core.js` contient des fonctions pures : état initial fictif, portée de chaque rôle, validation d’une sauvegarde et mutations. `school-store.js` implémente actuellement IndexedDB. Pour une vraie école, remplacer ce stockage par une API authentifiée **et réimplémenter les autorisations côté serveur**. Ne jamais faire confiance au rôle ou à l’identifiant envoyé par le navigateur.

| Entité | Relations principales |
| --- | --- |
| Utilisateurs | Identité serveur et rôle ; compte inactif sans accès |
| Liens parent-enfant | Créés et vérifiés par l’administration ; aucun accès parent par simple e-mail connu |
| Formations et modules | Brouillon/publication, intervenant(s), historique des versions |
| Inscriptions | Apprenant, formation, droits d’accès et dates |
| Séances et présences | Formation, professeur, début/fin et apprenants inscrits |
| Devoirs et copies | Formation, auteur de la copie, versions, note et retour |
| Ressources | Formation, visibilité, propriétaire et fichier privé ou extrait public |
| Échéances et paiements | Apprenant, commande réelle, statut confirmé par le prestataire |
| Messages | Auteur et destinataire vérifiés, notifications sur consentement |
| Contenu éditorial | Brouillon, traduction, validation et version publique |
| Journal | Identité authentifiée, opération, date serveur, accès restreint |

## Permissions indispensables

- Administration : gérer les comptes et les relations de l’école, éditer et publier le catalogue, consulter le pilotage. Accès nominatif et authentification forte pour les personnes autorisées.
- Professeur : formations/groupes explicitement attribués, ressources et copies correspondantes, présences de ses séances. Aucun accès aux finances générales.
- Apprenant : inscriptions, ressources autorisées, ses copies et ses progrès. Impossible d’écrire une note ou une présence officielle.
- Parent : enfants liés et données pédagogiques autorisées. Aucun accès à un autre enfant par changement d’identifiant dans l’URL.
- Visiteur : catalogue publié et extraits déclarés publics, jamais documents privés, comptes ou statistiques de gestion.

Les tests locaux de rôles vérifient l’intention fonctionnelle. Ils **ne remplacent pas des tests de permissions sur une API**.

## Infrastructure à connecter

1. Choisir un hébergement serveur et une base de données partagée ; conserver la vitrine GitHub Pages si une API distante est souhaitée.
2. Ajouter un fournisseur d’identité ou une authentification serveur avec sessions protégées, invitation et récupération de compte. Supprimer les accès démo du mode production, limiter les tentatives et vérifier les e-mails. Aucun secret dans les fichiers GitHub publics.
3. Mettre les PDF privés dans un stockage objet avec accès contrôlé, liens temporaires, quotas et vérifications de fichier. Évaluer les documents avant distribution ; sauvegarder les données et fichiers ensemble.
4. Fournir des routes de publication explicites : les brouillons ne doivent pas changer immédiatement le contenu public. Prévoir prévisualisation, historique et retour à une version précédente.
5. Brancher le contact sur un service serveur de messagerie, avec validation et limitation des envois. Pour Meet, utiliser une intégration calendrier autorisée ; l’export ICS actuel ne crée pas une visioconférence.
6. Choisir un prestataire de paiement disponible pour l’activité et le pays, puis utiliser ses confirmations serveur signées. Ne pas transformer le bouton démo « payée » en confirmation de règlement réel. Prévoir facturation et rapprochement selon les règles applicables à l’entreprise.
7. Finaliser les cours, droits sur les supports, calendrier, intervenants, conditions d’inscription, information sur le traitement des données et accompagnement des mineurs. Vérifier les obligations locales avec les professionnels compétents avant d’exploiter l’école.
8. Tester transactions concurrentes, droits entre familles/groupes, téléchargements privés, restauration des sauvegardes, quotas, accessibilité et appareils mobiles avant de recevoir des données réelles.

## Références techniques

- [GitHub Pages : hébergement statique](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [IndexedDB : API de stockage navigateur](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [OWASP : contrôle d’accès](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

Ces étapes constituent le travail restant pour la production ; elles ne sont pas déjà configurées dans ce dépôt.
