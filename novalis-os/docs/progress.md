# Journal de livraison — 14 octobre 2026

## Périmètre de cette session

Source de départ : `Achraf-Saidi/Achraf-Saidi.github.io`, commit `882f054d418ed7d6a058a9f1e2b33373e88eb71c`, dossier `novalisai`. Branche de travail : `novalis-2-os-20261014`. L’ancienne version reste disponible dans l’historique Git.

La cible confirmée par Achraf est Hostinger pour l’ensemble : vitrine sur `www.novalisai.com`, ERP et backend sur le KVM via `app.novalisai.com`. GitHub conserve le code et une version de revue ; il ne remplace pas cette cible de production. La vitrine GitHub est distincte de l’application Next.js observée sur `www.novalisai.com`. Aucune connexion d’exploitation de cette seconde application n’a été trouvée. Le domaine, ses DNS et sa messagerie n’ont pas été modifiés.

## État précis

| Fonction | Réalisation et limite |
|---|---|
| Identité visuelle | Logo, cuivre/ivoire, polices locales, sculpture et configurateur existants conservés |
| Positionnement | Développement logiciel polyvalent ; première heure offerte ; IA choisie selon le problème ; CTO Achraf Saidi |
| Pages publiques | 13 pages éditoriales dans FR/EN/NL/DE, sitemap, contacts institutionnels et portfolio avec statuts explicites |
| Interactivité publique | Exploration des rôles et calcul d’hypothèses ; configurateur existant conservé |
| Formulaire et réservation | Backend réellement persistant et prêt à être raccordé ; sur la vitrine actuelle, `runtime-config.json` reste désactivé et le formulaire prépare un e-mail |
| Identité juridique | Numéro et adresse conservés depuis le site ; annuaires cohérents avec le domaine. Aucun statut/extrait BCE accessible : forme et adresse complète à contrôler avant facturation |
| Réseau de compétences | Pôles présentés ; aucun total de salariés, disponibilité ou certification inventé. Les chiffres 4/5/3/4/2 n’ont pas été publiés faute de validation de leurs recouvrements |
| Authentification | Sessions serveur, hachage Scrypt, invitations/réinitialisation à usage unique, MFA sensible, récupération, révocation et suspension |
| CRM | Prospect, responsable, pipeline, note de cadrage, préparation de l’envoi, conversion transactionnelle |
| Opérations | Projets, affectations, jalons, tâches, revue, temps, demandes client, communication séparée, documents et livraison finale |
| Portail client | Données limitées à son organisation ; roadmap, décisions, messages et documents partagés ; ne contient pas de données de démonstration en production |
| Finances | Devis versionnés, brouillons internes, références de factures externes, confirmations bancaires, dépenses et CSV |
| Envoi e-mail | File chiffrée et worker SMTP implémentés ; aucune transmission réelle effectuée ou testée ici |
| Intégrations externes | Peppol, signature qualifiée, paiement en ligne et calendrier tiers non raccordés |
| Infrastructure | Docker/Gunicorn/Caddy, worker et procédures préparés ; construction Docker réussie dans la CI GitHub ; KVM et démarrage de production non testés |
| Paquet Hostinger | Construction publique isolée pour les trois domaines et configuration proxy complémentaire ; paquet généré, aucun déploiement Hostinger effectué |
| Sauvegardes | Copie cohérente et vérification de la base/documents, restauration dans une nouvelle destination testée ; stockage hors VPS non configuré |
| Recette mobile | CSS adapté et comportements DOM contrôlés. Pas de navigateur de recette aux largeurs 320/360/390/430 : aucune affirmation de perfection visuelle ou de score Lighthouse |

## Vérifications réalisées

- Treize tests backend sur les huit parcours métier et leurs protections : réservation et activation, conversion, développement/temps/revue, demandes et canaux, référence de facture externe/règlement idempotent, retards, autorisations/fichiers, livraison et maintenance, CSRF/suspension/restauration, réservations concurrentes, enrôlement/récupération MFA, expiration des invitations, injection d’en-têtes et sauvegarde de documents.
- Tests DOM des quatre éditions : navigation, formulaire, isolation des démonstrations, outils de calcul et 52 pages avec leurs liens/assets.
- Tests DOM des six rôles ERP : données reçues par l’API, navigation autorisée, échappement HTML, saisie d’une revue et menu mobile. Les réponses des tests DOM sont des fixtures ; la logique serveur est testée séparément dans une vraie base temporaire.
- Recette navigateur, appareils réels, Lighthouse, charge, SMTP et fournisseurs externes : **non exécutés**.

## Suite nécessaire pour la production

1. Ressources et services du VPS, accès d’exploitation via un moyen sécurisé, environnement de préproduction.
2. Extrait BCE/statuts et informations exactes de la société ; politique ERP et durées de conservation ; validation comptable de la TVA et du circuit de facturation.
3. SMTP de l’entreprise et expéditeur vérifié, sans divulgation des secrets dans la conversation.
4. Fournisseur Peppol, paiement hébergé si nécessaire et calendrier externe choisi ; tests en environnement de test avant activation.
5. Stockage de sauvegarde hors machine, surveillance et exercice de restauration.
6. Recette visuelle et tests de charge ; passage contrôlé vers le domaine public après sauvegarde et plan de retour arrière.

Hostinger restreint l’accès depuis le navigateur distant : le VPS n’a pas pu être inspecté ou modifié. Aucun compte, serveur, certificats, paramètres DNS ou moyens de paiement n’a été prétendu configuré.

## Modules restant au-delà du noyau

Contrats et avenants complets, signature, facturation structurée et notes de crédit, échéanciers automatiques, temps corrigé/versionné, compétences/disponibilités/coûts, marges et trésorerie prévisionnelle, dépendances de tâches, Gantt/capacité, recherche globale avancée, support/maintenance détaillé, base documentaire versionnée, rapports PDF et règles d’automatisation administrables.

## Sources consultées

- [Site public Novalis](https://www.novalisai.com/), observé lors de l’audit.
- [Facturation électronique B2B — source officielle belge](https://efacture.belgium.be/fr/article/partir-de-quand-la-facturation-electronique-est-elle-obligatoire).
- [OWASP — sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) et [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- [Flask — déploiement Gunicorn](https://flask.palletsprojects.com/en/stable/deploying/gunicorn/) et [Python — SQLite](https://docs.python.org/3/library/sqlite3.html).
