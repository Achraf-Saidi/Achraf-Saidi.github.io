# Factures et paiements Novalis OS

La Direction prépare les factures dans **Factures & paiements**, sélectionne le projet du client et renseigne ses coordonnées de facturation. Quantités à trois décimales, prix au centime, remise par ligne, TVA par ligne et regroupement TVA sont calculés sur le serveur. Le brouillon et son PDF restent privés. La publication fige le numéro, le destinataire, l’émetteur, les conditions et les prestations.

## Accès

- Direction : paramètres de facturation, création/modification du brouillon, publication, demande de paiement dans l’espace client, confirmation d’un virement reçu et remboursements fournisseur.
- Finances : consultation des documents et du suivi financier, sans émission ni demande de paiement.
- Client : uniquement les documents publiés des projets de son organisation, téléchargement de la facture et de ses reçus, paiement et déclaration de virement.
- Les autres rôles ne disposent pas d’un accès à l’atelier. La vérification s’effectue côté serveur sur chaque document, PDF et QR.

## Environnement de test

Une organisation explicitement marquée de démonstration peut recevoir des documents **TEST**. Leur numérotation, leurs règlements simulés et leurs reçus sont distincts du registre réel. Les totaux financiers réels et l’export CSV excluent ces documents. Un document TEST ne peut pas déclencher un paiement Mollie réel ou être réglé par l’ancienne route de confirmation bancaire.

Le client peut simuler un succès, un refus ou une annulation et un règlement partiel. Le reçu existe uniquement après le succès simulé. Le QR TEST ouvre la facture dans Novalis ; il ne contient aucune instruction bancaire. Aucun e-mail n’est envoyé par la création des données de démonstration.

## Journal et suivi financier

**Suivi financier** présente deux environnements explicites : **Opérations réelles** et **Démonstration**. Les factures et règlements TEST apparaissent dans Démonstration avec leurs reçus ; les simulations n’affectent jamais les flux réels. Le journal est recalculé depuis les paiements bancaires confirmés, les reçus prestataire, les dépenses et les remboursements effectivement confirmés. Une facture publiée, un échec de paiement, une déclaration de virement ou un remboursement en attente ne crée aucun mouvement d’argent confirmé.

Les filtres de recherche, de type et de période s’appliquent au journal et aux indicateurs d’entrées/sorties. Le reste à encaisser et le récapitulatif des factures couvrent toutes les échéances de l’environnement choisi. L’export des mouvements reprend les filtres et marque chaque ligne TEST ou REEL. Les mouvements sont actualisés à l’ouverture, au retour dans l’onglet et toutes les 30 secondes tant que cette vue est active. Le bouton Actualiser permet une vérification immédiate.

Les encaissements prestataire sont bruts : la part affectée à la facture et l’éventuel excédent restent distincts. Les remboursements confirmés figurent en sortie sans réécrire la facture ni son règlement. Le flux net enregistré ne constitue pas un solde bancaire et n’inclut pas automatiquement les frais ou les virements du prestataire vers le compte de Novalis.

## Documents réels et Falco

Les coordonnées légales de la société doivent être renseignées. Les documents B2B belges restent des brouillons/projets de facture tant que le raccordement Falco/Peppol n’est pas disponible : **aucune transmission n’est prétendue**. Le téléchargement des données préparées fournit le snapshot et les montants pour le futur connecteur ; il ne constitue ni une requête API Falco prête à envoyer ni une preuve de conformité Peppol.

L’émission hors du champ B2B belge demande une confirmation du traitement applicable, des coordonnées complètes et une justification pour une TVA à 0 %. Une entreprise belge ne doit pas être reclassée en particulier pour contourner le parcours Peppol. Le logiciel ne détermine pas à lui seul le régime fiscal de l’opération. Un document émis n’est pas supprimé ou réécrit : les avoirs restent à traiter avec le circuit comptable.

## Paiement et preuve

Le paiement en ligne réel utilise le connecteur Mollie existant : le bouton n’apparaît que si le serveur indique le mode live actif. Les secrets restent dans la configuration serveur. Voir `PAYMENTS-BANCONTACT.md` pour l’ouverture et la validation du compte marchand et la recette fournisseur.

Le virement utilise l’IBAN de l’émetteur figé sur la facture et son numéro comme communication. Le QR suit le format EPC SCT (version 002, encodage UTF-8, montant en EUR) ; la prise en charge dépend de l’application bancaire. La déclaration « J’ai effectué le virement » n’enregistre aucun paiement. La Direction confirme la réception effective avec une date et une référence bancaire ; le serveur interdit le dépassement du solde.

Chaque règlement confirmé dispose d’un reçu PDF avec montant, date, facture et référence. Le reçu reste attaché au paiement et ne remplace pas la facture. Une confirmation prestataire ne prouve pas encore le versement sur le compte de Novalis.

## Préservation du VPS

La livraison utilise un nouveau répertoire de code et un environnement Python séparé, une sauvegarde vérifiée de la base/documents, une migration additive et une bascule uniquement des services `novalis-os` et `novalis-worker`. Le déploiement vérifie les PID des services Pointage, le contenu et la configuration de son site, le lien de la vitrine publique et les utilisateurs existants. Il n’édite ni les services Pointage, ni Nginx, ni PostgreSQL.
