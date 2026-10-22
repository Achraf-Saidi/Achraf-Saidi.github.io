import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
import test_workflows as workflows
from novalis_os.db import get_db,row
from novalis_os.calendar import ics

class Planning(unittest.TestCase):
    setUp=workflows.Workflows.setUp
    tearDown=workflows.Workflows.tearDown
    create_user=workflows.Workflows.create_user
    call=workflows.Workflows.call
    flow=workflows.Workflows.flow
    def phase(self,p):
        d=dict(name='Conception & réalisation',description='Espace client et maquettes',acceptance='Parcours validés avec le client.',starts_on='2026-11-01',due_date='2026-11-30',price_cents=250000,vat_basis_points=2100,position=0)
        return self.call('account','POST',f'/api/planning/{p}/phases',d,201)['id'],d
    def agreement(self,p):
        s=self.call('account','POST',f'/api/planning/{p}/specs',{},201)['id']
        d=dict(version=1,title='Cahier des charges',sections={k:'Conditions convenues et documentées.' for k in ['context','scope','deliverables','acceptance','payment']},attachments=[])
        self.call('account','PATCH','/api/planning/specs/'+s,d)
        self.call('account','POST','/api/planning/specs/'+s+'/share',dict(version=2))
        self.call('manager','POST','/api/planning/specs/'+s+'/decision',dict(version=3,decision='accept',confirmed=True))
        self.call('client','POST','/api/planning/specs/'+s+'/decision',dict(version=4,decision='accept',confirmed=True))
        return s
    def event(self,p,**kw):
        d=dict(project_id=p,title='Atelier de conception',description='Revue des maquettes',starts_at='2026-11-10T09:00:00Z',ends_at='2026-11-10T10:00:00Z',visibility='shared',kind='workshop',attendee_ids=['account','developer','client'])
        return {**d,**kw}
    def test_phase_calendar_and_role_isolation(self):
        p,t,*_=self.flow();ph,d=self.phase(p)
        self.call('account','PUT',f'/api/planning/{p}/phases/{ph}/tasks',dict(task_id=t))
        self.assertEqual(self.call('manager','GET',f'/api/planning/{p}')['phases'][0]['task_ids'],[t])
        client=self.call('client','GET',f'/api/planning/{p}');self.assertEqual(client['phases'][0]['task_ids'],[])
        self.assertNotIn('price_cents',self.call('developer','GET',f'/api/planning/{p}')['phases'][0])
        self.call('other-client','GET',f'/api/planning/{p}',expected=404)
        cal=self.call('client','GET','/api/planner/calendar?start=2026-11-01&end=2026-12-01')
        self.assertIn('phase:'+ph,[e['id'] for e in cal['items']]);self.assertNotIn('task:'+t,[e['id'] for e in cal['items']])
    def test_calendar_conflict_rsvp_cancel_concurrency(self):
        p,*_=self.flow();d=self.event(p);event=self.call('account','POST','/api/planner/events',d,201)['id']
        self.call('account','POST','/api/planner/events',d,409)
        self.call('account','PATCH','/api/planner/events/'+event,{**d,'version':1,'title':'Atelier déplacé'})
        self.call('account','PATCH','/api/planner/events/'+event,{**d,'version':1},409)
        self.call('client','POST','/api/planner/events/'+event+'/rsvp',dict(response='accepted'))
        self.call('other-client','POST','/api/planner/events/'+event+'/rsvp',dict(response='accepted'),404)
        self.call('developer','PATCH','/api/planner/events/'+event,{**d,'version':2},403)
        self.call('account','POST','/api/planner/events/'+event+'/cancel',dict(version=2))
        self.call('client','POST','/api/planner/events/'+event+'/rsvp',dict(response='accepted'),409)
    def test_private_and_internal_calendar_events_do_not_leak(self):
        p,*_=self.flow();d=self.event(p,visibility='private',attendee_ids=['account']);e=self.call('account','POST','/api/planner/events',d,201)['id']
        for role in ['client','developer','manager','other-client']:
            result=self.call(role,'GET','/api/planner/calendar?start=2026-11-01&end=2026-12-01');self.assertNotIn(e,[x['id'] for x in result['items']])
        self.call('client','POST','/api/planner/events',self.event(p,visibility='team'),403)
        self.call('account','POST','/api/planner/events',self.event(p,visibility='team'),400)
        self.call('client','POST','/api/planner/events',self.event(p,meeting_url='javascript:alert(1)'),400)
        self.call('account','POST','/api/planner/events',self.event(p,attendee_ids=['other-client']),400)
    def test_recurring_events_keep_local_hour_across_dst(self):
        p,*_=self.flow();d=self.event(p,starts_at='2026-10-23T08:00:00Z',ends_at='2026-10-23T09:00:00Z',repeat_count=3,timezone='Europe/Brussels')
        self.call('account','POST','/api/planner/events',d,201)
        e=[x for x in self.call('client','GET','/api/planner/calendar?start=2026-10-20&end=2026-11-20')['items'] if x['source']=='event']
        self.assertEqual(len(e),3);self.assertIn('T08:00:00',e[0]['starts_at']);self.assertIn('T09:00:00',e[1]['starts_at'])
    def test_spec_bilateral_agreement_and_frozen_scope(self):
        p,*_=self.flow();ph,d=self.phase(p);s=self.agreement(p)
        spec=self.call('client','GET',f'/api/planning/{p}')['specs'][0];self.assertEqual(spec['status'],'accepted');self.assertEqual(spec['snapshot']['total_cents'],250000)
        self.call('account','PATCH',f'/api/planning/{p}/phases/{ph}',{**d,'version':1,'price_cents':1},409)
        self.call('account','PATCH','/api/planning/specs/'+s,dict(version=5,title='Rewrite'),409)
        self.call('client','POST','/api/planning/specs/'+s+'/decision',dict(version=5,decision='decline',reason='Changed',confirmed=True),409)
        new=self.call('account','POST',f'/api/planning/{p}/specs',{},201)['id'];self.assertNotEqual(new,s)
        self.call('account','PATCH',f'/api/planning/{p}/phases/{ph}',{**d,'version':1,'price_cents':300000})
        old=self.call('client','GET',f'/api/planning/{p}')['specs'][1];self.assertEqual(old['snapshot']['total_cents'],250000)
    def test_spec_comments_and_missing_acceptance(self):
        p,*_=self.flow();s=self.call('account','POST',f'/api/planning/{p}/specs',{},201)['id']
        self.call('account','POST','/api/planning/specs/'+s+'/share',dict(version=1),400)
        self.call('client','POST','/api/planning/specs/'+s+'/comments',dict(section='scope',body='Prévoir un accès mobile.'),201)
        self.call('other-client','POST','/api/planning/specs/'+s+'/comments',dict(body='Foreign'),404)
        self.assertEqual(self.call('account','GET',f'/api/planning/{p}')['specs'][0]['comments'][0]['body'],'Prévoir un accès mobile.')
    def test_graph_visibility_cycle_and_version(self):
        p,t,*_=self.flow();self.phase(p);base=self.call('account','GET',f'/api/planning/{p}/graph')
        a,b=base['nodes'][0]['id'],base['nodes'][1]['id'];body=dict(version=0,positions={},notes=[dict(id='note:internal',title='Interne',detail='Confidentiel',shared=False)],edges=[dict(source=a,target=b,relation='depends')])
        self.call('account','PUT',f'/api/planning/{p}/graph',body)
        self.call('account','PUT',f'/api/planning/{p}/graph',body,409)
        body['version']=1;body['edges'].append(dict(source=b,target=a,relation='depends'));self.call('account','PUT',f'/api/planning/{p}/graph',body,409)
        graph=self.call('client','GET',f'/api/planning/{p}/graph');self.assertNotIn('task:'+t,[n['id'] for n in graph['nodes']]);self.assertNotIn('note:internal',[n['id'] for n in graph['nodes']])
        self.call('client','PUT',f'/api/planning/{p}/graph',body,403)
    def test_phase_invoice_caps_and_client_publication_boundary(self):
        p,*_=self.flow();ph,_=self.phase(p)
        body=dict(purpose='deposit',amount_cents=100000,issue_date='2026-11-01',due_date='2026-11-15')
        url=f'/api/planning/{p}/phases/{ph}/invoice'
        self.call('manager','POST',url,body,409);self.agreement(p)
        first=self.call('manager','POST',url,body,201)['id'];self.call('manager','POST',url,{**body,'amount_cents':150001},409)
        self.call('account','POST',url,body,403);self.call('client','POST',url,body,403)
        self.assertEqual(self.call('client','GET',f'/api/planning/{p}')['invoices'],[])
        with self.app.app_context():doc=row('SELECT snapshot FROM billing_documents WHERE invoice_id=?',(first,));import json;snap=json.loads(doc['snapshot'])
        edit={**snap,'project_id':p,'version':1,'recipient_type':'belgian_business','due_date':'2026-11-15','lines':[{**snap['lines'][0],'unit_cents':999}]}
        self.call('manager','PATCH','/api/billing/'+first,edit,409)
        self.call('manager','POST','/api/billing/'+first+'/cancel',{})
        self.call('manager','POST',url,{**body,'amount_cents':250000},201)
    def test_pdf_and_ics_are_scoped_and_parseable(self):
        p,*_=self.flow();ph,_=self.phase(p);s=self.agreement(p)
        with self.app.app_context():get_db().execute('INSERT INTO billing_test_clients VALUES(?)',(row('SELECT client_id FROM projects WHERE id=?',(p,))['client_id'],))
        inv=self.call('manager','POST',f'/api/planning/{p}/phases/{ph}/invoice',dict(purpose='deposit',amount_cents=50000,issue_date=datetime.now(timezone.utc).date().isoformat(),due_date=datetime.now(timezone.utc).date().isoformat()),201)['id']
        self.call('manager','POST','/api/billing/'+inv+'/publish',dict(version=1,compliance_confirmed=True))
        self.call('account','POST','/api/planner/events',self.event(p,title='Réunion;\\\nRésumé '+('é'*90)),201)
        api=self.accounts['client']['api'];pdf=api.get('/api/planning/specs/'+s+'/pdf');self.assertEqual(pdf.status_code,200);self.assertTrue(pdf.data.startswith(b'%PDF-'))
        dossier=api.get(f'/api/planning/{p}/dossier/pdf');self.assertEqual(dossier.status_code,200);self.assertTrue(dossier.data.startswith(b'%PDF-'))
        graph=api.get(f'/api/planning/{p}/graph/pdf');self.assertEqual(graph.status_code,200);self.assertTrue(graph.data.startswith(b'%PDF-'))
        exported=api.get('/api/planner/calendar.ics?start=2026-11-01&end=2026-12-01');self.assertEqual(exported.status_code,200)
        raw=exported.data;self.assertIn(b'DTSTART;VALUE=DATE:20261130',raw);self.assertIn(b'CLASS:PRIVATE',raw)
        self.assertTrue(all(len(line)<=75 for line in raw.split(b'\r\n')))
        foreign=self.accounts['other-client']['api'].get('/api/planner/calendar.ics?start=2026-11-01&end=2026-12-01');self.assertNotIn(b'BEGIN:VEVENT',foreign.data)
        self.assertEqual(self.accounts['other-client']['api'].get('/api/planning/specs/'+s+'/pdf').status_code,404)
        import os
        if os.environ.get('NOVALIS_QA_OUTPUT'):
            output=Path(os.environ['NOVALIS_QA_OUTPUT']);output.mkdir(parents=True,exist_ok=True)
            (output/'dossier-qa.pdf').write_bytes(dossier.data);(output/'spec-qa.pdf').write_bytes(pdf.data);(output/'graph-qa.pdf').write_bytes(graph.data)
