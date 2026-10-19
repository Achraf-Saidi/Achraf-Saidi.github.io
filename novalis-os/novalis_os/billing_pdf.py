"""Branded, paginated documents generated solely from server-validated snapshots."""
import io
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle,getSampleStyleSheet
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,KeepTogether,Image
import qrcode
from qrcode.image.svg import SvgPathImage

INK=colors.HexColor('#183039');COPPER=colors.HexColor('#9c604b');PALE=colors.HexColor('#f5f1ea');MUTED=colors.HexColor('#68767a')
FONT_DIR=Path(__file__).with_name('fonts')
pdfmetrics.registerFont(TTFont('NovalisSans',str(FONT_DIR/'NovalisSans.ttf')))
pdfmetrics.registerFont(TTFont('NovalisSansBold',str(FONT_DIR/'NovalisSans-Bold.ttf')))
ST=getSampleStyleSheet()
ST.add(ParagraphStyle(name='BodyNovalis',fontName='NovalisSans',fontSize=9,leading=14,textColor=INK,spaceAfter=4))
ST.add(ParagraphStyle(name='LabelNovalis',parent=ST['BodyNovalis'],fontSize=8,textColor=MUTED,leading=12))
ST.add(ParagraphStyle(name='TitleNovalis',fontName='NovalisSansBold',fontSize=25,leading=30,textColor=INK,spaceAfter=10))
ST.add(ParagraphStyle(name='RightNovalis',parent=ST['BodyNovalis'],alignment=TA_RIGHT))
def p(v,style='BodyNovalis'):return Paragraph(escape(str(v or '')).replace('\n','<br/>'),ST[style])
def money(v):return f'{v/100:,.2f}'.replace(',',' ').replace('.',',')+' EUR'
def day(v):return v[:10] if v else '-'
def qr_svg(payload):
    q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=5,border=4);q.add_data(payload);q.make(fit=True)
    b=io.BytesIO();q.make_image(image_factory=SvgPathImage).save(b);return b.getvalue()
def epc_payload(v):
    from .billing import valid_iban
    s=v['snapshot']['seller'];iban=s.get('iban','')
    if v['test_mode'] or not valid_iban(iban) or v['balance_cents']<=0:return None
    name=s.get('legal_name','')[:70];ref=(v['number'] or '')[:140]
    value='\n'.join(['BCD','002','1','SCT',s.get('bic',''),name,iban,f"EUR{v['balance_cents']/100:.2f}",'','',ref,''])
    return value if len(value.encode('utf-8'))<=331 else None

def footer(canvas,doc):
    canvas.saveState();w,h=doc.pagesize
    canvas.setStrokeColor(colors.HexColor('#deded8'));canvas.line(20*mm,19*mm,w-20*mm,19*mm)
    canvas.setFont('NovalisSans',8);canvas.setFillColor(MUTED);canvas.drawString(20*mm,13*mm,'NOVALIS AI  /  Documents de facturation')
    canvas.drawRightString(w-20*mm,13*mm,f'Page {doc.page}');canvas.restoreState()
def build(story,title):
    b=io.BytesIO();doc=SimpleDocTemplate(b,pagesize=(210*mm,297*mm),rightMargin=20*mm,leftMargin=20*mm,topMargin=20*mm,bottomMargin=26*mm,title=title,author='Novalis AI')
    doc.build(story,onFirstPage=footer,onLaterPages=footer);return b.getvalue()
def header(v,title):
    s=v['snapshot'];seller=s['seller'];test=v['test_mode'];draft=not v['issued_at']
    story=[p('N O V A L I S   /   F I N A N C E','LabelNovalis'),Spacer(1,6*mm),p(title,'TitleNovalis')]
    if test:story+=[p('TEST - DEMONSTRATION - AUCUN DOCUMENT COMPTABLE REEL','LabelNovalis')]
    elif draft:story+=[p('BROUILLON / PRO FORMA - NON EMIS - NE PAS REGLER','LabelNovalis')]
    story+=[p(v['number'] or 'Brouillon '+v['id'][:8]),Spacer(1,7*mm)]
    def address(d,name):
        return [p(name,'LabelNovalis')]+[p(x) for x in [d.get('legal_name') or d.get('name') or 'Coordonnées à compléter',d.get('address'),(d.get('postal_code','')+' '+d.get('city','')).strip(),d.get('country'),('BCE : '+d['company_number']) if d.get('company_number') else '',('TVA : '+d['vat_number']) if d.get('vat_number') else '',d.get('email')] if x]
    table=Table([[address(seller,'EMETTEUR'),address(s['recipient'],'FACTURE A')]],colWidths=[85*mm,85*mm]);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),8)]));story+=[table,Spacer(1,9*mm)]
    return story

def invoice_pdf(v):
    s=v['snapshot'];story=header(v,'Facture' if v['issued_at'] else 'Projet de facture')
    meta=Table([[p('DATE DE FACTURE','LabelNovalis'),p('ECHEANCE','LabelNovalis'),p('DATE DE PRESTATION','LabelNovalis')],[p(s['issue_date']),p(v['due_date']),p(s['service_date'])]],colWidths=[57*mm,56*mm,57*mm]);meta.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('TOPPADDING',(0,0),(-1,0),9),('BOTTOMPADDING',(0,1),(-1,1),9),('VALIGN',(0,0),(-1,-1),'TOP')]))
    story += [meta,Spacer(1,8*mm),p(s['title']),p('Référence commande : '+s['buyer_reference']) if s.get('buyer_reference') else Spacer(1,1),Spacer(1,3*mm)]
    body=[[p('PRESTATION','LabelNovalis'),p('QTE','LabelNovalis'),p('P.U. HT','LabelNovalis'),p('TVA','LabelNovalis'),p('TOTAL HT','LabelNovalis')]]
    for l in s['lines']:
        desc=l['description']+'\n'+l['unit']+(f" - remise {l['discount_basis_points']/100:g} %" if l['discount_basis_points'] else '')
        body.append([p(desc),p(l['quantity']),p(money(l['unit_cents']),'RightNovalis'),p(f"{l['vat_basis_points']/100:g} %"),p(money(l['net_cents']),'RightNovalis')])
    t=Table(body,colWidths=[78*mm,15*mm,29*mm,17*mm,31*mm],repeatRows=1,hAlign='LEFT');t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),PALE),('LINEBELOW',(0,0),(-1,0),.5,COPPER),('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#e7e5df')),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]));story+=[t,Spacer(1,7*mm)]
    tax=[['Total HT',money(v['totals']['net_cents'])]]
    tax += [(f'TVA {int(rate)/100:g} %',money(g['tax_cents'])) for rate,g in sorted(v['totals']['vat_groups'].items())]
    tax += [['TOTAL TTC',money(v['total_cents'])]]
    summary=Table([[p(a),p(b,'RightNovalis')] for a,b in tax],colWidths=[55*mm,40*mm],hAlign='RIGHT');summary.setStyle(TableStyle([('BACKGROUND',(0,-1),(-1,-1),PALE),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    tail=[summary,Spacer(1,7*mm)]
    for label,key in [('TRAITEMENT TVA','vat_note'),('NOTE','notes'),('CONDITIONS','terms')]:
        if s.get(key):tail += [p(label,'LabelNovalis'),p(s[key]),Spacer(1,2*mm)]
    if v['issued_at'] and not v['test_mode']:
        seller=s['seller'];tail += [p('REGLEMENT','LabelNovalis'),p('IBAN : '+(seller.get('iban') or 'A communiquer par Novalis')),p('Communication : '+v['number'])]
    if v['test_mode']:tail += [p('Ce document sert exclusivement à tester Novalis OS. Aucun paiement réel ne doit être effectué.','LabelNovalis')]
    elif v['recipient_type']=='belgian_business':tail += [p('Préparation B2B : transmission Peppol non effectuée.','LabelNovalis')]
    story+=tail;return build(story,'Novalis - '+(v['number'] or 'Brouillon'))

def receipt_pdf(v,r):
    story=header(v,'Reçu de paiement');story += [p(r['number']),Spacer(1,8*mm)]
    details=[('FACTURE CONCERNEE',v['number']),('MONTANT CONFIRME',money(r['amount_cents'])),('DATE DU REGLEMENT',day(r['paid_at'])),('MOYEN DE PAIEMENT',r['method']),('REFERENCE',r['reference'])]
    t=Table([[p(k,'LabelNovalis'),p(value)] for k,value in details],colWidths=[60*mm,110*mm]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)]));story += [t,Spacer(1,10*mm),p('Ce reçu atteste le règlement indiqué ci-dessus. Il ne remplace pas la facture originale et ne constitue pas un avoir.')]
    if v['test_mode']:story += [p('SIMULATION : aucun encaissement ni mouvement bancaire réel.','LabelNovalis')]
    return build(story,'Novalis - '+r['number'])
