"""The journal follows money events while keeping demonstration data separate."""
import csv,io,unittest
from datetime import date
import test_billing as billing_tests
import test_payments as payment_tests
import test_workflows as workflows
from novalis_os.db import get_db,row,now


class FinanceJournal(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    create_user=workflows.Workflows.create_user
    call=workflows.Workflows.call
    flow=workflows.Workflows.flow
    draft=billing_tests.Billing.draft
    doc=billing_tests.Billing.doc
    publish=billing_tests.Billing.publish

    def test_simulated_partial_payment_is_immediate_idempotent_and_explicit(self):
        identifier=self.draft();self.publish()
        body={'amount_cents':10000,'method':'bancontact','idempotency_key':'journal-simulation-1'}
        self.call('client','POST','/api/billing/'+identifier+'/simulate',body)
        self.call('client','POST','/api/billing/'+identifier+'/simulate',body)
        self.call('client','POST','/api/billing/'+identifier+'/simulate',{**body,'outcome':'failed','idempotency_key':'journal-failed-attempt'})
        demo=self.call('finance','GET','/api/finance?mode=test')
        self.assertEqual(demo['totals']['received_cents'],10000)
        self.assertEqual(demo['totals']['receivable_cents'],17225)
        self.assertEqual(demo['totals']['net_flow_cents'],10000)
        self.assertEqual(len(demo['movements']),1)
        movement=demo['movements'][0]
        self.assertTrue(movement['test_mode']);self.assertEqual(movement['invoice_id'],identifier)
        self.assertEqual(self.accounts['client']['api'].get(movement['receipt_url']).status_code,200)
        live=self.call('manager','GET','/api/finance')
        self.assertEqual(live['movements'],[]);self.assertEqual(live['totals']['received_cents'],0);self.assertEqual(live['demo_invoice_count'],1)
        self.call('client','GET','/api/finance?mode=test',expected=403)
        self.call('account','GET','/api/finance/movements.csv?mode=test',expected=403)
        export=self.accounts['manager']['api'].get('/api/finance/movements.csv?mode=test&kind=bancontact')
        self.assertIn('TEST',export.headers['Content-Disposition'])
        records=list(csv.reader(io.StringIO(export.data.decode('utf-8-sig'))))
        self.assertEqual(len(records),2);self.assertEqual(records[1][0],'TEST');self.assertEqual(records[1][-2: ],['10000','0'])
        self.assertNotIn(b'TEST-NV-',self.accounts['manager']['api'].get('/api/finance/movements.csv').data)

    def test_bank_declaration_is_not_money_but_confirmation_and_expense_are(self):
        self.call('manager','PUT','/api/billing/settings',{'legal_name':'Société exemple','address':'Rue Exemple 1','postal_code':'1000','city':'Bruxelles','company_number':'TEST','email':'billing@example.test','iban':'BE68539007547034'})
        identifier=self.draft(False,'consumer');self.publish()
        self.call('client','POST','/api/billing/'+identifier+'/transfer-notice',{'reference':'Client says sent'})
        pending=self.call('manager','GET','/api/finance')
        self.assertEqual(pending['movements'],[]);self.assertEqual(len(pending['pending_transfers']),1)
        body={'amount_cents':27225,'bank_reference':'BANK-VERIFIED','bank_confirmed':True,'paid_at':date.today().isoformat(),'idempotency_key':'journal-bank-payment'}
        self.call('manager','POST','/api/invoices/'+identifier+'/payments',body,201)
        self.call('manager','POST','/api/invoices/'+identifier+'/payments',body)
        self.call('finance','POST','/api/expenses',{'description':'=EXTERNAL_FORMULA()','amount_cents':2225,'spent_at':date.today().isoformat(),'project_id':self.body['project_id']},201)
        snapshot=self.call('finance','GET','/api/finance')
        self.assertEqual(len(snapshot['movements']),2)
        self.assertEqual(snapshot['totals']['received_cents'],27225)
        self.assertEqual(snapshot['totals']['outgoing_cents'],2225)
        self.assertEqual(snapshot['totals']['net_flow_cents'],25000)
        self.assertEqual(snapshot['totals']['receivable_cents'],0);self.assertEqual(snapshot['pending_transfers'],[])
        export=self.accounts['manager']['api'].get('/api/finance/movements.csv?kind=out')
        records=list(csv.reader(io.StringIO(export.data.decode('utf-8-sig'))))
        self.assertEqual(len(records),2);self.assertEqual(records[1][8],"'=EXTERNAL_FORMULA()")
        self.assertEqual(records[1][-2:],['0','2225'])

    def test_invalid_filters_and_other_organisation_are_rejected_or_isolated(self):
        self.draft();self.publish()
        self.call('manager','GET','/api/finance?mode=all',expected=400)
        for query in ['from=garbage','from=2026-12-31&to=2026-01-01','kind=unknown','mode=other']:
            self.assertEqual(self.accounts['manager']['api'].get('/api/finance/movements.csv?'+query).status_code,400)
        with self.app.app_context():
            get_db().execute("INSERT INTO organisations VALUES('foreign','Foreign')")
            get_db().execute("INSERT INTO expenses VALUES('foreign','foreign',NULL,'Private expense',9900,?,?)",(date.today().isoformat(),now()))
        self.assertEqual(self.call('manager','GET','/api/finance')['movements'],[])
        self.assertNotIn('Private expense',str(self.call('manager','GET','/api/finance?mode=test')))


class ProviderJournal(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    create_user=workflows.Workflows.create_user
    call=workflows.Workflows.call
    flow=workflows.Workflows.flow
    invoice=payment_tests.Payments.invoice
    checkout=payment_tests.Payments.checkout
    paid=payment_tests.Payments.paid
    callback=payment_tests.Payments.callback

    def test_provider_payment_and_confirmed_refund_have_distinct_directions(self):
        identifier=self.invoice();attempt=self.checkout(identifier)['attempt']
        self.assertEqual(self.call('finance','GET','/api/finance')['movements'],[])
        self.paid(attempt);self.callback(attempt)
        snapshot=self.call('finance','GET','/api/finance');self.assertEqual(snapshot['totals']['received_cents'],12100)
        self.assertEqual(len(snapshot['movements']),1)
        self.call('manager','POST','/api/payment-attempts/'+attempt['id']+'/refunds',{'amount_cents':3000,'reason':'Commercial return','idempotency_key':'journal-refund-request','confirmed':True},201)
        snapshot=self.call('finance','GET','/api/finance');self.assertEqual(snapshot['totals']['outgoing_cents'],0);self.assertEqual(len(snapshot['pending_refunds']),1)
        next(iter(self.psp.refund_items.values()))['status']='refunded';self.callback(attempt);self.callback(attempt)
        snapshot=self.call('finance','GET','/api/finance')
        self.assertEqual(snapshot['totals']['net_flow_cents'],9100);self.assertEqual(snapshot['totals']['refunded_cents'],3000)
        self.assertEqual(snapshot['totals']['receivable_cents'],0);self.assertEqual(len(snapshot['movements']),2)
        self.assertEqual(snapshot['pending_refunds'],[])
        self.assertEqual(self.call('finance','GET','/api/finance?mode=test')['movements'],[])
