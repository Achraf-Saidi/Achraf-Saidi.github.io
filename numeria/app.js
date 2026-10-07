'use strict';

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const translations = {
    en: {
      launch:"Founding cohorts 2026/27 · Pre-enrolment open", reserve:"Reserve a place",
      nav_programs:"Programs",nav_bac:"BAC",nav_method:"Method",nav_founder:"Founder",nav_prices:"Pricing",nav_faq:"FAQ",nav_apply:"Apply",
      hero_eyebrow:"Online school · Algeria · Maths · Code · AI",
      hero_title_1:"Learn to",hero_title_2:"think.",hero_title_3:"Then learn to",hero_title_4:"build.",
      hero_lead:"NUMERIA prepares Algerian high-school students, university students and young professionals for demanding mathematics, programming and artificial intelligence — through live classes, projects and real human support.",
      hero_cta_1:"Explore programs",hero_cta_2:"Talk to NUMERIA",
      trust_1:"Interactive classes",trust_2:"Languages · FR / AR / EN",trust_3:"Maths → Code → AI",
      stage_time:"Tuesday · 19:00",stage_title:"Understand the derivative<br>before calculating it.",stage_question:"What does the slope actually tell us at this point?",
      float_1:"NEXT LIVE",float_1b:"AI Pulse #04",float_1c:"AI agents, without the hype.",float_2:"PROGRESS",float_2b:"Chapter · Probability",
      intro_title:"Not a video library.<br>A school that follows you.",
      intro_copy:"There are thousands of free videos online. What is often missing is a clear path, someone to answer when you get stuck, well-chosen exercises and a group that keeps you moving.",
      intro_copy_2:"NUMERIA combines the best of digital learning with what learning has always required: good teachers, practice and consistency.",
      program_title:"Three entry points.<br>One standard.",program_intro:"Start where you are today. The tracks are designed to cross: a high-school student can discover Python, a university student can strengthen mathematics, a professional can enter through data.",
      tab_bac:"BAC & High School",tab_tech:"Code & Data",tab_ai:"AI & Future",
      live_online:"Live · Online",bac_math_title:"BAC Maths · Excellence",bac_math_copy:"Functions, sequences, probability, complex numbers, geometry and BAC practice. We work on reasoning before recipes.",
      bac_math_li1:"1 × 90-min live session / week",bac_math_li2:"Exercise sheets + guided solutions",bac_math_li3:"Mini-tests and progress tracking",bac_math_li4:"Access to NUMERIA AI Pulse",
      launch_price:"Launch price",per_month:"/ month",
      bac_pack_title:"Maths + Physics Pack",bac_pack_copy:"Two core subjects, with a shared schedule and a path designed for scientific streams.",
      bac_pack_li1:"2 × 90-min live sessions / week",bac_pack_li2:"Maths + Physics",bac_pack_li3:"BAC papers and mock exams",bac_pack_li4:"Question channel between classes",
      four_weeks:"4 weeks",bac_sprint_title:"BAC Sprint · Maths",bac_sprint_copy:"For the final weeks: diagnosis, priority chapters, full papers and exam strategy.",
      bac_sprint_li1:"12 h live",bac_sprint_li2:"2 corrected mock exams",bac_sprint_li3:"Personal revision plan",bac_sprint_li4:"Limited group",one_time:"One-time payment",
      six_weeks:"6 weeks",python_title:"Python · Zero to Project",python_copy:"Learn the foundations by building. Variables, functions, logic, files, simple APIs and a first publishable project.",
      python_li1:"2 live classes / week",python_li2:"Corrected exercises",python_li3:"Final project",python_li4:"Git & good practices",full_program:"Full program",
      eight_weeks:"8 weeks",data_title:"Data & AI Foundations",data_copy:"Python, pandas, visualization, useful statistics and first machine-learning models on real data.",
      data_li1:"Python for data",data_li2:"Exploratory analysis",data_li3:"Core machine learning",data_li4:"Portfolio project",
      ten_weeks:"10 weeks",ml_title:"Machine Learning · Applied",ml_copy:"From preprocessing to evaluation: supervised models, pipelines, validation, interpretation and an end-to-end project.",
      ml_li1:"Scikit-learn & pipelines",ml_li2:"Validation & metrics",ml_li3:"Feature engineering",ml_li4:"Final project presented live",
      every_week:"Every week",pulse_copy:"A living session to understand one recent advance: models, agents, world models, robotics, tools and research — without pointless buzzwords.",
      pulse_li1:"45–60 min live",pulse_li2:"Recent developments explained clearly",pulse_li3:"Demos and discussion",pulse_li4:"Included for active students",standalone:"Standalone access",
      dl_title:"Deep Learning & GenAI",dl_copy:"Neural networks, CNNs, Transformers, embeddings and generative applications with a concrete project.",dl_li3:"Vision & text",dl_li4:"End-of-track project",
      workshop:"Workshop",genai_work_title:"Generative AI for work",genai_work_copy:"Use generative models methodically: prompting, research, automation, document analysis and quality control.",
      genai_li1:"Professional use cases",genai_li2:"Structured prompts",genai_li3:"Simple automations",genai_li4:"Risk & verification",
      bac_section_title:"The BAC is not a race for revision sheets.<br>It is a race for mastery.",
      bac_section_copy:"NUMERIA aims to become a reference for Mathematics, Experimental Sciences and Technical Mathematics streams. The format is simple: a strong teacher, a limited group, carefully chosen exercises and visible progress.",
      bac_point1:"Starting diagnosis",bac_point2:"Live class + replay",bac_point3:"Progressive practice",bac_point4:"Mock exams",bac_cta:"Pre-enrol a student",
      board_program:"BAC Program · Maths",board_goal:"TARGET",board_note:"A target, not a promise.",board_1:"Functions & continuity",board_2:"Sequences",board_3:"Probability",board_4:"Complex numbers",board_5:"3D geometry",
      method_title:"Live first.<br>Practice next.<br>Autonomy at the end.",method_intro:"We do not use technology to impress. We use it where it genuinely helps the learner: organization, feedback, repetition and access to resources.",
      method_1_title:"Live classroom",method_1_copy:"Sessions on Google Meet built around explanations, questions, exercises and live correction.",
      method_2_title:"Replay & resources",method_2_copy:"Course materials, exercise sheets, solutions and replays when recording is appropriate.",
      method_3_title:"Real feedback",method_3_copy:"Mini-tests, commented corrections and recurring attention to blocking points.",
      method_4_title:"Future literacy",method_4_copy:"Students also learn to understand AI, use it methodically and stay curious about emerging technology.",
      faculty_title:"A strong CV is not enough.<br>You also need to teach well.",faculty_intro:"NUMERIA is building its team around a common selection standard. Instructors are not chosen only for their degree: they must master the subject and explain it clearly.",
      faculty_1:"Strong academic record",faculty_2:"Technical or subject test",faculty_3:"Evaluated trial lesson",faculty_4:"Quality review after launch",faculty_note:"The team may include teachers and practitioners based in Algeria and abroad, depending on the programs opened.",
      founder_label:"FOUNDER & CEO",founder_title:"Designed for Algeria.<br>Built with an international outlook.",
      founder_p1:"NUMERIA is founded by Achraf Saidi, a PhD researcher and Teaching & Research Assistant at UCLouvain, within ISBA / LIDAM, in Belgium.",
      founder_p2:"His background combines statistics, data science, machine learning, deep learning, optimization and software development, with applied experience in energy, industry, biomedical data and AI systems.",
      founder_p3:"NUMERIA's ambition is simple: give learners in Algeria more direct access to a modern, demanding scientific culture connected to current research and technology.",
      affiliation_note:"NUMERIA is an independent project. Mention of UCLouvain only describes the founder's personal academic affiliation and does not imply institutional partnership or endorsement.",
      pulse_section_title:"A school should not teach only yesterday's world.",pulse_section_copy:"Every week, NUMERIA AI Pulse takes one recent advance and makes it understandable: a new model, research idea, tool, agent, robot or application. The goal is not to chase hype. It is to learn how to read the future.",
      pricing_title:"Algerian pricing.<br>International standards.",pricing_intro:"Launch pricing is designed to remain accessible while funding real live classes, smaller groups and serious follow-up.",
      price_bac_title:"Regular support",price_bac_1:"4 × 90-min live",price_bac_2:"Exercises + solutions",price_bac_3:"Progress tracking",
      best_value:"BEST VALUE",price_pack_title:"Scientific pack",price_pack_1:"8 × 90-min live",price_pack_2:"Two subjects",price_pack_3:"Mock exams",
      price_python_1:"6 weeks",price_python_2:"2 live classes / week",price_python_3:"Final project",price_data_1:"8 weeks",price_data_3:"Portfolio project",
      pricing_disclaimer:"Indicative launch prices for the first cohorts. No payment is processed on this website today. Price, schedule and terms are confirmed before final enrolment.",
      faq_title:"Before joining NUMERIA.",faq_q1:"Are the classes really live?",faq_a1:"Yes. NUMERIA is built around live classes. At launch, Google Meet is the preferred format to keep access simple. Resources remain available between sessions.",
      faq_q2:"Do BAC classes follow the Algerian curriculum?",faq_a2:"BAC tracks are designed around the Algerian national program and exam expectations. Final teaching materials are validated before each cohort.",
      faq_q3:"Does NUMERIA issue a state-recognized diploma?",faq_a3:"No. Tech tracks may include an internal NUMERIA completion certificate, but it is not presented as a state diploma or officially recognized qualification. Any future accreditation will only be stated after it is officially obtained.",
      faq_q4:"How are instructors selected?",faq_a4:"The NUMERIA standard includes a strong academic record, subject-level verification, a trial lesson and quality follow-up. Profiles may come from Algeria or abroad depending on the track.",
      faq_q5:"How do I pay?",faq_a5:"During pre-launch, no card is charged on this website. The goal is to activate Algeria-friendly payment methods, including CIB and Edahabia, before full commercial launch.",
      faq_q6:"Can I enrol if I am under 18?",faq_a6:"Yes for school tracks, with parent or legal guardian information and consent at final enrolment.",
      admission_title:"Start by telling us where you want to go.",admission_copy:"Pre-enrolment is free and non-binding. It helps us form the first cohorts, adjust schedules and direct you to the right track.",
      admission_note1:"✓ Personal response",admission_note2:"✓ No payment today",admission_note3:"✓ Group and schedule confirmed before enrolment",
      form_title:"Pre-enrolment",form_name:"Full name",form_email:"Email",form_profile:"Your profile",form_program:"Program",form_goal:"Your goal",form_parent:"Parent / guardian email",form_submit:"Prepare my request",
      form_note:"The form prepares an email to achraf@novalisai.com. You then choose to send it from your own email client. This page stores no data.",
      profile_bac:"BAC / High-school student",profile_student:"University student",profile_pro:"Young professional",profile_parent:"Parent",profile_other:"Other",
      preview_title:"Your message is ready.",preview_send:"Open my email",preview_edit:"Edit",
      footer_tagline:"Algeria's school for reasoning, code and AI.",footer_programs:"Programs",footer_contact:"Contact",footer_status:"Status",
      footer_status_copy:"Independent education project in pre-launch. Accreditation or recognized-diploma claims will only be displayed after official approval.",
      footer_independent:"Algeria · Online-first · Independent education project"
    },

    ar: {
      launch:"دفعات التأسيس 2026/27 · التسجيل المسبق مفتوح",reserve:"احجز مكانك",
      nav_programs:"البرامج",nav_bac:"البكالوريا",nav_method:"المنهج",nav_founder:"المؤسس",nav_prices:"الأسعار",nav_faq:"الأسئلة",nav_apply:"سجّل اهتمامك",
      hero_eyebrow:"مدرسة رقمية · الجزائر · رياضيات · برمجة · ذكاء اصطناعي",
      hero_title_1:"تعلّم كيف",hero_title_2:"تفكّر.",hero_title_3:"ثم تعلّم كيف",hero_title_4:"تبني.",
      hero_lead:"تُحضّر NUMERIA تلاميذ الثانوي والطلبة والشباب المهنيين في الجزائر للرياضيات القوية، والبرمجة، والذكاء الاصطناعي — عبر حصص مباشرة، مشاريع، ومتابعة بشرية حقيقية.",
      hero_cta_1:"اكتشف البرامج",hero_cta_2:"تواصل مع NUMERIA",
      trust_1:"حصص تفاعلية",trust_2:"ثلاث لغات · FR / AR / EN",trust_3:"رياضيات ← برمجة ← ذكاء اصطناعي",
      stage_time:"الثلاثاء · 19:00",stage_title:"افهم المشتقة<br>قبل أن تحسبها.",stage_question:"ماذا يخبرنا الميل فعلاً في هذه النقطة؟",
      float_1:"الحصة القادمة",float_1b:"AI Pulse #04",float_1c:"وكلاء الذكاء الاصطناعي بلا مبالغة.",float_2:"التقدم",float_2b:"الفصل · الاحتمالات",
      intro_title:"ليست مكتبة فيديوهات.<br>بل مدرسة تتابعك.",
      intro_copy:"هناك آلاف الفيديوهات المجانية على الإنترنت. ما ينقص غالباً هو مسار واضح، شخص يجيب عندما تتعثر، تمارين مختارة بعناية ومجموعة تدفعك للاستمرار.",
      intro_copy_2:"تجمع NUMERIA بين مزايا التعلم الرقمي وما كان التعلم يحتاجه دائماً: أساتذة جيدون، تدريب، واستمرارية.",
      program_title:"ثلاث نقاط بداية.<br>نفس مستوى الجدية.",program_intro:"ابدأ من مكانك اليوم. صُممت المسارات لتتكامل: تلميذ ثانوي يمكنه اكتشاف Python، طالب جامعي يمكنه تقوية الرياضيات، والمهني يمكنه الدخول عبر البيانات.",
      tab_bac:"البكالوريا والثانوي",tab_tech:"البرمجة والبيانات",tab_ai:"الذكاء الاصطناعي والمستقبل",
      live_online:"مباشر · عن بعد",bac_math_title:"رياضيات البكالوريا · Excellence",bac_math_copy:"الدوال، المتتاليات، الاحتمالات، الأعداد المركبة، الهندسة والتدريب على البكالوريا. نركز على الفهم قبل الوصفات.",
      bac_math_li1:"حصة مباشرة 90 دقيقة / أسبوع",bac_math_li2:"سلاسل تمارين + تصحيح موجه",bac_math_li3:"اختبارات قصيرة ومتابعة التقدم",bac_math_li4:"دخول إلى NUMERIA AI Pulse",
      launch_price:"سعر الإطلاق",per_month:"/ شهر",
      bac_pack_title:"باقة الرياضيات + الفيزياء",bac_pack_copy:"مادتان أساسيتان مع برنامج موحد ومسار مخصص للشعب العلمية.",
      bac_pack_li1:"حصتان مباشرتان 90 دقيقة / أسبوع",bac_pack_li2:"رياضيات + فيزياء",bac_pack_li3:"مواضيع بكالوريا وامتحانات تجريبية",bac_pack_li4:"قناة للأسئلة بين الحصص",
      four_weeks:"4 أسابيع",bac_sprint_title:"Sprint BAC · رياضيات",bac_sprint_copy:"للأسابيع الأخيرة: تشخيص، فصول أولوية، مواضيع كاملة واستراتيجية الامتحان.",
      bac_sprint_li1:"12 ساعة مباشر",bac_sprint_li2:"امتحانان تجريبيان مصححان",bac_sprint_li3:"خطة مراجعة شخصية",bac_sprint_li4:"مجموعة محدودة",one_time:"دفع مرة واحدة",
      six_weeks:"6 أسابيع",python_title:"Python · من الصفر إلى مشروع",python_copy:"تعلم الأساسيات عبر البناء: متغيرات، دوال، منطق، ملفات، APIs بسيطة وأول مشروع قابل للنشر.",
      python_li1:"حصتان مباشرتان / أسبوع",python_li2:"تمارين مصححة",python_li3:"مشروع نهائي",python_li4:"Git وممارسات جيدة",full_program:"البرنامج الكامل",
      eight_weeks:"8 أسابيع",data_title:"أساسيات Data & AI",data_copy:"Python وpandas والتصور والإحصاء المفيد وأول نماذج تعلم آلي على بيانات حقيقية.",
      data_li1:"Python للبيانات",data_li2:"تحليل استكشافي",data_li3:"أساسيات تعلم الآلة",data_li4:"مشروع Portfolio",
      ten_weeks:"10 أسابيع",ml_title:"Machine Learning · تطبيقي",ml_copy:"من تجهيز البيانات إلى التقييم: نماذج supervised، pipelines، validation، تفسير ومشروع كامل.",
      ml_li1:"Scikit-learn وpipelines",ml_li2:"Validation وmetrics",ml_li3:"Feature engineering",ml_li4:"عرض المشروع النهائي مباشرة",
      every_week:"كل أسبوع",pulse_copy:"موعد حي لفهم تطور حديث: نماذج، agents، world models، روبوتات، أدوات وأبحاث — بدون كلمات رنانة فارغة.",
      pulse_li1:"45–60 دقيقة مباشر",pulse_li2:"أحدث التطورات بشرح واضح",pulse_li3:"عروض ونقاش",pulse_li4:"مشمول للطلاب النشطين",standalone:"دخول منفصل",
      dl_title:"Deep Learning & GenAI",dl_copy:"الشبكات العصبية، CNN، Transformers، embeddings وتطبيقات توليدية مع مشروع حقيقي.",dl_li3:"رؤية ونصوص",dl_li4:"مشروع نهاية المسار",
      workshop:"ورشة",genai_work_title:"الذكاء الاصطناعي التوليدي للعمل",genai_work_copy:"استخدم النماذج التوليدية بمنهجية: prompting، البحث، الأتمتة، تحليل الوثائق ومراقبة الجودة.",
      genai_li1:"حالات استخدام مهنية",genai_li2:"Prompts منظمة",genai_li3:"أتمتة بسيطة",genai_li4:"المخاطر والتحقق",
      bac_section_title:"البكالوريا ليست سباقاً لجمع الملخصات.<br>إنها سباق نحو الإتقان.",
      bac_section_copy:"تطمح NUMERIA لأن تصبح مرجعاً لشعب الرياضيات والعلوم التجريبية والتقني رياضي. الصيغة بسيطة: أستاذ قوي، مجموعة محدودة، تمارين مختارة جيداً وتقدم واضح.",
      bac_point1:"تشخيص البداية",bac_point2:"حصص مباشرة + إعادة",bac_point3:"تدريب تدريجي",bac_point4:"امتحانات تجريبية",bac_cta:"سجّل تلميذاً مبدئياً",
      board_program:"برنامج البكالوريا · رياضيات",board_goal:"الهدف",board_note:"هدف، وليس وعداً.",board_1:"الدوال والاستمرارية",board_2:"المتتاليات",board_3:"الاحتمالات",board_4:"الأعداد المركبة",board_5:"الهندسة في الفضاء",
      method_title:"مباشر أولاً.<br>تطبيق ثانياً.<br>استقلالية في النهاية.",method_intro:"لا نستخدم التكنولوجيا للاستعراض. نستخدمها عندما تساعد المتعلم فعلاً: التنظيم، التغذية الراجعة، التكرار والوصول إلى الموارد.",
      method_1_title:"قسم مباشر",method_1_copy:"حصص عبر Google Meet مبنية على الشرح والأسئلة والتمارين والتصحيح المباشر.",
      method_2_title:"إعادة وموارد",method_2_copy:"دروس وملفات تمارين وتصحيحات وإعادات للحصص عندما يكون التسجيل مناسباً.",
      method_3_title:"Feedback حقيقي",method_3_copy:"اختبارات قصيرة وتصحيحات مشروحة ومتابعة نقاط الضعف أسبوعاً بعد أسبوع.",
      method_4_title:"ثقافة المستقبل",method_4_copy:"يتعلم الطلاب أيضاً فهم الذكاء الاصطناعي واستخدامه بمنهجية والبقاء فضوليين تجاه التقنيات الجديدة.",
      faculty_title:"السيرة الذاتية القوية لا تكفي.<br>يجب أن تعرف كيف تشرح.",faculty_intro:"تبني NUMERIA فريقها وفق معيار موحد للاختيار. الأستاذ لا يُختار بالشهادة فقط: يجب أن يتقن مادته وأن يعرف كيف يشرحها بوضوح.",
      faculty_1:"مسار أكاديمي قوي",faculty_2:"اختبار تقني أو تخصصي",faculty_3:"حصة تجريبية مُقيّمة",faculty_4:"متابعة الجودة بعد الإطلاق",faculty_note:"قد يضم الفريق أساتذة وممارسين في الجزائر وخارجها حسب البرامج المفتوحة.",
      founder_label:"المؤسس والرئيس التنفيذي",founder_title:"مصممة للجزائر.<br>بعقلية منفتحة على العالم.",
      founder_p1:"أسس NUMERIA أشرف سعيدي، باحث دكتوراه ومساعد تدريس وبحث في UCLouvain ضمن ISBA / LIDAM في بلجيكا.",
      founder_p2:"يجمع مساره بين الإحصاء وعلوم البيانات وتعلم الآلة والتعلم العميق والتحسين وتطوير البرمجيات، مع خبرات تطبيقية في الطاقة والصناعة والبيانات الطبية وأنظمة الذكاء الاصطناعي.",
      founder_p3:"طموح NUMERIA بسيط: إعطاء المتعلمين في الجزائر وصولاً أقرب إلى ثقافة علمية حديثة وجدية ومتصلة بما يحدث اليوم في البحث والتكنولوجيا.",
      affiliation_note:"NUMERIA مشروع مستقل. ذكر UCLouvain يصف فقط الانتماء الأكاديمي الشخصي للمؤسس ولا يعني شراكة أو رعاية مؤسساتية.",
      pulse_section_title:"المدرسة لا يجب أن تُدرّس عالم الأمس فقط.",pulse_section_copy:"كل أسبوع تختار NUMERIA AI Pulse تطوراً حديثاً وتجعله مفهوماً: نموذج جديد، فكرة بحث، أداة، agent، روبوت أو تطبيق. الهدف ليس ملاحقة الضجة، بل تعلم قراءة المستقبل.",
      pricing_title:"أسعار جزائرية.<br>معيار دولي.",pricing_intro:"أسعار الإطلاق مصممة لتبقى في المتناول مع تمويل حصص مباشرة حقيقية، مجموعات أصغر ومتابعة جدية.",
      price_bac_title:"متابعة منتظمة",price_bac_1:"4 × 90 دقيقة مباشر",price_bac_2:"تمارين + تصحيح",price_bac_3:"متابعة التقدم",
      best_value:"أفضل قيمة",price_pack_title:"الباقة العلمية",price_pack_1:"8 × 90 دقيقة مباشر",price_pack_2:"مادتان",price_pack_3:"امتحانات تجريبية",
      price_python_1:"6 أسابيع",price_python_2:"حصتان مباشرتان / أسبوع",price_python_3:"مشروع نهائي",price_data_1:"8 أسابيع",price_data_3:"مشروع Portfolio",
      pricing_disclaimer:"أسعار إطلاق إرشادية للدفعات الأولى. لا تتم أي عملية دفع على هذا الموقع حالياً. يتم تأكيد السعر والرزنامة والشروط قبل التسجيل النهائي.",
      faq_title:"قبل الانضمام إلى NUMERIA.",faq_q1:"هل الحصص مباشرة فعلاً؟",faq_a1:"نعم. نموذج NUMERIA مبني حول الحصص المباشرة. في البداية، Google Meet هو الخيار المفضل لتسهيل الدخول، وتبقى الموارد متاحة بين الحصص.",
      faq_q2:"هل دروس البكالوريا تتبع البرنامج الجزائري؟",faq_a2:"مسارات البكالوريا مصممة حول البرنامج الوطني الجزائري ومتطلبات الامتحان. يتم التحقق من المواد النهائية قبل كل دفعة.",
      faq_q3:"هل تمنح NUMERIA دبلوماً معترفاً به من الدولة؟",faq_a3:"لا. قد تمنح المسارات التقنية شهادة إتمام داخلية من NUMERIA، لكنها لا تُعرض كدبلوم دولة أو شهادة رسمية معترف بها. أي اعتماد مستقبلي سيُعلن فقط بعد الحصول عليه رسمياً.",
      faq_q4:"كيف يتم اختيار الأساتذة؟",faq_a4:"معيار NUMERIA يشمل مساراً أكاديمياً قوياً، التحقق من المستوى، حصة تجريبية ومتابعة الجودة. قد تكون الملفات من الجزائر أو من الخارج حسب المسار.",
      faq_q5:"كيف أدفع؟",faq_a5:"في مرحلة ما قبل الإطلاق لا يتم خصم أي مبلغ من البطاقة عبر هذا الموقع. الهدف هو تفعيل وسائل دفع مناسبة للجزائر، منها CIB وEdahabia، قبل الافتتاح التجاري الكامل.",
      faq_q6:"هل يمكنني التسجيل إذا كنت قاصراً؟",faq_a6:"نعم للمسارات المدرسية، مع معلومات وموافقة الولي أو المسؤول القانوني عند التسجيل النهائي.",
      admission_title:"ابدأ بإخبارنا إلى أين تريد الوصول.",admission_copy:"التسجيل المسبق مجاني وغير ملزم. يساعدنا على تكوين الدفعات الأولى وضبط الأوقات وتوجيهك إلى المسار المناسب.",
      admission_note1:"✓ رد شخصي",admission_note2:"✓ لا دفع اليوم",admission_note3:"✓ تأكيد المجموعة والوقت قبل التسجيل",
      form_title:"تسجيل مسبق",form_name:"الاسم واللقب",form_email:"البريد الإلكتروني",form_profile:"صفتك",form_program:"البرنامج",form_goal:"هدفك",form_parent:"بريد الولي / المسؤول",form_submit:"حضّر طلبي",
      form_note:"يحضّر النموذج بريداً إلى achraf@novalisai.com. ثم تختار إرساله من بريدك. لا تخزن هذه الصفحة بياناتك.",
      profile_bac:"تلميذ BAC / ثانوي",profile_student:"طالب جامعي",profile_pro:"مهني شاب",profile_parent:"ولي",profile_other:"آخر",
      preview_title:"رسالتك جاهزة.",preview_send:"افتح البريد",preview_edit:"تعديل",
      footer_tagline:"المدرسة الجزائرية للتفكير والبرمجة والذكاء الاصطناعي.",footer_programs:"البرامج",footer_contact:"تواصل",footer_status:"الحالة",
      footer_status_copy:"مشروع تعليمي مستقل في مرحلة ما قبل الإطلاق. لن تُعرض ادعاءات الاعتماد أو الدبلومات المعترف بها إلا بعد الموافقة الرسمية.",
      footer_independent:"الجزائر · Online-first · مشروع تعليمي مستقل"
    }
  };

  function setHtml(el, value) {
    if (/<br\s*\/?>/i.test(value)) el.innerHTML = value;
    else el.textContent = value;
  }

  function applyLanguage(lang) {
    const dictionary = lang === 'fr' ? null : translations[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dataset.lang = lang;

    if (!document.body.dataset.frCaptured) {
      $$('[data-i18n]').forEach(el => el.dataset.fr = el.innerHTML);
      $$('[data-i18n-option]').forEach(el => el.dataset.fr = el.textContent);
      document.body.dataset.frCaptured = '1';
    }

    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = lang === 'fr' ? el.dataset.fr : dictionary?.[key];
      if (value !== undefined) setHtml(el, value);
    });

    $$('[data-i18n-option]').forEach(el => {
      const key = el.dataset.i18nOption;
      const value = lang === 'fr' ? el.dataset.fr : dictionary?.[key];
      if (value !== undefined) el.textContent = value;
    });

    $$('.lang-switch button').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    try { localStorage.setItem('numeria-lang', lang); } catch {}
  }

  $$('.lang-switch button').forEach(btn => btn.addEventListener('click', () => applyLanguage(btn.dataset.lang)));
  let initialLang = 'fr';
  try { initialLang = localStorage.getItem('numeria-lang') || 'fr'; } catch {}
  if (!['fr','ar','en'].includes(initialLang)) initialLang = 'fr';
  applyLanguage(initialLang);

  const menuButton = $('.menu-button');
  const nav = $('#navlinks');
  menuButton?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  $$('#navlinks a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded','false');
  }));

  const tabs = $$('[data-program-tab]');
  const panels = $$('[data-program-panel]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(x => x.classList.toggle('active', x === tab));
    panels.forEach(p => p.classList.toggle('active', p.dataset.programPanel === tab.dataset.programTab));
  }));

  const programSelect = $('#program-select');
  $$('[data-interest]').forEach(link => link.addEventListener('click', () => {
    if (!programSelect) return;
    const match = [...programSelect.options].find(o => o.textContent.trim() === link.dataset.interest);
    if (match) programSelect.value = match.value || match.textContent;
  }));

  const profileSelect = $('select[name="profile"]');
  const parentField = $('.parent-field');
  const parentInput = $('.parent-field input');
  profileSelect?.addEventListener('change', () => {
    const key = profileSelect.options[profileSelect.selectedIndex]?.dataset?.i18nOption;
    const show = key === 'profile_bac';
    parentField.hidden = !show;
    parentInput.disabled = !show;
  });

  const form = $('#admission-form');
  const preview = $('#email-preview');
  const emailBody = $('#email-body');
  const sendEmail = $('#send-email');
  const editEmail = $('#edit-email');
  const contactEmail = 'achraf@novalisai.com';

  form?.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const lang = document.documentElement.lang;
    const labels = lang === 'ar'
      ? {hello:'سلام NUMERIA،',interest:'أرغب في التسجيل المسبق.',name:'الاسم',email:'البريد',profile:'الصفة',program:'البرنامج',goal:'الهدف',parent:'بريد الولي',thanks:'شكراً.'}
      : lang === 'en'
        ? {hello:'Hello NUMERIA,',interest:'I would like to pre-enrol.',name:'Name',email:'Email',profile:'Profile',program:'Program',goal:'Goal',parent:'Parent email',thanks:'Thank you.'}
        : {hello:'Bonjour NUMERIA,',interest:'Je souhaite me préinscrire.',name:'Nom',email:'E-mail',profile:'Profil',program:'Programme',goal:'Objectif',parent:'E-mail du parent',thanks:'Merci.'};

    const parent = String(data.get('parent_email') || '').trim();
    const body = [
      labels.hello,'',labels.interest,'',
      `${labels.name} : ${String(data.get('name')).trim()}`,
      `${labels.email} : ${String(data.get('email')).trim()}`,
      `${labels.profile} : ${String(data.get('profile')).trim()}`,
      `${labels.program} : ${String(data.get('program')).trim()}`,
      parent ? `${labels.parent} : ${parent}` : '',
      '',`${labels.goal} :`,String(data.get('goal')).trim(),'',
      labels.thanks
    ].filter((line, index, arr) => line !== '' || arr[index-1] !== '').join('\n');

    emailBody.textContent = body;
    const subject = `NUMERIA — Préinscription — ${String(data.get('program')).trim()}`;
    sendEmail.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.hidden = true;
    preview.hidden = false;
    preview.scrollIntoView({behavior:'smooth',block:'center'});
  });

  editEmail?.addEventListener('click', () => {
    preview.hidden = true;
    form.hidden = false;
    form.scrollIntoView({behavior:'smooth',block:'center'});
  });

  $('#year').textContent = new Date().getFullYear();
})();