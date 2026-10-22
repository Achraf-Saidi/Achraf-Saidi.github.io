# Sina — IA gratuite de test (0.5)

Dans [SAHATI](https://achraf-saidi.github.io/sahati/), ouvrir Sina puis sélectionner **IA gratuite**. Le mode initial reste **Guide local**. Aucun compte chez le fournisseur, clé API, carte bancaire ou paiement n’est configuré dans l’application.

| Élément | Connexion de cette version |
|---|---|
| Fournisseur | OVHcloud AI Endpoints, accès anonyme |
| Modèle | Mistral Small 3.2, `Mistral-Small-3.2-24B-Instruct-2506` |
| Endpoint | `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions` |
| Quota annoncé | Deux requêtes par minute, par IP et par modèle |
| Requête | POST HTTPS, JSON, sans Authorization ni cookies ; referrer omis |
| Données envoyées | Instructions statiques, question tapée et huit tours IA précédents au maximum |
| Données non jointes automatiquement | Comptes, identité, dossier, fichiers, prescriptions, rendez-vous et quantités de stock |
| Historique | Mémoire de la page, effacé au changement de mode/compte/langue ou à la nouvelle conversation |
| Sortie | Texte React échappé, sans HTML, outil ou écriture automatique |
| Limites | Question de 1 000 caractères, 700 tokens de réponse, 45 s, corps de 64 Kio maximum |

L’interface affiche le départ des messages vers OVHcloud avant le premier envoi. Utiliser exclusivement des données fictives. L’adresse IP et les métadonnées nécessaires au service sont visibles par le fournisseur ; ce mode n’offre pas de garantie contractuelle de confidentialité pour des dossiers de santé. Une conversation saisie peut être traitée par le fournisseur même après avoir interrompu la réception dans le navigateur.

L’attente locale de 31 secondes ménage le quota. Un HTTP 429 affiche un délai avant nouvel essai. Les erreurs réseau, indisponibilités et réponses invalides restent visibles, avec retour volontaire au guide local. Aucune réponse locale n’est déguisée en réponse IA. Une demande urgente ou de traitement reconnue affiche un repère local et n’est pas envoyée au modèle. Ce filtre et les instructions du modèle ne constituent pas une certification ou un dispositif médical.

Le mode gratuit a été vérifié le 22 octobre 2026 par POST réel puis par une réponse dans Chrome. Il dépend du quota, de la disponibilité, du modèle et des conditions OVHcloud, qui peuvent changer. Aucun basculement automatique vers une offre payante n’existe.

Source primaire : [capacités et limites d’AI Endpoints](https://docs.ovhcloud.com/en/guides/public-cloud/ai-machine-learning/ai-endpoints-capabilities). Revalidation nécessaire si le service cesse de répondre.

Depuis `source/`, `pnpm test:ai` teste le client sans appeler le fournisseur ; `pnpm test:all` contrôle l’ensemble de l’application. Les essais réels doivent rester espacés pour respecter le quota partagé.
