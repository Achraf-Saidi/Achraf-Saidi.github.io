# Numeria — accès réservé

La vitrine et l’espace école actuels sont publiés sous forme chiffrée. Tous les points d’entrée demandent le mot de passe. Le mot de passe ne figure pas dans le dépôt.

Le contenu est chiffré avec AES-256-GCM et une clé dérivée par PBKDF2-SHA-256 (600 000 itérations, sel aléatoire). La clé est conservée uniquement en mémoire pendant l’ouverture de la page ; elle n’est pas enregistrée dans le stockage du navigateur. Le bouton « Verrouiller », la fermeture et le rechargement demandent une nouvelle ouverture. Les téléchargements déchiffrés ne sont pas placés dans un cache persistant.

Un navigateur récent avec JavaScript, Web Crypto et les service workers activés est nécessaire, en HTTPS. Le verrou est limité au chemin `/numeria/`.

**Historique public :** les versions antérieures restent dans l’historique de ce dépôt public. Cette publication protège la version actuelle ; elle n’efface pas les anciennes copies. Une confidentialité complète du dépôt et de son historique nécessite un hébergement et un dépôt privés.

L’espace école reste une démonstration locale avec des données fictives ; ce verrou ne remplace pas l’authentification serveur d’un futur ERP de production.
