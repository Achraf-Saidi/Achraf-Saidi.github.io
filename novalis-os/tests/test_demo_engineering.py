from test_demo_seed import DemoSeedTests
from novalis_os.demo_seed import seed, ROLES
from novalis_os.demo_engineering import seed_engineering, PROJECT
from novalis_os.db import get_db

class EngineeringTests(DemoSeedTests):
 def test_engineering_consistency_and_accounts(self):
  credentials={r:'DemoEngineering-2026!'+r for r in ROLES};seed(self.app,credentials)
  self.assertTrue(seed_engineering(self.app)['created'])
  self.assertFalse(seed_engineering(self.app)['created'])
  with self.app.app_context():
   db=get_db();self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(),[])
   self.assertEqual(db.execute('SELECT sum(price_cents) FROM project_phases WHERE project_id=?',(PROJECT,)).fetchone()[0],3600000)
   self.assertEqual(db.execute('SELECT count(*) FROM tasks WHERE project_id=?',(PROJECT,)).fetchone()[0],18)
   self.assertEqual(db.execute('SELECT count(*) FROM documents WHERE project_id=?',(PROJECT,)).fetchone()[0],5)
   spec=db.execute('SELECT id FROM project_specs WHERE project_id=?',(PROJECT,)).fetchone()[0]
   invoices=[r[0] for r in db.execute('SELECT id FROM invoices WHERE project_id=?',(PROJECT,))]
  for r,(email,_) in ROLES.items():
   c=self.app.test_client();res=c.post('/api/auth/login',json={'email':email,'password':credentials[r]},headers={'Origin':'http://localhost:5000'})
   self.assertEqual(res.status_code,200,res.json);self.assertFalse(res.json['mfa_required'])
   self.assertEqual(c.get('/api/session').status_code,200)
   if r in ('manager','account','developer','client'):
    result=c.get('/api/projects/'+PROJECT);self.assertEqual(result.status_code,200,result.json)
   if r in ('manager','client'):
    for path in ['/api/planning/specs/'+spec+'/pdf','/api/planning/'+PROJECT+'/dossier/pdf']+['/api/billing/'+i+'/pdf' for i in invoices]:
     pdf=c.get(path);self.assertEqual(pdf.status_code,200,path);self.assertTrue(pdf.data.startswith(b'%PDF'))
