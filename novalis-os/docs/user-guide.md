# Guide utilisateur — Novalis OS

## Direction

Connectez-vous avec votre compte personnel. La double authentification est demandée par défaut pour les rôles sensibles ; le compte Direction du propriétaire bénéficie actuellement d’une exception temporaire à sa demande. La vue d’ensemble liste les projets, les opportunités et les alertes calculées à partir des données réellement enregistrées.

Dans **Commercial**, créez ou consultez un prospect, affectez son interlocuteur et rédigez la note de cadrage. Le bouton d’envoi prépare un message dans la file SMTP ; il n’indique pas une transmission réussie. Après accord commercial, passez par proposition/négociation puis **Créer le projet** : le client et le projet sont créés ensemble et restent liés au prospect.

Dans **Équipe et accès**, invitez le responsable, le développeur ou le client. Pour un client, choisissez sa bonne organisation. L’invitation permet de choisir un mot de passe ; elle expire après 24 heures. Après création, la fenêtre **Partager l’invitation** affiche un lien personnel à usage unique que vous pouvez copier et transmettre à la personne concernée. Si SMTP est désactivé, aucun e-mail n’est envoyé : utilisez ce lien. Les rôles Direction, Finances et Administration des accès nécessitent la double authentification. Le rôle Direction dispose des droits les plus complets et peut attribuer les six rôles. Ne partagez pas un compte direction entre plusieurs personnes. La suspension révoque les sessions du compte concerné.

## Responsable de compte

Vos opportunités et projets sont limités à ceux qui vous sont affectés. Ouvrez le projet, ajoutez les collaborateurs avec **Équipe**, définissez les jalons puis créez les tâches : spécifications, personne affectée, effort prévu et échéance.

Une tâche soumise par le développeur apparaît en revue. Examinez le travail avant de la valider. Le temps enregistré se valide séparément dans **Temps à valider**.

Dans **Échanges**, le canal interne accueille l’équipe ; le canal client accueille uniquement le client et l’interlocuteur habilité. Une demande client peut être qualifiée en tâche seulement si son périmètre est accepté. Un changement contractuel doit être cadré séparément avant cette planification.

Présentez ensuite les jalons au client. Lorsque les tâches et jalons sont approuvés, demandez la validation finale. Le client réalise la décision finale ; la direction peut poursuivre en maintenance.

## Développeur

**Ma journée** et **Mes tâches** donnent accès au travail qui vous est affecté. Commencez ou reprenez une tâche, indiquez un blocage ou soumettez-la en revue. L’effort restant et la saisie du temps sont distincts. **Mon temps** permet de consulter vos saisies et leur validation.

Consultez les projets auxquels vous êtes affecté, leurs spécifications et les documents internes. Utilisez le canal interne pour communiquer avec le responsable. Les conversations client et les finances ne sont pas accessibles à ce rôle.

## Client

Votre portail présente vos projets, votre interlocuteur et la roadmap partagée. Les conversations internes et les tâches sensibles ne sont pas affichées.

Dans **Échanges**, posez une question ou créez une demande. **Documents** vous permet de déposer un PDF, un texte ou une image de 6 Mo maximum. Les fichiers déposés sont partagés avec votre interlocuteur.

Lorsqu’un jalon attend votre décision, examinez le livrable puis validez-le ou indiquez qu’il doit être repris. La livraison finale possède une approbation séparée. Les propositions partagées conservent leur version et votre décision.

Dans **Règlements**, consultez les factures déjà enregistrées et les montants confirmés. Aucun paiement en ligne n’est activé dans cette version. Le solde n’est pas modifié par un clic client.

## Finance et administration

Finance prépare des brouillons internes, enregistre les références de factures émises dans l’outil comptable externe, confirme des règlements bancaires vérifiés et exporte le suivi en CSV. L’application ne remplace pas les obligations Peppol ou la comptabilité réglementaire.

L’administration système consulte les comptes et l’état des connexions. Elle ne possède pas un accès automatique aux projets ou aux finances et ne peut attribuer les rôles sensibles.

## Sécurité et erreurs

Les comptes sensibles exigent TOTP. Conservez les codes de récupération dans votre gestionnaire de mots de passe ; chaque code est à usage unique. **Sécurité du compte** révoque les autres sessions.

Un conflit de version signifie qu’un autre utilisateur a modifié la fiche. Rechargez-la avant de recommencer. Lorsqu’un serveur refuse une action, l’interface affiche l’erreur et conserve le formulaire. Aucun succès n’est affiché à la place d’une erreur réseau.

Les calendriers utilisent UTC au stockage ; l’ERP affiche le fuseau de votre navigateur et la vitrine indique Europe/Brussels pour les rendez-vous publics.

## Retrouver le statut d’une demande vitrine

Ouvrez la page **Suivre une demande** depuis le pied de page de novalisai.com. Indiquez la référence reçue après l’envoi et l’adresse e-mail utilisée pour cette demande, puis choisissez **Consulter le statut**. Cette consultation montre l’étape générale ; elle ne donne accès ni aux documents ni à un espace client.

Sur le navigateur utilisé pour envoyer la demande, les liens privés conservés apparaissent aussi dans **Demandes sur cet appareil**. Ils ouvrent l’historique public pendant leur validité. Sur un appareil partagé, utilisez **Effacer les liens de cet appareil** après consultation. Après expiration ou perte du lien, référence et e-mail permettent toujours de retrouver l’étape générale tant que la demande est conservée dans Novalis OS.
