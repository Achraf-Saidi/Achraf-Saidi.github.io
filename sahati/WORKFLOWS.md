# SAHATI — Parcours et invariants

Tous les exemples portent sur des personnes et établissements fictifs. Une donnée validée ne doit pas être effacée silencieusement. Un rôle autorisé, un périmètre et la version actuelle sont nécessaires à chaque mutation.

## A. Consultation et prescription

Patient : demande un rendez-vous. L’accueil confirme puis constate l’arrivée. Le médecin sélectionne ce rendez-vous dans une consultation, documente motif, examen, synthèse et plan, puis enregistre son brouillon. La validation senior rend la consultation visible au patient et termine le rendez-vous associé. Le résident peut soumettre, pas valider.

Une ordonnance référence la consultation, contient les instructions originales et est validée par le médecin. Le patient ouvre le document, ses explications et son PDF. La pharmacie consulte une proposition FEFO : une ligne peut être répartie entre plusieurs lots, par péremption croissante. Produit, unité, statut, quantité et péremption sont contrôlés. Les ordonnances anciennes sans référence de catalogue gardent une correspondance exacte par nom, sans substitution automatique. Statut et stock changent ensemble ; un échec annule toute la délivrance. Le QR expose une référence opaque et mène à la vérification locale autorisée. Une annulation reste traçable.

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

L’accès nécessite un protocole approuvé, l’appartenance à l’étude, une demande personnelle approuvée/non expirée et un consentement fictif du patient. La cohorte est limitée à l’établissement et à la spécialité. Les durées et événements synthétiques sont déterministes par étude/personne et restent stables quand l’ordre des dossiers change. Les codes ne constituent pas une anonymisation garantie. Effectifs, événements, censures, suivi médian observé et Kaplan-Meier sont descriptifs. La petite cohorte synthétique ne produit aucune preuve clinique ou résultat de calibration.

## G. Direction et présentation institutionnelle

Compte direction → Vue institutionnelle → établissement/wilaya/service → définition d’un indicateur → rapport PDF/CSV.

Le rapport enregistre le périmètre et l’horodatage. Occupation = occupés / hors maintenance ; une absence de séjours terminés donne « non disponible ». Les agrégats sont calculés depuis les entités, sans chiffres présentés comme nationaux. Aucun nom de patient n’apparaît dans cette vue.

## Corrections, concurrence et erreurs

Les brouillons restent éditables selon les droits. Les versions avant/après sont conservées lors des mutations. Une écriture sur une ancienne version, un créneau occupé, un lit pris ou un stock insuffisant échoue sans résultat partiel. Les fichiers restent liés à un document accessible. L’API ne propose pas de suppression d’une version.

Le navigateur demeure modifiable par son propriétaire. Les invariants du moteur démontrent le comportement du produit, pas une protection de production.


## H. Circuit de stock détaillé — version 0.3

1. Créer un article, préciser son unité de gestion, sa DCI/présentation si médicament, ses seuils et son coût par défaut. Le catalogue interne ne constitue pas une base pharmacologique certifiée.
2. Réceptionner avec bon, lot, date, quantité, emplacement et coût ; le même lot au même emplacement est regroupé si la date et l’état correspondent. Le coût du lot devient une moyenne pondérée des réceptions, arrondie au centime.
3. Une commande passe de brouillon à confirmée ; les réceptions partielles diminuent son reliquat. Une réception supérieure au reliquat échoue. L’annulation d’un reliquat conserve les réceptions déjà enregistrées.
4. Un comptage exige un motif, journalise l’écart et ne réécrit pas les mouvements passés. Un transfert produit une sortie et une entrée liées dans une seule transaction. Une sortie vers un service conserve son destinataire et son motif.
5. La quarantaine bloque un emplacement ; un rappel bloque le même article/numéro de lot dans tous les emplacements du même établissement. Le journal permet de retrouver les délivrances antérieures. Aucune notification externe de rappel n’est envoyée.
6. La délivrance FEFO déduit une seule fois les quantités agrégées par lot, même si plusieurs lignes utilisent ce lot. Une insuffisance sur une ligne annule toute l’opération. Les lots délivrés restent visibles dans l’ordonnance et le PDF.

Les numéros de version et les gardes SQL protègent les transactions. Les opérations d’inventaire reçoivent une clé d’idempotence ; rejouer la même clé du même compte retourne le résultat existant. Le journal démarre par un solde d’ouverture : aucun historique ancien n’est inventé.

Les suggestions utilisent disponible + commandes ouvertes, le seuil et la cible. La couverture estimée utilise les sorties de délivrance/service des 28 derniers jours, calculées sur le journal complet ; sans sortie elle reste absente. Le tableau et l’export affichent au plus les 2 000 mouvements les plus récents.

## I. Mon quotidien et Sina

Le carnet du patient est séparé des notes cliniques. Rappels, questions, notes et contact personnel ne sont pas transmis automatiquement à l’équipe. Cocher un rappel ne modifie aucune prescription. L’export ICS utilise les horaires algériens UTC+1 pour les rendez-vous et les rappels horaires. Les rappels sans heure sont des événements de journée. Les alertes dépendent du calendrier dans lequel l’utilisateur importe le fichier.

Sina lit uniquement le contexte déjà autorisé de la vue active. Elle oriente vers un dossier, un module ou les options de langue ; elle n’effectue pas de mutation clinique et ne choisit pas de dose. La conversation reste en mémoire et est effacée au changement de compte ou de langue. Le mode sans compte donne des repères génériques sans appeler un dossier.


## J. Dotation des services — version 0.4

Demandeur → **Demandes de service** → articles du catalogue, unités, quantités, service et motif → demande enregistrée. Pharmacie/logistique → **Dotations** → préparation totale ou partielle FEFO → réservation sans déduction physique → délivrance de toute la préparation → sortie et journal atomiques. Les reliquats restent préparables. Le demandeur confirme une réception complète. Annuler conserve les livraisons et libère seulement les réservations restantes. Si un lot réservé est bloqué/périmé, libérer puis refaire la préparation.

## K. Inventaire contrôlé — version 0.4

**Inventaires** → nom et emplacement ou tout l’établissement → comptages explicites, y compris zéro → enregistrer → revue → appliquer les écarts. Les corrections, mouvements et clôture font partie de la même transaction. Un changement de lot ou de périmètre bloque l’application ; **Réconcilier les mouvements** ajoute les nouveaux lots et demande de recompter les lots modifiés. Les comptages inchangés sont gardés. Un comptage inférieur aux réservations exige de libérer celles-ci avant un nouveau rapprochement. Le CSV conserve attendu, compté et écart.

## L. Fournisseurs et sorties — version 0.4

**Fournisseurs** → fiche, code, contact et délai → sélectionner le fournisseur actif lors d’une commande. Mettre en pause interdit les nouvelles commandes liées, sans réécrire les commandes anciennes. **Retours & retraits** → lot, quantité non réservée, motif et bordereau → retour fournisseur ou retrait/perte → journal et quantité mis à jour ensemble → bordereau PDF de démonstration. Les lots bloqués ou périmés peuvent être retirés. Retours et transferts ne gonflent pas la consommation sur 28 jours.
