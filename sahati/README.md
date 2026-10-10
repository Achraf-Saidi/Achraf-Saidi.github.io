# SAHATI — le soin, relié

Plateforme hospitalière algérienne conçue pour Achraf Saidi.

**[Ouvrir SAHATI en accès privé](https://sahati.ochrecreek8.chatgpt.site)** · [Code source complet](source/README.md)

Le site inclut une vitrine, 14 rôles, 25 espaces métier, des dossiers fictifs, ordonnances QR, laboratoire/radiologie, admissions et lits, transmissions, bloc, stocks, facturation, recherche et portail patient. Les données et actions sont enregistrées côté serveur.

L’accès nécessite le compte ChatGPT propriétaire, puis le mot de passe d’entrée personnel. Celui-ci est configuré comme secret serveur et absent de GitHub. Les comptes métier fictifs sont proposés sur l’écran de connexion.

Le dossier `source/` contient le projet React/TypeScript/Vinext complet, les images et polices, les migrations, les tests et la documentation. Le fichier `index.html` redirige vers l’application avec backend : GitHub Pages héberge ce point d’entrée, pas la base médicale.

La source est publique, l’application reste privée. **Version de démonstration : aucune donnée réelle, aucune validation pour un usage clinique.** Le périmètre exact et les étapes vers un ERP hospitalier figurent dans [la feuille de route](source/docs/ROADMAP.md). La recette visuelle en navigateur et la lecture physique des QR restent à effectuer.

Validation : contrôle TypeScript, build de production et 22 scénarios d’intégration serveur réussis.
