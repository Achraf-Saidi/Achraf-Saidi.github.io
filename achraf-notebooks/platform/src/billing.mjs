// Billing transitions are deliberately independent of HTTP and Stripe SDK for testing.
// Only trusted, Stripe-signature-verified events may call these functions.
export const PRODUCT_KEYS=Object.freeze(["foundations","pro_monthly"]);
export function checkoutProduct(key,prices){
 if(!PRODUCT_KEYS.includes(key))return null;
 const price=prices[key];
 if(!price||!/^price_[A-Za-z0-9_]+$/.test(price))return null;
 return {key,price,mode:key==="pro_monthly"?"subscription":"payment"};
}
export function entitledForSubscription(status){return status==="active"||status==="trialing";}
export function eligibleForCoursePayment(session){
 return !!session&&session.mode==="payment"&&session.payment_status==="paid"&&
 session.metadata?.productKey==="foundations"&&
 typeof session.client_reference_id==="string"&&session.client_reference_id.length>0;
}
export function isSafeProductKey(s){return typeof s==="string"&&PRODUCT_KEYS.includes(s);}
