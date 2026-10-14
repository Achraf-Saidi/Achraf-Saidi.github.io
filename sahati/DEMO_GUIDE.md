# SAHATI — Guide de démonstration 0.2

Ouvrir https://achraf-saidi.github.io/sahati/ puis utiliser les deux codes existants. Ils ne sont pas reproduits dans la documentation. Les comptes de démonstration utilisent `SahatiDemo2026!` ; les adresses par métier sont proposées sur la page de connexion. Aucun compte ChatGPT ni serveur de soins n’intervient dans ce parcours.

**Préparer :** utiliser un navigateur récent, autoriser le stockage, garder le même appareil pour tous les comptes et exporter une sauvegarde avant une démonstration importante. Une reprogrammation ou une action est conservée dans ce coffre. Les données sont fictives ; ne saisir aucune information médicale réelle.

## Parcours principal — environ 15 minutes proposées

1. **Patient (`patient@sahati.demo`).** Montrer l’accueil, « Mon dossier médical », la chronologie et les mesures synthétiques. Ouvrir un bilan et « Comprendre ce document » : valeur, unité, champ source, intervalle absent, glossaire et résumé PDF. Demander un rendez-vous sur un créneau libre ; montrer sa modification.
2. **Accueil (`accueil@sahati.demo`).** Confirmer la demande puis l’arrivée. La même référence apparaît. Les champs cliniques ne sont pas présents dans la vue administrative.
3. **Médecin (`medecin@sahati.demo`).** Créer une consultation pour Amel, sélectionner le rendez-vous arrivé, remplir les rubriques. Enregistrer ; rouvrir pour montrer le brouillon et la sauvegarde. Valider. Le rendez-vous passe terminé. Créer une ordonnance et une analyse associées à la consultation ; utiliser uniquement des traitements/consignes fictifs.
4. **Laboratoire (`laboratoire@sahati.demo`).** Confirmer le prélèvement, démarrer le traitement, saisir un résultat synthétique et une mesure avec source. Laisser l’intervalle vide si absent. Enregistrer, valider, puis publier. Montrer qu’une publication est une action distincte.
5. **Patient.** Retrouver consultation, ordonnance et résultat. Télécharger le PDF. Le QR mène à une vérification sur le même coffre après connexion autorisée ; montrer version et statut, sans prétendre à une signature qualifiée.
6. **Direction (`direction@sahati.demo`).** Ouvrir « Vue institutionnelle », filtrer un établissement ou une wilaya, ouvrir une définition et télécharger un rapport synthétique.

## Compléments

### DICOM — 4 minutes proposées

Le médecin crée une demande radiologique pour le patient fictif Amel (`p1`), ou utilise « Étude DICOM synthétique de démonstration ». Le compte radiologie programme un équipement libre, démarre la réalisation et rattache l’étude synthétique. Ouvrir fenêtre/niveau/zoom et télécharger le `.dcm`. Enregistrer le rapport, valider et publier. Le patient voit le document et le même fantôme.

Dire explicitement : fichier DICOM réel, pixels entièrement synthétiques, une seule image, aucune anatomie, aucun PACS connecté. Ne pas présenter ce module comme un visualiseur clinique.

### Hospitalisation — 3 minutes proposées

Choisir un patient sans admission active et un lit disponible du service. Admettre puis actualiser la direction : occupation et disponibilité évoluent. Le médecin saisit une synthèse de sortie ; le lit passe en bionettoyage. Le compte infirmier confirme ensuite sa disponibilité.

### Campus — 4 minutes proposées

Compte `etudiant@sahati.demo` → Campus médical → cas « Lire un bilan sans surinterpréter ». Explorer la méthode et le compte rendu, répondre aux trois questions, consulter la correction et revenir à l’historique. Refaire un cas pour montrer une nouvelle tentative. Aucun dossier nominatif n’est accessible depuis ce rôle.

### Recherche — 4 minutes proposées

L’étudiant possède une autorisation synthétique initiale pour `study1`. Ouvrir la cohorte et l’analyse. Pour le chercheur, créer une demande, puis la faire approuver par la direction ; elle ne peut pas être autoapprouvée. Exporter le rapport descriptif et expliquer la censure. Aucun résultat scientifique réel n’est obtenu.

## Réponses pour une présentation institutionnelle

| Question | Élément démontré | Prérequis réel |
|---|---|---|
| Continuité des soins | Consultation, ordonnance et résultat reliés | Identité et échanges autorisés |
| Travail administratif | États partagés et calendrier avec conflits | Mesure terrain du temps de travail |
| Accès patient | Dossier, documents et explications sources | Droits, publication et compréhension validés |
| Laboratoire / radiologie | Circuit d’état et DICOM pédagogique | Connecteurs, PACS et protocoles |
| Recherche / formation | Autorisation personnelle et cas séparés | Éthique, enseignants et gouvernance |
| Pilotage | Cinq KPI définis et filtres | Qualité des remontées et référentiel des établissements |
| Confidentialité | Permissions métier et coffre de démonstration | API, audit indépendant, hébergement et conformité |
| Déploiement progressif | Plan limité à un service volontaire | Convention, budget et évaluation indépendante |

Les bénéfices restent des hypothèses. Le pilote devra mesurer leur réalité. Voir `ROADMAP.md` pour les conditions d’entrée et de réussite.
