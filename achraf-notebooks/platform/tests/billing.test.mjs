import test from "node:test";
import assert from "node:assert/strict";
import {checkoutProduct,entitledForSubscription,eligibleForCoursePayment,canAccessProduct} from "../src/billing.mjs";
const prices={foundations:"price_123",pro_monthly:"price_456"};
test("only server allowlisted product keys are accepted",()=>{
 assert.equal(checkoutProduct("evil",prices),null);
 assert.equal(checkoutProduct("__proto__",prices),null);
 assert.deepEqual(checkoutProduct("foundations",prices),{key:"foundations",price:"price_123",mode:"payment"});
 assert.deepEqual(checkoutProduct("pro_monthly",prices),{key:"pro_monthly",price:"price_456",mode:"subscription"});
});
test("entitlement requires payment confirmed by provider",()=>{
 const session={mode:"payment",payment_status:"paid",metadata:{productKey:"foundations"},client_reference_id:"user1"};
 assert.equal(eligibleForCoursePayment(session),true);
 assert.equal(eligibleForCoursePayment({...session,payment_status:"unpaid"}),false);
 assert.equal(eligibleForCoursePayment({...session,metadata:{productKey:"pro_monthly"}}),false);
 assert.equal(eligibleForCoursePayment({...session,mode:"subscription"}),false);
});
test("inactive subscriptions must not unlock pro",()=>{
 for(const status of ["past_due","unpaid","canceled","incomplete","incomplete_expired","paused"])assert.equal(entitledForSubscription(status),false);
 for(const status of ["active","trialing"])assert.equal(entitledForSubscription(status),true);
});

test("premium content enforces server entitlements",()=>{
 assert.equal(canAccessProduct("foundations",[]),false);
 assert.equal(canAccessProduct("foundations",["foundations"]),true);
 assert.equal(canAccessProduct("foundations",["pro_monthly"]),true);
 assert.equal(canAccessProduct("pro_monthly",["foundations"]),false);
 assert.equal(canAccessProduct("pro_monthly",["pro_monthly"]),true);
 assert.equal(canAccessProduct("__proto__",["pro_monthly"]),false);
 assert.equal(canAccessProduct("foundations",null),false);
});
