# Endométriose ovarienne : réanalyse appariée et contrôle anatomique

**Achraf Saidi — analyse exploratoire de données publiques originales, 11 octobre 2026.**

## Résultat principal

Deux cohortes originales ont été réanalysées, comprenant **8 patientes avec RNA-seq** et **4 patientes avec microarray et trois tissus par patiente**. L’analyse porte sur **13,827 gènes communs** après annotation et filtrage prédéfini.

**Aucun gène ne passe le test primaire de réplication directionnelle après BH à 5 %. Aucun signal thérapeutique n’est validé.** Ce résultat ne démontre pas l’absence de mécanismes biologiques : les effectifs, la variabilité et les hypothèses des tests limitent l’inférence.

L’apport concret est un calcul vérifiable qui distingue la réplication biologique, la différence entre organes et les limites de résolution statistique. Ce n’est ni une nouvelle méthode mathématique ni une découverte de traitement.

## Données réellement utilisées

| Cohorte | Technologie d’après GEO | Donneuses | Comparaison |
|---|---|---:|---|
| GSE105764 | RNA-seq en vrac | 8 | Lésion ovarienne − endomètre eutopique, apparié |
| GSE86534 | Microarray Agilent GPL20115 | 4 | Lésion − endomètre ; lésion − tissu ovarien adjacent ; ovaire adjacent − endomètre |

GSE105764 décrit des patientes en phase sécrétoire sans antécédent de traitement hormonal. Les paires reposent sur les suffixes EC/EU de la matrice déposée ; le lien précis de ces suffixes aux numéros de patientes affichés dans GEO n’est pas résolu. GSE86534 donne des identifiants de patientes et de tissus explicites, mais sa phase et son statut hormonal ne sont pas résolus par les métadonnées téléchargées.

Les deux cohortes viennent d’études/institutions originales distinctes. Aucun croisement d’identité individuel n’est disponible : leur indépendance est une hypothèse documentée, pas une preuve absolue.

Le tissu « NO » est décrit au niveau des échantillons comme **tissu adjacent à la lésion**, pas comme ovaire d’une femme saine. Aucun groupe de femmes sans endométriose ne figure dans ces contrastes.

GSE135485 a été téléchargé pour audit mais exclu : les métadonnées originales disponibles ne permettent pas de résoudre les tissus et l’appariement par échantillon. Nous n’avons pas repris des annotations de publications secondaires sans les vérifier.

## Ce que les calculs donnent

| Mesure | Résultat |
|---|---:|
| Gènes communs testés | 13,827 |
| Différences lésion–endomètre de même signe dans les deux cohortes | 10,643 (77.0 %) |
| Corrélation de Spearman entre effets lésion–endomètre des deux plateformes | 0.625 |
| Gènes BH ≤ 0,05 dans la cohorte RNA seule, test t apparié | 7,417 |
| Gènes BH ≤ 0,05 dans la cohorte microarray seule, test t apparié | 0 |
| Réplication directionnelle BH ≤ 0,05, modèles t | 0 |
| Réplication directionnelle BY ≤ 0,05, modèles t | 0 |
| Conjonction avec contrôle ovarien, BH ≤ 0,05 | 0 |
| Réplication BY ≤ 0,05, sensibilité exacte par retournement des signes | 0 |
| Plus petite p-value directionnelle exacte de réplication | 0.125 |

La cohérence de signe et la corrélation sont descriptives. Elles ne constituent pas une réplication statistique de chaque gène ni une preuve de causalité. Une corrélation entre gènes dépendants n’est pas interprétée comme autant de validations indépendantes.

## Pourquoi le contrôle anatomique change la question

Dans GSE86534, la corrélation entre les différences **lésion−endomètre** et **ovaire adjacent−endomètre** vaut **0.803**. Une partie de la ressemblance entre cohortes peut donc être compatible avec des différences de site, de composition ou un effet de champ pathologique.

Cela ne prouve pas que ces signaux sont « uniquement ovariens ». Le contrôle adjacent peut lui-même être affecté, et les données bulk mélangent plusieurs populations cellulaires.

Quelques marqueurs familiers sont présentés **après analyse, uniquement pour interprétation**, sans constituer une sélection de cibles validées :

| Gène | RNA lésion−endomètre | Array lésion−endomètre | Array lésion−ovaire adjacent | q de réplication BH, modèle t |
|---|---:|---:|---:|---:|
| ACTA2 | 2.356 | 1.568 | -0.179 | 0.230 |
| ESR1 | -3.421 | -2.958 | -0.050 | 0.230 |
| NGF | 1.240 | 1.389 | -0.228 | 0.265 |
| FAP | 1.208 | -0.475 | 1.004 | 1.000 |
| COL1A1 | 1.573 | -0.022 | 0.023 | 1.000 |

Les effets RNA sont des différences moyennes de log2(CPM+0,5). Les effets array utilisent la VALUE traitée déposée, dont l’échelle est compatible avec une expression logarithmique mais n’est pas entièrement reconstruite depuis les images brutes. **Ne pas les fusionner comme des effets sur une même échelle.**

ACTA2, ESR1 et NGF illustrent des changements apparents par rapport à l’endomètre dont les différences moyennes avec l’ovaire adjacent sont nettement plus petites ici. **Une différence non significative n’établit pas l’équivalence, ni l’absence d’un rôle dans la maladie.** FAP et COL1A1 illustrent aussi que des changements observés dans une cohorte ne suffisent pas pour une conclusion transportable.

## Mathématiques de la réplication

Pour chaque cohorte et chaque gène, la différence appariée est calculée dans chaque donneuse, puis résumée par sa moyenne et son erreur standard. Les cellules ne sont jamais comptées comme des patientes supplémentaires.

Pour une direction fixée, la p-value de la conjonction est le maximum des p-values unilatérales des contrastes exigés. Tester une hausse **ou** une baisse entraîne un facteur deux :

\[
p_{rep}=\min\left(1,2\min\left[\max_s p_{s,+},\max_s p_{s,-}\right]\right).
\]

Si au moins un contraste exigé a un vrai null, l’événement « tous les p ≤ α » est inclus dans l’événement « le p du contraste nul ≤ α ». La validité de cette conjonction dépend donc de celle des tests individuels, sans exiger l’indépendance entre les deux contrastes du même microarray. Les p-values t restent conditionnelles à leurs hypothèses de modèle.

BH est appliqué à l’ensemble des 13,827 gènes communs ; BY est fourni comme sensibilité aux dépendances entre gènes. Le contrôle de l’erreur ne répare pas des p-values invalides ou les biais biologiques.

## Limite d’effectif, explicitement calculée

Avec quatre donneuses, il n’y a que 2⁴ = 16 configurations de signes. La plus petite p-value bilatérale exacte est donc 2/16 = **0,125**. Ce contrôle de sensibilité ne peut valider une réplication à 5 %, même avant correction des gènes.

Il faudrait au moins **6 paires** pour que la grille permette une p-value bilatérale inférieure à 0,05 sans multiplicité, et au moins **20 paires** pour atteindre la résolution minimale d’une correction de Bonferroni à 0,05 sur 13,827 gènes. **Ce sont des conditions de résolution nécessaires, pas une analyse de puissance ni une garantie de détection.** Le retournement des signes suppose une symétrie sous le null ; il n’est pas un test causal randomisé de ces tissus observés.

## Contrôles effectués et limites

- Analyse des différences au niveau des donneuses et audit de la technologie réelle.
- Univers commun complet ; filtrage RNA fondé sur l’expression avant les effets différentiels.
- Corrections BH/BY, conjonction directionnelle, énumération exacte des signes.
- Stabilité du signe au retrait d’une donneuse.
- Normalisation RNA alternative par ratios médians ; agrégation des sondes array par moyenne en sensibilité.
- Contraste anatomique avec tissu ovarien adjacent, sans le présenter comme contrôle sain.
- Comparaison numérique des tests appariés à SciPy et tests du calcul de conjonction.

L’analyse primaire est exploratoire : elle ne dispose pas de l’ensemble des covariables de cycle, d’âge et de traitement, d’un traitement cellulaire séparé, de correction complète des biais de composition, ou d’une cohorte externe suffisamment grande. Une faible p-value dans la cohorte RNA seule n’est pas une preuve de cible thérapeutique.

La sensibilité robuste empirical-Bayes prévue après l’analyse primaire a été tentée via InMoose 0.9.1. Son option `robust=True` lève `NotImplementedError` dans `squeezeVar`. **Aucun résultat de cette méthode n’a été produit ; aucun repli silencieux vers une méthode plus favorable n’a été utilisé.** Le blocage est enregistré dans `moderation_status.json`. Une comparaison avec limma R correctement validée reste à effectuer.

## Expérience suivante réellement informative

La prochaine question n’est pas « quel médicament ressort d’un classement de gènes ? », mais **quel signal persiste dans une même population cellulaire de la lésion, avec les bons témoins et suffisamment de donneuses ?**

1. Acquérir une cohorte distincte avec tissu, donneuse, phase, traitement et sous-type identifiables. Des atlas intégrés réutilisant les mêmes donneuses ne comptent pas comme validation indépendante.
2. Comparer les mêmes états stromaux, épithéliaux ou immunitaires au niveau des donneuses. Préciser l’effet du site et des proportions cellulaires avant d’attribuer un signal à un mécanisme.
3. Utiliser un modèle établi adapté aux comptages ou aux microarrays, valider ses hypothèses et sa puissance, puis confirmer les résultats hors cohorte sans ajuster les seuils sur celle-ci.
4. Pour une hypothèse qui résiste, définir avec des biologistes une perturbation, des contrôles de viabilité et des mesures séparées de phénotype lésionnel, de douleur et de fertilité. La présence d’un marqueur ne suffit pas pour choisir de l’inhiber ou de l’activer.

## Reproduction et fichiers

```bash
python research/biological_analysis.py --data /chemin/donnees_geo --output results
python research/plot_biological_results.py --results results
python research/write_biological_report.py --results results
python -m unittest discover -s tests -p 'test_*.py'
```

- `all_genes.csv.gz` : tous les gènes testés, effets, tests, corrections et sensibilités ; pas seulement les meilleurs scores.
- `biological_results.json` : audit des cohortes, exclusions, paramètres, versions et limitations.
- `acquisition_manifest.json` : fichiers sources, URL, tailles et empreintes SHA-256.
- `paired_anatomy_figure.svg` : figure scientifique régénérable.
- `BIOLOGICAL_ANALYSIS_PLAN.md` : plan interne écrit avant inspection des effets, non preregistré extérieurement.

Les sources téléchargées ne sont pas redistribuées dans le dépôt. Les scripts les récupèrent auprès des déposants ; les résultats agrégés et la provenance sont disponibles.

## Sources primaires

- GSE105764 : https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE105764 ; publication originale PMID 29357938.
- GSE86534 : https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE86534 ; publication originale PMID 30496345.
- HGNC : jeu officiel `hgnc_complete_set.txt`, empreinte exacte dans le manifeste.
- Benjamini & Heller, *Screening for Partial Conjunction Hypotheses*, Biometrics, 2008 : https://doi.org/10.1111/j.1541-0420.2007.00984.x
- InMoose eBayes, documentation officielle : https://inmoose.readthedocs.io/en/stable/generated/inmoose.limma.eBayes.html

**Conclusion : une réanalyse réelle et une limite biologique/statistique documentée, sans cible validée, remède découvert ou promesse clinique.**
