"""Verify the demo journey through the actual authenticated API and role boundaries."""
import tempfile
import unittest
from pathlib import Path
from novalis_os import create_app
from novalis_os.demo_seed import seed, ROLES


class IntelligenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.passwords = {role: 'Fixture-only-passphrase-' + role for role in ROLES}
        self.app = create_app({'TESTING': True, 'DATABASE': str(Path(self.temp.name)/'demo.db'),
            'FILES_DIR': str(Path(self.temp.name)/'files'), 'MODE': 'development',
            'APP_ORIGIN': 'http://localhost:5000', 'SECURE_COOKIES': False,
            'MFA_EXEMPT_EMAILS': {email for email, _ in ROLES.values()}})
        seed(self.app, self.passwords)

    def tearDown(self):
        self.temp.cleanup()

    def login(self, role):
        c = self.app.test_client()
        r = c.post('/api/auth/login', json={'email': ROLES[role][0], 'password': self.passwords[role]},
                   headers={'Origin': 'http://localhost:5000'})
        self.assertEqual(r.status_code, 200)
        return c, {'Origin': 'http://localhost:5000', 'X-CSRF-Token': r.json['csrf']}

    def test_six_accounts_and_role_scoped_journeys(self):
        for role in ROLES:
            with self.subTest(role=role):
                c, headers = self.login(role)
                self.assertEqual(c.get('/api/session').json['user']['role'], role)
                r = c.get('/api/projects')
                if role == 'sysadmin':
                    self.assertEqual(r.status_code, 200)
                    self.assertEqual(r.json['items'], [])
                    continue
                self.assertEqual(r.status_code, 200)
                projects = r.json['items']
                self.assertEqual(len(projects), 1 if role == 'client' else 4)
                for project in projects:
                    pid = project['id']
                    people = c.get(f'/api/projects/{pid}/stakeholders')
                    actions = c.get(f'/api/projects/{pid}/intelligence')
                    self.assertEqual(people.status_code, 200)
                    self.assertEqual(actions.status_code, 200)
                    if role in {'developer', 'client'}:
                        self.assertTrue(all(x['visibility'] == 'shared' for x in people.json['items']))
                    if role != 'manager':
                        self.assertFalse(any(x['code'] == 'bill_phase' for x in actions.json['actions']))

    def test_client_cannot_modify_stakeholders_or_view_another_project(self):
        manager, _ = self.login('manager')
        all_projects = manager.get('/api/projects').json['items']
        client, headers = self.login('client')
        own = client.get('/api/projects').json['items'][0]['id']
        other = next(p['id'] for p in all_projects if p['id'] != own)
        for suffix in ['stakeholders', 'intelligence']:
            self.assertEqual(client.get(f'/api/projects/{other}/{suffix}').status_code, 404)
        self.assertEqual(client.post(f'/api/projects/{own}/stakeholders', json={}, headers=headers).status_code, 403)

    def test_manager_receives_phase_billing_shortcut_for_agreed_scope(self):
        c, _ = self.login('manager')
        projects = c.get('/api/projects').json['items']
        horizon = next(p for p in projects if p['name'].startswith('Horizon'))
        actions = c.get(f'/api/projects/{horizon["id"]}/intelligence').json['actions']
        bills = [a for a in actions if a['code'] == 'bill_phase']
        self.assertTrue(bills)
        self.assertTrue(bills[0]['target'].startswith('phase-invoice:'))

    def test_sensitive_demo_accounts_still_require_mfa_setup(self):
        self.app.config['MFA_EXEMPT_EMAILS'] = set()
        for role in ['manager', 'finance', 'sysadmin']:
            c, _ = self.login(role)
            self.assertTrue(c.get('/api/session').json['mfa_required'])
            self.assertEqual(c.get('/api/projects').status_code, 403)


if __name__ == '__main__':
    unittest.main()
