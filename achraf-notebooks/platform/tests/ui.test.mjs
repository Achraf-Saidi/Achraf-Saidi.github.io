import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const h=fs.readFileSync("public/index.html","utf8");
const js=fs.readFileSync("public/assets/app.js","utf8");
const srv=fs.readFileSync("src/server.mjs","utf8");
test("no client-side Stripe secret or entitlement bypass",()=>{
 assert.doesNotMatch(h+js, /sk_live_|whsec_|__STRIPE_SECRET/);
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
 assert.match(js,/api\/auth\/get-session/);
 assert.match(js,/api\/me\/entitlements/);
 assert.match(js,/Paiements désactivés/);
 assert.match(srv,/BILLING_ENABLED/);
});
test("prototype has semantic forms and mobile layout",()=>{
 assert.match(h,/aria-live="polite"/);
 assert.match(h,/name-wrap/);
 assert.match(h,/viewport/);
 assert.match(fs.readFileSync("public/assets/app.css","utf8"),/@media\(max-width:650px\)/);
});
