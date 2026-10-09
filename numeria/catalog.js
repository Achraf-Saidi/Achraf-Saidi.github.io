// Public curriculum and reference prices. Checkout is a demonstration, never a payment gateway.
export const L = (fr, en, ar) => ({ fr, en, ar });
export const courses = [
  {
    id: 'math-2as', audience: 'lycee', category: '2as', price: 2900, weeks: 4, live: 6, practice: 8, monthly: true, resource: 'r-2as', icon: 'math',
    title: L('Maths · 2e année secondaire', 'Maths · Secondary year 2', 'رياضيات · السنة الثانية ثانوي'),
    short: L('Les bases qui changent tout.', 'Foundations that make a difference.', 'أساس متين يصنع الفرق.'),
    description: L('Comprendre les fonctions, raisonner avec méthode et arriver en terminale avec des bases solides. Un accompagnement régulier, adapté à la filière.', 'Understand functions, reason methodically and build solid foundations before the final year. Regular support adapted to your stream.', 'فهم الدوال والتفكير بمنهجية وبناء أساس متين قبل سنة البكالوريا، مع متابعة تناسب الشعبة.'),
    level: L('2AS · filières scientifiques', 'Year 2 · scientific streams', 'الثانية ثانوي · الشعب العلمية'),
    prerequisite: L('Être en 2AS. Un diagnostic permet d’identifier les acquis de 1AS à reprendre et de préciser la filière.', 'Be in secondary year 2. A diagnostic identifies first-year foundations to revisit and confirms your stream.', 'الدراسة في السنة الثانية ثانوي. يحدد التقييم الأولي مكتسبات السنة الأولى التي تحتاج إلى مراجعة والشعبة المناسبة.'),
    outcome: L('Savoir expliquer une démarche, étudier une fonction et résoudre un exercice en autonomie, avec une rédaction claire.', 'Explain your reasoning, study a function and solve an exercise independently with clear written work.', 'شرح طريقة الحل ودراسة دالة وحل تمرين باستقلالية، مع تحرير واضح.'),
    project: L('Un devoir de synthèse corrigé et un carnet personnel des erreurs à retravailler.', 'A corrected synthesis assignment and a personal log of errors to revisit.', 'فرض شامل مصحح ودفتر شخصي للأخطاء التي تحتاج إلى مراجعة.'),
    tools: ['Google Meet', 'GeoGebra', 'Fiches & corrections'],
    modules: L([
      ['Diagnostic & calcul', 'Calcul algébrique, équations, inéquations et rédaction. On reprend les blocages avant d’avancer.'],
      ['Fonctions & variations', 'Lecture graphique, domaine, parité, variations et transformations de fonctions.'],
      ['Dérivation', 'Taux de variation, tangente, règles de calcul et lien entre signe et variations.'],
      ['Suites, statistiques & probabilités', 'Modéliser une situation, organiser les données et justifier un calcul de probabilité.'],
      ['Géométrie & synthèse', 'Vecteurs et outils de géométrie selon la filière. Exercices transversaux et rédaction chronométrée.']
    ],[
      ['Diagnostic & algebra', 'Algebra, equations, inequalities and written reasoning. Address gaps before moving on.'],
      ['Functions & variation', 'Graphs, domains, parity, variation and transformations.'],
      ['Differentiation', 'Rates of change, tangents, calculation rules and the link between sign and variation.'],
      ['Sequences, statistics & probability', 'Model situations, organise data and justify probability calculations.'],
      ['Geometry & synthesis', 'Vectors and geometry tools according to your stream. Mixed exercises and timed writing.']
    ],[
      ['تقييم أولي وحساب جبري', 'الحساب الجبري والمعادلات والمتراجحات والتحرير، مع معالجة الثغرات قبل التقدم.'],
      ['الدوال والتغيّرات', 'القراءة البيانية ومجموعة التعريف والزوجية والتغيّرات وتحويلات الدوال.'],
      ['الاشتقاق', 'معدل التغيّر والمماس وقواعد الاشتقاق والعلاقة بين الإشارة والتغيّرات.'],
      ['المتتاليات والإحصاء والاحتمالات', 'نمذجة وضعية وتنظيم البيانات وتبرير حساب الاحتمال.'],
      ['الهندسة والتركيب', 'المتجهات وأدوات الهندسة حسب الشعبة، مع تمارين شاملة وتحرير في وقت محدد.']
    ])
  },
  {
    id: 'math-bac', audience: 'lycee', category: 'bac', price: 3900, weeks: 4, live: 6, practice: 8, monthly: true, resource: 'r-bac', icon: 'math',
    title: L('BAC Maths · Excellence', 'BAC Maths · Excellence', 'رياضيات البكالوريا · إتقان'),
    short: L('Du « je bloque » au « je sais pourquoi ».', 'From “I’m stuck” to “I know why”.', 'من «لم أفهم» إلى «أعرف لماذا».'),
    description: L('Une préparation progressive en 3AS : comprendre le cours, résoudre les exercices et apprendre à composer. Maths, sciences expérimentales et maths techniques : le parcours s’adapte.', 'Progressive final-year preparation: understand the theory, solve problems and learn exam technique. Adapted to Mathematics, Experimental Sciences and Technical Mathematics streams.', 'تحضير تدريجي في الثالثة ثانوي: فهم الدرس وحل التمارين والتدرّب على الامتحان، حسب شعب الرياضيات والعلوم التجريبية والتقني رياضي.'),
    level: L('3AS · préparation BAC', 'Final year · BAC preparation', 'الثالثة ثانوي · تحضير البكالوريا'),
    prerequisite: L('Être en 3AS. La filière et le niveau de départ sont précisés avant de fixer le programme de travail.', 'Be in the final secondary year. Stream and starting level are established before confirming the study plan.', 'الدراسة في الثالثة ثانوي. تُحدد الشعبة والمستوى الأولي قبل تثبيت برنامج العمل.'),
    outcome: L('Construire une solution, justifier les étapes et mieux gérer le temps sur un sujet de bac.', 'Build a solution, justify each step and manage your time on a BAC paper.', 'بناء حل وتبرير خطواته وتنظيم الوقت في موضوع البكالوريا.'),
    project: L('Des sujets de synthèse, une correction commentée et un plan de révision fondé sur les erreurs observées.', 'Synthesis papers, commented corrections and a revision plan based on observed errors.', 'مواضيع شاملة وتصحيح مشروح وخطة مراجعة مبنية على الأخطاء المسجلة.'),
    tools: ['Google Meet', 'GeoGebra', 'Annales & corrections'],
    modules: L([
      ['Fonctions, limites & continuité', 'Construire une étude complète et relier calculs, graphiques et interprétation.'],
      ['Exponentielle & logarithme', 'Équations, inéquations, limites et problèmes de modélisation.'],
      ['Primitives & intégrales', 'Calcul, aire et interprétation. Choisir une méthode et vérifier le résultat.'],
      ['Suites & récurrence', 'Monotonie, convergence et démonstrations structurées.'],
      ['Probabilités, complexes & géométrie', 'Arbres, lois discrètes, représentation complexe et géométrie de l’espace selon la filière.'],
      ['Méthode d’examen', 'Choix des questions, rédaction, gestion du temps et sujets complets corrigés.']
    ],[
      ['Functions, limits & continuity', 'Build a complete study and connect calculations, graphs and interpretation.'],
      ['Exponential & logarithm', 'Equations, inequalities, limits and modelling problems.'],
      ['Antiderivatives & integrals', 'Calculation, area and interpretation. Choose a method and check the answer.'],
      ['Sequences & induction', 'Monotonicity, convergence and structured proofs.'],
      ['Probability, complex numbers & geometry', 'Trees, discrete distributions, complex representation and spatial geometry according to stream.'],
      ['Exam technique', 'Question selection, written reasoning, time management and corrected full papers.']
    ],[
      ['الدوال والنهايات والاستمرارية', 'دراسة كاملة تربط الحساب بالتمثيل البياني والتفسير.'],
      ['الدالة الأسية واللوغاريتم', 'معادلات ومتراجحات ونهايات ومسائل نمذجة.'],
      ['الدوال الأصلية والتكامل', 'الحساب والمساحة والتفسير، مع اختيار الطريقة والتحقق من النتيجة.'],
      ['المتتاليات والاستدلال بالتراجع', 'الرتابة والتقارب وبراهين منظمة.'],
      ['الاحتمالات والأعداد المركبة والهندسة', 'الأشجار وقوانين الاحتمال والتمثيل المركب وهندسة الفضاء حسب الشعبة.'],
      ['منهجية الامتحان', 'اختيار الأسئلة والتحرير وتنظيم الوقت ومواضيع كاملة مصححة.']
    ])
  },
  {
    id: 'physics-bac', audience: 'lycee', category: 'bac', price: 3500, weeks: 4, live: 6, practice: 8, monthly: true, resource: 'r-physics', icon: 'atom',
    title: L('BAC Physique · Méthode', 'BAC Physics · Method', 'فيزياء البكالوريا · منهجية'),
    short: L('Le phénomène avant la formule.', 'The phenomenon before the formula.', 'فهم الظاهرة قبل تطبيق القانون.'),
    description: L('Modéliser, calculer, interpréter : un complément scientifique pour relier les maths aux problèmes de physique-chimie du bac.', 'Model, calculate, interpret: scientific support connecting mathematics with BAC physics and chemistry problems.', 'نمذجة وحساب وتفسير: متابعة علمية تربط الرياضيات بمسائل الفيزياء والكيمياء في البكالوريا.'),
    level: L('3AS · filières scientifiques', 'Final year · scientific streams', 'الثالثة ثانوي · الشعب العلمية'),
    prerequisite: L('Bases de 2AS, unités et calcul algébrique. Le contenu est ajusté à la filière.', 'Year-2 foundations, units and algebra. Content is adapted to your stream.', 'مكتسبات الثانية ثانوي والوحدات والحساب الجبري، مع تكييف المحتوى حسب الشعبة.'),
    outcome: L('Choisir un modèle, vérifier les unités et interpréter une courbe ou un résultat physique.', 'Choose a model, check units and interpret a graph or physical result.', 'اختيار نموذج والتحقق من الوحدات وتفسير منحنى أو نتيجة فيزيائية.'),
    project: L('Un dossier de problèmes corrigés et une épreuve blanche de synthèse.', 'A set of corrected problems and a synthesis mock exam.', 'ملف مسائل مصححة وامتحان تجريبي شامل.'),
    tools: ['Google Meet', 'PhET', 'Annales & corrections'],
    modules: L([
      ['Mesurer & modéliser', 'Unités, ordre de grandeur, lecture de courbes et méthode de résolution.'],
      ['Mécanique', 'Forces, mouvements, lois de Newton et choix du système étudié.'],
      ['Électricité', 'Dipôles et régimes transitoires. Exploiter une équation et un graphique.'],
      ['Transformations chimiques', 'Suivi temporel, avancement et équilibres selon la filière.'],
      ['Synthèse BAC', 'Problèmes transversaux, rédaction et contrôle de cohérence des résultats.']
    ],[
      ['Measure & model', 'Units, orders of magnitude, graph reading and problem-solving method.'],
      ['Mechanics', 'Forces, motion, Newton’s laws and choice of system.'],
      ['Electricity', 'Components and transient regimes. Use an equation and a graph.'],
      ['Chemical transformations', 'Time evolution, reaction progress and equilibria according to stream.'],
      ['BAC synthesis', 'Mixed problems, written reasoning and consistency checks.']
    ],[
      ['القياس والنمذجة', 'الوحدات ورتبة المقدار وقراءة المنحنيات ومنهجية الحل.'],
      ['الميكانيك', 'القوى والحركة وقوانين نيوتن واختيار الجملة المدروسة.'],
      ['الكهرباء', 'ثنائيات القطب والأنظمة الانتقالية واستغلال المعادلات والمنحنيات.'],
      ['التحولات الكيميائية', 'المتابعة الزمنية والتقدم والتوازنات حسب الشعبة.'],
      ['تركيب البكالوريا', 'مسائل شاملة وتحرير ومراقبة اتساق النتائج.']
    ])
  },
  {
    id: 'bac-sprint', audience: 'lycee', category: 'bac', price: 9900, weeks: 4, live: 12, practice: 16, monthly: false, resource: 'r-sprint', icon: 'bolt',
    title: L('BAC Maths · Sprint', 'BAC Maths · Sprint', 'رياضيات البكالوريا · مراجعة مكثفة'),
    short: L('Quatre semaines. Un plan précis.', 'Four weeks. A focused plan.', 'أربعة أسابيع وخطة واضحة.'),
    description: L('Une révision intensive pour les élèves qui ont déjà travaillé le programme et veulent consolider leurs points faibles avant l’examen.', 'Intensive revision for students who have already studied the syllabus and want to strengthen weak points before the exam.', 'مراجعة مكثفة لمن درسوا البرنامج ويريدون معالجة نقاط الضعف قبل الامتحان.'),
    level: L('3AS · révision intensive', 'Final year · intensive revision', 'الثالثة ثانوي · مراجعة مكثفة'),
    prerequisite: L('Avoir déjà étudié le programme de 3AS. Ce sprint ne remplace pas une année de préparation.', 'Have already studied the final-year syllabus. This sprint does not replace a year of preparation.', 'دراسة برنامج الثالثة ثانوي مسبقًا. هذه المراجعة لا تعوّض التحضير السنوي.'),
    outcome: L('Prioriser les révisions et traiter un sujet complet avec une méthode stable.', 'Prioritise revision and work through a complete paper with a consistent method.', 'تحديد أولويات المراجعة وحل موضوع كامل بمنهجية ثابتة.'),
    project: L('Deux épreuves blanches corrigées et une feuille de route personnalisée.', 'Two corrected mock exams and a personal revision roadmap.', 'امتحانان تجريبيان مصححان وخطة مراجعة شخصية.'),
    tools: ['Google Meet', 'Annales & corrections'],
    modules: L([
      ['Semaine 1 · diagnostic', 'Identifier les chapitres prioritaires et revoir les raisonnements essentiels.'],
      ['Semaine 2 · consolidation', 'Exercices ciblés, erreurs récurrentes et première épreuve blanche.'],
      ['Semaine 3 · sujets complets', 'Questions de synthèse, transitions entre chapitres et gestion du temps.'],
      ['Semaine 4 · mise au point', 'Deuxième épreuve blanche, correction individuelle et plan des dernières révisions.']
    ],[
      ['Week 1 · diagnostic', 'Identify priority chapters and revisit essential reasoning.'],
      ['Week 2 · consolidation', 'Targeted exercises, recurring mistakes and the first mock exam.'],
      ['Week 3 · full papers', 'Synthesis questions, links between chapters and time management.'],
      ['Week 4 · final review', 'Second mock exam, individual feedback and final revision plan.']
    ],[
      ['الأسبوع 1 · تشخيص', 'تحديد الفصول ذات الأولوية ومراجعة الاستدلالات الأساسية.'],
      ['الأسبوع 2 · تثبيت', 'تمارين موجهة وأخطاء متكررة وامتحان تجريبي أول.'],
      ['الأسبوع 3 · مواضيع كاملة', 'أسئلة تركيبية وربط الفصول وتنظيم الوقت.'],
      ['الأسبوع 4 · ضبط نهائي', 'امتحان تجريبي ثان وتصحيح فردي وخطة المراجعة الأخيرة.']
    ])
  },
  {
    id: 'python', audience: 'tech', category: 'code', price: 14900, weeks: 6, live: 24, practice: 36, monthly: false, resource: 'r-python', icon: 'code',
    title: L('Python · De zéro au projet', 'Python · From zero to a project', 'Python · من البداية إلى مشروع'),
    short: L('Écrire du code que vous comprenez.', 'Write code you understand.', 'اكتب كودًا تفهمه.'),
    description: L('Une vraie base de programmation : résoudre un problème, structurer le code, tester et livrer un premier projet reproductible.', 'A solid programming foundation: solve a problem, structure code, test and deliver your first reproducible project.', 'أساس حقيقي في البرمجة: حل مشكلة وتنظيم الكود واختباره وتسليم مشروع قابل لإعادة التشغيل.'),
    level: L('Fondamentaux · débutant', 'Foundations · beginner', 'أساسيات · مبتدئ'),
    prerequisite: L('Aucune expérience de code. Un ordinateur, une connexion stable et environ 10 h disponibles par semaine.', 'No coding experience required. A computer, reliable connection and about 10 hours available per week.', 'لا يشترط إتقان البرمجة. يلزم حاسوب واتصال مستقر ونحو 10 ساعات أسبوعيًا.'),
    outcome: L('Automatiser une tâche, traiter un fichier et publier un projet Python documenté et testé sur GitHub.', 'Automate a task, process a file and publish a documented, tested Python project on GitHub.', 'أتمتة مهمة ومعالجة ملف ونشر مشروع Python موثق ومختبر على GitHub.'),
    project: L('Un outil de suivi de dépenses : import CSV, contrôles des données, synthèse et tests. Livraison avec README et démonstration.', 'An expense tracker: CSV import, data validation, summaries and tests. Delivered with a README and demonstration.', 'أداة متابعة المصاريف: استيراد CSV والتحقق من البيانات وتلخيصها واختبارها، مع README وعرض للمشروع.'),
    tools: ['Python', 'VS Code', 'Jupyter', 'Git / GitHub', 'pytest'],
    references: [['Python · documentation', 'https://docs.python.org/3/tutorial/']],
    modules: L([
      ['S1 · penser comme un programmeur', 'Installation, variables, types, entrées/sorties, conditions et débogage.'],
      ['S2 · manipuler les données', 'Boucles, listes, dictionnaires, ensembles, compréhensions et exercices de logique.'],
      ['S3 · structurer', 'Fonctions, paramètres, portée, modules, exceptions et lecture de documentation.'],
      ['S4 · travailler avec des fichiers', 'CSV, JSON, pathlib, appels HTTP, environnement virtuel et dépendances.'],
      ['S5 · produire du code fiable', 'Classes simples, Git, tests unitaires, cas limites et relecture de code généré par IA.'],
      ['S6 · construire & présenter', 'Projet complet, refactorisation, documentation et soutenance avec retour pédagogique.']
    ],[
      ['W1 · think like a programmer', 'Setup, variables, types, input/output, conditions and debugging.'],
      ['W2 · handle data', 'Loops, lists, dictionaries, sets, comprehensions and logic exercises.'],
      ['W3 · structure your code', 'Functions, arguments, scope, modules, exceptions and documentation.'],
      ['W4 · work with files', 'CSV, JSON, pathlib, HTTP calls, virtual environments and dependencies.'],
      ['W5 · reliable code', 'Simple classes, Git, unit tests, edge cases and reviewing AI-generated code.'],
      ['W6 · build & present', 'Complete project, refactoring, documentation and presentation with feedback.']
    ],[
      ['أ1 · التفكير كمبرمج', 'التثبيت والمتغيرات والأنواع والإدخال والإخراج والشروط وتصحيح الأخطاء.'],
      ['أ2 · معالجة البيانات', 'الحلقات والقوائم والقواميس والمجموعات وتمارين المنطق.'],
      ['أ3 · تنظيم الكود', 'الدوال والمعاملات والنطاق والوحدات والاستثناءات وقراءة التوثيق.'],
      ['أ4 · التعامل مع الملفات', 'CSV وJSON وpathlib وطلبات HTTP والبيئات الافتراضية والمكتبات.'],
      ['أ5 · كود موثوق', 'أصناف بسيطة وGit واختبارات الوحدة والحالات الحدّية ومراجعة كود مولّد بالذكاء الاصطناعي.'],
      ['أ6 · بناء وعرض المشروع', 'مشروع كامل وتحسين الكود وتوثيقه وعرضه مع ملاحظات تعليمية.']
    ])
  },
  {
    id: 'stats-r', audience: 'tech', category: 'data', price: 24900, weeks: 8, live: 32, practice: 48, monthly: false, resource: 'r-stats', icon: 'chart',
    title: L('R & statistiques · Comprendre les données', 'R & statistics · Understand data', 'R والإحصاء · فهم البيانات'),
    short: L('Des chiffres. Une interprétation juste.', 'Numbers. Sound interpretation.', 'أرقام وتفسير سليم.'),
    description: L('Probabilités, estimation, tests et régression : les idées statistiques se construisent à la main, puis se vérifient avec R.', 'Probability, estimation, tests and regression: develop statistical ideas by hand, then check them with R.', 'احتمالات وتقدير واختبارات وانحدار: بناء الأفكار الإحصائية يدويًا ثم التحقق منها بلغة R.'),
    level: L('Niveau licence · fondations quantitatives', 'Undergraduate level · quantitative foundations', 'مستوى ليسانس · أسس كمية'),
    prerequisite: L('Algèbre de lycée et lecture de graphiques. R est enseigné depuis le début ; un diagnostic de maths est proposé.', 'Secondary-school algebra and graph reading. R is taught from the beginning; a maths diagnostic is available.', 'جبر الثانوي وقراءة الرسوم. تُدرّس R من البداية مع تقييم أولي في الرياضيات.'),
    outcome: L('Analyser un jeu de données, quantifier l’incertitude et expliquer les limites d’une conclusion statistique.', 'Analyse a dataset, quantify uncertainty and explain the limitations of a statistical conclusion.', 'تحليل بيانات وقياس عدم اليقين وشرح حدود الاستنتاج الإحصائي.'),
    project: L('Un rapport reproductible sous Quarto : nettoyage, visualisations, intervalle de confiance et régression sur données publiques.', 'A reproducible Quarto report: cleaning, visualisations, confidence intervals and regression using public data.', 'تقرير قابل لإعادة الإنتاج في Quarto: تنظيف ورسوم وفاصل ثقة وانحدار باستخدام بيانات عامة.'),
    tools: ['R', 'RStudio', 'tidyverse', 'ggplot2', 'Quarto'],
    references: [['R · manuels officiels', 'https://cran.r-project.org/manuals.html']],
    modules: L([
      ['S1 · prendre en main R', 'Vecteurs, data frames, fonctions, import, types et premiers scripts reproductibles.'],
      ['S2 · explorer & visualiser', 'Nettoyage, valeurs manquantes, jointures, statistiques descriptives et ggplot2.'],
      ['S3 · probabilités', 'Conditionnement, indépendance, variables aléatoires et lois usuelles.'],
      ['S4 · échantillonnage', 'Espérance, variance, loi des grands nombres, théorème central limite et simulation.'],
      ['S5 · estimer', 'Estimateurs, biais, intervalle de confiance, bootstrap et lecture critique.'],
      ['S6 · tester une hypothèse', 'Hypothèses, p-value, puissance, erreurs de type I/II et tests adaptés.'],
      ['S7 · régression', 'Régression linéaire, diagnostics, interactions, confusion et limites causales.'],
      ['S8 · rapport de recherche', 'Analyse complète, Quarto, reproductibilité et défense des conclusions.']
    ],[
      ['W1 · start with R', 'Vectors, data frames, functions, import, types and reproducible scripts.'],
      ['W2 · explore & visualise', 'Cleaning, missing data, joins, descriptive statistics and ggplot2.'],
      ['W3 · probability', 'Conditioning, independence, random variables and common distributions.'],
      ['W4 · sampling', 'Expectation, variance, law of large numbers, central limit theorem and simulation.'],
      ['W5 · estimation', 'Estimators, bias, confidence intervals, bootstrap and critical interpretation.'],
      ['W6 · hypothesis testing', 'Hypotheses, p-values, power, type I/II errors and appropriate tests.'],
      ['W7 · regression', 'Linear regression, diagnostics, interactions, confounding and causal limitations.'],
      ['W8 · research report', 'Complete analysis, Quarto, reproducibility and defending conclusions.']
    ],[
      ['أ1 · البدء بلغة R', 'المتجهات والجداول والدوال والاستيراد والأنواع وسكربتات قابلة لإعادة الإنتاج.'],
      ['أ2 · استكشاف وتمثيل', 'تنظيف وقيم مفقودة وربط جداول وإحصاء وصفي وggplot2.'],
      ['أ3 · الاحتمالات', 'الاحتمال الشرطي والاستقلال والمتغيرات العشوائية والقوانين المعتادة.'],
      ['أ4 · المعاينة', 'الأمل والتباين وقانون الأعداد الكبيرة ونظرية النهاية المركزية والمحاكاة.'],
      ['أ5 · التقدير', 'المقدّرات والتحيز وفواصل الثقة وbootstrap والقراءة النقدية.'],
      ['أ6 · اختبار الفرضيات', 'الفرضيات وp-value والقوة وأخطاء النوعين واختيار الاختبار المناسب.'],
      ['أ7 · الانحدار', 'انحدار خطي وتشخيص وتفاعلات وعوامل مربكة وحدود الاستنتاج السببي.'],
      ['أ8 · تقرير بحث', 'تحليل شامل وQuarto وإعادة الإنتاج والدفاع عن الاستنتاجات.']
    ])
  },
  {
    id: 'web-ai', audience: 'tech', category: 'code', price: 29900, weeks: 10, live: 40, practice: 60, monthly: false, resource: 'r-web', icon: 'web',
    title: L('Développement web & IA', 'Web development & AI', 'تطوير الويب والذكاء الاصطناعي'),
    short: L('Votre première application, de bout en bout.', 'Your first end-to-end application.', 'تطبيقك الأول من البداية إلى النشر.'),
    description: L('Construire une application utile, responsive et déployée. L’IA accélère le travail ; vous gardez la maîtrise de l’architecture, des tests et des données.', 'Build a useful, responsive and deployed application. AI speeds up the work; you stay in control of architecture, tests and data.', 'بناء تطبيق مفيد ومتجاوب ومنشور. يسرّع الذكاء الاصطناعي العمل مع احتفاظك بفهم البنية والاختبارات والبيانات.'),
    level: L('Intermédiaire · application complète', 'Intermediate · complete application', 'متوسط · تطبيق كامل'),
    prerequisite: L('Savoir écrire des fonctions et manipuler des structures de données, en Python ou dans un autre langage. JavaScript est introduit dans le parcours.', 'Know how to write functions and handle data structures in Python or another language. JavaScript is introduced in the course.', 'معرفة الدوال وبنى البيانات في Python أو لغة أخرى. يُقدّم JavaScript خلال المسار.'),
    outcome: L('Développer une interface accessible, une API et une base de données, puis intégrer une fonction IA avec des garde-fous.', 'Develop an accessible interface, an API and a database, then integrate an AI feature with safeguards.', 'تطوير واجهة ميسرة وAPI وقاعدة بيانات ثم دمج وظيفة ذكاء اصطناعي مع ضوابط.'),
    project: L('Un mini-SaaS de suivi d’apprentissage : comptes, tableau de bord, API, tests et assistant IA côté serveur. Déploiement et démo finale.', 'A learning-tracker mini-SaaS: accounts, dashboard, API, tests and a server-side AI assistant. Deployment and final demo.', 'SaaS مصغر لمتابعة التعلم: حسابات ولوحة متابعة وAPI واختبارات ومساعد ذكاء اصطناعي على الخادم، مع نشر وعرض نهائي.'),
    tools: ['HTML / CSS', 'JavaScript', 'React', 'FastAPI', 'SQL', 'Git'],
    references: [['MDN · développement web', 'https://developer.mozilla.org/en-US/docs/Learn_web_development']],
    modules: L([
      ['S1 · le Web & HTML', 'HTTP, navigateur, HTML sémantique, formulaires et outils de développement.'],
      ['S2 · CSS & responsive', 'Grilles, flexbox, typographie, états interactifs et accessibilité mobile.'],
      ['S3 · JavaScript', 'Variables, fonctions, objets, DOM, événements, promesses et fetch.'],
      ['S4 · React', 'Composants, état, formulaires, navigation et organisation du frontend.'],
      ['S5 · API Python', 'FastAPI, validation des entrées, contrats API et gestion des erreurs.'],
      ['S6 · SQL & comptes', 'Modèle relationnel, requêtes, authentification et autorisations.'],
      ['S7 · coder avec l’IA', 'Spécifications, relecture, tests et limites des assistants de code.'],
      ['S8 · intégrer un modèle', 'Appel serveur, secrets, limites de coût, citations et gestion des réponses incorrectes.'],
      ['S9 · tester & déployer', 'Tests, performance, logs, sécurité de base et mise en ligne.'],
      ['S10 · livrer', 'Mini-SaaS, documentation technique, audit et démonstration.']
    ],[
      ['W1 · Web & HTML', 'HTTP, browser, semantic HTML, forms and developer tools.'],
      ['W2 · CSS & responsive', 'Grid, flexbox, typography, interaction states and mobile accessibility.'],
      ['W3 · JavaScript', 'Variables, functions, objects, DOM, events, promises and fetch.'],
      ['W4 · React', 'Components, state, forms, navigation and frontend organisation.'],
      ['W5 · Python API', 'FastAPI, input validation, API contracts and error handling.'],
      ['W6 · SQL & accounts', 'Relational model, queries, authentication and authorisation.'],
      ['W7 · code with AI', 'Specifications, review, tests and the limitations of coding assistants.'],
      ['W8 · integrate a model', 'Server-side calls, secrets, cost limits, citations and incorrect-response handling.'],
      ['W9 · test & deploy', 'Tests, performance, logs, basic security and deployment.'],
      ['W10 · deliver', 'Mini-SaaS, technical documentation, audit and demonstration.']
    ],[
      ['أ1 · الويب وHTML', 'HTTP والمتصفح وHTML الدلالي والنماذج وأدوات التطوير.'],
      ['أ2 · CSS والتجاوب', 'الشبكات وflexbox والخطوط والحالات التفاعلية وإتاحة الاستخدام على الهاتف.'],
      ['أ3 · JavaScript', 'المتغيرات والدوال والكائنات وDOM والأحداث والوعود وfetch.'],
      ['أ4 · React', 'المكونات والحالة والنماذج والتنقل وتنظيم الواجهة.'],
      ['أ5 · API بلغة Python', 'FastAPI والتحقق من المدخلات وعقود API ومعالجة الأخطاء.'],
      ['أ6 · SQL والحسابات', 'النموذج العلاقي والاستعلامات والمصادقة والصلاحيات.'],
      ['أ7 · البرمجة بالذكاء الاصطناعي', 'المواصفات والمراجعة والاختبارات وحدود مساعدي البرمجة.'],
      ['أ8 · دمج نموذج', 'استدعاء من الخادم وأسرار وحدود تكلفة ومراجع ومعالجة الأجوبة الخاطئة.'],
      ['أ9 · الاختبار والنشر', 'اختبارات وأداء وسجلات وأمن أساسي ونشر.'],
      ['أ10 · التسليم', 'SaaS مصغر وتوثيق تقني وتدقيق وعرض.']
    ])
  },
  {
    id: 'ml', audience: 'tech', category: 'ai', price: 39000, weeks: 10, live: 40, practice: 60, monthly: false, resource: 'r-ml', icon: 'nodes',
    title: L('Machine Learning · Appliqué', 'Machine Learning · Applied', 'تعلّم آلي · تطبيقي'),
    short: L('Un modèle n’est bon que si l’évaluation l’est.', 'A model is only as good as its evaluation.', 'جودة النموذج تبدأ بجودة التقييم.'),
    description: L('Des fondements mathématiques à un pipeline complet. Apprendre à entraîner, comparer et expliquer les modèles sans fuite de données.', 'From mathematical foundations to a complete pipeline. Train, compare and explain models without data leakage.', 'من الأسس الرياضية إلى خط معالجة كامل. تدريب النماذج ومقارنتها وشرحها دون تسرب البيانات.'),
    level: L('Niveau licence avancée', 'Advanced undergraduate level', 'مستوى ليسانس متقدم'),
    prerequisite: L('Python, tableaux de données, probabilités, dérivées et bases d’algèbre linéaire. Python et R & statistiques constituent une préparation recommandée.', 'Python, data tables, probability, derivatives and basic linear algebra. Python and R & statistics are recommended preparation.', 'Python والجداول والاحتمالات والمشتقات وأساسيات الجبر الخطي. يوصى بمساري Python وR والإحصاء للتحضير.'),
    outcome: L('Concevoir un pipeline reproductible, choisir les bonnes métriques et défendre une validation honnête.', 'Design a reproducible pipeline, choose suitable metrics and defend an honest validation strategy.', 'تصميم خط معالجة قابل لإعادة الإنتاج واختيار المقاييس المناسبة وتبرير تحقق نزيه.'),
    project: L('Un benchmark prédictif sur données publiques : baseline, validation croisée, analyse d’erreurs et fiche des limites du modèle.', 'A predictive benchmark on public data: baseline, cross-validation, error analysis and a model-limitations card.', 'مقارنة تنبؤية على بيانات عامة: نموذج مرجعي وتحقق متقاطع وتحليل أخطاء وبطاقة حدود النموذج.'),
    tools: ['Python', 'NumPy', 'pandas', 'scikit-learn', 'Jupyter', 'Git'],
    references: [['scikit-learn · guide', 'https://scikit-learn.org/stable/user_guide.html'], ['CS229 · supports ouverts', 'https://see.stanford.edu/Course/CS229']],
    modules: L([
      ['S1 · bases mathématiques', 'Vecteurs, matrices, gradients, objectifs et descente de gradient.'],
      ['S2 · données & baselines', 'Splits, variables, valeurs manquantes, déséquilibre et risques de fuite.'],
      ['S3 · modèles linéaires', 'Régression, classification logistique, régularisation et interprétation.'],
      ['S4 · voisins & noyaux', 'k-NN, SVM, mise à l’échelle et choix des hyperparamètres.'],
      ['S5 · arbres & ensembles', 'Arbres, random forests, boosting et compromis biais-variance.'],
      ['S6 · validation', 'Validation croisée, choix des métriques, recherche d’hyperparamètres et pipelines.'],
      ['S7 · non supervisé', 'PCA, clustering, distances et évaluation de la structure trouvée.'],
      ['S8 · expliquer & diagnostiquer', 'Analyse d’erreurs, importance des variables, calibration et robustesse.'],
      ['S9 · préparer une livraison', 'Reproductibilité, sauvegarde, dérive des données et limites de déploiement.'],
      ['S10 · soutenance', 'Benchmark complet, ablations simples et défense des choix méthodologiques.']
    ],[
      ['W1 · mathematical foundations', 'Vectors, matrices, gradients, objectives and gradient descent.'],
      ['W2 · data & baselines', 'Splits, features, missing data, imbalance and leakage risks.'],
      ['W3 · linear models', 'Regression, logistic classification, regularisation and interpretation.'],
      ['W4 · neighbours & kernels', 'k-NN, SVM, scaling and hyperparameter choices.'],
      ['W5 · trees & ensembles', 'Trees, random forests, boosting and bias–variance trade-offs.'],
      ['W6 · validation', 'Cross-validation, metrics, hyperparameter search and pipelines.'],
      ['W7 · unsupervised learning', 'PCA, clustering, distances and assessment of discovered structure.'],
      ['W8 · explain & diagnose', 'Error analysis, feature importance, calibration and robustness.'],
      ['W9 · prepare delivery', 'Reproducibility, persistence, data drift and deployment limitations.'],
      ['W10 · defence', 'Complete benchmark, simple ablations and methodological justification.']
    ],[
      ['أ1 · أسس رياضية', 'المتجهات والمصفوفات والتدرجات ودوال الهدف والانحدار التدرجي.'],
      ['أ2 · البيانات والنماذج المرجعية', 'التقسيم والمتغيرات والقيم المفقودة وعدم التوازن ومخاطر التسرب.'],
      ['أ3 · نماذج خطية', 'الانحدار والتصنيف اللوجستي والتنظيم والتفسير.'],
      ['أ4 · الجيران والنوى', 'k-NN وSVM والتقييس واختيار المعاملات.'],
      ['أ5 · الأشجار والتجميع', 'الأشجار والغابات العشوائية وboosting وموازنة التحيز والتباين.'],
      ['أ6 · التحقق', 'التحقق المتقاطع والمقاييس والبحث عن المعاملات وخطوط المعالجة.'],
      ['أ7 · تعلم دون إشراف', 'PCA والتجميع والمسافات وتقييم البنية المكتشفة.'],
      ['أ8 · تفسير وتشخيص', 'تحليل الأخطاء وأهمية المتغيرات والمعايرة والمتانة.'],
      ['أ9 · التحضير للتسليم', 'إعادة الإنتاج والحفظ وانجراف البيانات وحدود النشر.'],
      ['أ10 · مناقشة', 'مقارنة شاملة وتجارب إزالة بسيطة وتبرير الاختيارات المنهجية.']
    ])
  },
  {
    id: 'dl', audience: 'tech', category: 'ai', price: 44900, weeks: 10, live: 40, practice: 80, monthly: false, resource: 'r-dl', icon: 'nodes',
    title: L('Deep Learning & IA générative', 'Deep Learning & Generative AI', 'التعلّم العميق والذكاء الاصطناعي التوليدي'),
    short: L('Comprendre les réseaux. Construire avec eux.', 'Understand networks. Build with them.', 'افهم الشبكات وابنِ باستخدامها.'),
    description: L('Backpropagation, vision, attention et modèles de langue. Un parcours exigeant qui relie calcul, implémentation et évaluation.', 'Backpropagation, vision, attention and language models. A demanding course connecting mathematics, implementation and evaluation.', 'الانتشار العكسي والرؤية والانتباه ونماذج اللغة. مسار يجمع الحساب والتنفيذ والتقييم.'),
    level: L('Niveau master · spécialisation', 'Graduate level · specialisation', 'مستوى ماستر · تخصص'),
    prerequisite: L('Python, Machine Learning, algèbre linéaire, gradients et probabilités. Le parcours ML ou un niveau équivalent est nécessaire.', 'Python, machine learning, linear algebra, gradients and probability. The ML course or equivalent knowledge is required.', 'Python والتعلم الآلي والجبر الخطي والتدرجات والاحتمالات. يلزم مسار ML أو مستوى مكافئ.'),
    outcome: L('Implémenter et entraîner un réseau, diagnostiquer les erreurs et évaluer une application générative au-delà d’une simple démo.', 'Implement and train a network, diagnose errors and evaluate a generative application beyond a simple demo.', 'تنفيذ شبكة وتدريبها وتشخيص الأخطاء وتقييم تطبيق توليدي يتجاوز العرض البسيط.'),
    project: L('Un projet au choix : classifieur d’images ou assistant documentaire RAG. Comparaisons, jeu de test et rapport sur les limites.', 'Choose an image classifier or a document-based RAG assistant. Comparisons, a test set and a limitations report.', 'مشروع اختياري: مصنف صور أو مساعد مستندات RAG، مع مقارنات ومجموعة اختبار وتقرير عن الحدود.'),
    tools: ['PyTorch', 'Python', 'Hugging Face', 'Jupyter', 'Google Colab'],
    references: [['PyTorch · tutoriels', 'https://docs.pytorch.org/tutorials/']],
    modules: L([
      ['S1 · tenseurs & différentiation', 'Tenseurs, autograd et rétropropagation sur un réseau simple.'],
      ['S2 · boucle d’entraînement', 'Datasets, batches, fonctions de perte, optimisateurs et reproductibilité.'],
      ['S3 · généralisation', 'Surapprentissage, régularisation, initialisation et diagnostic des gradients.'],
      ['S4 · vision', 'Convolutions, CNN, augmentation et transfert d’apprentissage.'],
      ['S5 · séquences', 'Embeddings, modèles séquentiels et représentation du texte.'],
      ['S6 · attention & Transformers', 'Attention, masques, architecture et intuition des modèles de langue.'],
      ['S7 · modèles préentraînés', 'Inférence, adaptation légère, choix du modèle et contraintes de calcul.'],
      ['S8 · RAG', 'Découpage, recherche vectorielle, contexte, citations et limites de la récupération.'],
      ['S9 · évaluation & risques', 'Jeux de test, hallucinations, injection de prompt, confidentialité et budget.'],
      ['S10 · projet final', 'Expériences reproductibles, démonstration, métriques et rapport critique.']
    ],[
      ['W1 · tensors & differentiation', 'Tensors, autograd and backpropagation on a simple network.'],
      ['W2 · training loop', 'Datasets, batches, losses, optimisers and reproducibility.'],
      ['W3 · generalisation', 'Overfitting, regularisation, initialisation and gradient diagnostics.'],
      ['W4 · vision', 'Convolutions, CNNs, augmentation and transfer learning.'],
      ['W5 · sequences', 'Embeddings, sequential models and text representation.'],
      ['W6 · attention & Transformers', 'Attention, masks, architecture and language-model intuition.'],
      ['W7 · pretrained models', 'Inference, lightweight adaptation, model selection and compute constraints.'],
      ['W8 · RAG', 'Chunking, vector search, context, citations and retrieval limitations.'],
      ['W9 · evaluation & risk', 'Test sets, hallucinations, prompt injection, privacy and budget.'],
      ['W10 · final project', 'Reproducible experiments, demonstration, metrics and critical report.']
    ],[
      ['أ1 · الموترات والاشتقاق', 'الموترات وautograd والانتشار العكسي على شبكة بسيطة.'],
      ['أ2 · حلقة التدريب', 'البيانات والدفعات والخسارة والمحسنات وإعادة الإنتاج.'],
      ['أ3 · التعميم', 'فرط التعلّم والتنظيم والتهيئة وتشخيص التدرجات.'],
      ['أ4 · الرؤية', 'الالتفاف وCNN وزيادة البيانات ونقل التعلّم.'],
      ['أ5 · التسلسلات', 'التضمينات والنماذج التسلسلية وتمثيل النص.'],
      ['أ6 · الانتباه وTransformers', 'الانتباه والأقنعة والبنية وفهم نماذج اللغة.'],
      ['أ7 · النماذج المدرّبة', 'الاستدلال والتكييف الخفيف واختيار النموذج وقيود الحوسبة.'],
      ['أ8 · RAG', 'التقسيم والبحث المتجهي والسياق والمراجع وحدود الاسترجاع.'],
      ['أ9 · التقييم والمخاطر', 'مجموعات اختبار وهلوسة وحقن التوجيه والخصوصية والميزانية.'],
      ['أ10 · مشروع نهائي', 'تجارب قابلة لإعادة الإنتاج وعرض ومقاييس وتقرير نقدي.']
    ])
  },
  {
    id: 'rl', audience: 'tech', category: 'ai', price: 34900, weeks: 8, live: 32, practice: 64, monthly: false, resource: 'r-rl', icon: 'agent',
    title: L('Reinforcement Learning · Décider & apprendre', 'Reinforcement Learning · Decide & learn', 'التعلّم المعزّز · القرار والتعلّم'),
    short: L('Apprendre par l’interaction.', 'Learn through interaction.', 'التعلّم من خلال التفاعل.'),
    description: L('Des bandits aux méthodes de deep RL : comprendre le compromis exploration-exploitation et mesurer réellement l’apprentissage d’un agent.', 'From bandits to deep RL: understand exploration–exploitation and measure what an agent actually learns.', 'من مسائل bandits إلى التعلم المعزز العميق: فهم الاستكشاف والاستغلال وقياس ما يتعلمه الوكيل فعليًا.'),
    level: L('Niveau master · spécialisation', 'Graduate level · specialisation', 'مستوى ماستر · تخصص'),
    prerequisite: L('Python, probabilités, Machine Learning et bases de PyTorch. Les modules deep RL nécessitent les bases du Deep Learning.', 'Python, probability, machine learning and basic PyTorch. Deep RL modules require deep-learning foundations.', 'Python والاحتمالات والتعلم الآلي وأساسيات PyTorch. تتطلب وحدات deep RL أسس التعلم العميق.'),
    outcome: L('Formuler un problème en MDP, entraîner un agent et comparer des politiques avec plusieurs graines et des métriques adaptées.', 'Formulate a problem as an MDP, train an agent and compare policies across multiple seeds with suitable metrics.', 'صياغة مسألة كـMDP وتدريب وكيل ومقارنة سياسات ببذور عشوائية متعددة ومقاييس مناسبة.'),
    project: L('Un agent dans un environnement Gymnasium : baseline aléatoire, apprentissage, comparaison multi-seeds et analyse des échecs.', 'An agent in a Gymnasium environment: random baseline, learning, multi-seed comparison and failure analysis.', 'وكيل في بيئة Gymnasium: مرجع عشوائي وتعلم ومقارنة متعددة البذور وتحليل الإخفاقات.'),
    tools: ['Python', 'Gymnasium', 'PyTorch', 'NumPy', 'Jupyter'],
    references: [['Sutton & Barto · ouvrage de référence', 'https://mitpress.mit.edu/9780262039246/reinforcement-learning/']],
    modules: L([
      ['S1 · bandits', 'Récompenses, exploration-exploitation, epsilon-greedy et regret.'],
      ['S2 · MDP & Bellman', 'États, actions, transitions, politiques et fonctions de valeur.'],
      ['S3 · programmation dynamique', 'Évaluation et amélioration de politique, value iteration.'],
      ['S4 · Monte Carlo & TD', 'Retours, bootstrap, différences temporelles et estimation.'],
      ['S5 · contrôle tabulaire', 'SARSA, Q-learning, exploration et environnements discrets.'],
      ['S6 · deep RL', 'Approximation de fonctions, DQN, replay buffer et réseau cible.'],
      ['S7 · gradients de politique', 'REINFORCE, actor-critic, intuition de PPO et stabilité.'],
      ['S8 · protocole expérimental', 'Graines, budget, courbes d’apprentissage, baselines et rapport final.']
    ],[
      ['W1 · bandits', 'Rewards, exploration–exploitation, epsilon-greedy and regret.'],
      ['W2 · MDP & Bellman', 'States, actions, transitions, policies and value functions.'],
      ['W3 · dynamic programming', 'Policy evaluation and improvement, value iteration.'],
      ['W4 · Monte Carlo & TD', 'Returns, bootstrapping, temporal differences and estimation.'],
      ['W5 · tabular control', 'SARSA, Q-learning, exploration and discrete environments.'],
      ['W6 · deep RL', 'Function approximation, DQN, replay buffer and target network.'],
      ['W7 · policy gradients', 'REINFORCE, actor-critic, PPO intuition and stability.'],
      ['W8 · experimental protocol', 'Seeds, budget, learning curves, baselines and final report.']
    ],[
      ['أ1 · Bandits', 'المكافآت والاستكشاف والاستغلال وepsilon-greedy والندم.'],
      ['أ2 · MDP وبيلمان', 'الحالات والأفعال والانتقالات والسياسات ودوال القيمة.'],
      ['أ3 · البرمجة الديناميكية', 'تقييم وتحسين السياسة وvalue iteration.'],
      ['أ4 · مونت كارلو وTD', 'العوائد وbootstrap والفروق الزمنية والتقدير.'],
      ['أ5 · التحكم الجدولي', 'SARSA وQ-learning والاستكشاف والبيئات المتقطعة.'],
      ['أ6 · deep RL', 'تقريب الدوال وDQN وذاكرة الإعادة والشبكة المستهدفة.'],
      ['أ7 · تدرجات السياسة', 'REINFORCE وactor-critic وفهم PPO والاستقرار.'],
      ['أ8 · بروتوكول تجريبي', 'البذور والميزانية ومنحنيات التعلم والمراجع والتقرير النهائي.']
    ])
  },
  {
    id: 'ai-work', audience: 'tech', category: 'code', price: 7900, weeks: 1, live: 6, practice: 4, monthly: false, resource: 'r-ai-work', icon: 'bolt',
    title: L('IA au travail · Atelier pratique', 'AI at work · Practical workshop', 'الذكاء الاصطناعي في العمل · ورشة تطبيقية'),
    short: L('Gagner du temps, garder le jugement.', 'Save time, keep your judgement.', 'وفّر الوقت واحتفظ بحسن التقدير.'),
    description: L('Un atelier pour les jeunes professionnels : analyser un document, structurer un besoin et créer une petite automatisation vérifiable.', 'A workshop for young professionals: analyse a document, structure a need and create a small, verifiable automation.', 'ورشة للشباب المهنيين: تحليل مستند وصياغة حاجة وبناء أتمتة صغيرة قابلة للتحقق.'),
    level: L('Atelier · tous secteurs', 'Workshop · all sectors', 'ورشة · مختلف القطاعات'),
    prerequisite: L('Être à l’aise avec un ordinateur. Aucun prérequis en programmation. Utiliser uniquement des données non confidentielles.', 'Comfortable using a computer. No programming prerequisite. Only use non-confidential data.', 'التمكن من استخدام الحاسوب. لا تشترط البرمجة، مع استخدام بيانات غير سرية فقط.'),
    outcome: L('Identifier un usage pertinent, rédiger un protocole et vérifier les réponses avant de les réutiliser.', 'Identify a useful application, write a protocol and verify outputs before reuse.', 'تحديد استخدام مفيد وكتابة بروتوكول والتحقق من الأجوبة قبل استخدامها.'),
    project: L('Une automatisation personnelle documentée, avec critères de contrôle et estimation du temps gagné.', 'A documented personal automation with checks and an estimate of time saved.', 'أتمتة شخصية موثقة مع معايير تحقق وتقدير للوقت المكتسب.'),
    tools: ['Outils IA au choix', 'Google Sheets', 'Documents'],
    modules: L([
      ['Bloc 1 · cadrer', 'Choisir une tâche, mesurer son coût et écrire un besoin précis.'],
      ['Bloc 2 · construire', 'Prompts structurés, synthèse de documents et automatisation simple.'],
      ['Bloc 3 · vérifier', 'Sources, contrôle humain, confidentialité et maintenance du workflow.']
    ],[
      ['Block 1 · define', 'Select a task, measure its cost and write a precise need.'],
      ['Block 2 · build', 'Structured prompts, document summaries and simple automation.'],
      ['Block 3 · verify', 'Sources, human checks, privacy and workflow maintenance.']
    ],[
      ['الجزء 1 · التأطير', 'اختيار مهمة وقياس تكلفتها وصياغة حاجة دقيقة.'],
      ['الجزء 2 · البناء', 'توجيهات منظمة وتلخيص مستندات وأتمتة بسيطة.'],
      ['الجزء 3 · التحقق', 'المصادر والمراجعة البشرية والخصوصية وصيانة سير العمل.']
    ])
  }
];

export const packs = [
  { id: 'pack-bac', audience: 'lycee', price: 6900, monthly: true, courses: ['math-bac', 'physics-bac'], icon: 'atom',
    title: L('BAC · Duo scientifique', 'BAC · Science duo', 'البكالوريا · الثنائي العلمي'),
    description: L('Maths et physique, dans un même rythme de travail. Deux matières, leurs ressources et un suivi coordonné.', 'Maths and physics with a shared study rhythm. Two subjects, their resources and coordinated support.', 'رياضيات وفيزياء بوتيرة عمل مشتركة، مع موارد المادتين ومتابعة منسقة.'),
    goal: L('2 séances de 90 min par semaine', 'Two 90-minute sessions per week', 'حصتان من 90 دقيقة أسبوعيًا') },
  { id: 'pack-data', audience: 'tech', price: 64900, monthly: false, courses: ['python', 'stats-r', 'ml'], icon: 'chart',
    title: L('Parcours Data · Fondations → ML', 'Data pathway · Foundations → ML', 'مسار البيانات · الأساسيات ← التعلّم الآلي'),
    description: L('Une progression complète : Python, statistiques avec R, puis Machine Learning. Les modules se suivent ; ils ne s’empilent pas.', 'A full progression: Python, statistics with R, then machine learning. Modules run sequentially rather than all at once.', 'تدرج شامل: Python ثم الإحصاء بلغة R ثم التعلم الآلي. وحدات متتابعة دون تحميل متزامن.'),
    goal: L('24 semaines · 96 h en direct', '24 weeks · 96 live hours', '24 أسبوعًا · 96 ساعة مباشرة') },
  { id: 'pack-web', audience: 'tech', price: 39900, monthly: false, courses: ['python', 'web-ai'], icon: 'web',
    title: L('Parcours Builder · Code → Web & IA', 'Builder pathway · Code → Web & AI', 'مسار البناء · البرمجة ← الويب والذكاء الاصطناعي'),
    description: L('Des premières lignes de Python à une application web déployée. Pour apprendre à construire, tester et livrer.', 'From your first Python lines to a deployed web application. Learn to build, test and deliver.', 'من أول أسطر Python إلى تطبيق ويب منشور. تعلّم البناء والاختبار والتسليم.'),
    goal: L('16 semaines · 64 h en direct', '16 weeks · 64 live hours', '16 أسبوعًا · 64 ساعة مباشرة') },
  { id: 'pack-ai', audience: 'tech', price: 99900, monthly: false, courses: ['ml', 'dl', 'rl'], icon: 'nodes',
    title: L('Parcours IA · ML → DL → RL', 'AI pathway · ML → DL → RL', 'مسار الذكاء الاصطناعي · ML ← DL ← RL'),
    description: L('Un parcours avancé, avec trois projets et une progression cohérente. Pour les personnes qui maîtrisent déjà Python et les maths requises.', 'An advanced pathway with three projects and a coherent progression. For learners who already know Python and the required maths.', 'مسار متقدم بثلاثة مشاريع وتدرج متسق، لمن يتقنون Python والرياضيات المطلوبة.'),
    goal: L('28 semaines · 112 h en direct', '28 weeks · 112 live hours', '28 أسبوعًا · 112 ساعة مباشرة') }
];

export const resources = [
  { id:'r-2as', course:'math-2as', price:990, type:'math', title:L('Cahier 2AS · Comprendre & pratiquer','Year-2 workbook · Understand & practise','دفتر الثانية ثانوي · فهم وتطبيق'), format:L('Fiches + exercices corrigés','Notes + worked exercises','ملخصات وتمارين مصححة'), description:L('Une collection prévue pour travailler les fonctions, le calcul et la rédaction à son rythme.','A planned collection for studying functions, algebra and written reasoning at your own pace.','مجموعة مرتقبة للتدرب على الدوال والحساب والتحرير حسب وتيرتك.'), preview:'math' },
  { id:'r-bac', course:'math-bac', price:1290, type:'math', title:L('BAC Maths · Méthodes & entraînement','BAC Maths · Methods & practice','رياضيات البكالوريا · منهجية وتدريب'), format:L('Fiches + sujets guidés','Notes + guided papers','ملخصات ومواضيع موجهة'), description:L('Les raisonnements essentiels, des exercices progressifs et une grille pour analyser ses erreurs.','Essential reasoning, progressive exercises and a framework for reviewing your mistakes.','استدلالات أساسية وتمارين متدرجة وشبكة لتحليل الأخطاء.'), preview:'math' },
  { id:'r-physics', course:'physics-bac', price:1290, type:'math', title:L('BAC Physique · Problèmes & modèles','BAC Physics · Problems & models','فيزياء البكالوريا · مسائل ونماذج'), format:L('Fiches + problèmes corrigés','Notes + worked problems','ملخصات ومسائل مصححة'), description:L('Unités, modèles, courbes et raisonnement : un support de travail pour relier cours et problèmes.','Units, models, graphs and reasoning: connect theory with problem-solving.','وحدات ونماذج ومنحنيات واستدلال لربط الدرس بالمسائل.'), preview:'physics' },
  { id:'r-sprint', course:'bac-sprint', price:1490, type:'math', title:L('BAC Sprint · Kit de révision','BAC Sprint · Revision kit','مراجعة البكالوريا · حزمة التحضير'), format:L('Plan + exercices de synthèse','Plan + synthesis exercises','خطة وتمارين شاملة'), description:L('Planifier quatre semaines, cibler les erreurs et s’entraîner à composer.','Plan four weeks, target mistakes and practise complete exam papers.','تنظيم أربعة أسابيع ومعالجة الأخطاء والتدرب على الامتحان.'), preview:'math' },
  { id:'r-python', course:'python', price:2490, type:'code', title:L('Python · Cahier de code','Python · Coding workbook','Python · دفتر البرمجة'), format:L('Notebooks + exercices + solutions','Notebooks + exercises + solutions','دفاتر تفاعلية وتمارين وحلول'), description:L('Un support prévu du premier script au mini-projet, avec exercices et corrections expliquées.','A planned companion from first script to mini-project, with exercises and explained solutions.','دليل مرتقب من أول سكربت إلى مشروع مصغر، مع تمارين وحلول مشروحة.'), preview:'python' },
  { id:'r-stats', course:'stats-r', price:2990, type:'data', title:L('R & stats · Laboratoire de données','R & stats · Data lab','R والإحصاء · مختبر بيانات'), format:L('Scripts R + données + méthodes','R scripts + data + methods','سكربتات R وبيانات ومنهجية'), description:L('Des analyses reproductibles pour explorer, estimer, tester et interpréter.','Reproducible analyses to explore, estimate, test and interpret.','تحليلات قابلة لإعادة الإنتاج للاستكشاف والتقدير والاختبار والتفسير.'), preview:'stats' },
  { id:'r-web', course:'web-ai', price:3490, type:'code', title:L('Web & IA · Carnet de construction','Web & AI · Builder’s notebook','الويب والذكاء الاصطناعي · دفتر البناء'), format:L('Guides + starters + checklists','Guides + starters + checklists','أدلة ونماذج بداية وقوائم تحقق'), description:L('Des spécifications aux tests : une collection prévue pour construire une application proprement.','From specifications to tests: a planned collection for building an application properly.','من المواصفات إلى الاختبارات: مجموعة مرتقبة لبناء تطبيق بمنهجية.'), preview:'web' },
  { id:'r-ml', course:'ml', price:3990, type:'ai', title:L('Machine Learning · Lab book','Machine Learning · Lab book','التعلّم الآلي · دفتر المختبر'), format:L('Notebooks + protocoles + données','Notebooks + protocols + data','دفاتر وبروتوكولات وبيانات'), description:L('Baselines, validation et diagnostics : des protocoles pour apprendre à comparer honnêtement.','Baselines, validation and diagnostics: protocols for making honest comparisons.','نماذج مرجعية وتحقق وتشخيص وبروتوكولات لمقارنة نزيهة.'), preview:'ml' },
  { id:'r-dl', course:'dl', price:4490, type:'ai', title:L('Deep Learning · De la théorie au réseau','Deep Learning · Theory to network','التعلّم العميق · من النظرية إلى الشبكة'), format:L('Notebooks PyTorch + guides','PyTorch notebooks + guides','دفاتر PyTorch وأدلة'), description:L('Tenseurs, entraînement et évaluation : un futur compagnon pour comprendre ses expériences.','Tensors, training and evaluation: a planned companion for understanding your experiments.','موترات وتدريب وتقييم: دليل مرتقب لفهم تجاربك.'), preview:'dl' },
  { id:'r-rl', course:'rl', price:3990, type:'ai', title:L('Reinforcement Learning · Agent lab','Reinforcement Learning · Agent lab','التعلّم المعزّز · مختبر الوكيل'), format:L('Notebooks + environnements + protocoles','Notebooks + environments + protocols','دفاتر وبيئات وبروتوكولات'), description:L('Des premiers bandits à l’évaluation multi-seeds d’un agent.','From your first bandits to multi-seed agent evaluation.','من أول مسائل bandits إلى تقييم وكيل ببذور متعددة.'), preview:'rl' },
  { id:'r-ai-work', course:'ai-work', price:1490, type:'code', title:L('IA au travail · Cahier de méthode','AI at work · Method workbook','الذكاء الاصطناعي في العمل · دفتر منهجية'), format:L('Canevas + contrôles + cas pratiques','Templates + checks + practical cases','قوالب ومراجعات وحالات تطبيقية'), description:L('Cadrer une tâche, organiser le workflow et contrôler la qualité du résultat.','Define a task, organise the workflow and check output quality.','تأطير مهمة وتنظيم سير العمل والتحقق من جودة النتيجة.'), preview:'ai-work' }
];

export const products = [...courses.map(c=>({...c,kind:'course'})), ...packs.map(p=>({...p,kind:'pack'})), ...resources.map(r=>({...r,kind:'resource'}))];
export const byId = Object.assign(Object.create(null), Object.fromEntries(products.map(p=>[p.id,p])));
export const copy = (value, lang='fr') => typeof value === 'object' && value !== null && !Array.isArray(value) ? (value[lang] ?? value.fr) : value;
