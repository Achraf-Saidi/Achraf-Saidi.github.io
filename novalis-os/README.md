# Novalis OS

Noyau ERP avec API persistante, autorisations serveur et interface par rôle. Il s’agit d’une livraison de développement **testée localement**, pas d’un ERP complet déjà déployé sur Hostinger. Les données de production doivent rester hors de ce dépôt public.

Voir [l’état exact de la livraison](docs/progress.md), [l’architecture](docs/architecture.md), [la sécurité](docs/security.md), [le guide utilisateur](docs/user-guide.md) et [l’exploitation](docs/operations.md).

## Lancer les contrôles

Python 3.12 ou supérieur et Node 24 pour les tests DOM :

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m unittest discover -s tests -v
```

Depuis la racine du dépôt pour les interfaces :

```sh
npm ci --prefix novalisai/qa
NOVALIS_JSDOM_MODULE="$(pwd)/novalisai/qa/node_modules/jsdom" node novalis-os/tests/ui.cjs
```

Les tests créent leur base et leurs utilisateurs dans un répertoire temporaire. Aucune fixture n’est injectée automatiquement dans une application réelle.

## Démarrage

L’application exige une clé de chiffrement de 32 octets, son origine HTTPS, une base migrée et un compte initial créé par la commande opérateur. Les secrets proviennent de l’environnement ; aucun secret ou mot de passe de production n’est fourni dans le dépôt. Voir `deploy/.env.example` et `docs/operations.md`.

Le mode `NOVALIS_MODE=development` autorise une origine locale et des cookies non Secure pour du développement isolé. Ce mode ne doit jamais être utilisé en production. La commande CLI `bootstrap` saisit le mot de passe avec `getpass` ; les invitations suivantes sont préparées par le gestionnaire.

## Modules livrés

Identité, MFA, invitations, révocation ; CRM et note de cadrage ; calendrier interne et réservation d’une heure ; conversion en projet ; membres et jalons ; tâches, revue et temps ; deux canaux de communication ; demandes client ; fichiers privés ; propositions versionnées ; brouillons de factures, références externes, règlements bancaires et dépenses ; notifications, journal ; sauvegarde/restauration et worker SMTP.

Les interfaces consomment les endpoints réels. Les intégrations non configurées restent visibles comme telles. Le backend n’émet pas de facture réglementaire, n’envoie pas de paiement à une banque et n’active pas un calendrier tiers.
