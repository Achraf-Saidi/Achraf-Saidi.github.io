"""Apply the agreed Novalis AI 2.0 editorial additions to all four editions."""
import json
from pathlib import Path
ROOT=Path(__file__).parent
c=json.loads((ROOT/'content.json').read_text())
updates={
'fr':{
 'title':'Novalis AI — Du site web au logiciel d’entreprise',
 'description':'Novalis AI conçoit des sites, applications, ERP, SaaS et solutions data sur mesure. Un interlocuteur en Belgique, une équipe adaptée et une première heure offerte.',
 'hero_title':['Votre ambition.', 'Notre ingénierie.'],
 'hero_copy':'Du premier site web au logiciel qui fait tourner votre entreprise. Nous concevons, développons et faisons évoluer les outils numériques qui répondent à votre réalité.',
 'hero_note':'Une première heure offerte. Un besoin compris. Un point de départ clair.',
 'talk':'Parler de mon projet — 1 h offerte', 'book':'Première heure offerte', 'book_short':'Demander mon heure offerte',
 'intro_title':'Un problème concret. Une solution bien conçue.',
 'intro_copy':'Un commerçant, une équipe, une startup ou une organisation complexe : chaque projet mérite le bon niveau d’ingénierie. Nous partons de votre besoin, choisissons les technologies utiles et construisons une solution que vous pourrez réellement utiliser.',
 'team_copy':'Achraf Saidi, cofondateur et directeur technique (CTO), associe ingénierie logicielle, mathématiques et recherche en IA et statistique à l’UCLouvain. Son rôle : comprendre vos contraintes, cadrer les choix et garder une direction technique lisible tout au long du projet.',
 'team_second':'Autour de la direction technique, un réseau de développeurs, designers et spécialistes des données, notamment avec JetThings / JetNext. Les compétences sont mobilisées selon le périmètre et leur disponibilité : un réseau de collaboration, sans effectif salarié annoncé artificiellement.',
 'team_map':'Belgique.\nCompétences.\nCollectif.', 'footer_role':'Cofondateur · Directeur technique (CTO)',
 'contact_copy':'Une idée à lancer, un site à créer ou un fonctionnement à améliorer ? Le premier échange d’une heure est offert, sans engagement. Écrivez-nous pour organiser le rendez-vous et définir le bon point de départ.',
 'contact_booking_note':'Après l’échange, nous préparons une première note de cadrage : objectifs, priorités, hypothèses et prochaines étapes. Une étude approfondie fait l’objet d’une proposition distincte.',
 'ai_title':'L’intelligence avant\nl’intelligence artificielle.',
 'ai_copy':'La bonne technologie se choisit après avoir compris le problème. Règles métier, automatisation, statistiques, optimisation, machine learning ou IA générative : nous retenons ce qui apporte une valeur utile et mesurable, avec un contrôle humain adapté.',
 'privacy_text':['Le formulaire prépare actuellement un brouillon d’e-mail dans votre navigateur. Votre demande est transmise seulement lorsque vous l’envoyez depuis votre messagerie. Lorsqu’un formulaire serveur est activé, la confirmation indique explicitement que la demande a été enregistrée.','Les informations que vous nous envoyez servent à étudier votre demande et à y répondre, sur la base des démarches précontractuelles sollicitées. Pour exercer vos droits d’accès, de rectification ou de suppression : contact@novalisai.com. Les durées de conservation de l’ERP seront définies avant son ouverture aux clients.','Cette vitrine n’utilise ni traceur publicitaire ni mesure d’audience. Ses images et polices sont locales. Les fournisseurs d’hébergement et de messagerie peuvent traiter les données techniques nécessaires à leurs services.'],
},
'en':{
 'title':'Novalis AI — From your website to your business software',
 'description':'Custom websites, applications, ERP, SaaS and data solutions. A contact in Belgium, a team matched to your needs and a complimentary first hour.',
 'hero_title':['Your ambition.', 'Our engineering.'],
 'hero_copy':'From your first website to the software that runs your business. We design, build and evolve digital tools around the way you actually work.',
 'hero_note':'Your first hour is on us. A clear need. A sensible starting point.',
 'talk':'Discuss my project — first hour free','book':'First hour free','book_short':'Request my complimentary hour',
 'intro_title':'A concrete problem. A considered solution.',
 'intro_copy':'A shop owner, a team, a startup or a complex organisation: every project deserves the right level of engineering. We start with your needs, choose useful technology and build something you can put to work.',
 'team_copy':'Achraf Saidi, cofounder and Chief Technology Officer (CTO), brings together software engineering, mathematics and AI and statistics research at UCLouvain. His role is to understand your constraints, explain the decisions and maintain a clear technical direction throughout the project.',
 'team_second':'A network of developers, designers and data specialists supports technical delivery, including collaboration with JetThings / JetNext. Specialists are engaged according to scope and availability; this network is not presented as a permanent employee headcount.',
 'team_map':'Belgium.\nExpertise.\nCollective.','footer_role':'Cofounder · Chief Technology Officer (CTO)',
 'contact_copy':'An idea to launch, a website to build or a process to improve? The first hour is complimentary, with no obligation. Write to us to arrange the meeting and find a useful starting point.',
 'contact_booking_note':'After our conversation, we prepare an initial scoping note: objectives, priorities, assumptions and next steps. In-depth analysis is covered by a separate proposal.',
 'ai_title':'Intelligence before\nartificial intelligence.',
 'ai_copy':'Technology follows understanding. Business rules, automation, statistics, optimisation, machine learning or generative AI: we choose what creates useful, measurable value, with appropriate human oversight.',
 'privacy_text':['The form currently prepares an email draft in your browser. Your request is transmitted only when you send it through your email application. When server submission is enabled, its confirmation explicitly states that the request was recorded.','Information you send is used to assess your request and respond as part of the precontractual steps you requested. For access, correction or deletion: contact@novalisai.com. ERP retention periods will be set before client access opens.','This website uses no advertising trackers or audience analytics. Images and fonts are local. Hosting and email providers may process technical information necessary to deliver their services.'],
},
'nl':{
 'title':'Novalis AI — Van uw website tot uw bedrijfssoftware',
 'description':'Websites, applicaties, ERP, SaaS en dataoplossingen op maat. Een aanspreekpunt in België, een passend team en een gratis eerste uur.',
 'hero_title':['Uw ambitie.', 'Onze expertise.'],
 'hero_copy':'Van uw eerste website tot de software die uw bedrijf ondersteunt. We ontwerpen, bouwen en verbeteren digitale tools die aansluiten op uw dagelijkse praktijk.',
 'hero_note':'Het eerste uur is gratis. Een heldere behoefte. Een concreet vertrekpunt.',
 'talk':'Bespreek mijn project — 1 uur gratis','book':'Eerste uur gratis','book_short':'Vraag mijn gratis uur aan',
 'intro_title':'Een concreet probleem. Een doordachte oplossing.',
 'intro_copy':'Een winkelier, een team, een startup of een complexe organisatie: elk project verdient de juiste expertise. We vertrekken vanuit uw behoeften, kiezen zinvolle technologie en bouwen software die u kunt gebruiken.',
 'team_copy':'Achraf Saidi, medeoprichter en technisch directeur (CTO), combineert softwareontwikkeling, wiskunde en onderzoek naar AI en statistiek aan UCLouvain. Hij begrijpt uw beperkingen, licht de keuzes toe en bewaakt de technische richting van uw project.',
 'team_second':'Een netwerk van ontwikkelaars, designers en dataspecialisten ondersteunt de uitvoering, onder meer met JetThings / JetNext. Specialisten worden ingezet op basis van het project en hun beschikbaarheid; dit netwerk wordt niet voorgesteld als een vast personeelsbestand.',
 'team_map':'België.\nExpertise.\nCollectief.','footer_role':'Medeoprichter · Technisch directeur (CTO)',
 'contact_copy':'Een idee lanceren, een website bouwen of uw werking verbeteren? Het eerste gesprek van een uur is gratis en vrijblijvend. Schrijf ons om de afspraak en een concreet vertrekpunt te bepalen.',
 'contact_booking_note':'Na het gesprek maken we een eerste scopingnota met doelen, prioriteiten, aannames en volgende stappen. Een uitgebreide studie valt onder een aparte offerte.',
 'ai_title':'Eerst begrijpen.\nDan de juiste technologie.',
 'ai_copy':'Technologie volgt op inzicht. Bedrijfsregels, automatisering, statistiek, optimalisatie, machine learning of generatieve AI: we kiezen wat aantoonbaar nuttige waarde oplevert, met passende menselijke controle.',
 'privacy_text':['Het formulier maakt momenteel een e-mailconcept in uw browser. Uw aanvraag wordt pas verzonden wanneer u dit in uw e-mailprogramma doet. Als serververzending actief is, vermeldt de bevestiging expliciet dat de aanvraag is geregistreerd.','Uw gegevens dienen om uw aanvraag te beoordelen en te beantwoorden in het kader van de gevraagde precontractuele stappen. Voor inzage, correctie of verwijdering: contact@novalisai.com. De bewaartermijnen van het ERP worden vóór de opening voor klanten vastgesteld.','Deze website gebruikt geen advertentietrackers of bezoekersstatistieken. Afbeeldingen en lettertypen staan lokaal. Hosting- en mailproviders kunnen technische gegevens verwerken die nodig zijn voor hun dienstverlening.'],
},
'de':{
 'title':'Novalis AI — Von Ihrer Website zur Unternehmenssoftware',
 'description':'Websites, Anwendungen, ERP, SaaS und Datenlösungen nach Maß. Ein Ansprechpartner in Belgien, ein passendes Team und eine kostenlose erste Stunde.',
 'hero_title':['Ihre Ziele.', 'Unsere Entwicklung.'],
 'hero_copy':'Von Ihrer ersten Website bis zur Software für Ihren Geschäftsbetrieb. Wir entwickeln digitale Werkzeuge, die zu Ihrer tatsächlichen Arbeitsweise passen.',
 'hero_note':'Die erste Stunde ist kostenlos. Ein klarer Bedarf. Ein konkreter Ausgangspunkt.',
 'talk':'Mein Projekt besprechen — 1 Stunde kostenlos','book':'Erste Stunde kostenlos','book_short':'Kostenlose erste Stunde anfragen',
 'intro_title':'Ein konkretes Problem. Eine durchdachte Lösung.',
 'intro_copy':'Ein Geschäft, ein Team, ein Startup oder eine komplexe Organisation: Jedes Projekt verdient die passende technische Umsetzung. Wir beginnen mit Ihrem Bedarf und entwickeln eine Lösung für den Alltag.',
 'team_copy':'Achraf Saidi, Mitgründer und technischer Geschäftsführer (CTO), verbindet Softwareentwicklung, Mathematik und Forschung zu KI und Statistik an der UCLouvain. Er klärt Ihre Rahmenbedingungen, erläutert die Entscheidungen und begleitet die technische Umsetzung.',
 'team_second':'Ein Netzwerk aus Entwicklern, Designern und Datenspezialisten unterstützt die Umsetzung, unter anderem mit JetThings / JetNext. Fachkräfte werden je nach Umfang und Verfügbarkeit eingebunden; dieses Netzwerk wird nicht als feste Mitarbeiterzahl dargestellt.',
 'team_map':'Belgien.\nFachwissen.\nZusammenarbeit.','footer_role':'Mitgründer · Technischer Geschäftsführer (CTO)',
 'contact_copy':'Eine Idee starten, eine Website erstellen oder Abläufe verbessern? Das erste Gespräch von einer Stunde ist kostenlos und unverbindlich. Schreiben Sie uns, um den Termin und die nächsten Schritte zu vereinbaren.',
 'contact_booking_note':'Nach dem Gespräch erstellen wir eine erste Projektnotiz mit Zielen, Prioritäten, Annahmen und nächsten Schritten. Eine vertiefte Studie wird gesondert angeboten.',
 'ai_title':'Erst verstehen.\nDann die passende Technik.',
 'ai_copy':'Technologie folgt dem Verständnis. Geschäftsregeln, Automatisierung, Statistik, Optimierung, maschinelles Lernen oder generative KI: Wir wählen, was nachweisbaren Nutzen bringt, mit angemessener menschlicher Kontrolle.',
 'privacy_text':['Das Formular erstellt derzeit einen E-Mail-Entwurf in Ihrem Browser. Die Anfrage wird erst übermittelt, wenn Sie sie mit Ihrem E-Mail-Programm versenden. Bei aktivierter Serverübermittlung bestätigt die Meldung ausdrücklich die Speicherung Ihrer Anfrage.','Ihre Angaben dienen der Prüfung und Beantwortung Ihrer Anfrage im Rahmen der angefragten vorvertraglichen Schritte. Für Auskunft, Berichtigung oder Löschung: contact@novalisai.com. Die Aufbewahrungsfristen des ERP werden vor der Freigabe für Kunden festgelegt.','Diese Website verwendet keine Werbetracker oder Besucheranalyse. Bilder und Schriften werden lokal bereitgestellt. Hosting- und E-Mail-Anbieter können die für ihre Leistungen notwendigen technischen Daten verarbeiten.'],
}}
for lang,u in updates.items():
 c[lang].update(u)
 # Keep the legal information from the retained source; do not infer new founders or staff counts.
 c[lang]['legal_text']=[p.replace('achraf@novalisai.com','contact@novalisai.com') for p in c[lang]['legal_text']]
 (ROOT/'content.json').write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
print('Four language editions updated.')
