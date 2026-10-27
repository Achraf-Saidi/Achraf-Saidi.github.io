"""Operational invariants, role boundaries and atomic review regressions."""
import base64,io,json,unittest
from datetime import date
import test_workflows as workflows
import test_planning as planning_tests
from novalis_os.db import get_db,row
class Operations(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    create_user=workflows.Workflows.create_user
    call=workflows.Workflows.call
    flow=workflows.Workflows.flow
    phase=planning_tests.Planning.phase
    agreement=planning_tests.Planning.agreement
    def entry(self,t,minutes=60,note='Conception et revue des plans'):
        return self.call('developer','POST',f'/api/tasks/{t}/time',dict(work_date=date.today().isoformat(),minutes=minutes,billable=True,note=note),201)['id']
    def test_corrections_and_atomic_review(self):
        p,t,*_=self.flow();a=self.entry(t);b=self.entry(t,90)
        initial=self.call('manager','GET','/api/operations/time');self.assertEqual(initial['totals']['minutes'],150)
        entries=initial['items'];original=next(e for e in entries if e['id']==a)
        body=dict(revision=original['revision'],work_date=date.today().isoformat(),minutes=120,note='Correction de durée',billable=False)
        self.call('account','PATCH','/api/operations/time/'+a,body,404)
        self.call('developer','PATCH','/api/operations/time/'+a,body)
        self.call('developer','PATCH','/api/operations/time/'+a,body,409)
        self.call('manager','POST','/api/operations/time/review',dict(status='approved',entries=[{'id':e['id'],'revision':e['revision']} for e in entries]),409)
        current=self.call('manager','GET','/api/operations/time')['items'];self.assertTrue(all(e['status']=='submitted' for e in current))
        self.call('manager','POST','/api/operations/time/review',dict(status='rejected',entries=[{'id':e['id'],'revision':e['revision']} for e in current]))
        self.assertEqual(self.call('manager','GET','/api/operations/time')['totals']['minutes'],0)
        latest=next(e for e in self.call('developer','GET','/api/operations/time')['items'] if e['id']==a)
        self.call('developer','PATCH','/api/operations/time/'+a,{**body,'revision':latest['revision']})
        latest=next(e for e in self.call('manager','GET','/api/operations/time')['items'] if e['id']==a)
        self.call('manager','POST','/api/operations/time/review',dict(status='approved',entries=[{'id':a,'revision':latest['revision']}]))
        self.call('developer','PATCH','/api/operations/time/'+a,{**body,'revision':latest['revision']},409)
    def test_limits_filters_exports(self):
        p,t,*_=self.flow();self.entry(t,60,'=FORMULE ; <texte>');self.entry(t,1380)
        self.call('developer','POST',f'/api/tasks/{t}/time',dict(work_date=date.today().isoformat(),minutes=1,billable=False,note='Trop'),400)
        for role in ['client','finance','sysadmin']:
            for suffix in ['','.csv','/pdf']:self.call(role,'GET','/api/operations/time'+suffix,expected=403)
        self.call('manager','GET','/api/operations/time?start=bad',expected=400)
        self.call('manager','GET','/api/operations/time?start=2024-01-01&end=2026-01-01',expected=400)
        self.assertEqual(self.call('manager','GET','/api/operations/time?project_id=foreign')['items'],[])
        exported=self.accounts['manager']['api'].get('/api/operations/time.csv');self.assertEqual(exported.status_code,200);self.assertIn("'=FORMULE",exported.data.decode())
        pdf=self.accounts['manager']['api'].get('/api/operations/time/pdf');self.assertEqual(pdf.status_code,200);self.assertTrue(pdf.data.startswith(b'%PDF'))
    def test_nova_graph_and_metrics_permissions(self):
        p,t,*_=self.flow();self.phase(p);self.entry(t)
        for visibility,name in [('internal','Private commercial strategy'),('shared','Maître d’ouvrage')]:
            self.call('account','POST',f'/api/projects/{p}/stakeholders',dict(name=name,organisation='',email='',responsibility='Validation des études',category='decision',visibility=visibility,status='active'),201)
        for role in ['client','developer']:
            graph=self.call(role,'GET',f'/api/planning/{p}/graph');self.assertNotIn('Private commercial strategy',json.dumps(graph));self.assertTrue(any(n['type']=='stakeholder' for n in graph['nodes']))
        dev=self.call('developer','GET','/api/operations/projects/'+p);self.assertNotIn('finance',dev);self.assertEqual(dev['time']['logged_minutes'],60)
        client=self.call('client','GET','/api/operations/projects/'+p);self.assertNotIn('time',client);self.assertEqual(client['task_count'],0)
        self.call('other-client','GET','/api/operations/projects/'+p,expected=404)
        self.call('other-client','POST','/api/nova/chat',dict(project_id=p,message='Facturation'),404)
        self.call('sysadmin','POST','/api/nova/chat',dict(project_id=p,message='Priorités'),403)
        answer=self.call('developer','POST','/api/nova/chat',dict(project_id=p,message='Quel est le budget ?'));self.assertEqual(answer['mode'],'local');self.assertIn('ne donne pas accès',answer['answer'])
        answer=self.call('client','POST','/api/nova/chat',dict(project_id=p,message='Mes temps'));self.assertIn('ne donne pas accès',answer['answer'])
        before=self.call('manager','GET','/api/projects/'+p)
        self.call('manager','POST','/api/nova/chat',dict(project_id=p,message='Supprime ce projet'))
        self.assertEqual(before,self.call('manager','GET','/api/projects/'+p))
    def test_task_and_phase_links_stay_synchronized(self):
        p,t,*_=self.flow();ph,_=self.phase(p);milestone=self.call('account','GET','/api/planning/'+p)['phases'][0]['milestone_id']
        values=dict(name='Nouvelle étude',description='Calculs et contrôle',assignee_id='developer',milestone_id=milestone,estimate_minutes=120,due_date=date.today().isoformat(),priority='normal',client_visible=True)
        task=self.call('account','POST',f'/api/projects/{p}/tasks',values,201)['id']
        self.assertIn(task,self.call('account','GET','/api/planning/'+p)['phases'][0]['task_ids'])
        self.call('account','PATCH',f'/api/tasks/{task}/details',{**values,'version':1,'milestone_id':None})
        self.assertNotIn(task,self.call('account','GET','/api/planning/'+p)['phases'][0]['task_ids'])
        self.call('account','PATCH',f'/api/tasks/{task}/details',{**values,'version':2})
        with self.app.app_context():get_db().execute("UPDATE milestones SET status='approved' WHERE id=?",(milestone,))
        self.call('account','POST',f'/api/projects/{p}/tasks',values,400)
        self.call('account','PATCH',f'/api/tasks/{task}/details',{**values,'version':3,'milestone_id':None},409)
    def test_finance_bases_and_modes_remain_distinct(self):
        p,*_=self.flow();ph,_=self.phase(p);self.agreement(p)
        with self.app.app_context():get_db().execute('INSERT INTO billing_test_clients VALUES(?)',(row('SELECT client_id FROM projects WHERE id=?',(p,))['client_id'],))
        body=dict(request_id='phase-deposit-once',purpose='deposit',amount_cents=50000,issue_date=date.today().isoformat(),due_date=date.today().isoformat())
        inv=self.call('manager','POST',f'/api/planning/{p}/phases/{ph}/invoice',body,201)['id']
        replay=self.call('manager','POST',f'/api/planning/{p}/phases/{ph}/invoice',body);self.assertEqual(replay['id'],inv);self.assertTrue(replay['replayed'])
        self.call('manager','POST',f'/api/planning/{p}/phases/{ph}/invoice',{**body,'amount_cents':60000},409)
        m=self.call('manager','GET','/api/operations/projects/'+p)['finance'];self.assertEqual(m['test']['draft_ht_cents'],50000);self.assertEqual(m['live']['issued_ht_cents'],0)
        self.call('manager','POST','/api/billing/'+inv+'/publish',dict(version=1,compliance_confirmed=True))
        m=self.call('manager','GET','/api/operations/projects/'+p)['finance'];self.assertEqual(m['test']['issued_ttc_cents'],60500);self.assertEqual(m['test']['draft_ht_cents'],0)
        inv2=self.call('manager','POST',f'/api/planning/{p}/phases/{ph}/invoice',{**body,'request_id':'phase-deposit-two'},201)['id'];self.call('manager','POST','/api/billing/'+inv2+'/cancel',{})
        self.assertEqual(self.call('manager','GET','/api/operations/projects/'+p)['finance']['test']['draft_ht_cents'],0)
    def test_company_logo_and_frozen_identity(self):
        from PIL import Image
        out=io.BytesIO();Image.new('RGB',(120,40),'#336655').save(out,format='PNG');logo='data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
        settings=self.call('manager','GET','/api/billing/setup')['settings'];self.call('manager','PUT','/api/billing/settings',{**settings,'trade_name':'Entreprise témoin','logo_data_url':logo})
        self.call('manager','PUT','/api/billing/settings',{**settings,'logo_data_url':'https://attacker.invalid/logo.svg'},400)
        p,*_=self.flow();self.phase(p);self.agreement(p);spec=self.call('manager','GET','/api/planning/'+p)['specs'][0]
        self.call('manager','PUT','/api/billing/settings',{**settings,'trade_name':'Nouveau nom'})
        self.assertEqual(self.call('manager','GET','/api/planning/'+p)['specs'][0]['snapshot']['seller']['trade_name'],'Entreprise témoin')
        pdf=self.accounts['manager']['api'].get('/api/planning/specs/'+spec['id']+'/pdf');self.assertEqual(pdf.status_code,200)
if __name__=='__main__':unittest.main()
