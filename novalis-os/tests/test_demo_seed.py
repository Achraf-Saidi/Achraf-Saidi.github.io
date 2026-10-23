"""Regression tests: synthetic demo tenant stays separate and repeatable."""
import tempfile
import unittest
from pathlib import Path
from novalis_os import create_app
from novalis_os.demo_seed import seed, ROLES, DEMO_ORG
from novalis_os.db import get_db

class DemoSeedTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.app=create_app({'TESTING':True,'DATABASE':str(Path(self.temp.name)/'demo.db'),
            'FILES_DIR':str(Path(self.temp.name)/'files'),'MODE':'development',
            'APP_ORIGIN':'http://localhost:5000','SECURE_COOKIES':False})
    def tearDown(self):self.temp.cleanup()

    def test_full_synthetic_erp_and_isolation(self):
        creds={role:'StrongDemoPassword-'+role+'-2026!' for role in ROLES}
        result=seed(self.app,creds)
        self.assertTrue(result['created'])
        self.assertEqual(result['projects'],4)
        self.assertEqual(len(result['profiles']),6)
        self.assertTrue(all(x['test_mode'] for x in result['invoices']))
        with self.app.app_context():
            db=get_db()
            self.assertEqual(db.execute('SELECT COUNT(*) FROM projects WHERE org_id=?',(DEMO_ORG,)).fetchone()[0],4)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM users WHERE org_id=?',(DEMO_ORG,)).fetchone()[0],6)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM project_stakeholders').fetchone()[0],12)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM project_phases').fetchone()[0],12)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],12)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM billing_documents WHERE test_mode=0').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM provider_receipts').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM project_specs').fetchone()[0],4)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM calendar_events').fetchone()[0],4)
            self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(),[])
        again=seed(self.app,creds)
        self.assertFalse(again['created'])
        self.assertEqual(again['projects'],4)

    def test_shared_weak_password_is_rejected(self):
        before={role:'Azerty00' for role in ROLES}
        with self.assertRaises(ValueError):
            seed(self.app,before)
        with self.app.app_context():
            self.assertIsNone(get_db().execute('SELECT id FROM organisations WHERE id=?',(DEMO_ORG,)).fetchone())

    def test_existing_user_email_is_not_modified(self):
        with self.app.app_context():
            get_db().execute('INSERT INTO organisations VALUES(?,?)',('real','Real'))
            get_db().execute('''INSERT INTO users(id,org_id,name,email,role,status,created_at)
               VALUES(?,?,?,?,?,'invited',?)''',('existing','real','Actual',ROLES['client'][0],'manager','2026-01-01'))
        with self.assertRaises(RuntimeError):
            seed(self.app,{role:'StrongDemoPassword-'+role+'-2026!' for role in ROLES})
        with self.app.app_context():
            self.assertIsNone(get_db().execute('SELECT id FROM organisations WHERE id=?',(DEMO_ORG,)).fetchone())

if __name__=='__main__':unittest.main()
