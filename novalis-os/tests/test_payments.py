"""Payment contracts with real SQLite transactions and a deterministic PSP double."""
import copy,sqlite3,threading,unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta,timezone,date
import test_workflows as workflows
from novalis_os.db import row,get_db,now
from novalis_os.payment_provider import amount,ProviderError,Mollie,safe_checkout,cents
from novalis_os.payments import reconcile_pending

class FakeMollie:
    def __init__(self):self.mode='test';self.items={};self.refund_items={};self.creates=0;self.refund_creates=0;self.timeout=False;self.down=False;self.bad=None;self.lock=threading.Lock()
    def methods(self,total):return [{'id':'bancontact','description':'Bancontact'},{'id':'creditcard','description':'Carte'}] if total>=2 else []
    def create(self,payload,key):
        with self.lock:
            self.creates+=1
            if key not in self.items:
                identifier='tr_'+str(len(self.items)+100)
                self.items[key]={**copy.deepcopy(payload),'id':identifier,'mode':self.mode,'status':'open','method':payload.get('method') or 'bancontact','_links':{'checkout':{'href':'https://www.mollie.com/checkout/'+identifier}}}
            result=copy.deepcopy(self.items[key])
        if self.timeout:self.timeout=False;raise ProviderError(ambiguous=True)
        if self.bad:result.update(self.bad)
        return result
    def get(self,identifier):
        if self.down:raise ProviderError()
        return copy.deepcopy(next(v for v in self.items.values() if v['id']==identifier))
    def find(self,identifier):return copy.deepcopy(next((v for v in self.items.values() if v['metadata']['novalis_attempt']==identifier),None))
    def mark(self,identifier,status,**fields):
        value=next(v for v in self.items.values() if v['id']==identifier);value.update(status=status,**fields)
        if status=='paid':value['paidAt']=now()
    def refund(self,payment_id,payload,key):
        self.refund_creates+=1
        if key not in self.refund_items:self.refund_items[key]={**payload,'id':'re_'+str(len(self.refund_items)+100),'status':'queued','paymentId':payment_id}
        result=copy.deepcopy(self.refund_items[key])
        if self.timeout:self.timeout=False;raise ProviderError(ambiguous=True)
        return result
    def refunds(self,payment_id):return [copy.deepcopy(x) for x in self.refund_items.values() if x['paymentId']==payment_id]

class Payments(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    create_user=workflows.Workflows.create_user
    call=workflows.Workflows.call
    flow=workflows.Workflows.flow
    def invoice(self,mode='live',registered=True):
        self.psp=FakeMollie();self.psp.mode=mode
        self.app.config.update(PAYMENTS_MODE=mode,MOLLIE_TEST_KEY='test_only_contract_key',MOLLIE_LIVE_KEY='live_only_contract_key',PAYMENTS_LIVE_ENABLED=mode=='live',PAYMENT_PROVIDER_FACTORY=lambda m:self.psp)
        project,*_=self.flow()
        identifier=self.call('finance','POST',f'/api/projects/{project}/invoices',{'due_date':date.today().isoformat(),'lines':[{'description':'Acompte','quantity':1,'unit_cents':10000,'vat_basis_points':2100}]},201)['id']
        if registered:self.call('finance','POST',f'/api/invoices/{identifier}/register',{'issued_externally':True,'external_number':'EXT-TEST','peppol_reference':'EXTERNAL'})
        return identifier
    def checkout(self,invoice,who='finance',expected=201,body=None):return self.call(who,'POST',f'/api/invoices/{invoice}/checkout',body if body is not None else {'method':'bancontact'},expected)
    def paid(self,attempt):self.psp.mark(attempt['provider_id'],'paid');return self.callback(attempt)
    def callback(self,attempt):return self.app.test_client().post('/api/payments/mollie/webhook',data={'id':attempt['provider_id'],'status':'paid','amount':'0.01'})
    def test_disabled_configuration(self):
        invoice=self.invoice();self.app.config['PAYMENTS_MODE']='disabled'
        self.assertFalse(self.call('finance','GET','/api/payments/config')['enabled']);self.checkout(invoice,expected=503);self.assertEqual(self.psp.creates,0)
    def test_role_draft_and_foreign_client(self):
        invoice=self.invoice(registered=False);self.checkout(invoice,expected=409)
        self.call('finance','POST',f'/api/invoices/{invoice}/register',{'issued_externally':True,'external_number':'EXT-TEST','peppol_reference':'EXTERNAL'})
        for who,status in [('developer',403),('account',403),('other-client',404)]:self.checkout(invoice,who,status)
        self.assertEqual(self.psp.creates,0)
    def test_server_amount_and_available_methods(self):
        invoice=self.invoice();self.checkout(invoice,expected=400,body={'method':'bancontact','amount_cents':1});self.checkout(invoice,expected=400,body={'method':'paypal'})
        a=self.checkout(invoice)['attempt'];self.assertEqual(a['amount_cents'],12100);self.assertIn('bancontact',[m['id'] for m in self.call('client','GET',f'/api/invoices/{invoice}/payment-methods')['items']])
        payload=next(iter(self.psp.items.values()));self.assertEqual(payload['amount'],{'currency':'EUR','value':'121.00'});self.assertEqual(payload['sequenceType'],'oneoff');self.assertTrue(payload['webhookUrl'].endswith('/api/payments/mollie/webhook'));self.assertNotIn('Only in tests',str(payload))
    def test_duplicate_checkout_and_callback(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];b=self.checkout(invoice,expected=200)['attempt'];self.assertEqual(a['id'],b['id']);self.assertEqual(self.psp.creates,1)
        self.assertEqual(self.callback(a).status_code,200);self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['paid_cents'],0)
        self.assertEqual(self.paid(a).status_code,200)
        with ThreadPoolExecutor(max_workers=2) as pool:codes=list(pool.map(lambda _:self.callback(a).status_code,range(2)))
        self.assertEqual(codes,[200,200]);self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['balance_cents'],0)
        with self.app.app_context():self.assertEqual(row('SELECT COUNT(*) AS n FROM provider_receipts')['n'],1)
        self.checkout(invoice,expected=409)
    def test_nonpaid_statuses(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt']
        for status in ['pending','authorized','failed','expired','canceled']:
            self.psp.mark(a['provider_id'],status);self.assertEqual(self.callback(a).status_code,200);self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['paid_cents'],0)
    def test_test_mode_never_settles_invoice(self):
        invoice=self.invoice(mode='test');self.checkout(invoice,'client',403);a=self.checkout(invoice)['attempt'];self.paid(a)
        self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['paid_cents'],0);self.assertEqual(self.call('finance','GET','/api/payment-attempts/'+a['id'])['attempt']['status'],'paid');self.call('client','GET','/api/payment-attempts/'+a['id'],expected=404)
        with self.app.app_context():self.assertEqual(row('SELECT COUNT(*) AS n FROM provider_receipts')['n'],0)
    def test_fake_unknown_callback_and_csrf_scope(self):
        self.invoice();api=self.app.test_client();self.assertEqual(api.post('/api/payments/mollie/webhook',data={'id':'tr_unknown'}).status_code,200)
        self.assertEqual(api.post('/api/payments/mollie/webhook',json={'status':'paid'}).status_code,200)
        self.assertEqual(api.post('/api/expenses',json={}).status_code,403);self.assertEqual(api.post('/api/payments/mollie/webhook',data='x'*3000).status_code,413)
    def test_verified_identity_mismatches(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];original=self.psp.get(a['provider_id'])
        for fields in [{'amount':amount(1)},{'amount':{'currency':'USD','value':'121.00'}},{'mode':'test'},{'metadata':{}},{'method':'paypal'}]:
            for key in fields:self.psp.mark(a['provider_id'],'paid',**fields)
            self.callback(a);self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['paid_cents'],0)
            self.assertEqual(self.call('finance','GET','/api/payment-attempts/'+a['id'])['attempt']['status'],'anomaly')
            self.psp.items[next(iter(self.psp.items))]=copy.deepcopy(original)
        self.paid(a);self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['paid_cents'],12100)
    def test_timeout_recovery_and_key_rotation(self):
        invoice=self.invoice();self.psp.timeout=True;self.checkout(invoice,expected=503)
        with self.app.app_context():a=row('SELECT * FROM payment_attempts');self.assertEqual(a['status'],'uncertain')
        result=self.call('finance','POST','/api/payment-attempts/'+a['id']+'/reconcile',{})['attempt'];self.assertEqual(result['status'],'open');self.assertEqual(self.psp.creates,1)
        self.checkout(invoice,expected=200)
    def test_old_uncertain_attempt_never_recreated(self):
        invoice=self.invoice();self.psp.timeout=True;self.checkout(invoice,expected=503);self.psp.items={}
        with self.app.app_context():get_db().execute('UPDATE payment_attempts SET created_at=?,lease_until=NULL',((datetime.now(timezone.utc)-timedelta(hours=2)).isoformat(),))
        self.checkout(invoice,expected=409);self.assertEqual(self.psp.creates,1)
    def test_rotated_key_prevents_uncertain_create(self):
        invoice=self.invoice();self.psp.timeout=True;self.checkout(invoice,expected=503);self.psp.items={};self.app.config['MOLLIE_LIVE_KEY']='live_a_different_contract_key';self.checkout(invoice,expected=409);self.assertEqual(self.psp.creates,1)
    def test_webhook_retry_and_return_reconciliation(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];self.psp.down=True;self.assertEqual(self.callback(a).status_code,503);self.psp.down=False;self.psp.mark(a['provider_id'],'paid')
        r=self.call('client','POST','/api/payment-attempts/'+a['id']+'/reconcile',{});self.assertEqual(r['attempt']['status'],'paid')
    def test_partial_bank_payment_and_overpayment(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];self.call('finance','POST',f'/api/invoices/{invoice}/payments',dict(amount_cents=2000,bank_reference='BANK',bank_confirmed=True,paid_at=date.today().isoformat(),idempotency_key='bank_partial_1'),201);self.paid(a)
        detail=self.call('finance','GET','/api/invoices/'+invoice);self.assertEqual(detail['invoice']['paid_cents'],12100);self.assertEqual(detail['online_receipts'][0]['excess_cents'],2000)
    def test_refund_states_idempotency_and_reservation(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];self.paid(a);path='/api/payment-attempts/'+a['id']+'/refunds';body=dict(amount_cents=3000,reason='Retour convenu',idempotency_key='refund_test_key_1',confirmed=True)
        self.call('client','POST',path,body,403);r=self.call('finance','POST',path,body,201);self.assertEqual(r['status'],'queued');self.assertTrue(self.call('finance','POST',path,body)['replayed']);self.assertEqual(self.psp.refund_creates,1)
        self.call('finance','POST',path,{**body,'amount_cents':10000,'idempotency_key':'refund_other_key'},409)
        next(iter(self.psp.refund_items.values()))['status']='refunded';self.callback(a)
        detail=self.call('finance','GET','/api/payment-attempts/'+a['id'])['attempt'];self.assertEqual(detail['refunds'][0]['status'],'refunded');self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['status'],'paid')
    def test_ambiguous_refund_not_repeated(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];self.paid(a);self.psp.timeout=True;body=dict(amount_cents=3000,reason='Retour',idempotency_key='refund_timeout_key',confirmed=True);path='/api/payment-attempts/'+a['id']+'/refunds';self.call('finance','POST',path,body,503)
        self.call('finance','POST',path,body);self.assertEqual(self.psp.refund_creates,1)
    def test_additive_migration_and_receipt_immutability(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];self.paid(a)
        from novalis_os.db import migrate
        migrate(self.app.config['DATABASE']);migrate(self.app.config['DATABASE'])
        with self.app.app_context():
            self.assertEqual(row('SELECT COUNT(*) AS n FROM invoices')['n'],1)
            with self.assertRaises(sqlite3.IntegrityError):get_db().execute('UPDATE provider_receipts SET amount_cents=1')
            self.assertIsNone(row('PRAGMA foreign_key_check'))
    def test_disabling_new_payments_keeps_existing_reconciliation(self):
        invoice=self.invoice();a=self.checkout(invoice)['attempt'];self.app.config.update(PAYMENTS_MODE='disabled',PAYMENTS_LIVE_ENABLED=False)
        self.assertFalse(self.call('finance','GET','/api/payments/config')['enabled']);self.paid(a)
        self.assertEqual(self.call('finance','GET','/api/invoices/'+invoice)['invoice']['paid_cents'],12100)
    def test_transport_amount_and_redirect_validation(self):
        self.assertEqual(cents('12.34'),1234)
        for value in ['12.345','1e2','-1.00',1.5]:
            with self.assertRaises(ValueError):cents(value)
        for url in ['http://www.mollie.com/','https://evil.example/','https://www.mollie.com@evil.example/']:
            with self.assertRaises(ProviderError):safe_checkout(url)
