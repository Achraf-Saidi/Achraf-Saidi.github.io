import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const landing=fs.readFileSync("public/index.html","utf8");
const landingJS=fs.readFileSync("public/assets/app.js","utf8");
const landingCSS=fs.readFileSync("public/assets/app.css","utf8");
const dashboard=fs.readFileSync("public/learning.html","utf8");
const dashboardJS=fs.readFileSync("public/assets/learning.js","utf8");
const dashboardCSS=fs.readFileSync("public/assets/learning.css","utf8");
const server=fs.readFileSync("src/server.mjs","utf8");
test("no card secrets, premium bypass or unsafe HTML injection from UI",()=>{
 for(const asset of [landing,landingJS,dashboard,dashboardJS]){
  assert.doesNotMatch(asset,/sk_live_|whsec_|__STRIPE_SECRET/);
 }
 assert.doesNotMatch(landingJS,/\.innerHTML\s*=/);
 assert.doesNotMatch(dashboardJS,/\.innerHTML\s*=/);
 assert.match(landingJS,/api\/auth\/get-session/);
 assert.match(landingJS,/api\/me\/entitlements/);
 assert.match(server,/BILLING_ENABLED/);
 assert.match(landingJS,/ventes sont désactivées/i);
});
test("editorial pricing labels are transparent and never charge",()=>{
 assert.match(landing,/TARIFICATION PROPOSÉE/);
 assert.match(landing,/4,90 €/);
 assert.match(landing,/9,90 €/);
 assert.match(landing,/49 €/);
 assert.match(landing,/89 €/);
 assert.match(landing,/Prix indicatifs TTC envisagés/);
 assert.match(landing,/Aucune remise, accréditation/);
 assert.match(landing,/role="group" aria-label="Période de facturation simulée"/);
 assert.match(landingJS,/billing-yearly/);
 assert.match(landingJS,/facturé en une seule fois/);
 assert.doesNotMatch(landingJS,/api\/billing\/checkout/);
});
test("accessible responsive layout with keyboard and reduced motion",()=>{
 for(const page of [landing,dashboard]){
  assert.match(page,/viewport/);
  assert.match(page,/aria-live="polite"/);
  assert.match(page,/href="#main"|href="#dashboard-main"/);
 }
 assert.match(landing,/id="menu-toggle"[^>]+aria-expanded="false"/);
 assert.match(landingCSS,/@media\(max-width:600px\)/);
 assert.match(landingCSS,/prefers-reduced-motion/);
 assert.match(dashboardCSS,/@media\(max-width:600px\)/);
 assert.match(dashboardJS,/keydown/);
});
test("dashboard offers distinct studied and graded progress, valid learning navigation and focus mode",()=>{
 assert.match(dashboard,/id="track-quick-select"/);
 assert.match(dashboard,/id="focus-button"/);
 assert.match(dashboard,/id="continue-link"/);
 assert.match(dashboardJS,/prerequisites/);
 assert.match(dashboardJS,/renderNextStep/);
 assert.match(dashboardJS,/study-link/);
 assert.match(dashboardJS,/state\.track==="statistical-inference"/);
 assert.match(dashboard,/Chapitres rédigés<\/span><strong>92/);
});
