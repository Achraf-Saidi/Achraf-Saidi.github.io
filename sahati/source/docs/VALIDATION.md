# Validation de cette version

La suite `tests/workflows.mjs` exécute le moteur serveur déployé, compilé par esbuild, sur une base SQLite réelle en mémoire. L’adaptateur reproduit les appels D1 et la transaction `batch`. Le stockage R2 est remplacé par un adaptateur mémoire. Ces tests ne prétendent pas être des tests d’intégration d’équipements réels.

23 scénarios vérifient l’accès privé et le refus sans session, les cookies, les 14 connexions, les périmètres par établissement et patient, la réduction des champs administratifs, la publication des résultats, les contre-validations, les versions périmées, les délivrances et refus pour stock insuffisant, les références QR et leur statut, les conflits de créneaux, les admissions et leur rollback, les sorties et le nettoyage, les checklists opératoires, les permis de recherche, le consentement, les fichiers et leur portée, les exports, les données invalides, les corrections de dossier, la révocation des comptes, les journaux et le verrouillage général.

Le QR est produit par l’encodeur QR Code de Kazuhiko Arase, distribué sous MIT, avec une zone calme de quatre modules. Le test vérifie sa génération SVG et sa portée d’accès ; une lecture sur appareil physique reste à effectuer.

TypeScript est vérifié avec `tsc --noEmit`. Le build de production passe par le workflow Sites. Les mises en page contiennent des points de rupture pour ordinateur, tablette et mobile, des règles RTL, un focus visible, une gestion du focus et de la touche Échap dans les modales, et une variante d’impression A4. Les préférences visuelles sont les seules informations conservées en localStorage.

**Limite de vérification :** l’environnement de construction ne fournit pas le contrôle de navigateur pris en charge pour une recette visuelle. Aucune capture ni vérification visuelle complète en navigateur n’a été effectuée. La conformité WCAG ou clinique n’est pas déclarée. Une recette sur appareils, lecteurs d’écran, réseaux lents et scénarios hospitaliers représentatifs reste nécessaire.

Vérification après le premier déploiement : le verrou d’entrée, le rendu HTTP de la vitrine et les connexions/chargements de 12 profils ont répondu avec succès sur l’hébergement réel. Le contrôle restant a été interrompu par un refus de tunnel du proxy de l’environnement ; les profils Logistique et Administration restent couverts par la suite locale, sans vérification HTTP complète sur la version déployée. Les migrations D1 ont été confirmées par l’outil d’hébergement. Aucun journal d’erreur serveur n’a été retourné lors de ce contrôle.
