"""Branded planning exports using immutable agreement snapshots."""
import io
from pathlib import Path
from flask import current_app
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from datetime import datetime
from zoneinfo import ZoneInfo
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.utils import simpleSplit
from xml.sax.saxutils import escape
from .billing_pdf import p, money, ST, INK, COPPER, PALE, MUTED, NumberedCanvas, brand_name, logo

ST.add(ParagraphStyle(name='PlanningSection',parent=ST['TitleNovalis'],fontSize=15,leading=20,spaceBefore=6,spaceAfter=6,keepWithNext=True))

def date_label(value):
    if not value:return 'En attente'
    try:
        date=datetime.fromisoformat(value)
        return date.strftime('%d/%m/%Y') if len(value)==10 else date.astimezone(ZoneInfo('Europe/Brussels')).strftime('%d/%m/%Y à %H:%M')+' (Bruxelles)'
    except ValueError:return value

def footer(canvas,doc):
    canvas.saveState();w,h=doc.pagesize
    canvas.setStrokeColor(colors.HexColor('#deded8'));canvas.line(20*mm,19*mm,w-20*mm,19*mm)
    canvas.setFont('NovalisSans',8);canvas.setFillColor(MUTED);canvas.drawString(20*mm,13*mm,doc.author[:70]+' / Projets & collaboration')
    canvas.restoreState()


class PlanningDocument(SimpleDocTemplate):
    def afterFlowable(self,flowable):
        if hasattr(flowable,"toc_label"):
            self.notify("TOCEntry",(0,escape(flowable.toc_label),self.page))

def heading(label,style="PlanningSection"):
    block=p(label,style);block.toc_label=label;return block


def build(story,title,landscape=False,seller=None):
    output=io.BytesIO();doc=PlanningDocument(output,pagesize=(297*mm,210*mm) if landscape else (210*mm,297*mm),leftMargin=20*mm,rightMargin=20*mm,topMargin=20*mm,bottomMargin=26*mm,title=title,author=brand_name(seller or {}))
    doc.multiBuild(story,onFirstPage=footer,onLaterPages=footer,canvasmaker=NumberedCanvas);return output.getvalue()


def table(data,widths,compact=False):
    t=Table([[p(cell,'LabelNovalis' if compact else 'BodyNovalis') for cell in r] for r in data],colWidths=widths,repeatRows=1,hAlign='LEFT',splitInRow=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),4 if compact else 8),('BOTTOMPADDING',(0,0),(-1,-1),4 if compact else 8),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor('#e1dfda'))]))
    return t


def diagram(graph,width=480,height=300):
    nodes=graph['nodes'];positions=graph.get('positions',{})
    if not nodes:return Drawing(width,30)
    # For large diagrams the readable indexed register remains the authoritative companion.
    cols=3 if width<600 else 4
    coords={n['id']:positions.get(n['id'],{'x':(i%cols)*250,'y':(i//cols)*145}) for i,n in enumerate(nodes)}
    if positions and (max(v['x'] for v in coords.values())-min(v['x'] for v in coords.values())>1800 or max(v['y'] for v in coords.values())-min(v['y'] for v in coords.values())>900):
        coords={n['id']:{'x':(i%cols)*250,'y':(i//cols)*145} for i,n in enumerate(nodes)}
    minx=min(v['x'] for v in coords.values());miny=min(v['y'] for v in coords.values())
    maxx=max(v['x'] for v in coords.values())+220;maxy=max(v['y'] for v in coords.values())+100
    height=min(height,max(90,(maxy-miny+8)*width/max(220,maxx-minx+8)))
    draw=Drawing(width,height)
    scale=min((width-8)/max(220,maxx-minx),(height-8)/max(100,maxy-miny))
    xy={k:((v['x']-minx)*scale+4,height-(v['y']-miny+100)*scale-4) for k,v in coords.items()}
    for edge in graph['edges']:
        if edge['source'] not in xy or edge['target'] not in xy:continue
        x1,y1=xy[edge['source']];x2,y2=xy[edge['target']];x1+=220*scale;y1+=50*scale;y2+=50*scale
        draw.add(Line(x1,y1,x2,y2,strokeColor=COPPER if not edge.get('automatic') else colors.HexColor('#b8c1be'),strokeWidth=.8))
    for i,n in enumerate(nodes):
        x,y=xy[n['id']];draw.add(Rect(x,y,220*scale,100*scale,rx=8*scale,ry=8*scale,fillColor=PALE,strokeColor=colors.HexColor('#bdc8c5'),strokeWidth=.5))
        kind={'project':'PROJET','client':'CLIENT','person':'PARTICIPANT','phase':'PHASE','milestone':'JALON','task':'TÂCHE','note':'NOTE','invoice':'FACTURE','stakeholder':'PARTIE PRENANTE'}.get(n['type'],n['type'])
        draw.add(String(x+10*scale,y+70*scale,f"{n.get('index',i+1):02d} / {kind}",fontName='NovalisSans',fontSize=max(3,9*scale),fillColor=COPPER))
        lines=simpleSplit(n['title'],'NovalisSansBold',12,200)
        if len(lines)>2:lines[1]=lines[1].rstrip()+'…'
        for j,label in enumerate(lines[:2]):draw.add(String(x+10*scale,y+(44-j*18)*scale,label,fontName='NovalisSansBold',fontSize=12*scale,fillColor=INK))
    return draw


def graph_register(graph,relations,width=170*mm):
    index={n['id']:i+1 for i,n in enumerate(graph['nodes'])}
    body=[['N°','Élément','Détail']]+[[str(i+1),n['title'],n.get('detail','')] for i,n in enumerate(graph['nodes'])]
    result=[table(body,[12*mm,width*.45,width-width*.45-12*mm],True),Spacer(1,6*mm)]
    if graph['edges']:
        body=[['De','Relation','Vers']]+[[str(index[e['source']]),relations.get(e['relation'],e['relation']),str(index[e['target']])] for e in graph['edges'] if e['source'] in index and e['target'] in index]
        result.append(table(body,[30*mm,width-60*mm,30*mm],True))
    return result


def graph_sheets(graph,relations,width=720,height=310):
    nodes=[{**n,'index':i+1} for i,n in enumerate(graph['nodes'])]
    story=[]
    # Each sheet is legible; cross-sheet relationships remain in the full register.
    for offset in [0]+list(range(8,len(nodes),12)):
        subset=nodes[offset:offset+(8 if offset==0 else 12)];ids={n['id'] for n in subset}
        if offset:story.append(PageBreak())
        story.extend([p(f"Éléments {offset+1} à {offset+len(subset)} sur {len(nodes)}",'PlanningSection'),
          p('Les liens vers d’autres planches sont détaillés dans le registre.','LabelNovalis'),Spacer(1,4*mm),
          diagram({'nodes':subset,'positions':{},'edges':[e for e in graph['edges'] if e['source'] in ids and e['target'] in ids]},width,height if offset else min(225,height))])
    return story

def graph_pdf(name,graph,relations):
    from .billing import settings
    seller=settings()
    story=logo(seller)+[p(brand_name(seller).upper()+' / ORGANISATION','LabelNovalis'),Spacer(1,4*mm),p(name,'TitleNovalis'),p('Relations, responsabilités et dépendances du projet.'),Spacer(1,5*mm)]
    story+=graph_sheets(graph,relations)
    story += [PageBreak(),p('Registre du schéma','TitleNovalis')]
    story+=graph_register(graph,relations,257*mm)
    return build(story,'Organisation - '+name,True,seller)


def specification_pdf(spec,snapshot,sections,invoices=None):
    from .planning import RELATIONS
    statuses={'draft':'BROUILLON COLLABORATIF','shared':'EN ATTENTE DES ACCORDS','accepted':'ACCORDS ENREGISTRÉS','declined':'À RÉVISER','superseded':'VERSION REMPLACÉE'}
    project=snapshot['project'];phases=snapshot['phases'];total=sum(ph['price_cents'] for ph in phases)
    seller=snapshot.get('seller',{})
    story=logo(seller)+[p(brand_name(seller).upper()+' / CAHIER DES CHARGES','LabelNovalis'),Spacer(1,12*mm),p(spec['title'],'TitleNovalis'),p(f"VERSION {spec['number']} / {statuses[spec['status']]}",'LabelNovalis'),Spacer(1,8*mm),p(project['name']),p('Échéance prévisionnelle : '+date_label(project['due_date'])),p('Budget des phases : '+money(total)+' HT'),p('Date de partage : '+(date_label(spec['shared_at']) if spec['shared_at'] else 'Non partagé')),Spacer(1,12*mm)]
    story+=[p('Accords sur cette version','TitleNovalis'),table([['Partie','Accord enregistré'],['Direction',date_label(spec['manager_at'])],['Client',date_label(spec['client_at'])]],[60*mm,110*mm]),Spacer(1,5*mm),p('Les accords sont enregistrés dans Novalis OS avec leur auteur et leur date. Ce document ne constitue pas une signature électronique qualifiée.','LabelNovalis'),PageBreak()]
    toc=TableOfContents();toc.levelStyles=[ParagraphStyle(name='ContentsEntry',fontName='NovalisSans',fontSize=10,leading=17,spaceBefore=5,textColor=INK)];toc.dotsMinLevel=0
    story+=[p('Sommaire','TitleNovalis'),Spacer(1,6*mm),toc,PageBreak(),heading('01 / Parties prenantes','TitleNovalis')]
    client=snapshot.get('client',{})
    if client:story+=[p(client.get('name','')),p(client.get('email','')),p(client.get('company_number',''))]
    names={u['id']:u['name'] for u in snapshot.get('team',[])}
    story.append(table([['Nom','Rôle']]+[[u['name'],{'account':'Responsable de projet','developer':'Développement','client':'Client','manager':'Direction'}.get(u['role'],u['role'])] for u in snapshot.get('team',[])],[100*mm,70*mm]))
    if snapshot.get('stakeholders'):
        story.append(Spacer(1,5*mm))
        story.append(p('Acteurs complémentaires et responsabilités','PlanningSection'))
        story.append(table([['Nom / organisation','Contribution']]+[[x['name']+((' · '+x['organisation']) if x.get('organisation') else ''),x['responsibility']] for x in snapshot['stakeholders']],[75*mm,95*mm]))
    story+=[Spacer(1,8*mm),p('Accord direction : '+(spec.get('manager_name') or names.get(spec.get('manager_by'),'En attente'))),p('Accord client : '+(spec.get('client_name') or names.get(spec.get('client_by'),'En attente'))),Spacer(1,10*mm)]
    for i,(key,label) in enumerate(sections.items(),2):
        story.append(KeepTogether([heading(f'{i:02d} / {label}'),p(spec['sections'].get(key) or 'À préciser conjointement.','BodyNovalis')])) if len(spec['sections'].get(key,''))<1000 else story.extend([heading(f'{i:02d} / {label}'),p(spec['sections'][key])])
        story.append(Spacer(1,5*mm))
    story+=[PageBreak(),heading('Phases, prix et échéances','TitleNovalis'),p('Les prix et les délais ci-dessous correspondent à cette version du cahier des charges.'),Spacer(1,5*mm)]
    story.append(table([['Phase','Début / fin','HT','TVA']]+[[ph['name'],date_label(ph['starts_on'])+'\n'+date_label(ph['due_date']),money(ph['price_cents']),str(ph['vat_basis_points']/100)+' %'] for ph in phases],[65*mm,45*mm,40*mm,20*mm]))
    story+=[Spacer(1,6*mm),p('Total HT : '+money(total)),p('TVA prévisionnelle : '+money(sum((ph['price_cents']*ph['vat_basis_points']+5000)//10000 for ph in phases))),Spacer(1,8*mm)]
    for ph in phases:story+=[p(ph['name'],'PlanningSection'),p(ph['description']),p('Critères de recette : '+ph['acceptance']),Spacer(1,8*mm)]
    graph=snapshot.get('graph')
    if graph and graph.get('nodes'):
        overview={**graph,'nodes':graph['nodes'][:9],'positions':{}}
        story+=[PageBreak(),heading('Organisation du projet','TitleNovalis'),p('Vue des 9 premiers éléments. Le registre ci-dessous répertorie tous les éléments et leurs relations.','LabelNovalis'),diagram(overview,480,300),Spacer(1,6*mm)]
        story+=graph_register(graph,RELATIONS)
    story+=[PageBreak(),heading('Maquettes et pièces jointes','TitleNovalis')]
    docs=snapshot.get('documents',[])
    if not docs:story.append(p('Aucune pièce jointe dans cette version.'))
    for d in docs:
        story+=[p(d['filename']),p(f"Référence : {d['id']} / {d['size']} octets",'LabelNovalis')]
        file=Path(current_app.config['FILES_DIR'])/d['id']
        if d['mime'] in {'image/png','image/jpeg','image/webp'} and file.is_file():
            try:
                from PIL import Image as PILImage
                with PILImage.open(file) as im:
                    im.thumbnail((1600,1600));buf=io.BytesIO();im.convert('RGB').save(buf,format='PNG');buf.seek(0)
                    w,h=im.size;scale=min(165*mm/w,150*mm/h)
                    story+=[Image(buf,width=w*scale,height=h*scale),Spacer(1,8*mm)]
            except (OSError,ValueError):story.append(p('Aperçu indisponible ; le fichier source reste dans les documents du projet.','LabelNovalis'))
        else:story.append(p('Pièce disponible dans l’espace partagé du projet.','LabelNovalis'))
    if spec['comments']:
        story+=[PageBreak(),heading('Contributions et échanges','TitleNovalis')]
        for c in spec['comments']:story+=[p(c['author']+' / '+c['created_at'][:16],'LabelNovalis'),p(sections.get(c['section'],'Discussion générale')),p(c['body']),Spacer(1,5*mm)]
    if invoices is not None:
        from .db import now
        story+=[PageBreak(),heading('Annexe / Situation financière','TitleNovalis'),p('État actualisé au '+date_label(now())+'. Cette annexe ne modifie pas les accords du cahier des charges.','LabelNovalis'),Spacer(1,8*mm)]
        if not invoices:story.append(p('Aucune facture publiée pour ce projet.'))
        else:
            story.append(table([['Facture','Échéance','TTC','Réglé','Solde']]+[[('TEST / ' if i['test_mode'] else '')+(i['number'] or i['title']),i['due_date'],money(i['total_cents']),money(i['paid_cents']),money(i['balance_cents'])] for i in invoices],[55*mm,30*mm,29*mm,28*mm,28*mm]))
            for i in invoices:
                story+=[Spacer(1,8*mm),p(i['number'] or i['title']),p(i['title'])]
                for l in i['snapshot']['lines']:story.append(p(l['description']+' / '+money(l['net_cents'])+' HT'))
                for r in i['receipts']:story.append(p('Reçu '+r['number']+' / '+money(r['amount_cents'])+' / '+r['paid_at'],'LabelNovalis'))
    return build(story,spec['title'],seller=seller)
