"""Export fictional backend-validated documents for DOM integration tests."""
import json,sys
from pathlib import Path
from test_billing import Billing
x=Billing('test_exact_decimals_discounts_and_pdf_escaping');x.setUp()
try:
    x.draft();x.publish()
    x.call('client','POST','/api/billing/'+x.identifier+'/simulate',{'amount_cents':10000,'method':'bancontact','idempotency_key':'dom-fixture-only'})
    Path(sys.argv[1]).write_text(json.dumps({'document':x.doc('client'),'list':x.call('manager','GET','/api/billing'),'setup':x.call('manager','GET','/api/billing/setup'),'finance_live':x.call('manager','GET','/api/finance'),'finance_test':x.call('manager','GET','/api/finance?mode=test')}))
finally:x.tearDown()
