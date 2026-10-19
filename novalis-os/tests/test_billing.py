"""Billing boundaries: identity isolation, exact money, publication and receipts."""
import unittest,sqlite3
from datetime import date
import test_workflows as workflows
from novalis_os.db import get_db,row
from novalis_os.billing import valid_iban
class Billing(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    create_user=workflows.Workflows.create_user
    call=workflows.Workflows.call
    flow=workflows.Workflows.flow
    def draft(self,test=True,kind='belgian_business'):
        project,*_=self.flow()
        with self.app.app_context():
            client=row('SELECT client_id FROM projects WHERE id=?',(project,))['client_id']
            if test:get_db().execute('INSERT OR IGNORE INTO billing_test_clients VALUES(?)',(client,))
        self.body={'project_id':project,'title':'Développement & accompagnement <Novalis>','recipient_type':kind,'test_mode':test,'issue_date':date.today().isoformat(),'service_date':date.today().isoformat(),'due_date':date.today().isoformat(),'recipient':{'name':'Client de démonstration','address':'Rue Exemple 12','city':'Bruxelles','postal_code':'1000','country':'BE','email':'client@example.test'},'lines':[{'description':'Analyse & conception','quantity':'2.5','unit':'heure','unit_cents':10000,'vat_basis_points':2100,'discount_basis_points':1000}],'terms':'Paiement sous 15 jours.'}
        self.identifier=self.call('manager','POST','/api/billing',self.body,201)['id'];return self.identifier
    def doc(self,who='manager'):return self.call(who,'GET','/api/billing/'+self.identifier)['document']
    def publish(self):return self.call('manager','POST','/api/billing/'+self.identifier+'/publish',{'version':self.doc()['version'],'compliance_confirmed':True})
    def get_pdf(self,path,who='manager',expected=200):
        r=self.accounts[who]['api'].get(path);self.assertEqual(r.status_code,expected)
        if expected==200:self.assertTrue(r.data.startswith(b'%PDF'));self.assertIn('no-store',r.headers['Cache-Control'])
        return r.data
    def test_direction_only_and_client_isolation(self):
        id=self.draft()
        for who in ['finance','account','developer','sysadmin','client']:self.call(who,'POST','/api/billing',self.body,403)
        self.call('client','GET','/api/billing/'+id,expected=404);self.publish()
        self.assertEqual(self.doc('client')['client_name'],'Client de démonstration')
        for suffix in ['','/pdf','/qr.svg','/receipts/unknown/pdf']:self.assertEqual(self.accounts['other-client']['api'].get('/api/billing/'+id+suffix).status_code,404)
        for who in ['finance','client','sysadmin']:self.call(who,'POST','/api/billing/'+id+'/request-payment',{},403)
    def test_exact_decimals_discounts_and_pdf_escaping(self):
        self.draft();d=self.doc();self.assertEqual(d['total_cents'],27225);self.assertEqual(d['totals']['net_cents'],22500)
        self.get_pdf('/api/billing/'+self.identifier+'/pdf');self.publish();self.get_pdf('/api/billing/'+self.identifier+'/pdf','client');self.assertTrue(self.doc()['number'].startswith('TEST-NV-'))
    def test_test_receipts_partial_idempotent_and_ledger_isolation(self):
        self.draft();self.publish();body={'amount_cents':10000,'method':'bancontact','idempotency_key':'billing-receipt-test-1'}
        self.call('client','POST','/api/billing/'+self.identifier+'/simulate',body);self.call('client','POST','/api/billing/'+self.identifier+'/simulate',body)
        d=self.doc('client');self.assertEqual(d['balance_cents'],17225);self.assertEqual(d['status'],'partial');self.assertEqual(len(d['receipts']),1)
        self.get_pdf('/api/billing/'+self.identifier+'/receipts/'+d['receipts'][0]['id']+'/pdf','client')
        self.call('manager','POST','/api/billing/'+self.identifier+'/simulate',{**body,'amount_cents':17225,'idempotency_key':'billing-receipt-test-2'})
        self.assertEqual(self.doc()['status'],'paid');self.assertEqual(self.call('manager','GET','/api/finance')['totals']['paid_cents'],0);self.assertEqual(self.call('manager','GET','/api/billing')['totals']['paid_cents'],0)
        with self.app.app_context():self.assertEqual(row('SELECT COUNT(*) AS n FROM payments')['n'],0);self.assertEqual(row('SELECT COUNT(*) AS n FROM provider_receipts')['n'],0)
    def test_fail_cancel_and_no_premature_receipt(self):
        self.draft();self.publish()
        for outcome in ['failed','canceled']:self.call('client','POST','/api/billing/'+self.identifier+'/simulate',{'method':'qr','amount_cents':27225,'outcome':outcome,'idempotency_key':'outcome-test-'+outcome})
        self.assertEqual(self.doc()['paid_cents'],0);self.assertEqual(self.doc()['receipts'],[]);self.get_pdf('/api/billing/'+self.identifier+'/receipts/no-receipt/pdf','client',404)
    def test_immutable_issued_snapshot_and_duplicate_publication(self):
        self.draft();first=self.publish();second=self.publish();self.assertEqual(first['number'],second['number']);self.call('manager','PATCH','/api/billing/'+self.identifier,{**self.body,'version':2},409)
        with self.app.app_context():
            with self.assertRaises(sqlite3.IntegrityError):get_db().execute("UPDATE billing_documents SET snapshot='{}' WHERE invoice_id=?",(self.identifier,))
    def test_b2b_real_blocked_without_falco_and_no_number_consumed(self):
        self.draft(False);self.call('manager','POST','/api/billing/'+self.identifier+'/publish',{'version':1,'compliance_confirmed':True},409);self.assertFalse(self.doc()['issued_at'])
        with self.app.app_context():self.assertIsNone(row('SELECT * FROM billing_sequences'))
    def test_test_payment_never_calls_real_provider_or_bank_ledger(self):
        self.draft();self.publish();self.call('manager','POST','/api/invoices/'+self.identifier+'/checkout',{'method':'bancontact'},403);self.call('manager','POST','/api/invoices/'+self.identifier+'/payments',{},409);self.call('manager','POST','/api/invoices/'+self.identifier+'/register',{},409)
    def test_transfer_notice_never_settles_invoice(self):
        self.draft();self.publish();self.call('client','POST','/api/billing/'+self.identifier+'/transfer-notice',{'reference':'Virement envoyé'});self.assertEqual(self.doc()['paid_cents'],0);self.assertEqual(len(self.doc()['transfer_notices']),1)
    def test_invalid_iban_settings_and_draft_version(self):
        self.assertTrue(valid_iban('BE68539007547034'));self.assertFalse(valid_iban('BE00539007547034'));self.call('manager','PUT','/api/billing/settings',{'iban':'BE00INVALID'},400)
        self.draft();self.call('manager','PATCH','/api/billing/'+self.identifier,{**self.body,'version':4},409);self.call('manager','PATCH','/api/billing/'+self.identifier,{**self.body,'title':'Nouvelle version','version':1});self.assertEqual(self.doc()['version'],2)
    def test_real_consumer_issuance_and_epc_qr(self):
        self.call('manager','PUT','/api/billing/settings',{'legal_name':'Entreprise de test','address':'Rue Exemple 1','postal_code':'1000','city':'Bruxelles','company_number':'TEST','email':'billing@example.test','iban':'BE68539007547034'})
        self.draft(False,'consumer');self.publish();d=self.doc('client');self.assertTrue(d['bank_available']);self.assertEqual(self.accounts['client']['api'].get('/api/billing/'+self.identifier+'/qr.svg').status_code,200)
        self.call('client','POST','/api/billing/'+self.identifier+'/simulate',{'amount_cents':1,'method':'qr','idempotency_key':'forbidden-test'},403)
        self.call('manager','POST','/api/invoices/'+self.identifier+'/payments',{'amount_cents':27225,'bank_reference':'BANK-VERIFIED','bank_confirmed':True,'paid_at':date.today().isoformat(),'idempotency_key':'real-bank-test-1'},201)
        d=self.doc('client');self.assertEqual(d['status'],'paid');self.get_pdf('/api/billing/'+self.identifier+'/receipts/'+d['receipts'][0]['id']+'/pdf','client')
