"""Create the four-page institutional brief from the delivered demo scope."""
from pathlib import Path
import base64, tempfile
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'docs' / 'SAHATI_Presentation.pdf'
OUT.parent.mkdir(exist_ok=True)
with tempfile.NamedTemporaryFile(suffix='.ttf') as font:
    font.write(base64.b64decode((ROOT / 'public/fonts/document-sans.ttf.b64').read_text()))
    font.flush()
    pdfmetrics.registerFont(TTFont('Sahati', font.name))

W, H = A4
C = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
C.setTitle('SAHATI - Parcours de soins et trajectoire pilote')
C.setAuthor('SAHATI')
INK, JADE, MUTED, LINE, SOFT = map(HexColor, ['#172e35', '#147d70', '#63777b', '#dce7e1', '#f2f6f3'])
styles = {
    'body': ParagraphStyle('body', fontName='Sahati', fontSize=10.2, leading=16.2, textColor=INK),
    'small': ParagraphStyle('small', fontName='Sahati', fontSize=8.5, leading=13.5, textColor=MUTED),
    'heading': ParagraphStyle('heading', fontName='Sahati', fontSize=17, leading=23, textColor=JADE),
    'title': ParagraphStyle('title', fontName='Sahati', fontSize=31, leading=38, textColor=INK)
}

def para(text, x, y, width, style='body'):
    p = Paragraph(text, styles[style])
    _, height = p.wrap(width, H)
    p.drawOn(C, x, y-height)
    return y-height

def header(number, label):
    C.setFillColor(white); C.rect(0, 0, W, H, fill=1, stroke=0)
    C.drawImage(str(ROOT / 'public/brand/logo.png'), 44, H-82, 45, 45, mask='auto', preserveAspectRatio=True)
    C.setFont('Sahati', 20); C.setFillColor(INK); C.drawString(102, H-55, 'SAHATI')
    C.setFont('Sahati', 8); C.setFillColor(MUTED); C.drawString(102, H-72, 'Le soin, relié.')
    C.setStrokeColor(LINE); C.line(44, H-101, W-44, H-101)
    C.setFont('Sahati', 8); C.setFillColor(JADE); C.drawString(44, H-126, label.upper())
    C.setStrokeColor(LINE); C.line(44, 47, W-44, 47)
    C.setFont('Sahati', 7.5); C.setFillColor(MUTED)
    C.drawString(44, 30, 'Prototype 0.2 - Données synthétiques - 14 octobre 2026')
    C.drawRightString(W-44, 30, str(number)+' / 4')
    return H-153

def block(title, text, y, height=100):
    C.setFillColor(SOFT); C.roundRect(44, y-height, W-88, height, 12, fill=1, stroke=0)
    yy = para(title, 61, y-15, W-122, 'heading')
    para(text, 61, yy-11, W-122)
    return y-height-18

y = header(1, 'Une plateforme conçue pour relier le soin')
y = para('Le dossier suit le patient.<br/>Les équipes gardent le fil.', 44, y, W-88, 'title')
y = para('Une démonstration de parcours hospitaliers, patients et pédagogiques pour préparer un pilote volontaire en Algérie.', 44, y-22, W-88)
y = block('Le problème à traiter', 'Rendez-vous, consultations, prescriptions et résultats peuvent rester séparés. La qualité d’une plateforme se mesure à la continuité de l’information et aux tâches que chaque utilisateur accomplit.', y-30, 124)
y = block('Ce que montre la version 0.2', 'Un même scénario relie une arrivée à une consultation, à une ordonnance et à un résultat publié. Le patient retrouve ses documents et leurs passages sources. Les équipes disposent de files de travail et de statuts cohérents.', y, 136)
y = para('Solution privée indépendante. Aucun partenariat ministériel, aucune homologation et aucun bénéfice clinique ou économique acquis ne sont annoncés.', 44, y-4, W-88, 'small')
C.showPage()

y = header(2, 'Des tâches qui produisent un résultat')
y = para('Sept parcours à examiner.', 44, y, W-88, 'title')-28
items = [
    ('Patient et consultation', 'Demande et modification d’un rendez-vous, confirmation d’arrivée, consultation reliée, validation et documents visibles dans le même coffre.'),
    ('Ordonnance et laboratoire', 'Champs structurés, PDF A4, QR opaque local, prélèvement, résultats chiffrés, sources conservées et publication distincte de la validation.'),
    ('Radiologie', 'Réservation d’équipement avec conflit ; vrai fichier DICOM de fantôme synthétique, fenêtre/niveau/zoom. Aucun PACS ou visualiseur clinique connecté.'),
    ('Hospitalisation', 'Admission, lit, situation du patient et indicateurs évoluent ensemble. La sortie documentée conduit au bionettoyage du lit.'),
    ('Campus médical', 'Trois cas fictifs, neuf questions, exploration, correction et progression personnelle. Contenus à faire revoir par des enseignants.'),
    ('Recherche et direction', 'Accès personnel à une cohorte minimisée, descriptif et Kaplan-Meier ; cinq KPI définis, filtres territoriaux et rapports synthétiques.')
]
for title, text in items:
    y = para(title, 44, y, W-88, 'heading')
    y = para(text, 44, y-8, W-88)-21
para('Aucune donnée réelle. Les modifications restent sur un appareil ; les chiffres ne décrivent pas les hôpitaux algériens.', 44, y, W-88, 'small')
C.showPage()

y = header(3, 'Gouvernance et limites visibles')
y = para('Une base à faire valider.', 44, y, W-88, 'title')-28
y = block('Droits et information', 'Les rôles du moteur distinguent clinique, gestion, patient, formation et recherche. Les administrateurs et chercheurs n’accèdent pas automatiquement aux dossiers nominatifs. Les versions des mutations sont conservées.', y, 130)
y = block('Lecture fidèle des documents', 'Les explications sont déterministes et reliées aux champs sources. Valeurs, unités et consignes restent inchangées. Un intervalle absent est indiqué absent. Aucune IA autonome ne pose de diagnostic ou ne modifie une prescription.', y, 136)
y = block('La frontière du prototype', 'GitHub Pages ne fournit pas une infrastructure de soins. Le coffre local et ses permissions ne protègent pas contre le propriétaire du navigateur. Un QR nécessite le même coffre ; les PDF ne sont pas des signatures qualifiées.', y, 132)
para('Avant des données réelles : cadre juridique algérien, responsables, délégué, habilitations serveur, audit indépendant, hébergement, contrats, sauvegardes et restauration. Sources : lois 18-07 et 25-11, à instruire avec les juristes.', 44, y, W-88, 'small')
C.showPage()

y = header(4, 'Un pilote limité, mesurable et progressif')
y = para('Commencer avec le terrain.', 44, y, W-88, 'title')-28
for title, text, height in [
    ('1. Observer et cadrer', 'Un établissement volontaire, un service de consultation et son laboratoire. Observer les tâches, définir une référence de comparaison et valider la gouvernance.', 93),
    ('2. Construire la base pilote', 'API sécurisée, identité, séparation des établissements, données normalisées, documents revus, audit et reprise. Puis connecteurs laboratoire et OHIF/Orthanc selon les systèmes existants.', 109),
    ('3. Évaluer avant d’étendre', 'Comparer temps et réussite des tâches, complétude, transmissions, compréhension patient, accessibilité et incidents. Prévoir un évaluateur indépendant et un retour au système précédent.', 110),
]: y = block(title, text, y, height)
y = para('Moyens et coûts à chiffrer', 44, y, W-88, 'heading')
y = para('Découverte, développement, validation clinique, sécurité, interfaces, migration, formation, hébergement et exploitation doivent être devisés séparément. Aucun tarif ferme ou retour sur investissement n’est établi.', 44, y-10, W-88)
y = para('Références publiques : Epic/MyChart, Oracle Health, MEDITECH, TrakCare, Dedalus, OpenMRS, OpenEMR, Bahmni, DHIS2, OMS, HL7 et DICOM. Détails et liens dans BENCHMARK.md.', 44, y-20, W-88, 'small')
para('Démonstration : https://achraf-saidi.github.io/sahati/<br/>Documentation : github.com/Achraf-Saidi/Achraf-Saidi.github.io/tree/main/sahati', 44, y-18, W-88, 'small')
C.save()
print(OUT)
