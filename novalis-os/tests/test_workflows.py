import base64
import io
import json
import re
import secrets
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from novalis_os import create_app
from novalis_os.db import get_db, uid, now, row
from novalis_os.security import encrypt, decrypt, hash_password, totp
from novalis_os.cli import backup, restore, verify_backup, maintenance

ORIGIN='https://app.novalis.test'
PASSWORD='Only in tests: a strong passphrase!'


class Workflows(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        root=Path(self.temp.name)
        self.app=create_app({'TESTING':True,'DATABASE':str(root/'database.sqlite3'),'FILES_DIR':str(root/'documents'),
                             'APP_ORIGIN':ORIGIN,'PUBLIC_ORIGINS':['https://public.novalis.test'],'ENCRYPTION_KEY':secrets.token_bytes(32)})
        self.accounts={}
        self.secrets={}
        with self.app.app_context():
            db=get_db()
            db.execute("INSERT INTO organisations VALUES('novalis','Novalis AI')")
            for client_id in ['client-a','client-b']:
                db.execute('INSERT INTO clients VALUES(?,?,?,?,?,?)',(client_id,'novalis',client_id,client_id+'@example.test','',now()))
            for role in ['manager','account','developer','client','finance','sysadmin']:
                self.create_user(role,role,'client-a' if role=='client' else None)
            self.create_user('other-client','client','client-b')
        for name in self.accounts:
            api=self.app.test_client()
            d={'email':name+'@example.test','password':PASSWORD}
            if name in self.secrets:
                d['code']=totp(self.secrets[name])
            result=api.post('/api/auth/login',json=d,headers={'Origin':ORIGIN})
            self.assertEqual(result.status_code,200,result.json)
            self.accounts[name]={'api':api,'csrf':result.json['csrf']}

    def tearDown(self):
        self.temp.cleanup()

    def create_user(self,name,role,client_id=None,mfa=True):
        secret=base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=') if mfa and role in {'manager','finance','sysadmin'} else None
        if secret:
            self.secrets[name]=secret
        get_db().execute("INSERT INTO users(id,org_id,client_id,name,email,role,status,password_hash,verified_at,totp_cipher,created_at) VALUES(?,?,?,?,?,?,'active',?,?,?,?)",
                         (name,'novalis',client_id,name,name+'@example.test',role,hash_password(PASSWORD),now(),encrypt(secret) if secret else None,now()))
        self.accounts[name]=None

    def call(self,who,method,url,body=None,expected=200,**kwargs):
        account=self.accounts[who]
        result=account['api'].open(url,method=method,json=body,headers={'Origin':ORIGIN,'X-CSRF-Token':account['csrf']},**kwargs)
        self.assertEqual(result.status_code,expected,result.json)
        return result.json

    def flow(self):
        lead=self.call('manager','POST','/api/leads',{'name':'Ada','email':'ada@example.test','company':'Studio A','category':'ERP','description':'Centraliser nos opérations.'},201)['id']
        self.call('manager','PATCH','/api/leads/'+lead,{'status':'proposal','version':1,'owner_id':'account','scoping_note':'Proposition commerciale validée.'})
        result=self.call('manager','POST',f'/api/leads/{lead}/convert',{'version':2,'accepted':True,'name':'Plateforme Studio','scope':'Le périmètre accepté','budget_cents':200000,'due_date':date.today().isoformat(),'account_id':'account'},201)
        # Attach client account to the converted customer, as an invited account would be.
        with self.app.app_context():
            get_db().execute('UPDATE users SET client_id=? WHERE id=?',(result['client_id'],'client'))
        project=result['id']
        self.call('account','POST',f'/api/projects/{project}/members',{'user_id':'developer'})
        milestone=self.call('account','POST',f'/api/projects/{project}/milestones',{'name':'Première livraison','description':'Livrable prêt à examiner','due_date':date.today().isoformat()},201)['id']
        task=self.call('account','POST',f'/api/projects/{project}/tasks',{'name':'Créer le module','description':'Critères d’acceptation','assignee_id':'developer','milestone_id':milestone,'estimate_minutes':120,'due_date':'2025-01-01'},201)['id']
        return project,task,milestone,lead

    def test_01_booking_contact_and_invitation(self):
        future=(datetime.now(timezone.utc)+timedelta(days=3)).isoformat()
        slot=self.call('manager','POST','/api/calendar/slots',{'starts_at':future,'owner_id':'account'},201)['id']
        body={'slot_id':slot,'name':'Prospect','email':'prospect@example.test','company':'Entreprise','category':'SaaS',
              'description':'Développer une application métier','consent':True}
        api=self.app.test_client()
        booked=api.post('/api/public/bookings',json=body,headers={'Origin':'https://public.novalis.test'})
        self.assertEqual(booked.status_code,201)
        double=api.post('/api/public/bookings',json=body,headers={'Origin':'https://public.novalis.test'})
        self.assertEqual(double.status_code,409)
        self.assertNotIn(slot,[i['id'] for i in api.get('/api/public/slots').json['items']])
        self.call('manager','POST','/api/users',{'name':'Nouveau','email':'new@example.test','role':'developer'},201)
        with self.app.app_context():
            message=row("SELECT body_cipher,status FROM outbox WHERE recipient='new@example.test'")
            token=re.search(r'#activate=([\w-]+)',decrypt(message['body_cipher']))[1]
            self.assertEqual(message['status'],'queued')
        response=api.post('/api/auth/activate',json={'token':token,'password':PASSWORD},headers={'Origin':ORIGIN})
        self.assertEqual(response.status_code,200)
        self.assertEqual(api.post('/api/auth/activate',json={'token':token,'password':PASSWORD},headers={'Origin':ORIGIN}).status_code,400)
        self.assertEqual(api.post('/api/auth/login',json={'email':'new@example.test','password':PASSWORD},headers={'Origin':ORIGIN}).status_code,200)

    def test_02_project_conversion_is_atomic(self):
        project,task,milestone,lead=self.flow()
        self.assertEqual(self.call('account','GET',f'/api/projects/{project}')['tasks'][0]['id'],task)
        self.call('manager','POST',f'/api/leads/{lead}/convert',{'version':2,'accepted':True},409)
        with self.app.app_context():
            self.assertEqual(row('SELECT COUNT(*) AS n FROM projects WHERE lead_id=?',(lead,))['n'],1)

    def test_03_developer_time_and_validation(self):
        project,task,_,_=self.flow()
        self.call('developer','PATCH','/api/tasks/'+task,{'status':'in_progress','version':1})
        entry=self.call('developer','POST',f'/api/tasks/{task}/time',{'minutes':90,'work_date':date.today().isoformat(),'billable':True,'note':'Réalisation du module'},201)['id']
        self.call('developer','PATCH','/api/tasks/'+task,{'status':'review','version':2,'remaining_minutes':0})
        self.call('developer','PATCH','/api/tasks/'+task,{'status':'approved','version':3},403)
        self.call('account','PATCH','/api/tasks/'+task,{'status':'approved','version':3})
        self.call('account','POST',f'/api/time/{entry}/review',{'status':'approved'})
        self.assertEqual(self.call('account','GET',f'/api/projects/{project}')['project']['progress'],100)
        self.call('developer','PATCH','/api/tasks/'+task,{'status':'in_progress','version':1},409)

    def test_04_client_communication_is_separate(self):
        project,_,_,_=self.flow()
        self.call('developer','POST',f'/api/projects/{project}/messages',{'channel':'internal','body':'Discussion confidentielle'},201)
        self.call('developer','POST',f'/api/projects/{project}/messages',{'channel':'external','body':'Message interdit'},403)
        self.call('client','POST',f'/api/projects/{project}/messages',{'channel':'external','body':'Merci pour le suivi'},201)
        self.call('client','POST',f'/api/projects/{project}/messages',{'channel':'internal','body':'Accès interdit'},403)
        bundle=self.call('client','GET',f'/api/projects/{project}')
        self.assertEqual(len(bundle['messages']),1)
        self.assertNotIn('budget_cents',bundle['project'])
        self.assertEqual(bundle['tasks'],[])
        req=self.call('client','POST',f'/api/projects/{project}/requests',{'title':'Améliorer le filtre','description':'Ajouter une sélection de dates'},201)['id']
        self.call('account','POST',f'/api/requests/{req}/qualify',{'version':1,'within_scope':True,'assignee_id':'developer','name':'Filtre','description':'Filtre par dates','estimate_minutes':60,'due_date':date.today().isoformat()},201)
        self.assertEqual(self.call('client','GET',f'/api/projects/{project}')['requests'][0]['status'],'planned')

    def test_05_external_invoice_and_bank_confirmation(self):
        project,_,_,_=self.flow()
        invoice=self.call('manager','POST',f'/api/projects/{project}/invoices',{'due_date':date.today().isoformat(),'lines':[{'description':'Acompte','quantity':1,'unit_cents':10000,'vat_basis_points':2100}]},201)['id']
        self.call('client','GET','/api/invoices/'+invoice,expected=404)
        self.call('manager','POST',f'/api/invoices/{invoice}/register',{'issued_externally':True,'external_number':'EXT-2026-001','peppol_reference':'TEST-receipt'})
        payment={'amount_cents':12100,'bank_reference':'TEST-bank-reference','bank_confirmed':True,'paid_at':date.today().isoformat(),'idempotency_key':'TEST-pay-1'}
        self.call('client','POST',f'/api/invoices/{invoice}/payments',payment,403)
        self.call('manager','POST',f'/api/invoices/{invoice}/payments',payment,201)
        self.call('manager','POST',f'/api/invoices/{invoice}/payments',payment)
        self.assertEqual(self.call('client','GET','/api/invoices/'+invoice)['invoice']['balance_cents'],0)
        self.assertEqual(self.call('manager','GET','/api/finance')['totals']['paid_cents'],12100)
        with self.app.app_context():
            with self.assertRaises(Exception):
                get_db().execute('UPDATE invoices SET external_number=? WHERE id=?',('changed',invoice))

    def test_06_delays_and_idempotent_alerts(self):
        self.flow()
        self.assertEqual(len(self.call('account','GET','/api/dashboard')['alerts']),1)
        with self.app.app_context():
            maintenance();maintenance()
            self.assertEqual(row("SELECT COUNT(*) AS n FROM notifications WHERE kind='overdue_task'")['n'],1)

    def test_07_authorisations_and_private_files(self):
        project,_,_,_=self.flow()
        self.call('other-client','GET',f'/api/projects/{project}',expected=404)
        self.call('developer','GET','/api/finance',expected=403)
        self.call('sysadmin','GET','/api/finance',expected=403)
        self.call('sysadmin','GET',f'/api/projects/{project}',expected=404)
        developer=self.accounts['developer']
        result=developer['api'].post(f'/api/projects/{project}/documents',data={'channel':'internal','file':(io.BytesIO(b'Private document'),'specification.txt')},
                                     headers={'Origin':ORIGIN,'X-CSRF-Token':developer['csrf']})
        self.assertEqual(result.status_code,201,result.json)
        document=result.json['id']
        self.call('client','GET','/api/documents/'+document,expected=404)
        self.call('other-client','GET','/api/documents/'+document,expected=404)
        response=developer['api'].get('/api/documents/'+document)
        self.assertEqual(response.data,b'Private document')
        self.assertIn('attachment',response.headers['Content-Disposition'])
        response.close()

    def test_08_delivery_and_maintenance(self):
        project,task,milestone,_=self.flow()
        self.call('account','POST',f'/api/projects/{project}/delivery',{'version':1},409)
        for status,version,who in [('in_progress',1,'developer'),('review',2,'developer'),('approved',3,'account')]:
            self.call(who,'PATCH','/api/tasks/'+task,{'status':status,'version':version})
        self.call('account','POST',f'/api/milestones/{milestone}/review',{'version':1})
        self.call('client','POST',f'/api/milestones/{milestone}/approve',{'version':2,'status':'approved'})
        self.call('account','POST',f'/api/projects/{project}/delivery',{'version':1})
        self.call('client','POST',f'/api/projects/{project}/accept-delivery',{'version':2})
        self.call('manager','POST',f'/api/projects/{project}/archive',{'version':3,'status':'maintenance'})
        self.assertEqual(self.call('client','GET',f'/api/projects/{project}')['project']['status'],'maintenance')

    def test_09_csrf_mfa_suspension_and_restore(self):
        manager=self.accounts['manager']
        self.assertEqual(manager['api'].post('/api/clients',json={},headers={'Origin':'https://evil.test','X-CSRF-Token':manager['csrf']}).status_code,403)
        self.assertEqual(manager['api'].post('/api/clients',json={},headers={'Origin':ORIGIN}).status_code,403)
        self.call('manager','POST','/api/users/developer/status',{'status':'suspended'})
        self.call('developer','GET','/api/dashboard',expected=401)
        with self.app.app_context():
            target=Path(self.temp.name)/'backup'
            backup(self.app.config['DATABASE'],self.app.config['FILES_DIR'],target)
            verify_backup(target)
            restored=Path(self.temp.name)/'restored'
            restore(target,restored)
            import sqlite3
            db=sqlite3.connect(restored/'novalis.sqlite3')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM users').fetchone()[0],7)
            db.close()
            with self.assertRaises(RuntimeError):
                restore(target,restored)

    def test_10_concurrent_booking_and_scoping_note(self):
        future=(datetime.now(timezone.utc)+timedelta(days=5)).isoformat()
        slot=self.call('manager','POST','/api/calendar/slots',{'starts_at':future},201)['id']
        body={'slot_id':slot,'name':'Lead','email':'lead@example.test','category':'Web','description':'Un site web professionnel','consent':True}
        def reserve(_):
            api=self.app.test_client()
            return api.post('/api/public/bookings',json=body,headers={'Origin':ORIGIN}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(reserve,range(2))),[201,409])
        lead=self.call('manager','GET','/api/leads')['items'][0]
        self.call('manager','PATCH','/api/leads/'+lead['id'],{'version':1,'status':'scoping','scoping_note':'Objectifs, phases, hypothèses et prochaines étapes.'})
        self.call('manager','POST',f"/api/leads/{lead['id']}/send-note",{},202)

    def test_11_sensitive_mfa_enrollment_and_recovery(self):
        with self.app.app_context():
            self.create_user('new-manager','manager',mfa=False)
        api=self.app.test_client()
        login=api.post('/api/auth/login',json={'email':'new-manager@example.test','password':PASSWORD},headers={'Origin':ORIGIN})
        self.assertEqual(login.status_code,200)
        self.assertTrue(login.json['mfa_required'])
        self.assertIn('Secure',login.headers['Set-Cookie'])
        self.assertIn('HttpOnly',login.headers['Set-Cookie'])
        self.assertEqual(api.get('/api/dashboard').status_code,403)
        headers={'Origin':ORIGIN,'X-CSRF-Token':login.json['csrf']}
        setup=api.post('/api/auth/mfa/setup',json={'password':PASSWORD},headers=headers)
        self.assertEqual(setup.status_code,200)
        code=totp(setup.json['secret'])
        confirmed=api.post('/api/auth/mfa/confirm',json={'code':code},headers=headers)
        self.assertEqual(confirmed.status_code,200)
        self.assertEqual(len(confirmed.json['recovery_codes']),8)
        self.assertEqual(api.get('/api/dashboard').status_code,200)
        second=self.app.test_client()
        replay=second.post('/api/auth/login',json={'email':'new-manager@example.test','password':PASSWORD,'code':code},headers={'Origin':ORIGIN})
        self.assertEqual(replay.status_code,401)
        recovery=confirmed.json['recovery_codes'][0]
        self.assertEqual(second.post('/api/auth/login',json={'email':'new-manager@example.test','password':PASSWORD,'code':recovery},headers={'Origin':ORIGIN}).status_code,200)
        third=self.app.test_client()
        self.assertEqual(third.post('/api/auth/login',json={'email':'new-manager@example.test','password':PASSWORD,'code':recovery},headers={'Origin':ORIGIN}).status_code,401)

    def test_12_expiry_and_email_header_injection(self):
        self.call('manager','POST','/api/users',{'name':'Nouveau','email':'new@example.test','role':'developer'},201)
        with self.app.app_context():
            message=row("SELECT body_cipher FROM outbox WHERE recipient='new@example.test'")
            token=re.search(r'#activate=([\w-]+)',decrypt(message['body_cipher']))[1]
            get_db().execute("UPDATE tokens SET expires_at='2000-01-01T00:00:00+00:00'")
        api=self.app.test_client()
        self.assertEqual(api.post('/api/auth/activate',json={'token':token,'password':PASSWORD},headers={'Origin':ORIGIN}).status_code,400)
        body={'name':'Lead','email':'other@example.test,extra@example.test','category':'Web','description':'Un projet professionnel','consent':True}
        self.assertEqual(api.post('/api/public/contact',json=body,headers={'Origin':ORIGIN}).status_code,400)

    def test_13_backup_preserves_private_documents(self):
        project,_,_,_=self.flow()
        manager=self.accounts['manager']
        upload=manager['api'].post(f'/api/projects/{project}/documents',data={'channel':'internal','file':(io.BytesIO(b'Document sauvegarde'),'notes.txt')},
                                    headers={'Origin':ORIGIN,'X-CSRF-Token':manager['csrf']})
        self.assertEqual(upload.status_code,201)
        with self.app.app_context():
            target=Path(self.temp.name)/'backup-docs'
            backup(self.app.config['DATABASE'],self.app.config['FILES_DIR'],target)
            restored=restore(target,Path(self.temp.name)/'restored-docs')
            document=restored/'documents'/upload.json['id']
            self.assertEqual(document.read_bytes(),b'Document sauvegarde')
            (target/'documents'/upload.json['id']).write_bytes(b'Corrupted test file')
            with self.assertRaises(RuntimeError):
                verify_backup(target)

    def test_14_manual_invitation_is_authorized_and_one_time(self):
        public=self.app.test_client()
        body={'name':'Invité','email':'manual@example.test','role':'developer'}
        self.assertEqual(public.post('/api/users',json=body,headers={'Origin':ORIGIN}).status_code,401)
        self.call('developer','POST','/api/users',body,403)
        self.call('sysadmin','POST','/api/users',dict(body,role='manager'),403)
        invitation=self.call('manager','POST','/api/users',body,201)
        self.assertEqual(invitation['expires_in_hours'],24)
        self.assertFalse(invitation['email_enabled'])
        self.assertTrue(invitation['activation_url'].startswith(ORIGIN+'/os/#activate='))
        token=invitation['activation_url'].split('#activate=')[1]
        self.assertNotIn('activation_url',str(self.call('manager','GET','/api/users')))
        activated=public.post('/api/auth/activate',json={'token':token,'password':PASSWORD},headers={'Origin':ORIGIN})
        self.assertEqual(activated.status_code,200)
        self.assertEqual(public.post('/api/auth/activate',json={'token':token,'password':PASSWORD},headers={'Origin':ORIGIN}).status_code,400)


    def test_15_mfa_exception_is_account_specific(self):
        with self.app.app_context():
            self.create_user('optional-manager','manager',mfa=False)
            self.create_user('required-manager','manager',mfa=False)
        self.app.config['MFA_EXEMPT_EMAILS']={'optional-manager@example.test'}
        optional=self.app.test_client()
        denied=optional.post('/api/auth/login',json={'email':'optional-manager@example.test','password':'wrong'},headers={'Origin':ORIGIN})
        self.assertEqual(denied.status_code,401)
        login=optional.post('/api/auth/login',json={'email':'optional-manager@example.test','password':PASSWORD},headers={'Origin':ORIGIN})
        self.assertEqual(login.status_code,200)
        self.assertFalse(login.json['mfa_required'])
        self.assertEqual(optional.get('/api/users').status_code,200)
        required=self.app.test_client()
        login=required.post('/api/auth/login',json={'email':'required-manager@example.test','password':PASSWORD},headers={'Origin':ORIGIN})
        self.assertEqual(login.status_code,200)
        self.assertTrue(login.json['mfa_required'])
        self.assertEqual(required.get('/api/users').status_code,403)
        self.app.config['MFA_EXEMPT_EMAILS']=set()
        optional=self.app.test_client()
        login=optional.post('/api/auth/login',json={'email':'optional-manager@example.test','password':PASSWORD},headers={'Origin':ORIGIN})
        self.assertTrue(login.json['mfa_required'])


if __name__=='__main__':
    unittest.main()
