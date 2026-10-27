# Pilotage, feuilles de temps et Nova

Cette évolution relie le suivi opérationnel aux accords et à la facturation, sans convertir automatiquement les heures en factures.

## Parcours

- **Temps** : feuille hebdomadaire, filtres projet/collaborateur/état, saisie en `1:30`, `1,5h` ou minutes, correction des temps en attente ou refusés, exports CSV et PDF. La validation en lot est atomique : une saisie modifiée annule toute la demande et impose une actualisation. Les temps validés restent immuables.
- **Projet → Pilotage** : progression pondérée par l'estimation des tâches, blocages, retards, temps saisis/validés et indicateurs financiers. Les temps refusés, les brouillons et les factures annulées ne gonflent pas les totaux. HT et TTC sont explicites ; les environnements réel et test restent séparés.
- **Phases et jalons** : création de tâche depuis une phase, synchronisation des rattachements et protection des jalons soumis ou validés. Un périmètre déjà partagé nécessite une nouvelle version du cahier des charges. Une préparation de facture rejouée avec le même identifiant retourne le même brouillon.
- **Organisation** : parties prenantes, vue graphique ajustable et alternative en liste ; export en planches lisibles et registre complet des éléments et relations.
- **Documents** : logo d'entreprise contrôlé et normalisé, identité figée lors du partage, pagination totale, sommaire paginé du cahier des charges, tableaux qui se poursuivent sur plusieurs pages.
- **Nova — expérimental** : assistant contextuel local en lecture seule. Il calcule des réponses depuis les données autorisées et des règles métier ; il ne s'agit pas d'un modèle génératif connecté. Il ne transmet pas de données à un fournisseur d'IA et ne modifie aucun dossier. Les réponses et liens respectent le rôle et le projet ouverts.

## Vérification et déploiement

La suite API comprend 95 tests. Les régressions spécifiques couvrent les droits, les corrections concurrentes, le traitement atomique, la limite journalière, l'injection CSV, l'idempotence de facturation, la séparation des montants et le gel de l'identité documentaire. Les tests DOM couvrent les six rôles existants, les documents, les paiements, la facturation et Nova. Les PDF ont été générés et inspectés ; les vues ont été vérifiées sur ordinateur et à une largeur mobile de 390 px.

Exécuter `python -m novalis_os.cli migrate` avec l'environnement de production avant de redémarrer l'application et le worker. La migration 8 ajoute uniquement la table des demandes de facturation idempotentes. Conserver une sauvegarde SQLite cohérente et l'ancienne release pour revenir au code précédent. Aucun réensemencement, changement de mot de passe ou connexion automatique à un service de paiement n'est requis.
