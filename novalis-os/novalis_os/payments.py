"""Hosted payments: durable attempts, verified callbacks, isolated test ledger."""
import hashlib,json,re
from datetime import datetime,timedelta,timezone
from flask import Blueprint,current_app,g,request,jsonify,abort
from .db import row,rows,uid,now,transaction,audit
from .security import required,rate_limit
from .validation import data,text,integer
from .finance import invoice_access,present_invoice
from .payment_provider import provider,configured,ProviderError,amount,cents,safe_checkout
payments=Blueprint('payments',__name__)
STATES={'open','pending','authorized','paid','failed','expired','canceled'}
REFUND_STATES={'queued','pending','processing','refunded','failed','canceled'}

def payment_configuration():
    mode=current_app.config['PAYMENTS_MODE'];ready=configured(mode)
    return dict(state=mode if ready else 'not_configured',provider='mollie',mode=mode if ready else 'disabled',enabled=ready,
                live_enabled=ready and mode=='live',currency='EUR',recurring=False,
                message='Paiements réels activés.' if ready and mode=='live' else 'Mode test : aucun règlement réel ni écriture comptable.' if ready else 'Compte marchand et clés sécurisées à raccorder. Aucun encaissement en ligne actif.')

def fingerprint(mode):return hashlib.sha256(current_app.config.get('MOLLIE_'+mode.upper()+'_KEY','').encode()).hexdigest()[:20]
def require_config(mode=None):
    if not configured(mode):abort(503,'Le paiement en ligne n’est pas configuré. Contactez votre interlocuteur.')

def public_attempt(item):
    result={k:item[k] for k in ['id','invoice_id','mode','amount_cents','method','provider_id','status','error','created_at','updated_at']}
    result.update(checkout_url=item['checkout_url'] if item['status'] in {'open','pending'} else None,test_only=item['mode']=='test',
                  refunds=rows('SELECT id,amount_cents,reason,provider_id,status,error,created_at FROM refund_attempts WHERE attempt_id=? ORDER BY created_at DESC',(item['id'],)),
                  events=rows('SELECT status,detail,created_at FROM payment_events WHERE attempt_id=? ORDER BY id DESC LIMIT 20',(item['id'],)))
    return result

def attempt_access(identifier):
    item=row('SELECT * FROM payment_attempts WHERE id=? AND org_id=?',(identifier,g.user['org_id']))
    if not item:abort(404)
    invoice_access(item['invoice_id'])
    if item['mode']=='test' and g.user['role']=='client':abort(404)
    return item

def set_state(db,item,status,error=''):
    if item['status']!=status or item['error']!=error:db.execute('INSERT INTO payment_events(attempt_id,status,detail,created_at) VALUES(?,?,?,?)',(item['id'],status,error,now()))
    db.execute('UPDATE payment_attempts SET status=?,error=?,lease_until=NULL,updated_at=? WHERE id=?',(status,error,now(),item['id']))

def verify_resource(item,r):
    m=r.get('metadata')
    if not isinstance(m,dict) or r.get('mode')!=item['mode'] or any(m.get(k)!=item[v] for k,v in [('novalis_attempt','id'),('invoice_id','invoice_id'),('org_id','org_id')]):raise ValueError()
    if r.get('amount',{}).get('currency')!='EUR' or cents(r.get('amount',{}).get('value'))!=item['amount_cents']:raise ValueError()
    if not re.fullmatch(r'tr_[A-Za-z0-9]{3,64}',r.get('id','')) or (item['provider_id'] and item['provider_id']!=r['id']) or r.get('status') not in STATES:raise ValueError()
    if item['method'] and r.get('method')!=item['method']:raise ValueError()

def apply_resource(identifier,r):
    with transaction() as db:
        item=row('SELECT * FROM payment_attempts WHERE id=?',(identifier,))
        try:verify_resource(item,r)
        except (ValueError,TypeError,AttributeError):set_state(db,item,'anomaly','Réponse incohérente : rapprochement manuel requis.');return
        status=r['status']
        if item['status']=='paid' and status!='paid':return
        try:checkout=safe_checkout(r.get('_links',{}).get('checkout',{}).get('href')) if status in {'open','pending'} else None
        except (ProviderError,ValueError):
            db.execute('UPDATE payment_attempts SET provider_id=? WHERE id=?',(r['id'],identifier));set_state(db,item,'anomaly','URL du prestataire invalide. Rapprochement requis.');return
        db.execute('UPDATE payment_attempts SET provider_id=?,checkout_url=?,method=? WHERE id=?',(r['id'],checkout,r.get('method') or item['method'],identifier));set_state(db,item,status)
        if status=='paid' and item['mode']=='live' and not row('SELECT id FROM provider_receipts WHERE attempt_id=?',(identifier,)):
            invoice=row('SELECT * FROM invoices WHERE id=?',(item['invoice_id'],));balance=max(0,present_invoice(invoice)['balance_cents']);allocated=min(balance,item['amount_cents']);excess=item['amount_cents']-allocated
            try:
                stamp=datetime.fromisoformat(r.get('paidAt','').replace('Z','+00:00'))
                if stamp.tzinfo is None:raise ValueError()
            except (ValueError,AttributeError,TypeError):set_state(db,item,'anomaly','Date de paiement absente ou invalide.');return
            db.execute('INSERT INTO provider_receipts VALUES(?,?,?,?,?,?,?,?,?)',(uid(),identifier,item['invoice_id'],r['id'],item['amount_cents'],allocated,excess,stamp.isoformat(),now()))
            if allocated and allocated==balance:db.execute("UPDATE invoices SET status='paid' WHERE id=?",(item['invoice_id'],))
            audit('payment.provider_verified',identifier,dict(invoice_id=item['invoice_id'],amount_cents=item['amount_cents'],excess_cents=excess),org_id=item['org_id'])
            if excess:db.execute('INSERT INTO payment_events(attempt_id,status,detail,created_at) VALUES(?,?,?,?)',(identifier,'overpayment','Trop-perçu à traiter : '+str(excess)+' centimes.',now()))

def reconcile_attempt(identifier):
    item=row('SELECT * FROM payment_attempts WHERE id=?',(identifier,));require_config(item['mode']);remote=provider(item['mode'])
    r=remote.get(item['provider_id']) if item['provider_id'] else remote.find(identifier)
    if r:apply_resource(identifier,r)
    return r is not None

@payments.get('/api/payments/config')
@required('manager','finance','client','sysadmin')
def configuration():return jsonify(payment_configuration())

@payments.get('/api/invoices/<invoice_id>/payment-methods')
@required('manager','finance','client')
def methods(invoice_id):
    invoice=invoice_access(invoice_id);config=payment_configuration();eligible=invoice['status']=='registered' and present_invoice(invoice)['balance_cents']>=2
    if not config['enabled'] or not eligible or (config['mode']=='test' and g.user['role']=='client'):return jsonify(items=[],configuration=config,eligible=eligible)
    try:items=provider(config['mode']).methods(present_invoice(invoice)['balance_cents'])
    except ProviderError:abort(503,'Impossible de récupérer les moyens de paiement. Réessayez.')
    return jsonify(items=[{'id':m['id'],'description':m.get('description',m['id'])} for m in items if isinstance(m,dict) and re.fullmatch(r'[a-z]{2,30}',m.get('id',''))],configuration=config,eligible=True)

@payments.get('/api/invoices/<invoice_id>/payment-attempts')
@required('manager','finance','client')
def invoice_attempts(invoice_id):
    invoice_access(invoice_id);suffix=" AND mode='live'" if g.user['role']=='client' else ''
    return jsonify(items=[public_attempt(i) for i in rows('SELECT * FROM payment_attempts WHERE invoice_id=?'+suffix+' ORDER BY created_at DESC',(invoice_id,))])

@payments.post('/api/invoices/<invoice_id>/checkout')
@required('manager','finance','client')
def checkout(invoice_id):
    d=data()
    if set(d)-{'method'}:abort(400,'Le montant est calculé par le serveur ; fournissez uniquement le moyen de paiement.')
    require_config();mode=current_app.config['PAYMENTS_MODE']
    if mode=='test' and g.user['role']=='client':abort(403,'Les tests sont réservés à la direction et aux finances.')
    rate_limit('checkout',20,60,invoice_id);chosen=text(d,'method',30,0,'');invoice=invoice_access(invoice_id);total=present_invoice(invoice)['balance_cents']
    if invoice['status']!='registered' or total<2:abort(409,'Cette facture ne peut pas être payée en ligne dans son état actuel.')
    try:available=provider(mode).methods(total)
    except ProviderError:abort(503,'Le prestataire ne répond pas. Aucun paiement n’a été créé.')
    if not available or (chosen and chosen not in [m.get('id') for m in available]):abort(400,'Moyen de paiement indisponible pour ce montant et ce profil marchand.')
    claimed=False
    with transaction() as db:
        invoice=invoice_access(invoice_id);total=present_invoice(invoice)['balance_cents']
        if invoice['status']!='registered' or total<2:abort(409,'Le solde a changé. Rechargez la facture.')
        item=row("SELECT * FROM payment_attempts WHERE invoice_id=? AND mode=? AND status IN ('creating','uncertain','open','pending','authorized','anomaly')",(invoice_id,mode))
        if item:
            if item['status']=='anomaly':abort(409,'Un paiement nécessite un rapprochement avant de poursuivre.')
            if item['provider_id'] or (item['lease_until'] and item['lease_until']>now()):return jsonify(attempt=public_attempt(item)),200
            payload=json.loads(item['payload'])
            if payload.pop('_key_fingerprint',None)!=fingerprint(mode):abort(409,'Clé marchand modifiée. Rapprochez la tentative auprès du prestataire.')
            age=(datetime.now(timezone.utc)-datetime.fromisoformat(item['created_at'])).total_seconds()
            if age>3000:abort(409,'Tentative incertaine ancienne. Rapprochez-la avant toute nouvelle création.')
            if item['amount_cents']!=total:abort(409,'Solde modifié pendant un paiement incertain. Rapprochement requis.')
        else:
            identifier=uid();origin=current_app.config['APP_ORIGIN'].rstrip('/')
            payload=dict(amount=amount(total),description=('Novalis / '+invoice['external_number'])[:255],redirectUrl=origin+'/os/#payment='+identifier,webhookUrl=origin+'/api/payments/mollie/webhook',locale='fr_BE',sequenceType='oneoff',metadata=dict(novalis_attempt=identifier,invoice_id=invoice_id,org_id=g.user['org_id']))
            if chosen:payload['method']=chosen
            db.execute('INSERT INTO payment_attempts(id,org_id,invoice_id,requester_id,mode,amount_cents,method,idempotency_key,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(identifier,g.user['org_id'],invoice_id,g.user['id'],mode,total,chosen,uid(),json.dumps({**payload,'_key_fingerprint':fingerprint(mode)}),now(),now()))
            item=row('SELECT * FROM payment_attempts WHERE id=?',(identifier,));db.execute('INSERT INTO payment_events(attempt_id,status,created_at) VALUES(?,?,?)',(identifier,'creating',now()));claimed=True
        db.execute('UPDATE payment_attempts SET lease_until=? WHERE id=?',((datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat(timespec='seconds'),item['id']))
    try:
        remote=provider(mode);resource=remote.create(payload,item['idempotency_key']) if claimed else remote.find(item['id']) or remote.create(payload,item['idempotency_key']);apply_resource(item['id'],resource)
    except ProviderError as error:
        with transaction() as db:
            fresh=row('SELECT * FROM payment_attempts WHERE id=?',(item['id'],))
            if not fresh['provider_id']:set_state(db,fresh,'uncertain' if error.ambiguous else 'failed',str(error))
        abort(503,'Création non confirmée. Consultez cette facture avant de réessayer.')
    return jsonify(attempt=public_attempt(row('SELECT * FROM payment_attempts WHERE id=?',(item['id'],)))),201 if claimed else 200

@payments.get('/api/payment-attempts/<attempt_id>')
@required('manager','finance','client')
def attempt_detail(attempt_id):return jsonify(attempt=public_attempt(attempt_access(attempt_id)))

@payments.post('/api/payment-attempts/<attempt_id>/reconcile')
@required('manager','finance','client')
def reconcile(attempt_id):
    attempt_access(attempt_id);rate_limit('payment_reconcile',15,60,attempt_id)
    try:found=reconcile_attempt(attempt_id);reconcile_refunds(attempt_id)
    except ProviderError:abort(503,'Confirmation serveur indisponible. Le retour navigateur ne prouve pas le paiement.')
    return jsonify(found=found,attempt=public_attempt(row('SELECT * FROM payment_attempts WHERE id=?',(attempt_id,))))

@payments.post('/api/payments/mollie/webhook')
def webhook():
    if request.content_length and request.content_length>2048:abort(413)
    identifier=request.form.get('id','')
    if not re.fullmatch(r'tr_[A-Za-z0-9]{3,64}',identifier):return '',200
    item=row('SELECT * FROM payment_attempts WHERE provider_id=?',(identifier,))
    if not item:return '',200
    rate_limit('mollie_callback',120,60,identifier)
    try:reconcile_attempt(item['id']);reconcile_refunds(item['id'])
    except ProviderError:return '',503
    return '',200

def reconcile_refunds(attempt_id):
    item=row('SELECT * FROM payment_attempts WHERE id=?',(attempt_id,));refunds=rows("SELECT * FROM refund_attempts WHERE attempt_id=? AND status NOT IN ('refunded','failed','canceled')",(attempt_id,))
    if not refunds or not item['provider_id']:return
    remote_items=provider(item['mode']).refunds(item['provider_id'])
    for refund in refunds:
        r=next((r for r in remote_items if (refund['provider_id'] and r.get('id')==refund['provider_id']) or r.get('description')=='Novalis refund '+refund['id']),None)
        if r:apply_refund(refund['id'],r)

def apply_refund(identifier,r):
    with transaction() as db:
        item=row('SELECT * FROM refund_attempts WHERE id=?',(identifier,))
        try:
            if r.get('status') not in REFUND_STATES or r.get('amount',{}).get('currency')!='EUR' or cents(r['amount']['value'])!=item['amount_cents'] or not re.fullmatch(r're_[A-Za-z0-9]{3,64}',r.get('id','')) or r.get('description')!='Novalis refund '+identifier or (item['provider_id'] and item['provider_id']!=r['id']):raise ValueError()
        except (ValueError,KeyError,TypeError):db.execute("UPDATE refund_attempts SET status='uncertain',error=?,updated_at=? WHERE id=?",('Réponse incohérente : rapprochement manuel requis.',now(),identifier));return
        if item['status']=='refunded':return
        db.execute('UPDATE refund_attempts SET provider_id=?,status=?,error=?,updated_at=? WHERE id=?',(r['id'],r['status'],'',now(),identifier))
        if item['status']!=r['status']:
            org=row('SELECT org_id FROM payment_attempts WHERE id=?',(item['attempt_id'],))['org_id'];audit('payment.refund_'+r['status'],identifier,{'amount_cents':item['amount_cents']},org_id=org)
        # An external credit note is separate. Never silently rewrite an issued invoice
        # or reopen a debt just because a commercial refund was requested.

@payments.post('/api/payment-attempts/<attempt_id>/refunds')
@required('manager','finance')
def refund_create(attempt_id):
    d=data();item=attempt_access(attempt_id);require_config(item['mode']);value=integer(d,'amount_cents',1,100000000);reason=text(d,'reason',500);key=text(d,'idempotency_key',100,8)
    if d.get('confirmed') is not True:abort(400,'Confirmez le remboursement et le traitement comptable associé.')
    try:reconcile_attempt(attempt_id);reconcile_refunds(attempt_id)
    except ProviderError:abort(503,'Rapprochement requis avant de rembourser.')
    with transaction() as db:
        item=attempt_access(attempt_id);existing=row('SELECT * FROM refund_attempts WHERE idempotency_key=?',(key,))
        if existing:
            if existing['attempt_id']!=attempt_id or existing['amount_cents']!=value or existing['reason']!=reason:abort(409,'Clé déjà utilisée pour un autre remboursement.')
            return jsonify(id=existing['id'],status=existing['status'],replayed=True)
        if item['status']!='paid':abort(409,'Seul un paiement confirmé peut être remboursé.')
        reserved=row("SELECT COALESCE(SUM(amount_cents),0) AS amount FROM refund_attempts WHERE attempt_id=? AND status NOT IN ('failed','canceled')",(attempt_id,))['amount']
        if value>item['amount_cents']-reserved:abort(409,'Montant supérieur au reste remboursable, demandes en attente comprises.')
        identifier=uid();db.execute('INSERT INTO refund_attempts(id,attempt_id,requester_id,amount_cents,reason,idempotency_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',(identifier,attempt_id,g.user['id'],value,reason,key,now(),now()));audit('payment.refund_requested',identifier,{'amount_cents':value,'test_only':item['mode']=='test'})
    try:apply_refund(identifier,provider(item['mode']).refund(item['provider_id'],{'amount':amount(value),'description':'Novalis refund '+identifier},key))
    except ProviderError as error:
        with transaction() as db:db.execute('UPDATE refund_attempts SET status=?,error=?,updated_at=? WHERE id=?',('uncertain' if error.ambiguous else 'failed',str(error),now(),identifier))
        abort(503,'Remboursement non confirmé. Rapprochez cette demande avant toute nouvelle tentative.')
    return jsonify(id=identifier,status=row('SELECT status FROM refund_attempts WHERE id=?',(identifier,))['status']),201

def reconcile_pending(limit=5):
    candidates=rows("SELECT id,mode FROM payment_attempts WHERE status IN ('creating','uncertain','open','pending','authorized') ORDER BY updated_at LIMIT ?",(limit,));result={'checked':0,'failed':0}
    for item in candidates:
        if not configured(item['mode']):continue
        try:reconcile_attempt(item['id']);reconcile_refunds(item['id']);result['checked']+=1
        except ProviderError:result['failed']+=1
    pending=rows("SELECT DISTINCT p.id,p.mode FROM payment_attempts p JOIN refund_attempts r ON r.attempt_id=p.id WHERE r.status IN ('creating','uncertain','queued','pending','processing') ORDER BY r.updated_at LIMIT ?",(limit,))
    for item in pending:
        if not configured(item['mode']):continue
        try:reconcile_refunds(item['id'])
        except ProviderError:result['failed']+=1
    return result
