# Architecture et accès

La version publiée sur GitHub est décrite dans `README.md` et `github/`. Les protections serveur ci-dessous concernent la variante serveur indépendante ; dans le navigateur, elles simulent les permissions sans isoler les données du propriétaire de l’appareil.

## Chaîne de protection

L’hébergement accepte les visiteurs sans compte externe. L’accès aux pages et aux données reste protégé par les sessions SAHATI. Le contrôle applicatif précède le rendu de chaque page et toute opération API. Le mot de passe de vitrine est vérifié par PBKDF2-SHA256 avec sel aléatoire et 100 000 itérations ; seul son vérificateur est présent dans un secret d’hébergement. Un deuxième accès identifie le compte métier. Les cookies `__Host-` sont Secure, HttpOnly, SameSite=Strict et ne contiennent que des jetons aléatoires dont la base conserve le SHA-256. La session de vitrine dure huit heures, la session métier une heure. Les tentatives sont limitées et les écritures vérifient l’origine. Une désactivation révoque les sessions du compte.

Les politiques `lib/policy.ts` sont appliquées par `lib/engine.ts`. Le filtrage de l’interface sert à présenter les actions disponibles ; il ne remplace pas les contrôles serveur. Les lectures, mutations, impressions, téléchargements et exports sont tracés. Les modifications utilisent une version optimiste pour refuser un état périmé.

| Rôle | Périmètre principal |
| --- | --- |
| Médecin | Patients de l’équipe et de l’établissement, synthèse, validation, sortie, export clinique |
| Résident | Patients attribués, rédaction et soumission ; validation senior requise |
| Infirmier | Établissement, transmissions, tâches et lits en nettoyage |
| Accueil | Identité et coordonnées, affectation médicale, rendez-vous, admission ; données cliniques masquées |
| Laboratoire | Demandes biologiques et identité minimale, comptes rendus |
| Radiologie | Demandes d’imagerie et identité minimale, comptes rendus |
| Pharmacie | Ordonnances et identité minimale, lots et délivrance |
| Finance | Coordonnées administratives et factures |
| Logistique | Lits sans identifiant de patient, lots et équipements |
| Chercheur | Études propres ou partagées, demandes propres ; aucun dossier nominal |
| Étudiant | Études partagées, demande personnelle, cohorte après approbation |
| Patient | Son dossier, ses rendez-vous, ordonnances validées et résultats publiés |
| Direction | Pilotage, équipes, qualité, revue des études et permis ; aucun dossier clinique nominal |
| Administration | Réseau et comptes, gestion opérationnelle ; aucun accès clinique automatique |

## Données

D1 contient neuf tables : comptes, sessions, tentatives, journal, établissements, enregistrements métier, pièces jointes, créneaux et métadonnées. Les enregistrements métier partagent une enveloppe typée (type, établissement, patient, version) et une charge JSON. Ce choix permet un démonstrateur large ; la normalisation des relations, unités, vocabulaires et contraintes est une étape indispensable pour un produit clinique.

Les créneaux de cinq minutes portent une contrainte unique sur ressource/date/heure. Une admission active par patient est imposée par index SQLite. L’allocation du lit et la création de l’admission sont exécutées dans la même transaction. La sortie libère le patient et impose un passage du lit en nettoyage. La délivrance et les mouvements de stock sont transactionnels ; une contrainte empêche les stocks négatifs. Les confirmations sont manuelles et ne portent aucune décision médicale automatisée.

Les fichiers de démonstration sont limités à cinq Mo, avec détection des signatures PDF/PNG/JPEG. Le serveur contrôle le dossier lors du dépôt et de chaque téléchargement ; aucun lien R2 public n’est exposé. La présence d’un antivirus, de sauvegardes testées ou d’une certification d’hébergement n’est pas revendiquée.

## Recherche

Une cohorte nécessite un protocole approuvé, un permis personnel non expiré et le consentement fictif du patient. Les seules variables sont un code de cohorte, une tranche d’âge, le sexe et des durées/événements simulés. Les codes sont pseudonymes ; ils ne garantissent pas l’anonymat. Les durées et événements ne proviennent pas de dossiers réels et n’ont aucune valeur scientifique.

## Déploiement

Les migrations de schéma accompagnent la source GitHub. Le serveur indépendant nécessite une configuration de stockage et de déploiement propre. Le secret d’entrée est géré hors du dépôt. Les dossiers fictifs sont initialisés de manière idempotente à la première connexion, avec marqueur de fin ; les migrations ne contiennent pas de données patient.
