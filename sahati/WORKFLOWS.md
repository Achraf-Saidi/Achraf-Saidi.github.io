# SAHATI — Parcours et invariants

Tous les exemples portent sur des personnes et établissements fictifs. Une donnée validée ne doit pas être effacée silencieusement. Un rôle autorisé, un périmètre et la version actuelle sont nécessaires à chaque mutation.

## A. Consultation et prescription

Patient : demande un rendez-vous. L’accueil confirme puis constate l’arrivée. Le médecin sélectionne ce rendez-vous dans une consultation, documente motif, examen, synthèse et plan, puis enregistre son brouillon. La validation senior rend la consultation visible au patient et termine le rendez-vous associé. Le résident peut soumettre, pas valider.

Une ordonnance référence la consultation, contient les instructions originales et est validée par le médecin. Le patient ouvre le document, ses explications et son PDF. La pharmacie choisit un lot pour chaque traitement : quantités, produit et péremption sont contrôlés. Statut et stock changent ensemble ; un échec annule toute la délivrance. Le QR expose une référence opaque et mène à la vérification locale autorisée. Une annulation reste traçable.

**Reprogrammation :** patient ou accueil peuvent changer date/heure avant l’arrivée. Pour le patient, la demande repasse à confirmer. Une collision restitue entièrement l’ancien rendez-vous et ses réservations.

## B. Laboratoire

Demande médicale → prélèvement confirmé → traitement → saisie des mesures et du compte rendu → validation biologique → publication → lecture confirmée par le médecin.

Chaque mesure garde nom, valeur numérique, unité, date, source, méthode et intervalle fourni. Une chaîne vide n’est pas transformée en zéro. Un intervalle absent n’est pas inventé. La décision de signaler un résultat critique appartient au professionnel. Le patient n’accède pas au résultat avant publication. Une explication donne la source exacte et ne modifie pas les valeurs.

La démo fournit des identifiants de prélèvement ; elle ne livre pas de code-barres de laboratoire, de lecteur matériel, de chaîne d’automates ou de procédure de contrôle qualité validée.

## C. Radiologie

Demande → programmation d’un équipement synthétique → réalisation → étude synthétique → rapport → validation → publication → lecture.

La réservation utilise des créneaux de 5 minutes et refuse les collisions. Dans le dossier fictif `p1`, l’équipe peut rattacher le fantôme DICOM pendant la réalisation. StudyInstanceUID et identité du jeu sont vérifiés au décodage. Le patient retrouve le rapport publié et peut explorer le même objet pédagogique. Fenêtre/niveau/zoom ne constituent pas des mesures anatomiques.

Avant usage réel : worklist DICOM, acquisition, identité, séries, antérieurs, annotation, communication critique, OHIF/PACS sécurisé et évaluation clinique.

## D. Admission et sortie

Un accueil ou un médecin choisit un patient et un lit disponible du service. La transaction occupe le lit, crée l’admission et met à jour la situation du patient. Une admission active par patient est autorisée dans le scénario. La direction voit le changement dans les indicateurs.

Seul le médecin enregistre une sortie avec synthèse. Le patient repasse actif ; le lit passe en bionettoyage. Un rôle habilité le rend ensuite disponible. Les indicateurs distinguent disponibilité, occupation, nettoyage et maintenance. Les transferts restent à développer.

## E. Étudiant

Connexion → Campus → choix d’un cas → exploration d’informations fictives → réponses → correction → score enregistré → historique personnel.

Les cas couvrent identitovigilance, lecture de mesures et censure en biostatistique. Le moteur évalue les réponses, vérifie leur nombre et enregistre chaque tentative pour le compte actif. Les tentatives d’un autre utilisateur ne sont pas retournées. Les contenus doivent être revus par des enseignants avant diffusion universitaire réelle.

## F. Recherche

Protocole → soumission → revue indépendante → demande personnelle avec motif et référence éthique → approbation expirante → cohorte minimisée → analyse → export réautorisé.

L’accès nécessite un protocole approuvé, l’appartenance à l’étude, une demande personnelle approuvée/non expirée et un consentement fictif du patient. La cohorte est limitée à l’établissement et à la spécialité. Les codes ne constituent pas une anonymisation garantie. Effectifs, événements, censures, suivi médian observé et Kaplan-Meier sont descriptifs. La petite cohorte synthétique ne produit aucune preuve clinique ou résultat de calibration.

## G. Direction et présentation institutionnelle

Compte direction → Vue institutionnelle → établissement/wilaya/service → définition d’un indicateur → rapport PDF/CSV.

Le rapport enregistre le périmètre et l’horodatage. Occupation = occupés / hors maintenance ; une absence de séjours terminés donne « non disponible ». Les agrégats sont calculés depuis les entités, sans chiffres présentés comme nationaux. Aucun nom de patient n’apparaît dans cette vue.

## Corrections, concurrence et erreurs

Les brouillons restent éditables selon les droits. Les versions avant/après sont conservées lors des mutations. Une écriture sur une ancienne version, un créneau occupé, un lit pris ou un stock insuffisant échoue sans résultat partiel. Les fichiers restent liés à un document accessible. L’API ne propose pas de suppression d’une version.

Le navigateur demeure modifiable par son propriétaire. Les invariants du moteur démontrent le comportement du produit, pas une protection de production.
