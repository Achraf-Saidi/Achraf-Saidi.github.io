"""Management ledger; legal invoice issuance belongs to a configured provider."""
import csv
import io
from datetime import date
from flask import Blueprint, g, jsonify, abort, Response, request
from .db import get_db, row, rows, uid, now, transaction, audit
from .security import required, project_access
from .validation import data, text, integer, choice, day

finance = Blueprint('finance', __name__)


def total_cents(invoice_id):
    return sum(line['quantity']*line['unit_cents'] +
               (line['quantity']*line['unit_cents']*line['vat_basis_points']+5000)//10000
               for line in rows('SELECT * FROM invoice_lines WHERE invoice_id=?',(invoice_id,)))


def invoice_access(invoice_id):
    item = row('SELECT * FROM invoices WHERE id=?',(invoice_id,))
    if not item:
        abort(404)
    project_access(item['project_id'],finances=True)
    if g.user['role']=='client' and item['status']=='draft':
        abort(404)
    return item


def present_invoice(item):
    total = total_cents(item['id'])
    paid = row('SELECT COALESCE(SUM(amount_cents),0) AS paid FROM payments WHERE invoice_id=?',(item['id'],))['paid']
    online = row('SELECT COALESCE(SUM(allocated_cents),0) AS paid FROM provider_receipts WHERE invoice_id=?',(item['id'],))['paid']
    paid += online
    doc=row('SELECT test_mode FROM billing_documents WHERE invoice_id=?',(item['id'],))
    if doc and doc['test_mode']:
        paid=row('SELECT COALESCE(SUM(amount_cents),0) AS paid FROM billing_test_receipts WHERE invoice_id=?',(item['id'],))['paid']
    return {**item,'billing_document':doc is not None,'total_cents':total,'paid_cents':paid,'balance_cents':total-paid}


@finance.get('/api/projects/<project_id>/invoices')
@required('manager','finance','client')
def invoice_list(project_id):
    project_access(project_id,finances=True)
    suffix = " AND status!='draft'" if g.user['role']=='client' else ''
    return jsonify(items=[present_invoice(i) for i in rows('SELECT * FROM invoices WHERE project_id=?'+suffix+' ORDER BY created_at DESC',(project_id,))])


@finance.post('/api/projects/<project_id>/invoices')
@required('manager')
def invoice_draft(project_id):
    d = data()
    with transaction() as db:
        project_access(project_id,finances=True)
        lines = d.get('lines')
        if not isinstance(lines,list) or not 1<=len(lines)<=100 or any(not isinstance(v,dict) for v in lines):
            abort(400,'Une à cent lignes de facture sont requises.')
        invoice_id = uid()
        db.execute('INSERT INTO invoices(id,project_id,due_date,created_at) VALUES(?,?,?,?)',(invoice_id,project_id,day(d,'due_date'),now()))
        for line in lines:
            db.execute('INSERT INTO invoice_lines VALUES(?,?,?,?,?,?)',
                       (uid(),invoice_id,text(line,'description',500),integer(line,'quantity',1,10000),
                        integer(line,'unit_cents',0,100000000),integer(line,'vat_basis_points',0,10000)))
        audit('invoice.draft',invoice_id)
    return jsonify(id=invoice_id,total_cents=total_cents(invoice_id)),201


@finance.post('/api/invoices/<invoice_id>/register')
@required('manager')
def invoice_register(invoice_id):
    d = data()
    with transaction() as db:
        item = invoice_access(invoice_id)
        if item['status']!='draft':
            abort(409,'Cette facture est déjà enregistrée.')
        if row('SELECT 1 FROM billing_documents WHERE invoice_id=?',(invoice_id,)):
            abort(409,'Utilisez l’atelier de facturation pour ce document.')
        # This imports the reference of an invoice already issued outside Novalis OS.
        # It never claims a PDF or an internal draft has been sent through Peppol.
        if d.get('issued_externally') is not True:
            abort(400,'Confirmez l’émission préalable par votre outil de facturation.')
        external_number = text(d,'external_number',100)
        reference = text(d,'peppol_reference',200)
        db.execute("UPDATE invoices SET external_number=?,peppol_reference=?,status='registered' WHERE id=?",
                   (external_number,reference,invoice_id))
        audit('invoice.external_registered',invoice_id,{'number':external_number})
    return jsonify(ok=True)


@finance.post('/api/invoices/<invoice_id>/payments')
@required('manager')
def payment(invoice_id):
    d = data()
    with transaction() as db:
        item = invoice_access(invoice_id)
        if row('SELECT 1 FROM billing_documents WHERE invoice_id=? AND test_mode=1',(invoice_id,)):
            abort(409,'Utilisez le parcours de simulation pour une facture TEST.')
        key = text(d,'idempotency_key',100,8)
        amount = integer(d,'amount_cents',1,100000000)
        reference = text(d,'bank_reference',200)
        existing = row('SELECT * FROM payments WHERE idempotency_key=?',(key,))
        if existing:
            if existing['invoice_id']!=invoice_id or existing['amount_cents']!=amount or existing['bank_reference']!=reference:
                abort(409,'Cette clé a déjà été utilisée pour un autre règlement.')
            return jsonify(id=existing['id'],replayed=True)
        if item['status']!='registered' or d.get('bank_confirmed') is not True:
            abort(409,'Vérifiez le règlement bancaire d’une facture enregistrée.')
        current = present_invoice(item)
        if amount>current['balance_cents']:
            abort(400,'Le règlement dépasse le solde dû. Traitez le trop-perçu séparément.')
        payment_id = uid()
        db.execute('INSERT INTO payments VALUES(?,?,?,?,?,?,?,?)',
                   (payment_id,invoice_id,amount,reference,g.user['id'],day(d,'paid_at'),key,now()))
        if amount==current['balance_cents']:
            db.execute("UPDATE invoices SET status='paid' WHERE id=?",(invoice_id,))
        audit('payment.bank_confirmed',payment_id,{'invoice_id':invoice_id,'amount_cents':amount})
    return jsonify(id=payment_id),201


@finance.get('/api/invoices/<invoice_id>')
@required('manager','finance','client')
def invoice_detail(invoice_id):
    item = invoice_access(invoice_id)
    return jsonify(billing_document=bool(row('SELECT 1 FROM billing_documents WHERE invoice_id=?',(invoice_id,))),invoice=present_invoice(item),payments=rows('SELECT id,amount_cents,bank_reference,paid_at,created_at FROM payments WHERE invoice_id=? ORDER BY created_at DESC',(invoice_id,)),online_receipts=rows('SELECT provider_id,amount_cents,allocated_cents,excess_cents,paid_at FROM provider_receipts WHERE invoice_id=?',(invoice_id,)),lines=rows('SELECT description,quantity,unit_cents,vat_basis_points FROM invoice_lines WHERE invoice_id=?',(invoice_id,)))


@finance.get('/api/finance')
@required('manager','finance')
def finance_overview():
    return jsonify(financial_snapshot(finance_mode()))


def finance_mode():
    return choice(request.args,'mode',['live','test'],'live')


def financial_snapshot(mode):
    db=get_db()
    if db.in_transaction:
        return _financial_snapshot(mode)
    db.execute('BEGIN')
    try:
        return _financial_snapshot(mode)
    finally:
        db.execute('ROLLBACK')


def _financial_snapshot(mode):
    """Build the journal from confirmed source records, never from invoice status alone."""
    test = mode=='test'
    org = g.user['org_id']
    invoices = [present_invoice(i) for i in rows('''SELECT i.*,p.name AS project_name,c.name AS client_name,
        b.title,b.published_at,b.canceled_at,COALESCE(b.test_mode,0) AS test_mode
        FROM invoices i JOIN projects p ON p.id=i.project_id JOIN clients c ON c.id=p.client_id
        LEFT JOIN billing_documents b ON b.invoice_id=i.id
        WHERE p.org_id=? AND COALESCE(b.test_mode,0)=? AND b.canceled_at IS NULL
        ORDER BY i.created_at DESC,i.id DESC''',(org,int(test)))]
    lookup = {i['id']:i for i in invoices}
    for i in invoices:
        i['payment_status']='draft' if i['status']=='draft' else 'paid' if i['balance_cents']<=0 else 'partial' if i['paid_cents'] else 'overdue' if i['due_date']<date.today().isoformat() else 'unpaid'
    movements = []

    def add(record,kind,method,direction,stamp,reference,description='',receipt_id=None):
        invoice = lookup.get(record.get('invoice_id'))
        if not invoice or invoice['status']=='draft':
            return
        movements.append({'id':kind+':'+record['id'],'kind':kind,'method':method,'direction':direction,
            'amount_cents':record['amount_cents'],'occurred_at':stamp,'reference':reference,
            'description':description or invoice.get('title') or invoice['external_number'] or 'Règlement de facture',
            'invoice_id':invoice['id'],'invoice_number':invoice['external_number'],'project_name':invoice['project_name'],
            'client_name':invoice['client_name'],'test_mode':test,'billing_document':invoice['billing_document'],
            'receipt_url':('/api/billing/'+invoice['id']+'/receipts/'+receipt_id+'/pdf') if receipt_id and invoice['billing_document'] else None,
            'allocated_cents':record.get('allocated_cents',record['amount_cents']),
            'excess_cents':record.get('excess_cents',0)})

    if test:
        for r in rows('''SELECT r.* FROM billing_test_receipts r JOIN billing_documents b ON b.invoice_id=r.invoice_id
                WHERE b.org_id=? AND b.test_mode=1''',(org,)):
            add(r,'payment',r['method'],'in',r['paid_at'],r['reference'],receipt_id=r['id'])
        expenses = []
        pending_refunds = []
    else:
        for r in rows('''SELECT r.* FROM payments r JOIN invoices i ON i.id=r.invoice_id
                JOIN projects p ON p.id=i.project_id WHERE p.org_id=?''',(org,)):
            add(r,'payment','transfer','in',r['paid_at'],r['bank_reference'],receipt_id=r['id'])
        for r in rows('''SELECT r.*,a.method FROM provider_receipts r JOIN payment_attempts a ON a.id=r.attempt_id
                WHERE a.org_id=? AND a.mode='live' ''',(org,)):
            add(r,'online',r['method'] or 'online','in',r['paid_at'],r['provider_id'],receipt_id=r['attempt_id'])
        refund_records = rows('''SELECT r.*,a.invoice_id FROM refund_attempts r JOIN payment_attempts a ON a.id=r.attempt_id
                WHERE a.org_id=? AND a.mode='live' ''',(org,))
        for r in refund_records:
            if r['status']=='refunded':
                add(r,'refund','online','out',r['updated_at'],r['provider_id'] or r['id'],r['reason'])
        pending_refunds = [r for r in refund_records if r['invoice_id'] in lookup and r['status'] not in {'refunded','failed','canceled'}]
        expenses = rows('''SELECT e.*,p.name AS project_name FROM expenses e LEFT JOIN projects p ON p.id=e.project_id
            WHERE e.org_id=? ORDER BY e.spent_at DESC,e.created_at DESC''',(org,))
        for e in expenses:
            movements.append({'id':'expense:'+e['id'],'kind':'expense','method':'expense','direction':'out',
                'amount_cents':e['amount_cents'],'occurred_at':e['spent_at'],'reference':'DEP-'+e['id'][:10].upper(),
                'description':e['description'],'invoice_id':None,'invoice_number':None,'client_name':'',
                'project_name':e.get('project_name') or '',
                'test_mode':False,'billing_document':False,'receipt_url':None,'allocated_cents':0,'excess_cents':0})
    movements.sort(key=lambda m:(m['occurred_at'][:10],m['occurred_at'],m['id']),reverse=True)
    registered = [i for i in invoices if i['status']!='draft']
    incoming = sum(m['amount_cents'] for m in movements if m['direction']=='in')
    outgoing = sum(m['amount_cents'] for m in movements if m['direction']=='out')
    notices = rows('''SELECT n.invoice_id,MAX(n.created_at) AS created_at FROM billing_transfer_notices n
        JOIN billing_documents b ON b.invoice_id=n.invoice_id WHERE b.org_id=? AND b.test_mode=?
        GROUP BY n.invoice_id''',(org,int(test)))
    return {'mode':mode,'test_mode':test,'updated_at':now(),'invoices':invoices,'expenses':expenses,'movements':movements,
        'demo_invoice_count':row('''SELECT COUNT(*) AS n FROM billing_documents WHERE org_id=? AND test_mode=1
            AND published_at IS NOT NULL AND canceled_at IS NULL''',(org,))['n'],
        'pending_transfers':[n for n in notices if n['invoice_id'] in lookup and lookup[n['invoice_id']]['balance_cents']>0],
        'pending_refunds':pending_refunds,'totals':{
            'invoiced_cents':sum(i['total_cents'] for i in registered),
            'paid_cents':sum(i['paid_cents'] for i in registered),
            'receivable_cents':sum(max(0,i['balance_cents']) for i in registered),
            'expenses_cents':sum(e['amount_cents'] for e in expenses),'received_cents':incoming,
            'outgoing_cents':outgoing,'refunded_cents':sum(m['amount_cents'] for m in movements if m['kind']=='refund'),
            'net_flow_cents':incoming-outgoing,'draft_count':len(invoices)-len(registered)}}


def filtered_movements(items):
    start = day(request.args,'from') if request.args.get('from') else ''
    end = day(request.args,'to') if request.args.get('to') else ''
    if start and end and start>end:
        abort(400,'La date de début doit précéder la date de fin.')
    kind = choice(request.args,'kind',['','in','out','refund','transfer','bancontact'],'')
    query = text(request.args,'q',200,0,'').lower()
    return [m for m in items if (not start or m['occurred_at'][:10]>=start) and
        (not end or m['occurred_at'][:10]<=end) and (not kind or m['direction']==kind or m['kind']==kind or m['method']==kind) and
        (not query or query in ' '.join(str(m.get(k) or '') for k in ['reference','description','invoice_number','client_name','project_name']).lower())]


def safe_csv(value):
    value = str(value or '')
    return "'"+value if value.lstrip()[:1] in {'=','+','-','@'} or value[:1] in {'\t','\r'} else value


@finance.get('/api/finance/movements.csv')
@required('manager','finance')
def movement_export():
    mode=finance_mode();snapshot=financial_snapshot(mode)
    output=io.StringIO();writer=csv.writer(output)
    writer.writerow(['environnement','date','operation','methode','client','projet','facture','reference','description','entree_centimes','sortie_centimes'])
    for m in filtered_movements(snapshot['movements']):
        values=['TEST' if mode=='test' else 'REEL',m['occurred_at'],m['kind'],m['method'],
            *[m[k] for k in ['client_name','project_name','invoice_number','reference','description']],
            m['amount_cents'] if m['direction']=='in' else 0,m['amount_cents'] if m['direction']=='out' else 0]
        writer.writerow([safe_csv(v) if isinstance(v,str) or v is None else v for v in values])
    filename='novalis-mouvements'+('-TEST' if mode=='test' else '')+'.csv'
    return Response('\ufeff'+output.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename="'+filename+'"'})


@finance.post('/api/expenses')
@required('manager','finance')
def expense():
    d = data()
    with transaction() as db:
        project_id = d.get('project_id')
        if project_id:
            project_access(project_id,finances=True)
        expense_id = uid()
        db.execute('INSERT INTO expenses VALUES(?,?,?,?,?,?,?)',
                   (expense_id,g.user['org_id'],project_id,text(d,'description',1000),integer(d,'amount_cents'),day(d,'spent_at'),now()))
        audit('expense.created',expense_id)
    return jsonify(id=expense_id),201


@finance.get('/api/finance/export.csv')
@required('manager','finance')
def export():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['reference','projet','statut','total_centimes','paye_centimes','echeance'])
    mode=finance_mode()
    for i in financial_snapshot(mode)['invoices']:
        writer.writerow([safe_csv(i['external_number'] or 'BROUILLON'),safe_csv(i['project_name']),i['status'],i['total_cents'],i['paid_cents'],i['due_date']])
    filename='novalis-finances'+('-TEST' if mode=='test' else '')+'.csv'
    return Response('\ufeff'+output.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename="'+filename+'"'})


@finance.post('/api/projects/<project_id>/proposals')
@required('manager','account')
def proposal(project_id):
    d = data()
    with transaction() as db:
        project_access(project_id,staff=True)
        version = row('SELECT COALESCE(MAX(version),0)+1 AS version FROM proposals WHERE project_id=?',(project_id,))['version']
        proposal_id = uid()
        db.execute('INSERT INTO proposals(id,project_id,version,title,scope,assumptions,exclusions,amount_cents,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
                   (proposal_id,project_id,version,text(d,'title'),text(d,'scope',10000),text(d,'assumptions',5000,0,''),
                    text(d,'exclusions',5000,0,''),integer(d,'amount_cents'),now()))
        audit('proposal.draft',proposal_id,{'version':version})
    return jsonify(id=proposal_id,version=version),201


@finance.get('/api/projects/<project_id>/proposals')
@required('manager','account','client')
def proposals(project_id):
    project_access(project_id)
    suffix = " AND status!='draft'" if g.user['role']=='client' else ''
    return jsonify(items=rows('SELECT * FROM proposals WHERE project_id=?'+suffix+' ORDER BY version DESC',(project_id,)))


@finance.post('/api/proposals/<proposal_id>/decision')
@required('manager','account','client')
def proposal_decision(proposal_id):
    d = data()
    with transaction() as db:
        item = row('SELECT * FROM proposals WHERE id=?',(proposal_id,))
        if not item:
            abort(404)
        project_access(item['project_id'],staff=g.user['role']!='client')
        status = choice(d,'status',['shared','accepted','declined'])
        expected = 'shared' if g.user['role']=='client' else 'draft'
        if (g.user['role']=='client' and status=='shared') or (g.user['role']!='client' and status!='shared') or item['status']!=expected:
            abort(409,'Cette décision n’est pas autorisée dans cet état.')
        db.execute('UPDATE proposals SET status=?,accepted_by=?,accepted_at=? WHERE id=?',
                   (status,g.user['id'] if status=='accepted' else None,now() if status=='accepted' else None,proposal_id))
        audit('proposal.decision',proposal_id,{'status':status})
    return jsonify(ok=True)
