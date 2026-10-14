# Modèle de menaces et limites de sécurité

Cette livraison comporte des protections et des tests ciblés. Elle n’est pas un audit externe ni une certification de sécurité.

| Menace | Protection implémentée | Vérification / suite |
|---|---|---|
| Modification d’un identifiant client/projet/document | Organisation, client et affectation contrôlés au serveur à chaque accès | Refus entre clients, documents internes et projets hors périmètre testés |
| Fuite de marges ou données internes vers un client/développeur | Sérialisation distincte et endpoints financiers réservés ; deux canaux de communication | Contrôles API et menus des rôles testés |
| Usurpation d’une session | Cookie HttpOnly, Secure, SameSite Strict, hôte unique ; jeton aléatoire haché en base et expiration 8 h | Suspension et révocation testées ; TLS réel à vérifier lors du déploiement |
| Requête forgée depuis un autre site | Origine attendue et jeton CSRF de session sur les écritures authentifiées | Origine hostile et jeton manquant refusés |
| Vol de mot de passe | Scrypt, minimum 12 caractères, aucune invitation avec mot de passe permanent | Test de connexion et activation à usage unique |
| Attaque par essais | Limites persistantes par IP et identité ; réponses de connexion génériques | Tester le proxy en production ; le port de l’application ne doit pas être exposé |
| Compromission d’un rôle sensible | TOTP obligatoire par défaut pour direction, finance et administration ; exception nominative possible dans la configuration privée sur demande explicite du propriétaire ; compte limité avant enrôlement, anti-rejeu et codes de récupération hachés | Parcours d’enrôlement et récupération à qualifier aussi avec un appareil réel |
| Réutilisation d’une invitation | Jeton aléatoire haché, expiration et consommation transactionnelle ; sessions révoquées au changement de mot de passe | Réutilisation refusée ; livraison SMTP non activée ici |
| Vol des secrets de MFA/invitation en base | AES-GCM avec clé externe de 32 octets ; corps de file d’envoi chiffrés | Sauvegarder la clé séparément ; son absence arrête l’application |
| Injection SQL ou contenu script | Requêtes paramétrées, validation de type, échappement DOM et en-têtes de sécurité | Données HTML échappées dans les tests DOM |
| Téléversement dangereux | Taille/format/signature contrôlés, identifiant de fichier serveur, permissions 0600, téléchargement en pièce jointe | Pas de prévisualisation HTML, pas d’exécution ; analyse antivirus à intégrer avant l’ouverture de documents non fiables à grande échelle |
| Réservation ou paiement en double | Transaction, unicité des créneaux, clé de règlement idempotente | Deux réservations simultanées et rejeu du règlement testés |
| Perte/corruption de données | Sauvegarde SQLite cohérente, copie des documents, SHA-256 et contrôle d’intégrité ; restauration dans un nouveau répertoire | Restauration locale testée ; stockage hors VPS et exercices de restauration de production non configurés |
| Effacement des traces | Journal applicatif en ajout uniquement avec triggers | Ce journal ne résiste pas à un administrateur ayant un accès direct à la base ; externaliser les logs pour cette menace |

## Conditions avant une ouverture à des clients réels

Qualifier le VPS et le reverse proxy ; activer SMTP avec SPF/DKIM/DMARC vérifiés ; confirmer l’identité de société et les mentions légales ; définir les durées de conservation et les personnes habilitées ; tester la restauration hors machine et les mises à jour ; réaliser une recette navigateur et une revue indépendante des accès. Ne pas transférer des données de production dans les tests.

Le secret de chiffrement, les paramètres SMTP, les fichiers, les bases et les sauvegardes ne doivent jamais entrer dans GitHub ou la racine GitHub Pages. Les fixtures de tests utilisent exclusivement des adresses `example.test` et des répertoires temporaires.

Le worker SMTP offre une livraison avec reprise ; une interruption entre acceptation SMTP et enregistrement local peut provoquer une répétition. Le Message-ID reste stable et les invitations restent à usage unique. Il ne faut pas annoncer une garantie d’envoi exactement une fois.


## Exception temporaire demandée par le propriétaire

`NOVALIS_MFA_EXEMPT_EMAILS` est vide par défaut. Le propriétaire a demandé une exception temporaire pour son compte Direction. L’opération conserve son mot de passe et son rôle, efface exclusivement ses secrets TOTP et codes de récupération, révoque ses sessions et journalise la demande. L’adresse est configurée uniquement sur le serveur, sans donnée personnelle dans le dépôt. Les autres comptes conservent leur règle d’enrôlement.

Pour rétablir l’obligation, retirer l’adresse de cette variable privée et révoquer les sessions du compte concerné. À sa connexion suivante, le parcours TOTP obligatoire reprend. Les tests vérifient le mot de passe erroné, l’accès Direction avec l’exception, l’obligation conservée pour un autre compte et le retour à l’obligation après retrait de l’exception.
