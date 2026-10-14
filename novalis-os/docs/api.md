# API — contrats principaux

Toutes les routes privées exigent une session serveur. Les mutations exigent l’origine configurée et `X-CSRF-Token`, obtenu à la connexion ou via `GET /api/session`. Les montants utilisent des centimes entiers ; durées en minutes ; dates calendaires ISO ; rendez-vous avec décalage UTC explicite. Une modification optimiste exige le `version` courant.

| Domaine | Routes principales | Contrat |
|---|---|---|
| Session | `POST /api/auth/login`, `GET /api/session`, `POST /api/auth/logout` | Login : email, password, code MFA éventuel ; retour user, csrf, mfa_required |
| Activation | `POST /api/auth/activate`, `/api/auth/reset` | Lien à usage unique ; token et nouveau password ; reset renvoie une réponse générique |
| MFA | `POST /api/auth/mfa/setup`, `/api/auth/mfa/confirm` | Setup avec mot de passe ; confirmation avec code TOTP ; codes de récupération affichés une fois |
| Comptes | `GET/POST /api/users`, `POST /api/users/{id}/status` | Invitation : name, email, role, client_id pour un client ; état e-mail queued |
| Contact public | `POST /api/public/contact` | name, email, company, category, description, budget/horizon éventuels, consent=true, website vide |
| Réservation | `GET /api/public/slots`, `POST /api/public/bookings` | Payload contact et slot_id ; réponse de réservation après transaction |
| Gestion rendez-vous | `POST /api/public/bookings/cancel`, `/reschedule` | Jeton personnel envoyé dans le corps ; report avec slot_id |
| Calendrier | `GET /api/calendar`, `POST /api/calendar/slots` | starts_at avec fuseau ; créneau de 60 minutes ; responsable contrôlé |
| CRM | `GET/POST /api/leads`, `PATCH /api/leads/{id}`, `POST /api/leads/{id}/send-note` | Pipeline, affectation, note, motif de perte et version |
| Conversion | `POST /api/leads/{id}/convert` | Accord confirmed via accepted=true, version, nom, scope, account_id, budget_cents, due_date |
| Clients | `GET/POST /api/clients` | name, email, company_number éventuel ; visibilité par portefeuille |
| Projets | `GET/POST /api/projects`, `GET /api/projects/{id}` | Projet et bundle sérialisé selon le rôle ; création par direction |
| Affectations | `GET /api/collaborators`, `POST /api/projects/{id}/members` | Répertoire minimal des collaborateurs ; user_id à affecter |
| Jalons | `POST /api/projects/{id}/milestones`, `/api/milestones/{id}/review`, `/approve` | Présentation par responsable et décision par client ; version exigée |
| Tâches | `GET /api/tasks`, `POST /api/projects/{id}/tasks`, `PATCH /api/tasks/{id}` | Assignee membre, effort, date, statut ; transitions contrôlées |
| Temps | `GET /api/time`, `POST /api/tasks/{id}/time`, `POST /api/time/{id}/review` | Saisie personnelle, work_date, minutes, note, billable ; validation séparée |
| Communication | `POST /api/projects/{id}/messages` | channel internal/external, body ; autorisation indépendante du menu |
| Demandes | `POST /api/projects/{id}/requests`, `POST /api/requests/{id}/qualify` | Demande par client, qualification et tâche par responsable ; périmètre approuvé |
| Documents | `POST /api/projects/{id}/documents`, `GET /api/documents/{id}` | Multipart file et channel ; téléchargement autorisé, en pièce jointe |
| Propositions | `GET/POST /api/projects/{id}/proposals`, `POST /api/proposals/{id}/decision` | Versions immuables, partage puis décision client |
| Factures | `GET/POST /api/projects/{id}/invoices`, `GET /api/invoices/{id}`, `POST /api/invoices/{id}/register` | Brouillon avec lines, due_date ; référence d’une facture émise externement, jamais émission Peppol |
| Règlements | `POST /api/invoices/{id}/payments` | amount_cents, bank_reference, paid_at, bank_confirmed=true, idempotency_key |
| Finances | `GET /api/finance`, `POST /api/expenses`, `GET /api/finance/export.csv` | Gestion interne et export réservés aux rôles habilités |
| Livraison | `POST /api/projects/{id}/delivery`, `/accept-delivery`, `/archive` | Soumission, approbation client puis maintenance ou archivage ; version |
| Suivi | `GET /api/dashboard`, `/api/audit`, `/api/integrations` | Indicateurs réels, journal par organisation, états des intégrations |

Erreurs JSON : `{ "error": "message" }`. 400 données invalides, 401 connexion nécessaire, 403 opération interdite, 404 objet inaccessible/inexistant, 409 version/état/unicité en conflit, 413 taille excessive, 429 limite de fréquence. Ne pas transformer un refus en succès visuel. Les liens et jetons d’invitation ne sont jamais renvoyés par la liste des comptes.
