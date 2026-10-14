# Déploiement, sauvegardes et maintenance

**État : Novalis est déployé sur le KVM Hostinger existant.** La procédure Docker ci-dessous reste une alternative pour une cible qualifiée ; la machine actuelle utilise l'installation native décrite ici.

## Installation active

- Vitrine : `https://www.novalisai.com/`, racine redirigée vers `www`.
- ERP / API : `https://app.novalisai.com/os/`, backend lié uniquement à `127.0.0.1:18080`.
- Source applicative installée : release `4bebb5f4bf6ca6dfb30efc526eb65a0886a7bba6`, répertoire `/opt/novalis-os/releases/`, lien actif `/opt/novalis-os/current`.
- Services : `novalis-os.service` et `novalis-worker.service`. Ils utilisent un compte système dédié, un système de fichiers protégé et des plafonds de ressources ; le pointage reste géré par son propre PM2 et sa base PostgreSQL.
- Données et sauvegardes ERP privées : `/srv/novalis-os/data`, `/srv/novalis-os/backups`. Configuration de production : `/etc/novalis-os/production.env`, accessible à root uniquement. Ne jamais copier ce fichier ou le lien d'invitation initial dans GitHub.
- Configuration Novalis uniquement : `/etc/nginx/sites-available/zz-novalisai`. Le fichier du pointage reste intact. Valider avec `nginx -t` avant une recharge gracieuse.
- Certificat Novalis : `/etc/letsencrypt/live/novalisai.com/`. Le renouvellement est assuré par le timer Certbot existant et recharge Nginx après validation de la configuration.

Une vérification ponctuelle du renouvellement se lance avec `certbot renew --dry-run --cert-name novalisai.com --no-random-sleep-on-renew`. Le dernier test a réussi. Ne pas forcer de renouvellement réel sans raison.

La sauvegarde pré-déploiement est dans `/var/backups/novalis-predeploy-20261014T045749Z`, avec manifestes et restauration PostgreSQL de contrôle réussie. L'instantané Hostinger est temporaire : ne pas l'utiliser comme politique de sauvegarde permanente. Les sauvegardes locales ERP ne remplacent pas un stockage chiffré hors machine avec rétention et surveillance.

Pour un retour arrière Novalis, conserver ses données, désactiver uniquement ses deux services et son hôte Nginx, valider puis recharger Nginx. Reprendre les anciens enregistrements A de Novalis si nécessaire ; l'ancienne racine était `216.198.79.1`. Ne pas restaurer tout le VPS pour annuler une modification Novalis : cela reviendrait aussi sur les données du pointage.

La CI GitHub a construit l’image de production avec succès sur le commit `62c94f2b9bdaa559baba338df37219f904166263`. Cela vérifie la construction de l’image, pas la capacité du KVM ni son démarrage en production.

## Qualification de la machine

Le script `deploy/audit-vps.sh` est en lecture seule : OS, CPU, mémoire, disque, ports, services, charge et consommation des conteneurs existants. Il n'affiche ni variables d'environnement, ni secrets, ni données métier. Évaluer également les certificats et le reverse proxy déjà utilisé. Le service Caddy est placé dans le profil explicite `dedicated-edge` : un lancement ordinaire ne le démarre pas. Ses ports 80/443 supposent une machine disponible ; s'ils sont occupés, intégrer l'application au proxy existant.

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
docker compose -f novalis-os/deploy/compose.yml --profile dedicated-edge up -d
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

### Vitrine et ERP ensemble sur le KVM

La cible demandée est Hostinger pour les deux applications : vitrine sur `www.novalisai.com`, ERP et API sur `app.novalisai.com`, racine `novalisai.com` redirigée vers `www`. Le script suivant prépare le dossier public isolément, sans réécrire les pages GitHub ni inclure les sources Python, les configurations privées ou les données ERP :

```sh
python3 novalis-os/deploy/prepare-public.py --output /chemin/vers/nouvelle-version-publique --site-url https://www.novalisai.com --api-origin https://app.novalisai.com --portal-url https://app.novalisai.com/os/
```

Ne rendre cette version active qu’après recette du backend. `NOVALIS_PUBLIC_PATH` désigne la version publique active. Le fichier `compose.public.yml`, utilisé en complément de `compose.yml`, monte cette version en lecture seule et applique `Caddyfile.public` pour les trois domaines. Un reverse proxy existant doit recevoir une configuration équivalente plutôt qu’être remplacé sans audit. Conserver une référence vers l’ancienne version pour le retour arrière.

```sh
docker compose -f novalis-os/deploy/compose.yml -f novalis-os/deploy/compose.public.yml config
```

La revue des enregistrements A/AAAA, du certificat et des services existants précède toute mise en service. Les enregistrements de messagerie ne sont pas modifiés. Le paquet a été généré ici ; aucun de ces domaines n’a été basculé.

### Cohabitation avec `pointagevdc.cloud`

Achraf indique qu'un site de pointage existe déjà sur le KVM. La lecture publique de `https://pointagevdc.cloud/` a répondu HTTP 200 avec un en-tête `Server: nginx` le 14 octobre 2026. Cela ne prouve ni l'architecture interne ni la capacité disponible. Aucun accès authentifié à ce serveur n'est établi.

La cible de cohabitation conserve son proxy, ses services, ses bases et ses répertoires. Utiliser `compose.shared.yml` en complément de `compose.yml`, sans activer `dedicated-edge` et sans utiliser `compose.public.yml`. Ce mode démarre uniquement l'application et son worker, avec stockage Novalis séparé, limites CPU/mémoire, rotation des journaux et backend lié à `127.0.0.1:18080`. Le port et les plafonds proposés doivent être qualifiés après l'inventaire ; ce ne sont pas des mesures de capacité. Si le proxy existant est un conteneur, configurer un réseau Docker dédié après audit ; l'adresse loopback de l'hôte n'est pas celle de ce conteneur.

```sh
docker compose -f novalis-os/deploy/compose.yml -f novalis-os/deploy/compose.shared.yml config --quiet
docker compose -f novalis-os/deploy/compose.yml -f novalis-os/deploy/compose.shared.yml up -d app worker
```

Ces commandes restent une préparation, à exécuter après initialisation de la base et du compte. Ne pas installer ou mettre à jour Docker à l'aveugle sur ce VPS : ses changements réseau peuvent affecter les applications existantes. Si Docker n'est pas déjà utilisable, qualifier une installation Python/systemd ou une autre méthode adaptée avant toute modification.

Avant la bascule : vérifier l'état HTTP/HTTPS et le parcours de connexion du pointage, identifier précisément ses unités/conteneurs et sa base, sauvegarder le proxy et la configuration, puis produire une sauvegarde cohérente de sa base selon son moteur et vérifier la restauration dans une destination isolée. Ne pas copier simplement une base active en espérant une sauvegarde cohérente. La sauvegarde Novalis ne sauvegarde pas automatiquement le pointage.

Ajouter ensuite seulement les hôtes `novalisai.com`, `www.novalisai.com` et `app.novalisai.com` au proxy existant. Valider toute la configuration avant une recharge gracieuse et conserver le fichier précédent. Ne pas remplacer la configuration du pointage, arrêter son service, modifier sa base ou changer ses DNS. Comparer son état avant/après, surveiller les ressources et revenir à la configuration précédente si la recette échoue. La configuration exacte du proxy et le choix des certificats attendent l'inventaire réel.

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
