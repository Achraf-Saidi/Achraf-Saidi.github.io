# Calibration séquentielle sous censure : ce que les tests établissent

**Bilan : la difficulté empirique est réelle, plusieurs cas simples sont résolubles, et l'originalité doctorale reste à établir précisément.** Le remplacement de G par un estimateur ponctuel peut provoquer une inflation majeure des fausses alertes, même sans ajouter de biais artificiel à cet estimateur. Une meilleure spécification ou une augmentation AIPCW corrige plusieurs exemples. Une construction conservatrice protège aussi un sous-modèle homogène, au prix d'une faible sensibilité aux petites dégradations.

[Ouvrir le dashboard et ses graphiques](https://achraf-saidi.github.io/research/calibration-lab/#view=audit) · [Protocole et justifications mathématiques](AUDIT_METHODS.md) · [Résultats JSON](audit-results/confirm.json) · [Premières alertes et graines, gzip](audit-results/confirm-replicates.json.gz)

## 1. Expérience réellement exécutée

13 méthodes, 11 scénarios, 200 répétitions par scénario, 2 500 patients de surveillance par répétition : **2 200 cohortes, 5,5 millions de patients synthétiques et 28 600 couples méthode/cohorte**, auxquels s'ajoutent les historiques d'apprentissage. Les méthodes d'une répétition partagent les mêmes patients. Le générateur respecte l'indépendance conditionnelle de la censure et la positivité.

Neuf scénarios conservent H0 : E[Yτ|p,passé]=p. Deux introduisent une vraie dégradation après le patient 1 250. Aucun biais logit artificiel n'est ajouté à G estimé. Les ajustements utilisent uniquement les observations historiques ou passées déjà évaluées, avant la contribution du patient actuel.

Le niveau visé est α=5 % pour **chaque procédure séparément**, sur toute la surveillance. Les taux ci-dessous sont des probabilités d'au moins une première alerte, estimées par Monte-Carlo. Le protocole, les méthodes et les graines de confirmation ont été fixés avant ces calculs ; les empreintes du code sont conservées dans le JSON. Les essais de développement ont servi à construire ces exemples : ils ne constituent pas une sélection aléatoire représentative de tous les problèmes de survie.

## 2. Des solutions simples corrigent des difficultés simples

| Situation H0, modèle toujours calibré | Procédure | Fausses alertes | IC Wilson individuel à 95 % |
| --- | --- | ---: | ---: |
| Censure homogène stable | IPCW, G vrai | 5/200 = 2,5 % | [1,1 % ; 5,7 %] |
| Censure homogène stable | KM figé, 50 historiques | **118/200 = 59 %** | [52,1 % ; 65,6 %] |
| Censure homogène stable | KM figé, 2 000 historiques | 7/200 = 3,5 % | [1,7 % ; 7,0 %] |
| G dépend de X | KM marginal croissant | **156/200 = 78 %** | [71,8 % ; 83,2 %] |
| G dépend de X | G exponentiel conditionnel correctement spécifié | 3/200 = 1,5 % | [0,5 % ; 4,3 %] |
| G dépend de X | AIPCW conditionnel | 0/200 = 0 % | [0 % ; 1,9 %] |

L'effet du petit historique apparaît donc sans trafiquer G estimé. Mais augmenter l'historique suffit à supprimer l'inflation détectable dans cet exemple homogène. Quand G dépend de X, un KM marginal reste inadéquat même avec beaucoup de données ; un modèle conditionnel adapté corrige cet exemple.

**Conséquence pour la thèse :** « le plug-in IPCW peut échouer » est un point de départ, pas à lui seul une contribution nouvelle. Il faut dépasser les corrections élémentaires sur une classe de problèmes définie.

## 3. Le changement de censure peut être confondu avec une décalibration

Quand seule la censure augmente après N/2, S*(τ|X)=p reste exactement vrai : toute alerte est donc fausse.

| Procédure | Fausses alertes sur 200 répétitions |
| --- | ---: |
| G vrai | 1/200 = 0,5 % |
| KM marginal croissant | 200/200 = 100 % |
| KM récent, fenêtre 500 | 200/200 = 100 % |
| G exponentiel conditionnel croissant | 200/200 = 100 % |
| AIPCW marginal | 1/200 = 0,5 % |
| AIPCW conditionnel | 1/200 = 0,5 % |

Dans cette expérience, la fenêtre mobile réagit trop tard : une première fausse alerte a déjà eu lieu pendant le transitoire. L'augmentation exploite aussi les temps d'événement observés avant τ et fonctionne bien ici, avec un modèle événement exponentiel correctement spécifié. Elle doit donc faire partie des comparateurs sérieux.

## 4. L'augmentation testée ne résout pas tous les exemples

Dans le scénario « censure non linéaire et survie Weibull », la loi de censure dépend de x² et la forme des événements vaut 2,3. Les modèles de travail exponentiels linéaires de G et des événements sont alors tous deux faux, tout en conservant la calibration à τ et l'indépendance conditionnelle.

| Procédure | Fausses alertes | IC Wilson individuel à 95 % |
| --- | ---: | ---: |
| G vrai | 0/200 = 0 % | [0 % ; 1,9 %] |
| G exponentiel conditionnel | 200/200 = 100 % | [98,1 % ; 100 %] |
| AIPCW, G marginal | **68/200 = 34 %** | [27,8 % ; 40,8 %] |
| AIPCW, deux modèles conditionnels | **44/200 = 22 %** | [16,8 % ; 28,2 %] |

L'inflation des deux versions AIPCW reste significative après correction globale de Holm sur les 117 tests H0 ; pour la version conditionnelle, p corrigée ≈6×10⁻¹⁵. Cela identifie une limite des modèles de travail effectivement testés. Cela ne montre pas qu'un estimateur flexible, une autre augmentation ou une protection explicite du biais échouerait aussi. Il n'y a aucune contradiction avec la double robustesse lorsque l'une des deux courbes auxiliaires est exactement correcte.

Autre exemple : quand la forme des événements **et** la censure changent en préservant S*(τ|X)=p, les deux AIPCW donnent 20/200=10 % d'alertes, IC [6,6 % ; 14,9 %]. Cette cellule **n'est pas concluante après Holm** (p corrigée ≈0,165). Il serait trompeur de présenter ce seul taux comme une inflation statistiquement confirmée après toutes les comparaisons.

Le scénario p=0,6 constant, S*(X)=0,4 ou 0,8, vérifie aussi la calibration faible du PDF sans imposer S*(X)=p. Les modèles ajustés sur X restent opérationnels dans cet exemple. Le JSON et le tableau interactif conservent les neuf scénarios H0, y compris ces contrôles moins spectaculaires.

## 5. Une protection simple est possible dans une classe restrictive

Une treizième méthode encadre G par une séquence de confiance issue d'une vraisemblance exponentielle homogène, puis utilise les enveloppes des scores pour les paris de signes opposés. Avec δ=1 % pour l'incertitude sur G et β=4 % pour le moniteur, l'argument de Ville et une union donnent une probabilité de fausse alerte ≤5 %, sous les hypothèses précisées dans [AUDIT_METHODS.md](AUDIT_METHODS.md).

Ce benchmark utilise des outils classiques de vraisemblance et de martingales ; aucune nouveauté n'est revendiquée. Son hypothèse supplémentaire est forte : la même loi exponentielle de censure pour tous les profils et patients.

Dans le scénario homogène H0 : 0/200 fausses alertes et aucun défaut d'encadrement observé sur les 200 trajectoires. Ces zéros sont des vérifications empiriques ; la garantie annoncée vient de l'argument mathématique, pas des simulations. La garantie ne s'étend pas aux scénarios de G(X) hétérogène ou changeant, signalés † dans le dashboard.

### Coût en détection

Sous une vraie dégradation logit de −0,45 après N/2, toujours avec censure homogène :

| Procédure | Alertes précoces | Premières alertes après changement / 200 | Sans alerte | Délai médian après changement* |
| --- | ---: | ---: | ---: | ---: |
| Sans censure | 0 | 200 = 100 % | 0 | 360 patients |
| IPCW, G vrai | 3 | 124 = 62 % | 73 | 705 patients |
| AIPCW, deux modèles conditionnels | 0 | 198 = 99 % | 2 | 455 patients |
| G encadré | 0 | 11 = 5,5 % | 189 | 950 patients |

*Délai conditionnel à une première alerte après le changement. Le dénominateur des taux de détection reste 200 : les non-détections ne disparaissent pas de l'analyse.*

Avec une dégradation forte de −1,2, G encadré détecte 200/200 après le changement, sans alerte précoce, avec délai médian 220 patients. Le coût de sensibilité dépend donc de l'amplitude de la dégradation. Ce résultat n'établit pas une borne inférieure pour toutes les méthodes protégées possibles.

AIPCW peut dépasser la puissance de la référence IPCW avec G vrai : l'oracle comparé n'est pas un oracle d'efficacité optimale. AIPCW utilise davantage d'information observée sur les événements avant τ.

## 6. La question de nouveauté reste distincte des simulations

La consultation de travaux primaires au moment de cet audit indique déjà plusieurs familles à comparer. Les cibles et garanties diffèrent ; les titres ne suffisent pas à établir ou exclure une contribution.

| Travaux | Élément déjà étudié | Comparaison à mener avec la cible du PDF |
| --- | --- | --- |
| [Arnold, Henzi, Ziegel](https://arxiv.org/abs/2109.11761) | Tests séquentiellement valides de calibration probabiliste | Rôle de la censure et différence entre PIT et calibration conditionnelle à un horizon |
| [Farina, Tchetgen Tchetgen, Kuchibhotla](https://arxiv.org/abs/2501.04615) | IPCW et AIPCW pour ensembles prédictifs sous censure à droite ordinaire, couverture asymptotique | Couverture d'ensembles prédictifs versus surveillance séquentielle de E[Yτ|p,passé]=p |
| [Dalal et coauteurs](https://arxiv.org/abs/2408.09598) | DML avec inférence asymptotique uniforme dans le temps et nuisances apprises | Conditions de reste, adaptation à la censure et différence avec un contrôle fini exact |
| [Wang et coauteurs](https://arxiv.org/html/2605.18459v1), annexe H | Séquences de confiance asymptotiques en survie censurée avec nuisances apprises | Cible causale et plan adaptatif différents ; il est faux de dire que « survie + séquentiel + nuisances apprises » n'a jamais été traité |
| [Grigg, STRAND](https://pmc.ncbi.nlm.nih.gov/articles/PMC6767103/) | Surveillance séquentielle de survie ajustée au risque | Hypothèses de modèle, cible surveillée et type de contrôle des alertes |
| [Jonkers, résumé de conférence 2026](https://biblio.ugent.be/publication/01KWBT0P50CDGBQA468M0DT3AS) | Calibration fonctionnelle sous censure à droite | Résumé seulement : document insuffisant pour attribuer une garantie séquentielle ou conclure à un doublon exact |

Cette comparaison est ciblée, non exhaustive. Aucun théorème d'équivalence entre ces méthodes et le monitorage du PDF n'est affirmé. Le prototype n'est pas présenté comme une reproduction complète de ces travaux.

## 7. Décision raisonnable pour la thèse

**Poursuivre le sujet est justifié par ces résultats, à condition de resserrer la contribution.** L'expérience montre une confusion possible entre décalibration prédictive et erreurs sur le mécanisme d'observation. Elle montre aussi que des outils connus résolvent des sous-cas et que certains modèles de travail simples deviennent insuffisants.

Une question de travail plus précise serait : construire et analyser une surveillance de E[Yτ|p,passé]=p sous censure conditionnellement indépendante et positive, avec nuisances apprises sur les observations passées, en contrôlant explicitement leur reste d'estimation et en mesurant le coût en délai de détection. Il faut préciser la classe de G, la régularité, les dérives autorisées et le type de garantie : fini exact, conservateur, ou asymptotique uniforme dans le temps.

La prochaine étape scientifique doit chercher à **réfuter** cette piste avec des concurrents plus solides : G et S ajustés de manière flexible, AIPCW, encadrements de nuisances et méthodes séquentielles existantes dont les hypothèses correspondent. Une grille préfixée de tailles d'historique, N, intensités de censure, non-linéarités et dérives est nécessaire. Un phénomène qui disparaît après une meilleure spécification doit être décrit comme tel ; un gain théorique ou un compromis validité–puissance doit être démontré au-delà de ces exemples.

Ce qui n'est pas validé par l'audit : « jamais fait », « aucune solution simple possible », « difficulté fondamentale démontrée », « garantie générale obtenue ». Les simulations ne peuvent établir aucune de ces quatre affirmations.

## 8. Vérification et reproductibilité

- 40 tests automatisés réussis : moteur, bornes, ajustements, ordre temporel, formules AIPCW, séquence de confiance et transports Worker.
- Contrôles indépendants avec SciPy de l'ajustement exponentiel initial, des racines de l'encadrement, des espérances AIPCW par quadrature et des 117 queues binomiales.
- Réconciliation des 143 taux méthode/scénario avec les 2 200 enregistrements comprimés de premières alertes.
- Empreintes SHA-256 du moteur et du code d'audit identiques à celles figées avant les calculs confirmatoires.
- Diagnostic secondaire : la troncature AIPCW n'a pas été comptée dans le code figé ; l'interface la signale comme non mesurée, sans modifier les premières alertes ni les scores.
- Cohérence statique des identifiants de contrôles et des imports vérifiée. Le rendu visuel et le téléchargement PNG n'ont pas pu être vérifiés dans un navigateur de cet environnement.

Les commandes de reproduction sont dans [AUDIT_METHODS.md](AUDIT_METHODS.md). Le dashboard permet de relancer les 13 méthodes sur le scénario choisi avec d'autres graines et effectifs, de visualiser les IC et de télécharger SVG, PNG, CSV, JSON et rapport HTML.
