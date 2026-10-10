import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { seedSchool } from '../school-core.js';
import * as V from '../school-views.js';
import { pageHTML } from '../views.js';
function inspect(html,label){const {document}=parseHTML('<html><body>'+html+'</body></html>');const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length,label+': IDs must be unique');for(const b of document.querySelectorAll('button'))assert.ok(b.textContent.trim()||b.getAttribute('aria-label'),label+': every button needs a name');for(const input of document.querySelectorAll('input:not([type=hidden]),select,textarea'))assert.ok(input.closest('label')||input.getAttribute('aria-label')||document.querySelector('label[for="'+input.id+'"]'),label+': every field needs a label');}
test('all six role dashboards and their screens provide named controls and unique IDs',()=>{const s=seedSchool();for(const actor of s.users.slice(0,6))for(const [screen] of V.NAV[actor.role])inspect(V.shellHTML(s,actor,screen,{mode:'persistent'}),actor.role+'/'+screen);});
test('public learning experiences remain accessible in French, English and Arabic',()=>{for(const lang of ['fr','en','ar'])for(const view of ['home','lycee','tech','resources'])inspect(pageHTML(view,lang),view+'/'+lang);});
test('account, PDF, course, lesson, attendance and payment forms have labels',()=>{const s=seedSchool();for(const [label,html] of [['login',V.loginHTML()],['user',V.userForm(s)],['course',V.courseForm(s)],['resource',V.resourceForm(s,s.users[0])],['assignment',V.assignmentForm(s,s.users[1])],['session',V.sessionForm(s,s.users[1])],['invoice',V.invoiceForm(s)],['payment',V.invoicePayDialog(s,'inv-4')],['lesson',V.lessonDialog(s,s.users[3],'python')],['attendance',V.attendanceDialog(s,'s-1')]])inspect(html,label);});
