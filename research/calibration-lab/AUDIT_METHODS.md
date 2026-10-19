# Audit des solutions simples — protocole et justification

**Version audit : 1.0.0.** Ce benchmark prolonge le laboratoire de calibration séquentielle à horizon fixe. Il évalue des correctifs élémentaires ; il ne démontre pas une nouveauté bibliographique, une impossibilité ou la difficulté intrinsèque d'une classe entière de problèmes.

Voir [les résultats confirmatoires](AUDIT_RESULTS.md), [le code](audit.mjs) et [les résultats structurés](audit-results/confirm.json).

## 1. Correspondance avec le cadrage doctoral

| Élément du cadrage | Réalisation dans l'audit |
| --- | --- |
| Modèle déployé fixé, horizon τ fixé | Même règle p=fτ(X) pour chaque méthode d'une cohorte |
| H0 : E[Yτ \| p, passé]=p | Neuf scénarios H0, dont un où S*(X)≠p mais E[Yτ\|p,passé]=p |
| Censure à droite ordinaire | Seulement min(T,C,τ) et la cause de fin de suivi entrent dans les ajustements |
| Indépendance conditionnelle T ⟂ C \| X, passé | Respectée dans tous les scénarios de cet audit ; aucun ρ≠0 |
| Positivité G≥gmin | Imposée par le générateur, gmin=0,05 |
| G inconnu et appris sur le passé | Aucun G vrai transmis aux estimateurs opérationnels |
| Détection à maturité | Contribution évaluée après arrivée+τ, dans l'ordre d'arrivée |
| Erreur d'estimation réelle | gBias=0 dans tous les nouveaux essais |
| Fonctions h du risque | h=1 et indicatrices de quatre intervalles fixes de p |

Le scénario de calibration faible a p=0,6 constant, groupe équiprobable et S*(X)=0,4 ou 0,8. Son hypothèse nulle est exactement celle du PDF, sans supposer à tort que S*(X)=p pour chaque X.

Un changement de forme Weibull est aussi testé : la forme passe de 1 à 2,5 après N/2, en préservant les uniformes latents et S*(τ|X)=p. La censure augmente simultanément. Une modification de la forme avant τ ne constitue donc pas ici une décalibration à l'horizon τ.

Le stress-test non linéaire utilise

$$
G(\tau\mid X)=\max\{g_{\min},\exp[-a\exp(0.9(x^2-1)+0.4z)]\}.
$$

Il reste dans les hypothèses de censure indépendante du cadrage. Les deux modèles exponentiels linéaires de travail sont alors mal spécifiés. Cela n'est pas un échec de la double robustesse sous une nuisance exactement correcte.

## 2. Plan de confirmation

- 11 scénarios : 9 H0 et 2 H1.
- 200 répétitions par scénario, N=2 500 patients évalués par répétition.
- 2 200 cohortes, 5 500 000 patients de surveillance synthétiques.
- 13 méthodes appariées, soit 28 600 couples méthode/cohorte.
- Les patients historiques s'ajoutent à ces effectifs.
- Même cohorte, mêmes prédictions et même historique emboîté entre méthodes d'une répétition.
- Trois lots exécutés séparément, fusionnés avant l'interprétation statistique globale. Les mêmes graines sont réutilisées entre scénarios : les cellules peuvent être dépendantes, ce que permet la correction de Holm.
- Graines de confirmation distinctes des graines de développement.
- Empreintes SHA-256 du moteur et du code d'audit enregistrées avant calcul, puis contrôlées à la fusion.
- Pas de sélection de la meilleure graine et aucun changement des méthodes après lecture des résultats confirmatoires.

Les essais de développement ont servi à vérifier les calculs, choisir des exemples et assurer que le scénario « G conditionnel correctement spécifié » n'active pas le plafonnement de la loi génératrice. Les scénarios n'ont pas été tirés aléatoirement dans une population de scénarios. Les IC ne quantifient donc pas une généralisation à tous les hôpitaux ou mécanismes.

## 3. Méthodes comparées

| Identifiant | Méthode | Historique et actualisation |
| --- | --- | --- |
| full | Y−p, référence sans censure | Vérité synthétique seulement |
| naive | R−p, censure ignorée | Aucune correction |
| oracle | R/G*−p | G* connu, référence irréalisable en pratique |
| km_small | IPCW, KM marginal figé | 50 historiques indépendants |
| km_large | IPCW, KM marginal figé | 2 000 historiques indépendants |
| km_online | IPCW, KM marginal croissant | 200 historiques, réajustement tous les 100 patients |
| km_window | IPCW, KM marginal récent | Fenêtre de 500, réajustement tous les 100 patients |
| strat_online | IPCW, KM groupe × 3 classes de p | 200 historiques, échantillon croissant |
| exp_online | IPCW, G exponentiel conditionnel en x et groupe | 200 historiques, échantillon croissant |
| km_clip | KM croissant avec plancher 0,40 | Même ajustement que km_online avant troncature |
| dr_pooled | AIPCW : G exponentiel marginal, survie exponentielle conditionnelle | Deux nuisances apprises sur le passé |
| dr_cond | AIPCW : G et survie exponentiels conditionnels | Deux nuisances apprises sur le passé |
| guard_exp | G encadré par séquence de confiance | Modèle de censure exponentielle homogène uniquement |

Les KM sont inversés : la censure devient l'événement. L'historique n'utilise pas les temps latents de censure des patients dont l'événement survient en premier.

La référence oracle IPCW n'est pas une borne d'efficacité optimale : elle utilise seulement R/G*. AIPCW exploite aussi les événements observés avant τ et leur temps. Une meilleure puissance qu'un moniteur oracle IPCW particulier n'est donc pas paradoxale.

Le compteur de troncature des probabilités de censure a été enregistré pour les variantes IPCW, mais pas pour AIPCW dans le code figé 1.0.0. Pour AIPCW, l'interface affiche « non mesurée » et le CSV de résumé laisse la case vide. Le zéro historique de ce champ dans le JSON n'est pas une mesure ; les métadonnées le signalent. Cela n'affecte pas les scores ni les premières alertes.

## 4. Surveillance séquentielle et bornes prévisibles

L'audit conserve les fonctions h, la grille de paris et les départs fixés du premier moteur, mais adapte les tailles des paris à une borne de score disponible dans le passé. Les décisions sont prises tous les 10 patients évalués et à N. Le processus est arrêté à sa première alerte.

Pour IPCW, si la probabilité utilisée est au moins g, le score appartient à [-1,1/g]. Les paris positifs sont

$$
b\in\{.002,.006,.02,.06,.15,.35,.65,.9\},
$$

et les paris négatifs valent −bg. Le plancher g peut évoluer, mais il est calculé sur le modèle ajusté au passé et globalement sur les profils possibles, jamais sur la réponse du patient actuel.

Pour un KM marginal, g est sa valeur tronquée à τ. Pour un KM stratifié, c'est le minimum sur les six strates. Pour le modèle conditionnel, c'est le minimum sur x∈[-4,4] et z∈{0,1}. Pour l'oracle, une borne déterministe est déduite de la classe de génération connue.

Cela stabilise les facteurs et évite qu'un plancher excessivement prudent ne rende artificiellement tous les moniteurs impuissants. **Des facteurs positifs ne suffisent pas à garantir leur espérance sous H0.** Le plug-in reste expérimental lorsque son score n'est pas centré.

Le mélange gère les fonctions h, paris et départs prédéfinis à l'intérieur d'une procédure. Il ne transforme pas les 13 procédures en un test global au niveau 5 %. La correction de Holm décrite plus bas concerne l'analyse des taux Monte-Carlo, pas une règle clinique qui sélectionnerait une alerte parmi 13 procédures.

## 5. Score augmenté AIPCW effectivement testé

Posons u=min(T,C,τ)/τ et dT l'indicateur d'événement observé avant τ. Les modèles de travail sont

$$
\widehat S(v)=e^{-av/\tau},\qquad \widehat G(v)=e^{-bv/\tau}.
$$

La pseudo-réponse augmentée est

$$
Q=\widehat S(\tau)
-\widehat S(\tau)\int_0^\tau
\frac{dN(v)-Y(v)\widehat\lambda_T\,dv}
{\widehat S(v)\widehat G(v)}.
$$

Pour les exponentielles de travail, le calcul est analytique :

$$
Q=e^{-a}\left[
1+\frac{a}{a+b}\{\exp((a+b)u)-1\}
-d_T\exp((a+b)u)
\right].
$$

Le score testé est Q−p. Cette expression emploie les données observées, pas Y latent. Les coefficients de la nuisance événement sont estimés par maximum de vraisemblance, avec le décalage connu −log(p) :

$$
\lambda_T(X)\tau=(-\log p)\exp(\theta_0+\theta_1x+\theta_2z).
$$

Lorsque le générateur a une forme exponentielle et S*(X)=p, θ=0 est correctement spécifié. Si la forme est Weibull non exponentielle, le modèle de travail peut être faux malgré une calibration parfaite à τ.

### Double robustesse et bornes

Dans le modèle exponentiel continu, l'espérance de Q est la survie réelle si l'une des deux courbes de nuisance est exactement correcte. Le calcul est vérifié par quadrature indépendante avec SciPy.

Cette propriété vaut aussi pour des lois réelles plus générales lorsque l'une des deux courbes de travail est exactement correcte, sous indépendance conditionnelle et positivité. Lorsque les deux nuisances sont estimées, la double robustesse ne signifie pas que le reste d'estimation est exactement nul à chaque étape. Une erreur résiduelle peut donc affecter l'inférence séquentielle.

Si b≤−log(g), alors Q∈[-1/g,1/g], d'où Q−p∈[-1/g−1,1/g]. Les paris positifs sont bg/(1+g), les négatifs −bg. Ce choix explicite garantit des facteurs strictement positifs, avec les mêmes réserves de centrage.

## 6. Solution simple avec encadrement de G dans un sous-modèle

Cette construction est un **benchmark conservateur obtenu par des outils de vraisemblance et de martingales classiques**, pas une revendication de méthode inédite. Elle montre qu'une partie du problème admet déjà une solution simple avec des hypothèses restrictives.

### Hypothèses supplémentaires

Le risque de censure est constant : C|X,passé suit une exponentielle de taux λ/τ, avec le même λ pour tous les profils et patients. On suppose G=e^-λ≥gmin et la censure indépendante de T conditionnellement à X et au passé. La loi de T peut dépendre de X.

### Vraisemblance de la censure

Pour les patients déjà évalués, D=ΣdC et V=ΣU/τ. À facteur de nuisance événement identique près, la vraisemblance est

$$
L_n(\lambda)=\lambda^D e^{-\lambda V}.
$$

Pour deux valeurs de λ, le rapport des vraisemblances observées est le rapport des lois de censure : les facteurs associés à la loi des événements se simplifient. Sous le vrai λ0, ce rapport définit une martingale de vraisemblance le long des patients évalués.

Une loi mélange Gamma(a,b), fixée avec a=b=1 avant les données, donne

$$
E_n^G(\lambda)=
\frac{b^a\Gamma(D+a)}
{\Gamma(a)(V+b)^{D+a}}
\frac{e^{\lambda V}}{\lambda^D}.
$$

Ainsi, par Ville, l'ensemble

$$
\mathcal C_n=\{\lambda\in[0,-\log g_{\min}]:E_n^G(\lambda)<1/\delta\}
$$

contient simultanément le vrai paramètre avec probabilité au moins 1−δ. On inverse numériquement cet ensemble pour obtenir [L_n,U_n] encadrant G. Les calculs et les racines sont contrôlés indépendamment avec SciPy.

### Encadrer les scores et contrôler les alertes

Avant de traiter le patient i, on utilise uniquement l'intervalle calculé sur le passé :

$$
\psi_i^-=R_i/U_{i-1}-p_i,\qquad
\psi_i^+=R_i/L_{i-1}-p_i.
$$

Quand G appartient à l'intervalle,

$$
\psi_i^-\le R_i/G-p_i\le\psi_i^+.
$$

Sous H0, pour h≥0, l'espérance du score inférieur pondéré est ≤0 et celle du score supérieur est ≥0. On utilise donc le score inférieur pour les paris positifs et le score supérieur pour les paris négatifs.

Pour le justifier malgré les éventuels défauts de couverture, on considère le processus arrêté avant le premier intervalle prévisible qui n'inclut plus le vrai G. Ce processus est une supermartingale non négative sous les hypothèses. Sur l'événement de couverture simultanée, il coïncide avec le processus effectivement calculé.

Avec δ=0,01 consacré à G et β=α−δ=0,04 consacré au moniteur,

$$
P_{H0}(\text{au moins une fausse alerte})
\le \beta+\delta=\alpha=0,05.
$$

Le seuil du moniteur vaut 1/β=25. L'argument ne nécessite pas l'indépendance entre l'estimateur de G et le moniteur : il utilise le passé et une couverture simultanée. Une intersection vide avec la classe de positivité produit un intervalle de repli [gmin,1], sans inverser artificiellement les bornes.

**Cette justification ne vaut pas pour G(X) hétérogène ou un taux de censure qui change avec le temps.** Les résultats hors de ce sous-modèle portent le symbole † dans l'interface. Leur échec ne réfute pas la justification précédente.

Le coût de cette construction peut être important : un intervalle large sur G masque une petite dégradation prédictive. Ce coût observé n'est pas une borne inférieure prouvée pour toutes les méthodes possibles.

## 7. Incertitude Monte-Carlo et comparaisons multiples

Pour chaque cellule, l'indicateur est « au moins une première alerte avant la fin de N ». Les IC de Wilson à 95 % sont individuels.

Pour les 9 scénarios H0 et les 13 procédures, on teste l'inflation de la probabilité d'alerte au-dessus de 0,05 par une queue binomiale unilatérale exacte. Les 117 p-values sont corrigées conjointement par Holm, sans hypothèse d'indépendance entre cellules.

- Inflation détectée : preuve Monte-Carlo d'un dépassement pour le générateur et la procédure testés.
- Inflation non détectée : absence de conclusion sur le dépassement, pas une preuve de contrôle.
- Un zéro sur 200 donne encore une borne supérieure Wilson d'environ 1,9 %.
- L'excès de 10 % dans le scénario de forme et censure variables n'est pas concluant après la correction globale ; il reste visible avec son IC et sa p-value.

Les contrastes appariés supplémentaires sont exploratoires et explicitement séparés de cette famille principale.

Sous H1, les alertes précoces, les premières alertes après changement et les non-détections sont séparées. Le délai médian est conditionnel à une première alerte après N/2. La proportion de premières alertes après changement utilise toutes les répétitions au dénominateur.

## 8. Reproduction

Depuis la racine du dépôt :

    node --test research/calibration-lab/tests/engine.test.mjs research/calibration-lab/tests/worker.test.mjs research/calibration-lab/tests/audit.test.mjs

Pour reproduire la confirmation en trois lots :

    node research/calibration-lab/tests/run-audit.mjs --phase confirm --reps 200 --n 2500 --scenarios no-censor,homogeneous,censor-drift,mild-drift --label a
    node research/calibration-lab/tests/run-audit.mjs --phase confirm --reps 200 --n 2500 --scenarios conditional,population,weak-calibration,strong-drift --label b
    node research/calibration-lab/tests/run-audit.mjs --phase confirm --reps 200 --n 2500 --scenarios double-misspec,shape-and-censor-drift,nonlinear-censor --label c
    node research/calibration-lab/tests/merge-audit.mjs

Une graine r est calculée par l'arithmétique uint32 baseSeed+(r+1)×0x9E3779B1. Le moteur conserve les mêmes patients entre méthodes. Les transformations supplémentaires du générateur ne transmettent jamais les variables latentes aux ajustements.

Le fichier gzip publié conserve les indices de première alerte, graines, scénarios et ordre des méthodes. Les diagnostics complets par répétition sont reproductibles avec auditReplicate(scenario,seed). Les données de développement et fichiers de lots sont des intermédiaires ; la confirmation fusionnée est le résultat de référence.

## 9. Portée pour le projet doctoral

Les tests établissent un risque réel sans biais artificiel et montrent que plusieurs difficultés simples sont corrigibles par une meilleure spécification ou par AIPCW. Ils montrent aussi les limites de ces modèles et le coût d'une protection conservatrice.

Ils ne permettent pas de conclure :
- qu'aucune solution simple ne fonctionne dans une classe encore à définir ;
- que ces solutions ou leurs variantes sont inédites ;
- qu'une garantie uniforme découle d'un succès sur 2 200 cohortes ;
- qu'il faut viser une robustesse sans aucune hypothèse sur la censure ;
- qu'un échec sous deux modèles mal spécifiés contredit une propriété de double robustesse.

La contribution doctorale éventuelle doit préciser la classe de G et de dérives admises, le type de garantie, la quantité surveillée et le compromis validité–puissance au-delà des outils existants.

## Références de méthode

- [Farina, Tchetgen Tchetgen et Kuchibhotla : IPCW et augmentation sous censure](https://arxiv.org/abs/2501.04615).
- [Wasserman, Ramdas et Balakrishnan : inférence universelle et vraisemblances avec nuisances](https://arxiv.org/abs/1912.11436).
- [Pace et ses coauteurs : séquences de confiance et rapports de vraisemblance](https://doi.org/10.1002/cjs.11749).
- [Dalal et ses coauteurs : inférence uniforme dans le temps avec DML](https://arxiv.org/abs/2408.09598).
- [Wang et ses coauteurs : survie séquentielle, nuisances apprises et séquences asymptotiques](https://arxiv.org/abs/2605.18459).

## Vérification visuelle

Les tests du moteur, du Worker, des formules et de l'intégration statique sont automatisés. Le contrôle visuel dans un navigateur n'était pas disponible dans cet environnement ; les téléchargements PNG restent à vérifier dans le navigateur utilisateur.

