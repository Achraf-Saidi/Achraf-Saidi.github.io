"""Isolated production-cleanup invariants: no real VPS or outside database access."""
import contextlib
import importlib.util
import io
import json
import os
import secrets
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import test_workflows as workflows
from novalis_os.db import get_db, row, rows, now
from novalis_os.security import hash_password


def load_operator():
    path=Path(__file__).resolve().parents[1]/'deploy'/'safe-production-cleanup.py'
    spec=importlib.util.spec_from_file_location('safe_production_cleanup',path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CleanupInvariant(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    def test_suspends_only_live_extras_and_preserves_demo_and_prospect(self):
        api=self.app.test_client()
        req=api.post('/api/public/contact',headers={'Origin':'https://public.novalis.test'},
            json={'name':'Isolated prospect','email':'testcontact@example.test',
                  'company':'Real-looking test customer','category':'ERP',
                  'description':'A test request that must survive account cleanup',
                  'consent':True,'request_id':secrets.token_hex(16)})
        self.assertEqual(req.status_code,201,req.json)
        with self.app.app_context():
            db=get_db()
            db.execute("INSERT INTO organisations VALUES('novalis-demo','Synthetic demo')")
            db.execute("""INSERT INTO users(id,org_id,name,email,role,status,password_hash,created_at)
                VALUES('demo-direction','novalis-demo','Demo manager','demo@example.test','manager','active',?,?)""",
                (hash_password(workflows.PASSWORD),now()))
            db.execute("""INSERT INTO users(id,org_id,name,email,role,status,password_hash,created_at)
                VALUES('nacim-test','novalis','Old title','saidi@novalisai.com','manager','active',?,?)""",
                (hash_password(workflows.PASSWORD),now()))
            before={r['id']:r for r in rows("SELECT * FROM users WHERE org_id='novalis-demo'")}
            lead_before=row('SELECT * FROM leads WHERE id=?',(req.json['id'],))
            operator=load_operator()
            output=io.StringIO()
            env={'NOVALIS_PROTECTED_REFERENCE':req.json['reference'],
                 'NOVALIS_PROTECTED_EMAIL':'testcontact@example.test',
                 'NOVALIS_ORG_ID':'novalis','NOVALIS_MODE':'production'}
            def fake_backup(_,__,destination):
                destination.mkdir(parents=True,exist_ok=False)
                return destination
            with patch.dict(os.environ,env),patch.object(sys,'argv',['operator','--apply']),\
                 patch.object(operator,'create_app',return_value=self.app),\
                 patch.object(operator,'backup',side_effect=fake_backup),\
                 patch.object(operator,'verify_backup',return_value=None),\
                 patch.object(operator,'token_for',return_value='private-invite-link'),\
                 contextlib.redirect_stdout(output):
                operator.main()
            result=json.loads(output.getvalue())
            self.assertTrue(result['user_changes_applied'])
            self.assertEqual(result['deleted_count'],0)
            self.assertEqual(row('SELECT name FROM users WHERE id=?',('nacim-test',))['name'],'Nacim Saidi')
            achraf=row("SELECT * FROM users WHERE email='achraf@novalisai.com'")
            self.assertIsNotNone(achraf)
            self.assertEqual(achraf['role'],'manager')
            self.assertEqual(achraf['status'],'invited')
            self.assertTrue(all(u['status']=='suspended' for u in rows(
                "SELECT status FROM users WHERE org_id='novalis' AND email NOT IN ('achraf@novalisai.com','saidi@novalisai.com')")))
            self.assertEqual(before,{r['id']:r for r in rows("SELECT * FROM users WHERE org_id='novalis-demo'")})
            self.assertEqual(lead_before,row('SELECT * FROM leads WHERE id=?',(req.json['id'],)))
            self.assertEqual([e['status'] for e in rows('SELECT * FROM lead_public_events WHERE lead_id=?',(req.json['id'],))],['received'])

    def test_protected_request_must_be_verified_before_account_changes(self):
        operator=load_operator()
        with self.app.app_context():
            with patch.dict(os.environ,{'NOVALIS_MODE':'production','NOVALIS_ORG_ID':'novalis',
                   'NOVALIS_PROTECTED_REFERENCE':'NV-26-00000000',
                   'NOVALIS_PROTECTED_EMAIL':'wrong@example.test'}),\
                 patch.object(sys,'argv',['operator','--apply']),\
                 patch.object(operator,'create_app',return_value=self.app):
                with self.assertRaises(RuntimeError):
                    operator.main()
            self.assertIsNone(row("SELECT * FROM users WHERE email='achraf@novalisai.com'"))


if __name__=='__main__':
    unittest.main()
