"""Direction-owned invoicing workspace, immutable snapshots and verified receipts."""
import io,json,re
from datetime import date
from decimal import Decimal,InvalidOperation,ROUND_HALF_UP
from flask import Blueprint,g,jsonify,abort,Response,current_app
from .db import row,rows,get_db,transaction,uid,now,audit,notify
from .security import required,project_access
from .validation import data,text,integer,choice,day
from .finance import invoice_access,present_invoice

billing=Blueprint('billing',__name__)
DEFAULTS={'legal_name':'','trade_name':'Novalis AI','address':'','postal_code':'','city':'','country':'BE','company_number':'','vat_number':'','email':'contact@novalisai.com','iban':'','bic':'','bank_name':'','terms':'Paiement à l’échéance indiquée.','default_due_days':15}
FIELDS={'legal_name':150,'trade_name':100,'address':300,'postal_code':20,'city':100,'country':2,'company_number':50,'vat_number':50,'email':254,'iban':40,'bic':11,'bank_name':100,'terms':2000}

def settings():
    found=row('SELECT payload FROM billing_settings WHERE org_id=?',(g.user['org_id'],))
    return {**DEFAULTS,**(json.loads(found['payload']) if found else {})}

def valid_iban(value):
    value=re.sub(r'\s','',value).upper()
    if not re.fullmatch(r'[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}',value):return False
    return int(''.join(str(ord(c)-55) if c.isalpha() else c for c in value[4:]+value[:4]))%97==1

def clean_party(d):
    if not isinstance(d,dict):abort(400,'Coordonnées de facturation invalides.')
    result={k:text(d,k,n,0,'') for k,n in {'name':150,'address':300,'postal_code':20,'city':100,'country':2,'company_number':50,'vat_number':50,'email':254}.items()}
    result['country']=(result['country'] or 'BE').upper()
    if not result['name']:abort(400,'Le nom du destinataire est requis.')
    return result

def calculations(values):
    if not isinstance(values,list) or not 1<=len(values)<=100:abort(400,'Ajoutez entre 1 et 100 prestations.')
    result=[]
    for v in values:
        if not isinstance(v,dict):abort(400,'Prestation invalide.')
        try:
            quantity=Decimal(str(v.get('quantity','1')))
            if not quantity.is_finite() or quantity<=0 or quantity>10000 or quantity.as_tuple().exponent < -3:raise ValueError()
        except (InvalidOperation,ValueError):abort(400,'La quantité doit être positive, avec 3 décimales au maximum.')
        unit=integer(v,'unit_cents',0,100000000);vat=integer(v,'vat_basis_points',0,10000)
        discount=integer(v,'discount_basis_points',0,10000,0)
        net=int((quantity*unit*(10000-discount)/10000).quantize(Decimal(1),rounding=ROUND_HALF_UP))
        tax=(net*vat+5000)//10000
        result.append({'description':text(v,'description',1000),'quantity':str(quantity),'unit':text(v,'unit',30,0,'unité'),'unit_cents':unit,'vat_basis_points':vat,'discount_basis_points':discount,'net_cents':net,'tax_cents':tax,'total_cents':net+tax})
    if not 0<sum(v['total_cents'] for v in result)<=100000000:abort(400,'Le total TTC doit être positif et inférieur ou égal à 1 000 000 €.')
    return result

def totals(lines):
    groups={}
    for l in lines:
        v=groups.setdefault(str(l['vat_basis_points']),{'net_cents':0,'tax_cents':0})
        v['net_cents']+=l['net_cents'];v['tax_cents']+=l['tax_cents']
    return {'net_cents':sum(l['net_cents'] for l in lines),'tax_cents':sum(l['tax_cents'] for l in lines),'total_cents':sum(l['total_cents'] for l in lines),'vat_groups':groups}

def document(identifier):
    invoice=invoice_access(identifier)
    doc=row('SELECT * FROM billing_documents WHERE invoice_id=? AND org_id=?',(identifier,g.user['org_id']))
    if not doc or (g.user['role']=='client' and not doc['published_at']):abort(404,'Facture introuvable.')
    return invoice,doc

def receipts(invoice,doc):
    if doc['test_mode']:
        return [{**r,'kind':'test','number':'TEST-RECU-'+r['id'][:10].upper()} for r in rows('SELECT * FROM billing_test_receipts WHERE invoice_id=? ORDER BY paid_at',(invoice['id'],))]
    bank=[{**r,'kind':'bank','method':'Virement bancaire','reference':r['bank_reference'],'number':'RECU-'+r['id'][:12].upper()} for r in rows('SELECT id,amount_cents,bank_reference,paid_at FROM payments WHERE invoice_id=? ORDER BY paid_at',(invoice['id'],))]
    online=[{'id':r['attempt_id'],'kind':'online','method':r['method'] or 'Paiement en ligne','reference':r['provider_id'],'number':'RECU-'+r['attempt_id'][:12].upper(),'amount_cents':r['amount_cents'],'paid_at':r['paid_at']} for r in rows('SELECT r.*,a.method FROM provider_receipts r JOIN payment_attempts a ON a.id=r.attempt_id WHERE r.invoice_id=? ORDER BY r.paid_at',(invoice['id'],))]
    return bank+online

def presented(invoice,doc,detail=False):
    snap=json.loads(doc['snapshot']);rs=receipts(invoice,doc)
    total=totals(snap['lines']);paid=sum(r['amount_cents'] for r in rs) if doc['test_mode'] else present_invoice(invoice)['paid_cents']
    balance=total['total_cents']-paid
    status='canceled' if doc['canceled_at'] else 'draft' if not doc['issued_at'] else 'paid' if balance<=0 else 'partial' if paid else 'overdue' if invoice['due_date']<date.today().isoformat() else 'unpaid'
    result={'id':invoice['id'],'project_id':invoice['project_id'],'number':invoice['external_number'],'title':doc['title'],'test_mode':bool(doc['test_mode']),'recipient_type':doc['recipient_type'],'client_name':snap['recipient']['name'],'due_date':invoice['due_date'],'issued_at':doc['issued_at'],'published_at':doc['published_at'],'status':status,'version':doc['version'],'total_cents':total['total_cents'],'paid_cents':paid,'balance_cents':balance,'peppol_status':doc['peppol_status'],'request_count':doc['request_count'],'created_at':invoice['created_at']}
    if detail:result.update(events=rows("SELECT action,created_at FROM audit WHERE entity_id=? AND action IN ('billing.published','billing.payment_requested','billing.transfer_declared','billing.test_paid','billing.test_failed','billing.test_canceled') ORDER BY id DESC LIMIT 20",(invoice['id'],)),snapshot=snap,totals=total,receipts=rs,transfer_notices=rows('SELECT reference,created_at FROM billing_transfer_notices WHERE invoice_id=?',(invoice['id'],)))
    return result

@billing.get('/api/billing')
@required('manager','finance','client')
def overview():
    suffix=' AND p.client_id=? AND b.published_at IS NOT NULL AND b.canceled_at IS NULL' if g.user['role']=='client' else ''
    params=(g.user['org_id'],g.user['client_id']) if g.user['role']=='client' else (g.user['org_id'],)
    items=[]
    for r in rows('SELECT i.id FROM invoices i JOIN billing_documents b ON b.invoice_id=i.id JOIN projects p ON p.id=i.project_id WHERE b.org_id=?'+suffix+' ORDER BY i.created_at DESC',params):
        inv,doc=document(r['id']);items.append(presented(inv,doc))
    real=[i for i in items if not i['test_mode'] and i['status'] not in {'draft','canceled'}]
    return jsonify(items=items,totals={'invoiced_cents':sum(i['total_cents'] for i in real),'paid_cents':sum(i['paid_cents'] for i in real),'balance_cents':sum(max(0,i['balance_cents']) for i in real)},test_count=sum(i['test_mode'] for i in items))

@billing.get('/api/billing/setup')
@required('manager','finance')
def setup():
    projects=rows('SELECT p.id,p.name,p.client_id,c.name AS client_name,c.email,c.company_number FROM projects p JOIN clients c ON c.id=p.client_id WHERE p.org_id=? ORDER BY c.name,p.name',(g.user['org_id'],))
    test_clients=[r['client_id'] for r in rows('SELECT t.client_id FROM billing_test_clients t JOIN clients c ON c.id=t.client_id WHERE c.org_id=?',(g.user['org_id'],))]
    from .payments import payment_configuration
    return jsonify(settings=settings(),projects=projects,test_clients=test_clients,peppol={'state':'not_connected','provider':'falco','message':'Connexion Falco à ajouter. Aucun document n’est envoyé sur Peppol.'},payment=payment_configuration())

@billing.put('/api/billing/settings')
@required('manager')
def save_settings():
    d=data();values={k:text(d,k,n,0,'') for k,n in FIELDS.items()}
    values['country']=(values['country'] or 'BE').upper();values['iban']=re.sub(r'\s','',values['iban']).upper();values['bic']=values['bic'].upper()
    if values['iban'] and not valid_iban(values['iban']):abort(400,'IBAN invalide : vérifiez les chiffres et le pays.')
    if values['bic'] and not re.fullmatch('[A-Z0-9]{8}([A-Z0-9]{3})?',values['bic']):abort(400,'BIC invalide.')
    values['default_due_days']=integer(d,'default_due_days',0,180,15)
    with transaction() as db:
        db.execute('INSERT INTO billing_settings VALUES(?,?,?) ON CONFLICT(org_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',(g.user['org_id'],json.dumps(values),now()));audit('billing.settings_updated',g.user['org_id'])
    return jsonify(ok=True)

def draft_values(d):
    project=project_access(text(d,'project_id',40),finances=True)
    test=d.get('test_mode') is True
    if test and not row('SELECT 1 FROM billing_test_clients WHERE client_id=?',(project['client_id'],)):abort(400,'Le mode test est réservé à une organisation de démonstration.')
    if not test and row('SELECT 1 FROM billing_test_clients WHERE client_id=?',(project['client_id'],)):abort(400,'Une organisation de test ne peut pas recevoir de facture réelle.')
    lines=calculations(d.get('lines'));recipient=clean_party(d.get('recipient',{}));kind=choice(d,'recipient_type',['belgian_business','consumer','international'],'belgian_business')
    if not test and kind=='consumer' and (recipient['vat_number'] or recipient['company_number']):abort(400,'Un destinataire professionnel ne peut pas être classé comme particulier.')
    if not test and kind=='international' and recipient['country']=='BE':abort(400,'Un client belge ne peut pas être classé comme client à l’étranger.')
    due=day(d,'due_date');issue=day(d,'issue_date');service=day(d,'service_date')
    if due<issue:abort(400,'L’échéance doit suivre la date de facture.')
    snap={'recipient':recipient,'seller':settings(),'lines':lines,'issue_date':issue,'service_date':service,'notes':text(d,'notes',3000,0,''),'vat_note':text(d,'vat_note',1000,0,''),'terms':text(d,'terms',3000,0,settings()['terms']),'reference':text(d,'reference',100,0,''),'buyer_reference':text(d,'buyer_reference',100,0,''),'title':text(d,'title',200)}
    return project,test,kind,due,snap

def replace_lines(db,identifier,lines):
    db.execute('DELETE FROM invoice_lines WHERE invoice_id=?',(identifier,))
    for l in lines:db.execute('INSERT INTO invoice_lines VALUES(?,?,?,?,?,?)',(uid(),identifier,l['description'],1,l['net_cents'],l['vat_basis_points']))

@billing.post('/api/billing')
@required('manager')
def create():
    d=data()
    with transaction() as db:
        project,test,kind,due,snap=draft_values(d);identifier=uid()
        db.execute('INSERT INTO invoices(id,project_id,due_date,created_at) VALUES(?,?,?,?)',(identifier,project['id'],due,now()))
        replace_lines(db,identifier,snap['lines'])
        db.execute('INSERT INTO billing_documents(invoice_id,org_id,test_mode,title,recipient_type,snapshot) VALUES(?,?,?,?,?,?)',(identifier,g.user['org_id'],int(test),snap['title'],kind,json.dumps(snap)))
        audit('billing.draft_created',identifier,{'test_mode':test})
    return jsonify(id=identifier),201

@billing.patch('/api/billing/<identifier>')
@required('manager')
def edit(identifier):
    d=data()
    with transaction() as db:
        inv,doc=document(identifier)
        if doc['issued_at'] or doc['canceled_at'] or d.get('version')!=doc['version']:abort(409,'Ce brouillon a changé ou a déjà été publié. Rechargez-le.')
        project,test,kind,due,snap=draft_values(d)
        linked=row('SELECT pi.*,ph.project_id,ph.vat_basis_points FROM phase_invoices pi JOIN project_phases ph ON ph.id=pi.phase_id WHERE pi.invoice_id=?',(identifier,))
        if linked:
            frozen=row('SELECT snapshot FROM project_specs WHERE id=?',(linked['spec_id'],))
            phase=next(x for x in json.loads(frozen['snapshot'])['phases'] if x['id']==linked['phase_id'])
            if project['id']!=linked['project_id'] or totals(snap['lines'])['net_cents']!=linked['amount_cents'] or any(l['vat_basis_points']!=phase['vat_basis_points'] for l in snap['lines']):
                abort(409,'Cette facture est liée au prix convenu d’une phase. Conservez le projet, le montant HT et la TVA ; annulez le brouillon pour préparer un autre montant.')
        db.execute('UPDATE invoices SET project_id=?,due_date=? WHERE id=?',(project['id'],due,identifier));replace_lines(db,identifier,snap['lines'])
        db.execute('UPDATE billing_documents SET test_mode=?,title=?,recipient_type=?,snapshot=?,version=version+1 WHERE invoice_id=?',(int(test),snap['title'],kind,json.dumps(snap),identifier));audit('billing.draft_updated',identifier)
    return jsonify(ok=True)

@billing.get('/api/billing/<identifier>')
@required('manager','finance','client')
def detail(identifier):
    inv,doc=document(identifier);result=presented(inv,doc,True)
    from .payments import payment_configuration
    result['online']=payment_configuration();result['bank_available']=bool(valid_iban(result['snapshot']['seller'].get('iban',''))) and not doc['test_mode']
    result['can_pay']=bool(doc['published_at']) and not doc['canceled_at'] and result['balance_cents']>0
    return jsonify(document=result)

@billing.post('/api/billing/<identifier>/publish')
@required('manager')
def publish(identifier):
    d=data()
    with transaction() as db:
        inv,doc=document(identifier)
        if doc['issued_at']:return jsonify(number=inv['external_number'],replayed=True)
        if doc['canceled_at'] or d.get('version')!=doc['version']:abort(409,'Le brouillon a changé. Rechargez-le.')
        snap=json.loads(doc['snapshot']);seller=settings()
        if not doc['test_mode']:
            if doc['recipient_type']=='belgian_business':abort(409,'Facture B2B préparée : raccordez Falco avant l’émission Peppol. Vous pouvez tester le parcours avec le client de démonstration.')
            if any(not seller.get(k) for k in ['legal_name','address','postal_code','city','company_number','email']):abort(400,'Complétez les coordonnées légales de Novalis dans les paramètres.')
            if any(not snap['recipient'].get(k) for k in ['address','postal_code','city']):abort(400,'Complétez l’adresse du client.')
            if d.get('compliance_confirmed') is not True:abort(400,'Confirmez les mentions et le régime de TVA applicables avant émission.')
            if any(l['vat_basis_points']==0 for l in snap['lines']) and not snap['vat_note']:abort(400,'Indiquez la justification du traitement TVA à 0 %.')
        else:
            seller={**seller,'legal_name':'Novalis AI - DEMONSTRATION','address':'Données de démonstration','postal_code':'','city':'','company_number':'TEST','vat_number':'TEST','iban':'','bic':''}
        snap['seller']=seller
        if snap['issue_date']!=date.today().isoformat():abort(400,'La date d’émission doit être celle du jour. Modifiez le brouillon.')
        year=date.today().year
        seq=row('SELECT number FROM billing_sequences WHERE org_id=? AND year=? AND test_mode=?',(g.user['org_id'],year,doc['test_mode']))
        number=(seq['number'] if seq else 0)+1
        db.execute('INSERT INTO billing_sequences VALUES(?,?,?,?) ON CONFLICT(org_id,year,test_mode) DO UPDATE SET number=excluded.number',(g.user['org_id'],year,doc['test_mode'],number))
        reference=('DEMO-TEST-' if doc['test_mode'] and g.user['org_id']=='novalis-demo' else 'TEST-' if doc['test_mode'] else '')+f'NV-{year}-{number:05d}'
        db.execute('UPDATE billing_documents SET snapshot=?,issued_at=?,published_at=?,version=version+1 WHERE invoice_id=?',(json.dumps(snap),now(),now(),identifier))
        db.execute("UPDATE invoices SET external_number=?,status='registered' WHERE id=?",(reference,identifier))
        for u in rows("SELECT id FROM users WHERE client_id=? AND status='active'",(project_access(inv['project_id'],finances=True)['client_id'],)):notify(u['id'],'billing.invoice',identifier,'Une facture est disponible dans votre espace.')
        audit('billing.published',identifier,{'number':reference,'test_mode':bool(doc['test_mode'])})
    return jsonify(number=reference)

@billing.post('/api/billing/<identifier>/request-payment')
@required('manager')
def request_payment(identifier):
    with transaction() as db:
        inv,doc=document(identifier);v=presented(inv,doc)
        if not doc['published_at'] or doc['canceled_at'] or v['balance_cents']<=0:abort(409,'Seule une facture publiée avec un solde dû peut faire l’objet d’une demande.')
        project=project_access(inv['project_id'],finances=True)
        recipients=rows("SELECT id FROM users WHERE client_id=? AND status='active'",(project['client_id'],))
        if not recipients:abort(409,'Invitez d’abord le client dans son espace Novalis.')
        if doc['last_requested_at'] and doc['last_requested_at'][:10]==now()[:10]:return jsonify(ok=True,replayed=True)
        for u in recipients:notify(u['id'],'billing.payment_request',identifier,'Une demande de paiement est disponible : '+inv['external_number'])
        db.execute('UPDATE billing_documents SET request_count=request_count+1,last_requested_at=? WHERE invoice_id=?',(now(),identifier));audit('billing.payment_requested',identifier)
    return jsonify(ok=True)

@billing.post('/api/billing/<identifier>/cancel')
@required('manager')
def cancel(identifier):
    with transaction() as db:
        inv,doc=document(identifier)
        if doc['issued_at']:abort(409,'Une facture émise est conservée. Une correction nécessite un avoir dans le circuit comptable.')
        db.execute('UPDATE billing_documents SET canceled_at=?,version=version+1 WHERE invoice_id=?',(now(),identifier));audit('billing.draft_canceled',identifier)
    return jsonify(ok=True)

@billing.post('/api/billing/<identifier>/transfer-notice')
@required('client')
def transfer_notice(identifier):
    d=data()
    with transaction() as db:
        inv,doc=document(identifier)
        if not doc['published_at'] or presented(inv,doc)['balance_cents']<=0:abort(409,'Aucun règlement attendu.')
        ref=text(d,'reference',200,0,'Virement déclaré par le client')
        db.execute('INSERT INTO billing_transfer_notices VALUES(?,?,?,?,?) ON CONFLICT(invoice_id,user_id) DO NOTHING',(uid(),identifier,g.user['id'],ref,now()));audit('billing.transfer_declared',identifier)
    return jsonify(ok=True,message='Déclaration reçue. Le paiement reste à vérifier sur le compte bancaire.')

@billing.post('/api/billing/<identifier>/simulate')
@required('manager','client')
def simulate(identifier):
    d=data()
    with transaction() as db:
        inv,doc=document(identifier)
        if not doc['test_mode'] or not doc['published_at'] or doc['canceled_at']:abort(403,'La simulation est réservée aux factures TEST publiées.')
        key=text(d,'idempotency_key',100,8);method=choice(d,'method',['bancontact','transfer','qr']);outcome=choice(d,'outcome',['paid','failed','canceled'],'paid')
        previous=row('SELECT * FROM billing_test_receipts WHERE idempotency_key=?',(key,))
        if previous:
            if previous['invoice_id']!=identifier or previous['amount_cents']!=d.get('amount_cents') or previous['method']!=method:abort(409,'Clé déjà utilisée pour une autre opération.')
            return jsonify(ok=True,replayed=True)
        amount=integer(d,'amount_cents',1,100000000)
        if amount>presented(inv,doc)['balance_cents']:abort(409,'Le montant dépasse le solde restant.')
        if outcome=='paid':
            db.execute('INSERT INTO billing_test_receipts VALUES(?,?,?,?,?,?,?)',(uid(),identifier,amount,method,'SIMULATION - aucun mouvement bancaire',now(),key))
            if presented(inv,doc)['balance_cents']==0:db.execute("UPDATE invoices SET status='paid' WHERE id=?",(identifier,))
        audit('billing.test_'+outcome,identifier,{'amount_cents':amount,'method':method})
    return jsonify(ok=True,outcome=outcome)

@billing.get('/api/billing/<identifier>/pdf')
@required('manager','finance','client')
def pdf(identifier):
    inv,doc=document(identifier)
    from .billing_pdf import invoice_pdf
    v=presented(inv,doc,True)
    return Response(invoice_pdf(v),mimetype='application/pdf',headers={'Content-Disposition':'attachment; filename="'+(inv['external_number'] or 'BROUILLON-'+identifier[:8])+'.pdf"'})

@billing.get('/api/billing/<identifier>/receipts/<receipt_id>/pdf')
@required('manager','finance','client')
def receipt_pdf(identifier,receipt_id):
    inv,doc=document(identifier);v=presented(inv,doc,True);r=next((r for r in v['receipts'] if r['id']==receipt_id),None)
    if not r:abort(404,'Reçu disponible uniquement après confirmation du règlement.')
    from .billing_pdf import receipt_pdf as render
    return Response(render(v,r),mimetype='application/pdf',headers={'Content-Disposition':'attachment; filename="'+r['number']+'.pdf"'})

@billing.get('/api/billing/<identifier>/qr.svg')
@required('manager','finance','client')
def qr(identifier):
    inv,doc=document(identifier);v=presented(inv,doc,True)
    if not doc['published_at'] or v['balance_cents']<=0:abort(409,'Aucun paiement attendu.')
    from .billing_pdf import qr_svg,epc_payload
    payload=current_app.config['APP_ORIGIN']+'/os/#invoice='+identifier if doc['test_mode'] else epc_payload(v)
    if not payload:abort(409,'Configurez un IBAN valide avant de proposer le QR de virement.')
    return Response(qr_svg(payload),mimetype='image/svg+xml')

@billing.get('/api/billing/<identifier>/falco-payload')
@required('manager')
def falco_payload(identifier):
    inv,doc=document(identifier);v=presented(inv,doc,True)
    result={'integration_status':'not_connected','purpose':'Données préparées pour le futur connecteur Falco. Aucun envoi effectué.','invoice':v,'currency':'EUR'}
    return Response(json.dumps(result,ensure_ascii=False,indent=2),mimetype='application/json',headers={'Content-Disposition':'attachment; filename="preparation-falco-'+identifier[:8]+'.json"'})
