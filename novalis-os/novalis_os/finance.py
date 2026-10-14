"""Management ledger; legal invoice issuance belongs to a configured provider."""
import csv
import io
from flask import Blueprint, g, jsonify, abort, Response
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
    return {**item,'total_cents':total,'paid_cents':paid,'balance_cents':total-paid}


@finance.get('/api/projects/<project_id>/invoices')
@required('manager','finance','client')
def invoice_list(project_id):
    project_access(project_id,finances=True)
    suffix = " AND status!='draft'" if g.user['role']=='client' else ''
    return jsonify(items=[present_invoice(i) for i in rows('SELECT * FROM invoices WHERE project_id=?'+suffix+' ORDER BY created_at DESC',(project_id,))])


@finance.post('/api/projects/<project_id>/invoices')
@required('manager','finance')
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
@required('manager','finance')
def invoice_register(invoice_id):
    d = data()
    with transaction() as db:
        item = invoice_access(invoice_id)
        if item['status']!='draft':
            abort(409,'Cette facture est déjà enregistrée.')
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
@required('manager','finance')
def payment(invoice_id):
    d = data()
    with transaction() as db:
        item = invoice_access(invoice_id)
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
    return jsonify(invoice=present_invoice(item),lines=rows('SELECT description,quantity,unit_cents,vat_basis_points FROM invoice_lines WHERE invoice_id=?',(invoice_id,)))


@finance.get('/api/finance')
@required('manager','finance')
def finance_overview():
    invoices = [present_invoice(i) for i in rows('''SELECT i.*,p.name AS project_name FROM invoices i JOIN projects p ON p.id=i.project_id
        WHERE p.org_id=? ORDER BY i.created_at DESC''',(g.user['org_id'],))]
    expenses = rows('SELECT * FROM expenses WHERE org_id=? ORDER BY spent_at DESC',(g.user['org_id'],))
    registered = [i for i in invoices if i['status']!='draft']
    return jsonify(invoices=invoices,expenses=expenses,totals={
        'invoiced_cents':sum(i['total_cents'] for i in registered),'paid_cents':sum(i['paid_cents'] for i in registered),
        'receivable_cents':sum(i['balance_cents'] for i in registered),'expenses_cents':sum(e['amount_cents'] for e in expenses)})


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
    def safe(value):
        value = str(value)
        return "'"+value if value.lstrip()[:1] in {'=','+','-','@'} or value[:1] in {'\t','\r'} else value
    for i in rows('SELECT i.*,p.name AS project_name FROM invoices i JOIN projects p ON p.id=i.project_id WHERE p.org_id=?',(g.user['org_id'],)):
        presented = present_invoice(i)
        writer.writerow([safe(i['external_number'] or 'BROUILLON'),safe(i['project_name']),i['status'],presented['total_cents'],presented['paid_cents'],i['due_date']])
    return Response('\ufeff'+output.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename="novalis-finances.csv"'})


@finance.post('/api/projects/<project_id>/proposals')
@required('manager','account')
def proposal():
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
