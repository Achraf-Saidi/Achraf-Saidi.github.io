"""Persistence, retries, access boundaries and prospect-to-project continuity."""
import io,secrets,unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta,timezone,date
import test_workflows as workflows
from novalis_os.db import get_db,row,rows,migrate
from novalis_os.security import digest
class Intake(unittest.TestCase):
 setUp=workflows.Workflows.setUp
 tearDown=workflows.Workflows.tearDown
 create_user=workflows.Workflows.create_user
 call=workflows.Workflows.call
 flow=workflows.Workflows.flow
 def body(self,**changes):return dict(name='Prospect',email='prospect@example.test',company='Atelier de recette',category='ERP',description='Relier les stocks et les commandes.',consent=True,request_id=secrets.token_hex(16),**changes)
 def public(self,path,body,expected=200,origin='https://public.novalis.test'):
  r=self.app.test_client().post('/api/public/'+path,json=body,headers={'Origin':origin});self.assertEqual(r.status_code,expected,r.json);return r.json
 def test_real_receipt_private_hash_and_safe_public_response(self):
  r=self.public('contact',self.body(),201);self.assertRegex(r['reference'],r'^NV-\d{2}-[A-F0-9]{8}$');self.assertEqual(len(r['tracking_token']),43)
  with self.app.app_context():
   item=row('SELECT * FROM lead_intake WHERE lead_id=?',(r['id'],));self.assertEqual(item['access_hash'],digest(r['tracking_token']));self.assertNotIn(r['tracking_token'],str(item));self.assertTrue(rows("SELECT * FROM notifications WHERE user_id='manager'"));self.assertEqual(len(rows('SELECT id FROM outbox')),1)
  status=self.public('request-status',{'token':r['tracking_token']});self.assertEqual(status['status'],'received');self.assertEqual(set(status),{'reference','status','events','expires_at','portal_url'});self.assertNotIn('prospect@example',str(status));self.assertNotIn('Relier les stocks',str(status));self.assertIsNone(status['portal_url'])
 def test_duplicate_and_concurrent_request_are_one_lead(self):
  b=self.body()
  def send(_):return self.app.test_client().post('/api/public/contact',json=b,headers={'Origin':'https://public.novalis.test'})
  with ThreadPoolExecutor(max_workers=2) as pool:responses=list(pool.map(send,range(2)))
  self.assertEqual(sorted(r.status_code for r in responses),[200,201]);self.assertEqual(responses[0].json['id'],responses[1].json['id']);self.assertEqual(responses[0].json['tracking_token'],responses[1].json['tracking_token']);self.public('contact',{**b,'description':'Un contenu différent pour le même identifiant.'},409)
  with self.app.app_context():self.assertEqual(len(rows('SELECT id FROM leads')),1);self.assertEqual(len(rows('SELECT id FROM outbox')),1)
 def test_reference_and_email_show_only_general_stage_even_after_private_link_expiry(self):
  r=self.public('contact',self.body(),201)
  with self.app.app_context():get_db().execute("UPDATE lead_intake SET expires_at='2001-01-01T00:00:00+00:00'")
  shown=self.public('request-lookup',dict(reference=r['reference'].lower(),email='PROSPECT@EXAMPLE.TEST'))
  self.assertEqual(shown,dict(reference=r['reference'],status='received'))
  self.public('request-status',{'token':r['tracking_token']},404)
  self.call('manager','PATCH','/api/leads/'+r['id'],dict(status='proposal',version=1,scoping_note='PRIVATE COMMERCIAL NOTE'))
  shown=self.public('request-lookup',dict(reference=r['reference'],email='prospect@example.test'))
  self.assertEqual(shown,dict(reference=r['reference'],status='proposal'))
  self.assertNotIn('PRIVATE',str(shown))
 def test_reference_lookup_mismatch_origin_scope_and_no_cache(self):
  r=self.public('contact',self.body(),201);good=dict(reference=r['reference'],email='prospect@example.test')
  a=self.public('request-lookup',{**good,'email':'someone@example.test'},404)
  b=self.public('request-lookup',{**good,'reference':'NV-26-00000000'},404)
  self.assertEqual(a,b);self.public('request-lookup',good,403,origin='https://attacker.test')
  response=self.app.test_client().post('/api/public/request-lookup',json=good,headers={'Origin':'https://public.novalis.test'})
  self.assertEqual(response.status_code,200);self.assertIn('no-store',response.headers['Cache-Control'])
  self.app.config['ORG_ID']='another-organization'
  self.public('request-lookup',good,404)
 def test_reference_lookup_limits_attempts(self):
  for _ in range(8):self.public('request-lookup',dict(reference='NV-26-00000000',email='someone@example.test'),404)
  self.public('request-lookup',dict(reference='NV-26-00000000',email='someone@example.test'),429)
 def test_invalid_expired_and_foreign_tokens_do_not_disclose(self):
  r=self.public('contact',self.body(),201);self.public('request-status',{'token':'x'},404);self.public('request-status',{'token':'x'*43},404);self.public('request-status',{'token':r['tracking_token']},403,origin='https://attacker.test')
  with self.app.app_context():get_db().execute("UPDATE lead_intake SET expires_at='2001-01-01T00:00:00+00:00'")
  self.public('request-status',{'token':r['tracking_token']},404);self.call('developer','GET','/api/leads/'+r['id']+'/tracking',expected=403)
 def test_pipeline_events_and_internal_notes_remain_private(self):
  r=self.public('contact',self.body(),201);self.call('account','GET','/api/leads/'+r['id']+'/tracking',expected=404);self.call('manager','PATCH','/api/leads/'+r['id'],dict(status='qualified',version=1,owner_id='account',scoping_note='INTERNAL: marge et risque'));self.call('account','PATCH','/api/leads/'+r['id'],dict(status='discovery',version=2));self.call('account','PATCH','/api/leads/'+r['id'],dict(status='proposal',version=3))
  status=self.public('request-status',{'token':r['tracking_token']});self.assertEqual([e['status'] for e in status['events']],['received','reviewing','contact','proposal']);self.assertNotIn('INTERNAL',str(status));shown=self.call('account','GET','/api/leads/'+r['id']+'/tracking');self.assertEqual(shown['tracking']['reference'],r['reference']);self.assertNotIn('access_hash',str(shown));self.assertEqual(self.call('account','GET','/api/leads')['items'][0]['public_reference'],r['reference']);self.call('account','PATCH','/api/leads/'+r['id'],dict(status='lost',version=3),409);self.assertEqual(len(self.public('request-status',{'token':r['tracking_token']})['events']),4);self.call('account','PATCH','/api/leads/'+r['id'],dict(status='lost',version=4,loss_reason='INTERNAL PRIVATE'));self.assertEqual(self.public('request-status',{'token':r['tracking_token']})['status'],'closed')
 def test_conversion_continues_tracking_without_granting_access(self):
  r=self.public('contact',self.body(),201);self.call('manager','PATCH','/api/leads/'+r['id'],dict(status='proposal',version=1,owner_id='account'));self.call('manager','POST','/api/leads/'+r['id']+'/convert',dict(version=2,accepted=True,name='Projet de recette',scope='Gestion de stock',budget_cents=10000,due_date=date.today().isoformat(),account_id='account'),201);status=self.public('request-status',{'token':r['tracking_token']});self.assertEqual(status['status'],'project');self.assertEqual(status['portal_url'],workflows.ORIGIN+'/os/');self.assertNotIn('project_id',str(status))
  with self.app.app_context():self.assertIsNone(row("SELECT id FROM users WHERE email='prospect@example.test'"))
 def test_booking_with_receipt_is_atomic_and_retriable(self):
  slot=self.call('manager','POST','/api/calendar/slots',dict(starts_at=(datetime.now(timezone.utc)+timedelta(days=4)).isoformat(),owner_id='account'),201)['id'];b=self.body(slot_id=slot);r=self.public('contact',b,201);self.assertEqual(r['booking']['status'],'reserved');self.assertEqual(self.public('contact',b)['booking']['id'],r['booking']['id']);self.public('contact',self.body(slot_id=slot),409)
  with self.app.app_context():self.assertEqual(len(rows('SELECT id FROM leads')),1);self.assertEqual(len(rows('SELECT id FROM meetings')),1)
 def test_old_clients_and_migration_are_compatible(self):
  b=self.body();del b['request_id'];self.assertTrue(self.public('contact',b,201)['received'])
  with self.app.app_context():
   before=rows('SELECT * FROM users');migrate(self.app.config['DATABASE']);migrate(self.app.config['DATABASE']);self.assertEqual(before,rows('SELECT * FROM users'));self.assertEqual([r['version'] for r in rows('SELECT version FROM migrations ORDER BY version')],[1,2,3,4])
 def upload(self,who,project,name='scope.txt',content=b'Version 1',channel='external',previous=None,expected=201):
  account=self.accounts[who];body=dict(file=(io.BytesIO(content),name),channel=channel)
  if previous:body['supersedes']=previous
  result=account['api'].post('/api/projects/'+project+'/documents',data=body,headers={'Origin':workflows.ORIGIN,'X-CSRF-Token':account['csrf']});self.assertEqual(result.status_code,expected,result.json);return result.json
 def test_document_versions_keep_history_and_notify_client(self):
  project,*_=self.flow();v1=self.upload('account',project);v2=self.upload('account',project,content=b'Version 2',previous=v1['id']);self.assertEqual(v2['version'],2);docs=self.call('client','GET','/api/projects/'+project)['documents'];self.assertEqual({d['version']:d['latest'] for d in docs},{1:0,2:1});account=self.accounts['client'];response=account['api'].get('/api/documents/'+v1['id']);self.assertEqual(response.data,b'Version 1');response.close();response=account['api'].get('/api/documents/'+v2['id']);self.assertEqual(response.data,b'Version 2');response.close();self.upload('account',project,previous=v1['id'],expected=409);self.upload('client',project,previous=v2['id'],expected=403);self.upload('account',project,channel='internal',previous=v2['id'],expected=404);self.call('other-client','GET','/api/projects/'+project,expected=404)
  with self.app.app_context():self.assertTrue(row("SELECT id FROM notifications WHERE user_id='client' AND kind='document'"));self.assertEqual(len(rows('SELECT * FROM documents')),2)
 def test_document_versions_never_cross_visibility_or_project(self):
  project,*_=self.flow();internal=self.upload('developer',project,channel='internal');self.assertEqual(self.call('client','GET','/api/projects/'+project)['documents'],[]);self.upload('account',project,previous=internal['id'],expected=404);self.upload('other-client',project,expected=404)
  with self.app.app_context():get_db().execute("UPDATE projects SET status='archived' WHERE id=?",(project,))
  self.upload('account',project,expected=409)
