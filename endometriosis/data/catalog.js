/* Manually curated publication metadata, checked 2026-10-11. No patient data. */
const ENDO_CATALOG = {
  version: '0.1.0', reviewed: '2026-10-11',
  sources: [
    {id:'fonseca2023',year:2023,title:'Single-cell transcriptomic analysis of endometriosis',journal:'Nature Genetics',doi:'10.1038/s41588-022-01254-1',url:'https://pubmed.ncbi.nlm.nih.gov/36624343/',type:'Single-cell',scope:'Lésions, endomètre eutopique et tissus témoins',cells:370000,cellsLabel:'>370 000',donors:null,summary:'Atlas de plusieurs sites tissulaires, décrivant les compartiments épithéliaux, stromaux et le microenvironnement. Les cellules ne représentent pas des observations indépendantes.',dataUrl:'https://www.ncbi.nlm.nih.gov/bioproject/PRJNA879764',codeUrl:'https://github.com/lawrenson-lab/AtlasEndometriosis',access:'BioProject identifié ; matrices et métadonnées à acquérir et auditer.',status:'Référence cataloguée · données non importées',overlap:'HECA intègre des données de cette étude : ne pas les compter comme réplication indépendante.'},
    {id:'heca2024',year:2024,title:'An integrated single-cell reference atlas of the human endometrium',journal:'Nature Genetics',doi:'10.1038/s41588-024-01873-w',url:'https://pubmed.ncbi.nlm.nih.gov/39198675/',type:'Atlas intégré',scope:'Endomètre humain, avec et sans endométriose',cells:313527,cellsLabel:'313 527',donors:63,summary:'Référence intégrée des états cellulaires. La contextualisation génétique met notamment en avant les cellules stromales déciduales et les macrophages ; cela ne démontre pas une cible curative.',dataUrl:'https://doi.org/10.1038/s41588-024-01873-w',access:'Consulter Data availability ; droits et fichiers à vérifier avant ingestion.',status:'Référence cataloguée · données non importées',overlap:'Réutilise plusieurs cohortes publiées, dont Fonseca. Identifier les donneuses originales.'},
    {id:'gwas2023',year:2023,title:'The genetic basis of endometriosis and comorbidity with other pain and inflammatory conditions',journal:'Nature Genetics',doi:'10.1038/s41588-023-01323-z',url:'https://pubmed.ncbi.nlm.nih.gov/36914876/',type:'GWAS',scope:'Risque génétique et comorbidités',cases:60674,controls:701926,summary:'Méta-analyse identifiant 42 loci significatifs. Un locus associé au risque ne détermine à lui seul ni le gène causal, ni le sens d’une intervention.',dataUrl:'https://doi.org/10.1038/s41588-023-01323-z',access:'Statistiques sommaires, cohortes et licences à auditer.',status:'Référence cataloguée · données non importées',overlap:'Vérifier les cohortes communes à la méta-analyse de 2026.'},
    {id:'gwas2026',year:2026,title:'Multi-ancestry genome-wide association and integrated multi-omics analyses of endometriosis and its clinical manifestations',journal:'Nature Genetics',doi:'10.1038/s41588-026-02582-2',url:'https://pubmed.ncbi.nlm.nih.gov/42056605/',type:'GWAS',scope:'Plusieurs ascendances et manifestations cliniques',cases:105869,summary:'Étude récente portant sur environ 1,4 million de femmes, dont 105 869 cas. Elle doit faire partie de l’évaluation de l’état de l’art avant toute revendication de nouveauté.',dataUrl:'https://doi.org/10.1038/s41588-026-02582-2',access:'Les conditions diffèrent selon les cohortes ; accès individuel non présumé.',status:'Référence cataloguée · données non importées',overlap:'Indépendance par rapport aux études antérieures à établir.'},
    {id:'ai2026',year:2026,title:'Endometriosis-related alterations in the endometrium revealed by integrated single-cell and AI-powered approaches',journal:'Publication indexée PubMed',doi:null,url:'https://pubmed.ncbi.nlm.nih.gov/42161907/',type:'Atlas intégré',scope:'Endomètre et analyse intégrée',cells:466371,cellsLabel:'466 371',donors:60,summary:'Atlas annoncé de 35 donneuses avec endométriose et 25 sans, sans traitement hormonal exogène. Le statut exact des données et la réutilisation de cohortes doivent être vérifiés.',dataUrl:'https://pubmed.ncbi.nlm.nih.gov/42161907/',access:'Référence récente : revue approfondie et disponibilité à confirmer.',status:'Résumé indexé vérifié · analyse complète à faire',overlap:'Origine des donneuses à vérifier avant comparaison avec HECA.'},
    {id:'who2025',year:2025,title:'Endometriosis — fact sheet',journal:'Organisation mondiale de la Santé',doi:null,url:'https://www.who.int/news-room/fact-sheets/detail/endometriosis',type:'Contexte clinique',scope:'Maladie, prise en charge et besoins de recherche',summary:'L’OMS indique qu’aucune guérison définitive connue n’est disponible. Les traitements existants peuvent réduire les symptômes ; un résultat informatique ne constitue pas un traitement.',access:'Fiche de contexte, pas une cohorte expérimentale.',status:'Contexte clinique',overlap:'Sans objet'}
  ],
  nodes:[
    {id:'endometriosis',label:'Endométriose',kind:'disease',description:'Question centrale. Cette carte organise les références ; elle n’est pas un réseau causal.'},
    {id:'lesions',label:'Lésions',kind:'tissue',description:'Tissus ectopiques représentés dans l’étude Fonseca. Les sites et sous-types doivent rester distingués.'},
    {id:'endometrium',label:'Endomètre',kind:'tissue',description:'Tissu eutopique. Une variation observée ici ne peut être extrapolée automatiquement aux lésions.'},
    {id:'stroma',label:'Stroma décidual',kind:'cell',description:'Contexte cellulaire mis en avant dans HECA. Association et contextualisation ne démontrent pas une action thérapeutique.'},
    {id:'macrophage',label:'Macrophages',kind:'cell',description:'Contexte immunitaire identifié par HECA, à explorer au niveau des donneuses et des états cellulaires.'},
    {id:'genetics',label:'Risque génétique',kind:'evidence',description:'Les GWAS associent des variants au risque. Fine-mapping, colocalisation et perturbation sont nécessaires pour relier risque, gène et intervention.'},
    {id:'fonseca2023',label:'Fonseca · 2023',kind:'study'},
    {id:'heca2024',label:'HECA · 2024',kind:'study'},
    {id:'gwas2023',label:'GWAS · 2023',kind:'study'},
    {id:'gwas2026',label:'GWAS · 2026',kind:'study'},
    {id:'ai2026',label:'Atlas / IA · 2026',kind:'study'}
  ],
  edges:[
    {source:'fonseca2023',target:'lesions',relation:'profilage tissulaire',evidence:'fonseca2023'},
    {source:'fonseca2023',target:'endometrium',relation:'profilage tissulaire',evidence:'fonseca2023'},
    {source:'heca2024',target:'endometrium',relation:'atlas de référence',evidence:'heca2024'},
    {source:'heca2024',target:'stroma',relation:'contextualisation génétique',evidence:'heca2024'},
    {source:'heca2024',target:'macrophage',relation:'contextualisation génétique',evidence:'heca2024'},
    {source:'gwas2023',target:'genetics',relation:'association au risque',evidence:'gwas2023'},
    {source:'gwas2026',target:'genetics',relation:'association au risque',evidence:'gwas2026'},
    {source:'ai2026',target:'endometrium',relation:'atlas intégré',evidence:'ai2026'},
    {source:'genetics',target:'endometriosis',relation:'risque associé',evidence:'gwas2023'},
    {source:'lesions',target:'endometriosis',relation:'tissus étudiés',evidence:'fonseca2023'},
    {source:'endometrium',target:'endometriosis',relation:'tissus étudiés',evidence:'heca2024'}
  ]
};
if(typeof module!=='undefined') module.exports=ENDO_CATALOG;
