# Validation

23 scénarios de gestion passent sur SQLite natif et sur l'adaptateur SQLite WASM de la version GitHub. Huit scénarios vérifient le coffre chiffré IndexedDB, les accès locaux et les restrictions d’en-têtes des navigateurs, la persistance des dossiers et fichiers, le verrouillage, les sauvegardes falsifiées, la restauration et les quatre points d'entrée. Les tests du coffre utilisent SQLite WASM réel et un adaptateur IndexedDB de test ; ils ne remplacent pas un navigateur.

Le build GitHub et TypeScript sont vérifiés. Aucun contrôle visuel complet en navigateur ni lecture physique de QR n'a été effectué dans cet environnement. Les interfaces médicales externes ne sont pas connectées. Aucune certification clinique, WCAG ou FHIR n'est déclarée.
