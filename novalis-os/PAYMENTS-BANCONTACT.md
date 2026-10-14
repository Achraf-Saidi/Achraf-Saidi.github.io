# Paiements Mollie / Bancontact — raccordement et recette

État au 14 octobre 2026 : code préparé, tests contractuels avec un prestataire simulé. Aucun compte marchand ni clé fournisseur n’a été fourni. Aucun paiement Mollie réel ou sandbox n’a donc été exécuté. Le mode livré est **désactivé** ; l’ERP l’affiche clairement.

## Raccordement

1. Le dirigeant crée et vérifie son compte marchand Mollie, accepte lui-même les conditions et renseigne l’identité légale, le profil du site et le compte de versement. Ne communiquer aucune clé dans une conversation, un ticket ou le dépôt Git.
2. Activer Bancontact dans le profil marchand. Les autres moyens proposés par le profil seront récupérés par l’API, filtrés pour le montant de la facture et EUR. Un logo ne signifie pas qu’un moyen est disponible.
3. Sur le VPS, un opérateur autorisé édite `/etc/novalis-os/production.env` (permissions 600), ajoute la clé test à `NOVALIS_MOLLIE_TEST_KEY`, définit `NOVALIS_PAYMENTS_MODE=test` et garde `NOVALIS_PAYMENTS_LIVE_ENABLED=false`. Redémarrer uniquement `novalis-os` et `novalis-worker` après sauvegarde. Ne modifier ni Nginx ni Pointage pour cette opération.
4. Dans Connexions, vérifier l’état test, puis dans une facture enregistrée ouvrir **Détail → Moyens de paiement**. Les tests sont réservés à Direction et Finances ; les clients ne voient jamais ces tentatives de test.
5. Laisser accessibles en HTTPS le retour `https://app.novalisai.com/os/#payment=IDENTIFIANT` et le callback `https://app.novalisai.com/api/payments/mollie/webhook`. Le callback legacy reçoit un identifiant ; son état est relu via l’API Mollie authentifiée. Ne pas fabriquer une signature ni croire un champ `status` reçu.

## Recette fournisseur obligatoire avant activation réelle

Sur une facture de recette clairement identifiée, vérifier : Bancontact disponible, redirection Mollie, retour avant callback, succès, annulation, expiration, échec, callback répété, consultation serveur, reprise après timeout et rapprochement par le worker. Le solde de la facture réelle doit rester inchangé en mode test, même si Mollie renvoie `paid`.

Vérifier ensuite un remboursement de test partiel : état queued/pending/processing puis refunded/failed/canceled selon les scénarios du fournisseur. Un remboursement demandé n’est pas présenté comme terminé. Vérifier un timeout ambigu sans recréer la demande sous une autre clé.

La recette des outils de paiement du fournisseur doit être faite avec son compte de test ; les tests automatisés du dépôt ne remplacent pas cette étape. Une confirmation de paiement n’est pas une confirmation de versement bancaire.

## Passage en production

Après compte marchand vérifié, Bancontact actif et recette test réussie, renseigner `NOVALIS_MOLLIE_LIVE_KEY`, définir `NOVALIS_PAYMENTS_MODE=live` **et** `NOVALIS_PAYMENTS_LIVE_ENABLED=true`. La clé doit commencer par `live_`; une clé test ne peut pas activer les paiements réels. Cette activation implique une décision du dirigeant. Faire un premier paiement réel de faible montant puis vérifier le callback, l’écriture ERP, le statut fournisseur et le versement séparément. Les opérations financières finales restent exécutées par une personne habilitée.

## Règles mises en œuvre

- Montant TTC en centimes calculé exclusivement sur le serveur depuis la facture enregistrée et son solde. Aucun montant envoyé par le navigateur n’est accepté.
- Tentative durable et clé d’idempotence serveur ; une seule tentative active par facture et mode. Une création incertaine ancienne ou après rotation de clé bloque toute création aveugle. Mollie conserve une clé d’idempotence pendant une heure ; l’ERP limite la reprise automatique de création à 50 minutes.
- Confirmation `paid` vérifiée : ID, mode, EUR, montant, métadonnées, rattachement et date. Écriture transactionnelle unique ; le retour navigateur ne solde jamais une facture.
- Mode test séparé du registre comptable. Règlements bancaires manuels conservés séparément. Tout encaissement réel excédant le solde est enregistré et signalé en trop-perçu.
- États open/pending/authorized/failed/expired/canceled distincts. Une autorisation n’est pas un encaissement.
- Remboursements partiels et clés uniques, permissions Direction/Finances, montant restant tenant compte des demandes en attente, rapprochement périodique. Le motif interne est conservé dans l’ERP ; le prestataire reçoit un identifiant de remboursement sans détails privés.
- Factures enregistrées immuables. Un remboursement commercial n’écrit pas automatiquement un avoir légal et ne recrée pas silencieusement une dette : gérer l’avoir dans l’outil comptable habilité.
- Aucun numéro de carte, donnée bancaire du client ou secret marchand stocké dans le navigateur.

## Bancontact

Paiements ponctuels en EUR. Le minimum indiqué par Mollie est 0,02 €. La limite mobile intent/QR indiquée est 1 500 €, distincte de la saisie de carte ; la disponibilité effective dépend du profil et du flux hébergé. Aucun abonnement Bancontact natif n’est annoncé ; la récurrence et les mandats SEPA demandent un parcours séparé.

## Exploitation et limites

Le worker rapproche les tentatives et remboursements en attente. Désactiver les nouvelles créations ne coupe pas la confirmation des paiements déjà créés, tant que la clé de leur mode reste disponible. Une anomalie d’identité/montant/mode bloque toute écriture et demande une investigation. Un callback d’ID inconnu est ignoré avec 200 ; une panne de vérification d’un paiement connu renvoie 503 pour permettre au fournisseur de réessayer.

Le rapprochement automatique de création recherche au plus 500 paiements récents. Si le paiement ne peut pas être retrouvé, vérifier le tableau marchand avant toute nouvelle tentative. Les remboursements effectués directement dans le tableau Mollie, les contestations, le rapprochement détaillé des versements, les frais PSP et les avoirs ne constituent pas encore un module comptable automatisé. Traiter ces événements avec le comptable et le tableau du fournisseur. SMTP et l’émission Peppol restent des intégrations séparées.

## Sources officielles

- https://docs.mollie.com/docs/accepting-payments
- https://docs.mollie.com/reference/create-payment
- https://docs.mollie.com/reference/get-payment
- https://docs.mollie.com/reference/webhooks
- https://docs.mollie.com/reference/api-idempotency
- https://docs.mollie.com/reference/testing
- https://docs.mollie.com/docs/bancontact
- https://docs.mollie.com/reference/list-methods
- https://docs.mollie.com/reference/create-refund
- https://docs.mollie.com/docs/refunds
