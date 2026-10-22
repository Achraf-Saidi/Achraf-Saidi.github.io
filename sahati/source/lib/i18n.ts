import {formTranslations} from './form-translations';
import {professionalTranslations} from './professional-translations';
import {uiTranslations} from './ui-translations';
export type Language='fr'|'ar'|'en'|'kab';
export const languages:{id:Language;label:string;locale:string;script:string}[]=[{id:'fr',label:'Français',locale:'fr-DZ',script:'Français'},{id:'ar',label:'العربية',locale:'ar-DZ',script:'العربية · من اليمين إلى اليسار'},{id:'en',label:'English',locale:'en-GB',script:'English'},{id:'kab',label:'Tamaziɣt',locale:'kab-DZ',script:'Tamaziɣt · Tira talatinit'}];
let current:Language='fr';
export function setUILanguage(lang:Language){current=lang;}
export const getUILanguage=()=>current;
const dictionary:Record<string,[string,string,string]>={};
export function registerTranslations(rows:string){for(const row of rows.trim().split('\n')){const [fr,ar,en,kab]=row.split('|');if(fr&&ar&&en&&kab)dictionary[fr]=[ar,en,kab];}}
export function translate(fr:string,lang:Language=current,ar?:string,en?:string,kab?:string):string{
 if(lang==='fr')return fr;
 const found=dictionary[fr]||dictionary[fr.trim()];return lang==='ar'?(ar||found?.[0]||fr):lang==='en'?(en||found?.[1]||fr):(kab||found?.[2]||fr);
}
export const uiText=(fr:string)=>translate(fr);
registerTranslations(`
Vue d’ensemble|نظرة عامة|Overview|Tamuɣli tamatut
Mon quotidien|يومياتي|My daily companion|Ass-inu
Mon dossier médical|ملفي الطبي|My medical record|Akaram-inu n tdawsa
Campus médical|الحرم الطبي|Medical campus|Aselmed n tujjya
Vue institutionnelle|المنظور المؤسسي|Network overview|Tamuɣli n uẓeṭṭa
Dossiers patients|ملفات المرضى|Patient records|Ikaramen n imuḍan
Rendez-vous|المواعيد|Appointments|Timliliyin
Consultations|الاستشارات|Consultations|Timsiwelin
Ordonnances|الوصفات|Prescriptions|Tiwaratin n ddwa
Examens & résultats|الفحوصات والنتائج|Tests & results|Ikayaden d igmaḍ
Hospitalisations|الاستشفاء|Hospital stays|Igaman deg usensu
Lits & unités|الأسرة والوحدات|Beds & units|Usuḍ d yiḥricen
Soins & transmissions|الرعاية والتسليم|Care & handovers|Ttawilat n lɛilaj
Urgences|الاستعجالات|Emergency care|Timarɣiwt
Bloc opératoire|غرف العمليات|Operating theatre|Axxam n ujraḥ
Documents|الوثائق|Documents|Isemliyen
Pharmacie & stocks|الصيدلية والمخزون|Pharmacy & inventory|Axxam n ddwa d ukufi
Facturation|الفوترة|Billing|Tifaturin
Équipes & planning|الفرق والجدول|Teams & rosters|Tirebbuya d uɣawas
Équipements|المعدات|Equipment|Allalen
Qualité & incidents|الجودة والحوادث|Quality & incidents|Taɣara d yineḍruyen
Pilotage|القيادة|Analytics|Aselken
Recherche médicale|البحث الطبي|Medical research|Anadi n tujjya
Autorisations recherche|تصاريح البحث|Research permissions|Tisirag n unadi
Réseau hospitalier|شبكة المستشفيات|Hospital network|Aẓeṭṭa n yisensuyen
Comptes & accès|الحسابات والصلاحيات|Accounts & access|Imiḍanen d unekcum
Journal de traçabilité|سجل التتبع|Audit trail|Aɣmis n uḍfar
Messagerie|المراسلات|Messages|Iznan
Aide & prise en main|المساعدة|Help & getting started|Tallalt d tazwara
Votre espace|فضاؤك|Your workspace|Amḍiq-ik
Parcours de soins|مسار الرعاية|Care journey|Abrid n lɛilaj
Gestion de l’hôpital|إدارة المستشفى|Hospital management|Asefrek n usensu
Recherche & réseau|البحث والشبكة|Research & network|Anadi d uẓeṭṭa
Administration|إدارة النظام|Administration|Tadbelt
Formation|التكوين|Learning|Aselmed
Médecin|طبيب|Doctor|Amejjay
Résident|طبيب مقيم|Resident|Amejjay anelmad
Soins infirmiers|التمريض|Nursing|Lɛilaj
Accueil & admissions|الاستقبال|Reception & admissions|Anṣuf d unekcum
Laboratoire|المخبر|Laboratory|Asnay
Radiologie|الأشعة|Radiology|Tiẓeṛwin
Pharmacie|الصيدلية|Pharmacy|Axxam n ddwa
Patient & famille|المريض والأسرة|Patient & family|Amuḍin d twacult
Chercheur|باحث|Researcher|Anaram
Étudiant|طالب|Student|Anelmad
Direction|الإدارة|Management|Tanmehla
Finances|المالية|Finance|Idrimen
Logistique|الخدمات اللوجستية|Logistics|Allalen d usefrek
Enregistrer|حفظ|Save|Sekles
Enregistrement…|جارٍ الحفظ…|Saving…|Asekles…
Annuler|إلغاء|Cancel|Sefsex
Fermer|إغلاق|Close|Mdel
Ajouter|إضافة|Add|Rnu
Supprimer|حذف|Delete|Kkes
Rechercher|بحث|Search|Nadi
Actualiser|تحديث|Refresh|Sismeḍ
Choisir…|اختر…|Choose…|Fren…
Tout|الكل|All|Akk
Date|التاريخ|Date|Azemz
Heure|الوقت|Time|Akud
Statut|الحالة|Status|Addad
Actions|الإجراءات|Actions|Tigawin
Référence|المرجع|Reference|Tamsisɣelt
Quantité|الكمية|Quantity|Amḍan
Emplacement|الموقع|Location|Amḍiq
Lot|الدفعة|Lot|Akufi
Péremption|انتهاء الصلاحية|Expiry|Taggara n useqdec
Fournisseur|المورّد|Supplier|Amessawi
Motif|السبب|Reason|Taɣẓint
Prix unitaire (DZD)|سعر الوحدة (دج)|Unit price (DZD)|Ssuma n yiwen (DZD)
Disponible|متاح|Available|Yella
Bloqué|محجوز|Blocked|Yewḥel
Périmé|منتهي الصلاحية|Expired|Ifat wakud
Quarantaine|الحجر|Quarantine|Aɛzel
Rappelé|مسحوب|Recalled|Yettuɣal
Actif|نشط|Active|Yermed
À commander|للطلب|To order|I usuter
Réception|الاستلام|Receipt|Armas
Réceptionner|استلام|Receive stock|Rmes akufi
Nouvel article|مادة جديدة|New product|Aferdis amaynut
Catalogue|الكتالوج|Catalogue|Akaram n yiferdisen
Lots & emplacements|الدفعات والمواقع|Lots & locations|Ikufan d yimukan
Commandes|الطلبيات|Purchase orders|Isuturen
Mouvements|الحركات|Stock movements|Imussuten n ukufi
Délivrances|صرف الأدوية|Dispensing|Asiweḍ n ddwa
À surveiller|للمراقبة|Watch list|I uɛiwed n uwali
Valeur du stock|قيمة المخزون|Inventory value|Azal n ukufi
Articles au seuil|مواد عند الحد الأدنى|At or below minimum|Iferdisen deg tlisa
Lots sous 90 jours|دفعات تنتهي خلال ٩٠ يومًا|Lots expiring within 90 days|Ikufan ara ifaken deg 90 n wussan
Lots indisponibles|دفعات غير متاحة|Unavailable lots|Ikufan ur nettuseqdac
Le stock, dans le détail.|المخزون، بكل تفاصيله.|Every unit accounted for.|Akufi, s telqayt.
Réceptions, lots et délivrances dans un même circuit.|الاستلام والدفعات والصرف في مسار واحد.|Receipts, lots and dispensing in one workflow.|Armas, ikufan d usiweḍ deg yiwen n ubrid.
Rechercher un nom, une DCI, un code ou un lot…|ابحث عن اسم أو مادة أو رمز أو دفعة…|Search name, ingredient, code or lot…|Nadi isem, DCI, tangalt neɣ akufi…
Stock disponible|المخزون المتاح|Available stock|Akufi yellan
En commande|قيد الطلب|On order|Deg usuter
Seuil / cible|الحد الأدنى / الهدف|Minimum / target|Tilisa / iswi
Couverture estimée|التغطية التقديرية|Estimated cover|Akud yettwaḥesben
jours|أيام|days|ussan
Non calculable|غير قابل للحساب|Not available|Ur yettwaḥsab ara
Aucune alerte|لا تنبيهات|No alerts|Ulac alɣu
Aucun mouvement|لا حركات|No stock movements|Ulac amussu
Aucune commande|لا طلبيات|No purchase orders|Ulac asuter
Créer une commande|إنشاء طلبية|Create purchase order|Snulfu asuter
Réapprovisionner|إعادة التموين|Reorder|Ales armas
Exporter CSV|تصدير CSV|Export CSV|Suffeɣ CSV
Compter / corriger|جرد / تصحيح|Count / adjust|Siḍen / seɣti
Transférer|تحويل|Transfer|Sɛeddi
Sortie vers un service|إخراج إلى قسم|Issue to department|Asiweḍ ɣer uḥric
Bloquer / libérer|حجز / تحرير|Block / release|Ḥbes / serreḥ
Stock compté|الكمية المعدودة|Counted quantity|Amḍan yettwasiḍnen
Destination|الوجهة|Destination|Tanila
Quantité transférée|الكمية المحوّلة|Transfer quantity|Amḍan i usɛeddi
Service destinataire|القسم المستلم|Receiving department|Aḥric n urmas
Nouveau statut|الحالة الجديدة|New lot status|Addad amaynut
Bon de réception|وصل الاستلام|Delivery reference|Tamsisɣelt n urmas
Numéro de lot|رقم الدفعة|Lot number|Uṭṭun n ukufi
Code article|رمز المادة|Product code|Tangalt n uferdis
Nom de l’article|اسم المادة|Product name|Isem n uferdis
Unité de stock|وحدة المخزون|Stock unit|Aferdis n ukufi
Seuil minimum|الحد الأدنى|Minimum level|Talast taddayt
Stock cible|المخزون المستهدف|Target stock|Iswi n ukufi
Présentation|الشكل والتعبئة|Presentation / pack|Talɣa n ddwa
Dosage du conditionnement|تركيز العبوة|Pack strength|Tazmert n ukufi
DCI|المادة الفعالة|Generic ingredient|DCI
Conservation|الحفظ|Storage conditions|Aḥraz
Code-barres|الرمز الشريطي|Barcode|Tangalt
Médicament|دواء|Medication|Ddwa
Consommable|مستلزم|Supply|Allal
Date attendue|التاريخ المتوقع|Expected delivery|Azemz yettwarǧan
Quantité commandée|الكمية المطلوبة|Ordered quantity|Amḍan yettwasutren
Quantité reçue|الكمية المستلمة|Received quantity|Amḍan yettwaramsen
Restant|المتبقي|Remaining|Ayen i d-yeggran
Confirmer la commande|تأكيد الطلبية|Confirm order|Sentem asuter
Enregistrer la réception|تسجيل الاستلام|Record receipt|Sekles armas
Traçabilité du lot|تتبع الدفعة|Lot traceability|Aḍfar n ukufi
Solde après mouvement|الرصيد بعد الحركة|Balance after movement|Akufi deffir umussu
Préparation FEFO|تحضير حسب أقرب انتهاء|FEFO preparation|Aheggi FEFO
Préparer la délivrance|تحضير الصرف|Prepare dispensing|Heggi asiweḍ
Valider la délivrance|تأكيد الصرف|Confirm dispensing|Sentem asiweḍ
Aucun lot utilisable|لا دفعة صالحة للاستخدام|No usable lot|Ulac akufi i useqdec
Traitements|العلاجات|Treatments|Ddwa
Article du catalogue|مادة من الكتالوج|Catalogue product|Aferdis seg ukaram
Saisie libre|إدخال حر|Manual entry|Asekcem ilelli
Quantité à délivrer|الكمية للصرف|Quantity to dispense|Amḍan i usiweḍ
Mettre à jour|تحديث|Update|Sismeḍ
Enregistré.|تم الحفظ.|Saved.|Yettwasekles.
Chargement…|جارٍ التحميل…|Loading…|Asali…
Réessayer|إعادة المحاولة|Try again|Ɛreḍ tikkelt nniḍen
`);

registerTranslations(uiTranslations);

registerTranslations(professionalTranslations);

registerTranslations(formTranslations);
