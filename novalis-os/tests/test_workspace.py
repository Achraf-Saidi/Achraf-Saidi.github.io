"""Complete proposal, maintenance, profile and editing workflows."""
import re,unittest
from datetime import date
import test_workflows as workflows
from novalis_os.db import get_db,row

class Workspace(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    create_user=workflows.Workflows.create_user
    call=workflows.Workflows.call
    flow=workflows.Workflows.flow
    def test_proposal_full_cycle_and_conditions(self):
        project,*_=self.flow();body=dict(title='Proposition',scope='Module',assumptions='API accessible',exclusions='Hébergement exclu',amount_cents=10000)
        q=self.call('account','POST',f'/api/projects/{project}/proposals',body,201);self.assertEqual(q['version'],1);self.assertEqual(self.call('client','GET',f'/api/projects/{project}/proposals')['items'],[])
        self.call('account','POST','/api/proposals/'+q['id']+'/decision',{'status':'shared'});shared=self.call('client','GET',f'/api/projects/{project}/proposals')['items'][0];self.assertEqual(shared['exclusions'],body['exclusions']);self.assertEqual(shared['assumptions'],body['assumptions'])
        self.call('client','POST','/api/proposals/'+q['id']+'/decision',{'status':'accepted'});self.call('client','POST','/api/proposals/'+q['id']+'/decision',{'status':'declined'},409)
        q2=self.call('account','POST',f'/api/projects/{project}/proposals',body,201);self.assertEqual(q2['version'],2);self.call('account','POST','/api/proposals/'+q2['id']+'/decision',{'status':'shared'});self.call('client','POST','/api/proposals/'+q2['id']+'/decision',{'status':'declined'})
        self.call('other-client','GET',f'/api/projects/{project}/proposals',expected=404)
    def test_edit_project_task_and_concurrency(self):
        project,task,*_=self.flow();p=self.call('account','GET','/api/projects/'+project)['project'];body={k:p[k] for k in ['name','scope','due_date','version']};body['name']='Renommé';self.call('account','PATCH','/api/projects/'+project,body);self.call('account','PATCH','/api/projects/'+project,body,409)
        t=self.call('account','GET','/api/projects/'+project)['tasks'][0];t['name']='Module amélioré';self.call('account','PATCH','/api/tasks/'+task+'/details',t);self.call('account','PATCH','/api/tasks/'+task+'/details',t,409);self.call('developer','PATCH','/api/tasks/'+task+'/details',t,403)
    def test_maintenance_request_cycle_and_archive_guard(self):
        project,task,*_=self.flow()
        with self.app.app_context():get_db().execute("UPDATE projects SET status='maintenance' WHERE id=?",(project,))
        r=self.call('client','POST',f'/api/projects/{project}/requests',{'title':'Corriger filtre','description':'Le filtre de date doit être amélioré'},201)['id']
        self.call('account','PATCH','/api/requests/'+r,dict(status='analysing',reason='Nous vérifions la cause.',version=1))
        t=self.call('account','POST','/api/requests/'+r+'/qualify',dict(version=2,within_scope=True,assignee_id='developer',name='Filtre',description='Dates',estimate_minutes=60,due_date=date.today().isoformat()),201)['task_id']
        self.call('account','PATCH','/api/requests/'+r,dict(status='resolved',reason='Terminé',version=3),409)
        self.call('developer','PATCH','/api/tasks/'+t,dict(status='in_progress',version=1));self.call('developer','PATCH','/api/tasks/'+t,dict(status='review',version=2,remaining_minutes=0));self.call('account','PATCH','/api/tasks/'+t,dict(status='approved',version=3))
        self.call('account','PATCH','/api/requests/'+r,dict(status='resolved',reason='Corrigé et vérifié.',version=3));self.assertEqual(self.call('client','GET','/api/projects/'+project)['requests'][0]['status'],'resolved')
        self.call('manager','POST','/api/projects/'+project+'/archive',dict(status='archived',version=1),409)
        self.call('account','POST','/api/tasks/'+t+'/reopen',dict(reason='Régression constatée',remaining_minutes=30,version=4));self.assertEqual(self.call('client','GET','/api/projects/'+project)['requests'][0]['status'],'planned')
    def test_request_decline_is_explained_to_client(self):
        project,*_=self.flow();r=self.call('client','POST',f'/api/projects/{project}/requests',dict(title='Changement',description='Nouvelle fonctionnalité'),201)['id'];self.call('account','PATCH','/api/requests/'+r,dict(status='declined',version=1,reason='Hors du périmètre accepté.'))
        d=self.call('client','GET','/api/projects/'+project);self.assertEqual(d['requests'][0]['status'],'declined');self.assertIn('Hors du périmètre',d['messages'][0]['body']);self.call('account','POST','/api/requests/'+r+'/qualify',dict(version=2),409)
    def test_profiles_roles_and_dependency_guard(self):
        project,*_=self.flow();body=dict(name='Data spécialiste',role='developer',job_title='Data scientist',engagement='independent');self.call('manager','PATCH','/api/users/developer',body)
        u=next(u for u in self.call('manager','GET','/api/users')['items'] if u['id']=='developer');self.assertEqual(u['job_title'],'Data scientist');self.assertEqual(u['engagement'],'independent')
        self.call('sysadmin','PATCH','/api/users/developer',{**body,'role':'manager'},403);self.call('manager','PATCH','/api/users/manager',{**body,'role':'developer'},403);self.call('manager','PATCH','/api/users/developer',{**body,'role':'finance'},409)
        self.call('account','DELETE',f'/api/projects/{project}/members/developer',{},409)
    def test_search_never_exposes_foreign_records(self):
        project,*_=self.flow();r=self.call('client','GET','/api/search?q=module');self.assertEqual(r['items'],[]);self.assertEqual(self.call('other-client','GET','/api/search?q=Plateforme')['items'],[])
        self.assertEqual(self.call('developer','GET','/api/search?q=module')['items'][0]['kind'],'task');self.call('developer','GET','/api/search?q=x',expected=400);self.assertEqual(self.call('sysadmin','GET','/api/search?q=Plateforme')['items'],[])
    def test_reinvite_invalidates_old_link(self):
        from novalis_os.security import digest
        r=self.call('manager','POST','/api/users',dict(name='Designer',email='designer@example.test',role='developer'),201)
        old=r['activation_url'].split('=')[1];new=self.call('manager','POST','/api/users/'+r['id']+'/reinvite',{})['activation_url'].split('=')[1]
        self.assertNotEqual(old,new)
        with self.app.app_context():self.assertIsNotNone(row('SELECT consumed_at FROM tokens WHERE token_hash=?',(digest(old),))['consumed_at'])
        self.call('manager','POST','/api/users/manager/reinvite',{},409)
