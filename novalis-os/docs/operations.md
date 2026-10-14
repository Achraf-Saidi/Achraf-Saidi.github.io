# Déploiement, sauvegardes et maintenance

**État : fichiers préparés ; aucune opération n’a été exécutée sur le VPS Hostinger.** Ne pas copier cette procédure sur une machine existante avant l’inventaire, la sauvegarde et la vérification des conflits.

## Qualification de la machine

Le script `deploy/audit-vps.sh` est en lecture seule : OS, CPU, mémoire, disque, ports et services. Évaluer la charge existante, le stockage disponible, les certificats et le reverse proxy déjà utilisé. Les ports 80/443 du fichier Compose supposent une machine disponible pour Caddy ; si ces ports sont occupés, intégrer l’application au proxy existant au lieu de démarrer celui-ci.

Prévoir un compte d’exploitation avec accès limité au répertoire de l’application, une préproduction avec sa propre base et son domaine, un stockage hors machine et un moyen de recevoir les alertes. Aucune capacité ou performance KVM n’est supposée dans cette livraison.

## Installation sur une cible qualifiée

Depuis la racine du dépôt :

```sh
python3 -m venv novalis-os/.venv
novalis-os/.venv/bin/pip install -r novalis-os/requirements.txt
```

Pour Docker, le contexte est la racine du dépôt et le fichier est `novalis-os/deploy/Dockerfile`. Les dépendances Python sont figées. Les images Python et Caddy doivent être résolues et figées par digest lors de la recette de production, puis mises à jour de manière contrôlée.

Copier `.env.example` en `.env` **uniquement sur la cible** et restreindre ses droits à 0600. Générer localement une clé aléatoire de 32 octets encodée en base64 URL-safe pour `NOVALIS_ENCRYPTION_KEY`. Ne pas utiliser une valeur de démonstration ; ne pas transmettre cette clé dans un chat. Conserver une copie chiffrée dans un coffre séparé des sauvegardes.

Les répertoires `/srv/novalis-os/data` et `/srv/novalis-os/backups` doivent être privés et accessibles à l’UID/GID 10001 du conteneur. La base et les documents ne doivent jamais être placés dans GitHub Pages.

Après préparation du fichier d’environnement et du stockage, initialiser la base et le premier compte dans un terminal sécurisé :

```sh
docker compose -f novalis-os/deploy/compose.yml run --rm app python -m novalis_os.cli migrate
docker compose -f novalis-os/deploy/compose.yml run --rm -it app python -m novalis_os.cli bootstrap --email achraf@novalisai.com --name 'Achraf Saidi'
```

Le mot de passe est saisi avec `getpass` et n’apparaît pas dans les arguments. Le premier compte ne peut accéder à l’ERP avant son enrôlement TOTP. Aucun mot de passe initial n’existe dans le dépôt.

Le reverse proxy proposé ne dessert que `app.novalisai.com` ; l’application n’expose pas son port sur Internet. `NOVALIS_TRUST_PROXY=true` ne doit être activé que derrière **un seul** reverse proxy de confiance, avec le backend non exposé. Ce paramètre sert notamment à limiter les tentatives selon l’adresse réelle du visiteur.

Après recette sur préproduction, lancer les services :

```sh
docker compose -f novalis-os/deploy/compose.yml up -d
```

Vérifier HTTPS, `/healthz`, les cookies, une connexion MFA, les refus d’accès entre deux clients, le dépôt/téléchargement de fichiers, les réservations concurrentes et l’envoi SMTP. Les conteneurs sont prévus sans privilèges supplémentaires, avec système de fichiers en lecture seule et volumes dédiés. Le worker est unique : rappels, file SMTP et sauvegarde locale quotidienne. Il signale les erreurs, sans afficher les corps des messages ou les secrets.

## Raccordement de la vitrine

Ne modifier `novalisai/runtime-config.json` qu’après qualification du backend :

```json
{
  "api_origin": "https://app.novalisai.com",
  "portal_url": "https://app.novalisai.com/os/"
}
```

Tant que ces valeurs sont `null`, le formulaire prépare un e-mail et le portail explique que les accès ne sont pas ouverts. Le client ne reçoit une confirmation d’enregistrement qu’après la réponse positive de l’API. Les créneaux visibles viennent du calendrier serveur, sans masquer les collisions de réservation.

Pour transférer la vitrine sur le domaine, construire une copie avec `python3 novalisai/build.py --site-url https://www.novalisai.com`. Sauvegarder d’abord l’ancienne application et le proxy. Cette commande ajuste les URL canoniques ; elle ne modifie pas les DNS. Ne pas toucher aux MX, SPF, DKIM et DMARC existants.

## SMTP et intégrations

Configurer le serveur SMTP, son utilisateur, ses identifiants dans le coffre d’exploitation et l’adresse expéditrice vérifiée. Activer `NOVALIS_MAIL_ENABLED=true` après un test autorisé avec une adresse de test appartenant à l’entreprise. Le worker utilise STARTTLS avec validation de certificat. Le suivi différencie `queued`, `sending`, `sent` et `failed`.

Les invitations, confirmations, reports et notes de cadrage sont préparés dans l’outbox. Ils ne sont pas envoyés dans l’environnement livré ici. Les prestataires de paiement, Peppol, signature électronique et calendriers externes n’ont pas de connecteur actif : aucun secret ou compte commercial n’est inventé.

## Sauvegarde et restauration

Le worker crée une sauvegarde locale quotidienne si `NOVALIS_BACKUP_DIR` est configuré. Une sauvegarde comprend la base cohérente, les documents, les sommes SHA-256 et une vérification SQLite/foreign keys. Une sauvegarde incomplète ne passe pas la vérification et ne doit pas être considérée comme disponible. Aucune suppression automatique de sauvegarde n’est activée.

Commandes opérateur :

```sh
python -m novalis_os.cli backup --destination /chemin/prive/sauvegarde-nouvelle
python -m novalis_os.cli check-backup --source /chemin/prive/sauvegarde-nouvelle
python -m novalis_os.cli restore --source /chemin/prive/sauvegarde-nouvelle --destination /chemin/prive/restauration-nouvelle
```

La restauration refuse d’écraser un répertoire existant. Arrêter les écritures avant une bascule vers une base restaurée ; tester dans un nouvel environnement avec le secret de chiffrement correspondant. La restauration locale est couverte par les tests, pas la reprise sur le VPS réel.

**Un disque du même VPS ne constitue pas une sauvegarde hors machine.** Ajouter un dépôt de sauvegarde chiffré hors VPS, définir la rétention, vérifier les erreurs et effectuer un exercice de restauration. Cette intégration est encore nécessaire avant production.

## Mises à jour et retour arrière

1. Conserver la version courante, le fichier Compose/proxy et une sauvegarde vérifiée.
2. Vérifier les dépendances, exécuter les tests puis construire la nouvelle image.
3. Valider sur la préproduction et contrôler la migration. Seule la migration initiale v1 est livrée.
4. Mettre à jour l’application ; vérifier santé, permissions et parcours métier.
5. Si l’application échoue sans migration destructive, reprendre l’image précédente. En cas de changement de données incompatible, restaurer une sauvegarde dans une destination nouvelle puis basculer après contrôle. Ne jamais appliquer une migration destructive improvisée.

La CI proposée exécute génération et tests. Elle ne contient aucune clé SSH et ne déploie pas automatiquement sur Hostinger. Les alertes hors application, la rétention du journal, les contrôles de vulnérabilités continus et le suivi des ressources nécessitent encore une configuration d’exploitation.
