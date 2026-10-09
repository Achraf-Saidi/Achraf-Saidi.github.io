import { courses, packs, resources, byId } from './catalog.js?v=6e7f347bc8';

export const CREDIT_DAYS = 30;
export const STORAGE_VERSION = 2;
const DAY = 86400000;

/** The cart stores atomic course/resource IDs. Packs are selected automatically at the best non-overlapping price. */
export function normalizeCart(ids) {
  if (!Array.isArray(ids)) return [];
  const result = new Set();
  for (const id of ids.slice(0, 100)) {
    if (typeof id !== 'string') continue;
    const product = byId[id];
    if (!product) continue;
    if (product.kind === 'pack') product.courses.forEach(c => result.add(c));
    else result.add(id);
  }
  return [...result];
}

export function addToCart(ids, id) {
  return normalizeCart([...normalizeCart(ids), id]);
}

export function removeFromCart(ids, id) {
  const remove = byId[id]?.kind === 'pack' ? byId[id].courses : [id];
  return normalizeCart(ids).filter(item => !remove.includes(item));
}

export function cleanHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(order => order && order.schema === STORAGE_VERSION && typeof order.id === 'string'
    && order.id.startsWith('DEMO-NUM-') && Number.isFinite(Date.parse(order.createdAt))
    && ['edahabia', 'cash'].includes(order.method) && Number.isSafeInteger(order.total) && order.total >= 0
    && Array.isArray(order.courseIds) && order.courseIds.every(id => byId[id]?.kind === 'course')
    && Array.isArray(order.lines) && order.lines.every(line => byId[line?.id] && Number.isSafeInteger(line.amount) && line.amount >= 0)
    && Array.isArray(order.resourcePurchases) && order.resourcePurchases.every(p => byId[p?.resourceId]?.kind === 'resource' && typeof p.id === 'string' && Number.isSafeInteger(p.amount) && p.amount > 0 && Number.isFinite(Date.parse(p.createdAt)))
    && Array.isArray(order.resourceCredits) && order.resourceCredits.every(c => byId[c?.resourceId]?.kind === 'resource' && typeof c.purchaseId === 'string' && Number.isSafeInteger(c.amount) && c.amount >= 0)
  ).slice(-30);
}

function candidates(history, now) {
  const used = new Set(history.flatMap(order => order.resourceCredits.map(c => c.purchaseId)));
  const found = new Map();
  for (const order of history) {
    for (const purchase of order.resourcePurchases) {
      const resource = byId[purchase?.resourceId];
      const age = now - Date.parse(purchase?.createdAt);
      if (resource?.kind !== 'resource' || typeof purchase.id !== 'string' || used.has(purchase.id)
        || !Number.isSafeInteger(purchase.amount) || purchase.amount <= 0 || !Number.isFinite(age)
        || age < 0 || age > CREDIT_DAYS * DAY || found.has(resource.id)) continue;
      found.set(resource.id, { purchaseId: purchase.id, resourceId: resource.id, amount: Math.min(purchase.amount, resource.price) });
    }
  }
  return found;
}

function bestCover(courseIds) {
  const wanted = new Set(courseIds);
  const eligible = packs.filter(pack => pack.courses.every(id => wanted.has(id))).map(pack => byId[pack.id]);
  let best = courseIds.map(id => byId[id]);
  let bestTotal = best.reduce((sum, p) => sum + p.price, 0);
  // Four packs => at most sixteen combinations. Reject any shared course.
  for (let mask = 1; mask < 2 ** eligible.length; mask++) {
    const selected = eligible.filter((_, i) => mask & (1 << i));
    const covered = selected.flatMap(p => p.courses);
    if (new Set(covered).size !== covered.length) continue;
    const uncovered = courseIds.filter(id => !covered.includes(id)).map(id => byId[id]);
    const option = [...selected, ...uncovered];
    const total = option.reduce((sum, p) => sum + p.price, 0);
    if (total < bestTotal) { best = option; bestTotal = total; }
  }
  return best;
}

export function quote(ids, rawHistory = [], now = Date.now()) {
  const cart = normalizeCart(ids);
  const history = cleanHistory(rawHistory);
  const courseIds = cart.filter(id => byId[id].kind === 'course');
  const resourceIds = cart.filter(id => byId[id].kind === 'resource');
  const coveredResources = new Set(courseIds.map(id => byId[id].resource));
  const ownedResources = new Set(history.flatMap(order => [
    ...order.courseIds.filter(id => byId[id]?.kind === 'course').map(id => byId[id].resource),
    ...order.resourcePurchases.filter(p => byId[p?.resourceId]?.kind === 'resource' && p.amount > 0).map(p => p.resourceId)
  ]));
  const availableCredits = candidates(history, now);
  const lines = bestCover(courseIds).map(product => {
    const coveredCourses = product.kind === 'pack' ? product.courses : [product.id];
    const credits = coveredCourses.map(id => availableCredits.get(byId[id].resource)).filter(Boolean);
    const credit = Math.min(product.price, credits.reduce((sum, c) => sum + c.amount, 0));
    const regular = coveredCourses.reduce((sum, id) => sum + byId[id].price, 0);
    return { id: product.id, kind: product.kind, price: product.price, regular, coveredCourses, credits, credit, amount: product.price - credit, reason: null };
  });
  for (const id of resourceIds) {
    const product = byId[id];
    const reason = coveredResources.has(id) ? 'included' : ownedResources.has(id) ? 'owned' : null;
    lines.push({ id, kind: 'resource', price: product.price, regular: product.price, amount: reason ? 0 : product.price, credit: 0, credits: [], coveredCourses: [], reason });
  }
  const subtotal = courseIds.reduce((sum, id) => sum + byId[id].price, 0) + resourceIds.reduce((sum, id) => sum + byId[id].price, 0);
  const packSavings = lines.filter(l => l.kind === 'pack').reduce((sum, l) => sum + l.regular - l.price, 0);
  const includedSavings = lines.filter(l => l.reason === 'included').reduce((sum, l) => sum + l.price, 0);
  const ownedSavings = lines.filter(l => l.reason === 'owned').reduce((sum, l) => sum + l.price, 0);
  const creditSavings = lines.reduce((sum, l) => sum + l.credit, 0);
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { cart, courseIds, resourceIds, coveredResources: [...coveredResources], lines, subtotal, packSavings, includedSavings, ownedSavings, creditSavings, total, savings: subtotal - total };
}

/** Records only anonymous demonstration receipts. No names, email addresses or financial credentials. */
export function createDemoReceipt(ids, history, method, now = Date.now(), suffix = '') {
  if (!['edahabia', 'cash'].includes(method)) throw new Error('Unknown demonstration method');
  const calculation = quote(ids, history, now);
  if (!calculation.cart.length) throw new Error('Empty cart');
  const createdAt = new Date(now).toISOString();
  const random = suffix || Math.random().toString(36).slice(2, 7).toUpperCase();
  const id = `DEMO-NUM-${now.toString(36).toUpperCase()}-${random}`;
  return {
    schema: STORAGE_VERSION, id, createdAt, method, total: calculation.total,
    courseIds: calculation.courseIds,
    resourcePurchases: calculation.lines.filter(l => l.kind === 'resource' && l.amount > 0).map(l => ({ id: `${id}-${l.id}`, resourceId: l.id, amount: l.amount, createdAt })),
    resourceCredits: calculation.lines.flatMap(l => l.credits),
    lines: calculation.lines.map(l => ({ id: l.id, amount: l.amount, credit: l.credit, reason: l.reason }))
  };
}

export function resourceValue(product) {
  const ids = product.kind === 'pack' || product.courses ? product.courses : [product.id];
  return ids.reduce((sum, id) => sum + (byId[byId[id]?.resource]?.price || 0), 0);
}
