import test from 'node:test';
import assert from 'node:assert/strict';
import { byId, courses, packs, resources } from '../catalog.js';
import { normalizeCart, addToCart, removeFromCart, quote, cleanHistory, createDemoReceipt, CREDIT_DAYS } from '../commerce.js';

const now=Date.parse('2026-10-09T12:00:00Z');
const day=86400000;
const receipt=(items,method='edahabia',time=now,previous=[],suffix='TEST')=>createDemoReceipt(items,previous,method,time,suffix);

test('resource alone and the matching course have the advertised prices',()=>{
  assert.equal(quote(['r-python'],[],now).total,2490);
  assert.equal(quote(['python'],[],now).total,14900);
  const both=quote(['python','r-python'],[],now);
  assert.equal(both.total,14900);assert.equal(both.includedSavings,2490);
  assert.equal(both.lines.find(l=>l.id==='r-python').reason,'included');
});

test('eligible resource purchase reduces the matching formation exactly once',()=>{
  const purchase=receipt(['r-python']);
  const q=quote(['python'],[purchase],now+day);
  assert.equal(q.total,12410);assert.equal(q.creditSavings,2490);
  assert.equal(quote(['stats-r'],[purchase],now+day).creditSavings,0);
  const enrol=receipt(['python'],'edahabia',now+day,[purchase],'COURSE');
  assert.equal(quote(['python'],[purchase,enrol],now+2*day).creditSavings,0);
});

test('credits expire after 30 days and cannot come from future receipts',()=>{
  const purchase=receipt(['r-python']);
  assert.equal(CREDIT_DAYS,30);
  assert.equal(quote(['python'],[purchase],now+30*day).creditSavings,2490);
  assert.equal(quote(['python'],[purchase],now+30*day+1).creditSavings,0);
  assert.equal(quote(['python'],[purchase],now-1).creditSavings,0);
});

test('only the amount paid is credited, even inside a discounted pack',()=>{
  const purchase=receipt(['r-python']);purchase.resourcePurchases[0].amount=1800;
  const q=quote(['pack-data'],[purchase],now+day);
  assert.equal(q.total,63100);assert.equal(q.packSavings,13900);assert.equal(q.creditSavings,1800);
  purchase.resourcePurchases[0].amount=999999;
  assert.equal(quote(['pack-data'],[purchase],now+day).creditSavings,2490);
});

test('the cart chooses a cheaper compatible pack without charging shared courses twice',()=>{
  const q=quote(['python','stats-r','ml'],[],now);
  assert.equal(q.total,64900);assert.deepEqual(q.lines.map(l=>l.id),['pack-data']);
  const overlap=quote(['pack-data','pack-web'],[],now);
  assert.equal(overlap.total,94800);
  assert.deepEqual(new Set(overlap.courseIds),new Set(['python','stats-r','ml','web-ai']));
  const advanced=quote(['pack-data','pack-ai'],[],now);
  assert.equal(advanced.total,139700);
  assert.equal(advanced.courseIds.filter(id=>id==='ml').length,1);
});

test('packs and resources can be removed without losing unrelated selections',()=>{
  const items=addToCart(addToCart(['r-rl'],'pack-data'),'pack-ai');
  assert.equal(items.filter(id=>id==='ml').length,1);
  assert.deepEqual(new Set(removeFromCart(items,'pack-ai')),new Set(['python','stats-r','r-rl']));
  assert.deepEqual(removeFromCart(['python','r-python'],'r-python'),['python']);
});

test('one month is charged for school support and no recurring renewal is created',()=>{
  assert.equal(quote(['math-bac','physics-bac'],[],now).total,6900);
  const order=receipt(['pack-bac'],'cash');
  assert.equal(order.total,6900);assert.equal(order.method,'cash');
  assert.equal('subscription' in order,false);
});

test('already included resources are not charged in a later demonstration order',()=>{
  const enrolled=receipt(['python']);
  const q=quote(['r-python'],[enrolled],now+day);
  assert.equal(q.total,0);assert.equal(q.ownedSavings,2490);
  assert.equal(q.lines[0].reason,'owned');
});

test('anonymous demo receipts contain no personal or financial credentials',()=>{
  const order=receipt(['python','r-python']);
  assert.match(order.id,/^DEMO-NUM-/);assert.equal(order.schema,2);
  for(const key of ['name','email','card','cvv','pin','otp','address','phone'])assert.equal(key in order,false);
  assert.equal(cleanHistory([order]).length,1);
  assert.equal(cleanHistory([{},null,{...order,lines:[{id:'unknown',amount:1}]}]).length,0);
  assert.throws(()=>receipt([]));assert.throws(()=>receipt(['python'],'bank'));
});

test('corrupt browser state and duplicate selections cannot create invalid totals',()=>{
  assert.deepEqual(normalizeCart([null,{},'__proto__','constructor','python','python','no-such-course']),['python']);
  assert.equal(quote(['python','python','pack-web','web-ai'],[],now).total,39900);
  assert.deepEqual(normalizeCart(null),[]);
});

test('invoice arithmetic balances across every course selection, with matching resources included',()=>{
  const ids=courses.map(p=>p.id);
  for(let mask=0;mask<2**ids.length;mask++){
    const selected=ids.filter((_,i)=>mask&(1<<i));
    const q=quote([...selected,...selected.map(id=>byId[id].resource)],[],now);
    assert.equal(q.total,q.subtotal-q.packSavings-q.includedSavings-q.ownedSavings-q.creditSavings);
    assert.ok(Number.isSafeInteger(q.total)&&q.total>=0);
    const charged=q.lines.flatMap(l=>l.coveredCourses);
    assert.equal(charged.length,new Set(charged).size);
    assert.equal(q.lines.filter(l=>l.kind==='resource').reduce((sum,l)=>sum+l.amount,0),0);
  }
});

test('published pricing is internally consistent',()=>{
  for(const pack of packs){assert.ok(pack.price<pack.courses.reduce((sum,id)=>sum+byId[id].price,0));assert.equal(pack.monthly,pack.courses.every(id=>byId[id].monthly));}
  for(const resource of resources){assert.equal(byId[resource.course].resource,resource.id);assert.ok(resource.price>0&&resource.price<byId[resource.course].price);}
});
