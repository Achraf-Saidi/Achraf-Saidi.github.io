import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// The mastery section is self-contained and ships as lightweight static HTML.
// Check translated routes, original chapters and syntactically valid browser scripts.
const root = path.resolve('public/mastery');
const chapters = ['pca','bayes','backprop','attention','bellman','survival','multiomics'];
const read = (lang, rel) => fs.readFileSync(path.join(root,lang,rel,'index.html'),'utf8');

for (const lang of ['fr','en']) {
 test(`mastery atlas: 136 modules, 26 resources and 7 chapters (${lang})`, () => {
  const page = read(lang,'.');
  assert.match(page,/Achraf Notebooks/);
  assert.equal((page.match(/data-module data-school=/g)||[]).length,136);
  assert.equal((page.match(/data-resource data-school=/g)||[]).length,26);
  assert.equal((page.match(/data-mark="/g)||[]).length,7);
  assert.ok(page.includes('achraf-mastery-progress-v1'));
  for (const id of chapters) assert.ok(page.includes(`/chapters/${id}/`),id);
  for (const [,script] of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
 });
 for (const id of chapters) {
  test(`mastery chapter: ${lang}/${id}`, () => {
   const page = read(lang,'chapters/'+id);
   assert.match(page,/<h1>/);
   assert.match(page,/id="notes"/);
   assert.match(page,/class="lab"/);
   assert.match(page,/type="range"/);
   assert.match(page,/id="complete"/);
   assert.match(page,/<pre><code>/);
   assert.match(page,/<details>/);
   assert.ok(page.includes('/mastery/'+(lang==='en'?'fr':'en')+'/chapters/'+id+'/'));
   for(const [,script] of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
  });
 }
}
