import express from "express";
import path from "node:path";
import {fileURLToPath} from "node:url";
import Stripe from "stripe";
import {toNodeHandler,fromNodeHeaders} from "better-auth/node";
import {auth,db} from "./auth.mjs";
import {mountLearningRoutes} from "./learning/routes.mjs";
import {checkoutProduct,entitledForSubscription,eligibleForCoursePayment,canAccessProduct} from "./billing.mjs";

const ORIGIN=process.env.APP_ORIGIN;
const billingEnabled=process.env.BILLING_ENABLED==="true";
const required=["DATABASE_URL","BETTER_AUTH_SECRET","RESEND_API_KEY","RESEND_FROM_EMAIL","APP_ORIGIN",
 ...(billingEnabled?["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_PRICE_FOUNDATIONS","STRIPE_PRICE_PRO_MONTHLY"]:[])];
for(const name of required)if(!process.env[name]||(process.env[name].includes("REPLACE_ME")))throw Error("Missing configuration: "+name);
if(process.env.NODE_ENV==="production"&&(!ORIGIN.startsWith("https://")||process.env.BETTER_AUTH_SECRET.length<32))throw Error("Production requires HTTPS and a long auth secret");
// This public development branch must not charge a real card while the new
// student/academy products, legal terms and content review are unfinished.
if(billingEnabled&&(!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")))
 throw Error("Live Stripe billing is intentionally blocked pending product and legal launch approval.");
const stripe=billingEnabled?new Stripe(process.env.STRIPE_SECRET_KEY):null;
const prices={foundations:process.env.STRIPE_PRICE_FOUNDATIONS,pro_monthly:process.env.STRIPE_PRICE_PRO_MONTHLY};
const app=express();
const publicRoot=path.join(path.dirname(fileURLToPath(import.meta.url)),"..","public");
app.disable("x-powered-by");
app.set("trust proxy","loopback");
app.use((_req,res,next)=>{res.set("Cache-Control","no-store");res.set("X-Content-Type-Options","nosniff");res.set("Referrer-Policy","strict-origin-when-cross-origin");res.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");next();});
app.get("/healthz",(_req,res)=>res.json({ok:true}));
function assertSameOrigin(req,res,next){
 const origin=req.get("origin");
 if(origin!==ORIGIN)return res.status(403).json({error:"invalid_origin"});
 next();
}
const session=async(req,res,next)=>{
 try{
  const s=await auth.api.getSession({headers:fromNodeHeaders(req.headers),query:{disableCookieCache:true}});
  if(!s?.user?.id||!s.user.emailVerified)return res.status(401).json({error:"authentication_required"});
  req.currentUser=s.user;next();
 }catch{res.status(401).json({error:"authentication_required"});}
};
// Webhook MUST receive the original bytes: mounted before JSON parser.
app.post("/api/billing/webhook",express.raw({type:"application/json",limit:"512kb"}),async(req,res)=>{
 if(!billingEnabled)return res.status(503).json({error:"billing_not_enabled"});
 let event;
 try{event=stripe.webhooks.constructEvent(req.body,req.get("stripe-signature"),process.env.STRIPE_WEBHOOK_SECRET);}
 catch{return res.status(400).json({error:"invalid_signature"});}
 const client=await db.connect();
 try{
  await client.query("BEGIN");
  const claim=await client.query("INSERT INTO billing_events (id,type) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id",[event.id,event.type]);
  if(claim.rowCount===0){await client.query("COMMIT");return res.json({received:true,duplicate:true});}
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   const s=event.data.object;
   if(eligibleForCoursePayment(s)){
    // We only trust the user id if the session is one we created and stored.
    const row=await client.query("SELECT user_id FROM checkout_sessions WHERE session_id=$1 AND user_id=$2 AND product_key='foundations'",[s.id,s.client_reference_id]);
    if(row.rowCount===1){
     const intent=typeof s.payment_intent==="string"?s.payment_intent:s.payment_intent?.id;
     if(intent)await client.query("UPDATE checkout_sessions SET payment_intent_id=$1 WHERE session_id=$2",[intent,s.id]);
     await client.query(`INSERT INTO entitlements(user_id,product_key,source_id,is_active,last_event_created)
      VALUES($1,'foundations',$2,TRUE,$3) ON CONFLICT(user_id,product_key,source_id)
      DO UPDATE SET is_active=TRUE,last_event_created=EXCLUDED.last_event_created,updated_at=NOW()
      WHERE entitlements.last_event_created<=EXCLUDED.last_event_created`,[row.rows[0].user_id,s.id,event.created]);
    }
   }
  }
  if(event.type.startsWith("customer.subscription.")){
   const s=event.data.object;
   const customer=typeof s.customer==="string"?s.customer:s.customer?.id;
   const row=await client.query("SELECT user_id FROM billing_customers WHERE stripe_customer_id=$1",[customer]);
   if(row.rowCount===1){
    const priceId=s.items?.data?.[0]?.price?.id;
    const isPro=priceId===prices.pro_monthly;
    // Deleted or inactive subscriptions revoke their *own* entitlement;
    // unrelated purchases and subscriptions remain untouched.
    await client.query(`INSERT INTO entitlements(user_id,product_key,source_id,is_active,last_event_created)
     VALUES($1,'pro_monthly',$2,$3,$4) ON CONFLICT(user_id,product_key,source_id)
     DO UPDATE SET is_active=EXCLUDED.is_active,last_event_created=EXCLUDED.last_event_created,updated_at=NOW()
     WHERE entitlements.last_event_created<=EXCLUDED.last_event_created`,
     [row.rows[0].user_id,s.id,isPro&&entitledForSubscription(s.status),event.created]);
   }
  }
  if(event.type==="charge.refunded"||event.type==="charge.dispute.created"){
   const charge=event.data.object;
   const intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
   const revoke=event.type==="charge.dispute.created"||
     (charge.refunded===true&&typeof charge.amount==="number"&&charge.amount_refunded>=charge.amount);
   if(intent&&revoke){
    // A dispute or full refund revokes the matching one-time course grant only.
    await client.query(`UPDATE entitlements e SET is_active=FALSE,last_event_created=$2,updated_at=NOW()
      FROM checkout_sessions cs WHERE cs.session_id=e.source_id
      AND cs.payment_intent_id=$1 AND e.product_key='foundations'
      AND e.last_event_created<=$2`,[intent,event.created]);
   }
  }
  await client.query("COMMIT");res.json({received:true});
 }catch(err){await client.query("ROLLBACK");console.error("Billing event failed",event.id,event.type);res.status(500).json({error:"retry_event"});}
 finally{client.release();}
});
app.all("/api/auth/{*any}",toNodeHandler(auth));
app.use(express.json({limit:"16kb"}));
app.use("/assets",express.static(path.join(publicRoot,"assets"),{index:false,dotfiles:"deny",maxAge:"1h"}));
app.get(["/dashboard","/learning","/exam"],(_req,res)=>res.sendFile(path.join(publicRoot,"learning.html")));
app.get("/certificates/:id",(_req,res)=>res.sendFile(path.join(publicRoot,"certificate.html")));
app.get(["/","/pricing","/account","/billing/success"],(_req,res)=>res.sendFile(path.join(publicRoot,"index.html")));

app.post("/api/billing/checkout",assertSameOrigin,session,async(req,res)=>{
 if(process.env.BILLING_ENABLED!=="true")return res.status(503).json({error:"billing_not_enabled"});
 const product=checkoutProduct(req.body?.productKey,prices);
 if(!product)return res.status(400).json({error:"unknown_product"});
 const user=req.currentUser;
 try{
  let row=await db.query("SELECT stripe_customer_id FROM billing_customers WHERE user_id=$1",[user.id]);
  let customerId=row.rows[0]?.stripe_customer_id;
  if(!customerId){
   const customer=await stripe.customers.create({email:user.email,metadata:{userId:user.id}},{idempotencyKey:"notebooks-customer-"+user.id});
   await db.query("INSERT INTO billing_customers(user_id,stripe_customer_id) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING",[user.id,customer.id]);
   row=await db.query("SELECT stripe_customer_id FROM billing_customers WHERE user_id=$1",[user.id]);
   customerId=row.rows[0].stripe_customer_id;
  }
  const s=await stripe.checkout.sessions.create({
   mode:product.mode,customer:customerId,client_reference_id:user.id,
   line_items:[{price:product.price,quantity:1}],
   billing_address_collection:"required",tax_id_collection:{enabled:true},
   automatic_tax:{enabled:true},
   success_url:ORIGIN+"/billing/success?session_id={CHECKOUT_SESSION_ID}",
   cancel_url:ORIGIN+"/pricing",
   metadata:{productKey:product.key},
   ...(product.mode==="subscription"?{subscription_data:{metadata:{productKey:product.key,userId:user.id}}}:{})
  },{idempotencyKey:"notebooks-checkout-"+user.id+"-"+product.key+"-"+crypto.randomUUID()});
  await db.query("INSERT INTO checkout_sessions(session_id,user_id,product_key) VALUES($1,$2,$3)",[s.id,user.id,product.key]);
  res.json({url:s.url});
 }catch(err){console.error("Checkout failed");res.status(503).json({error:"checkout_unavailable"});}
});
app.post("/api/billing/portal",assertSameOrigin,session,async(req,res)=>{
 if(!billingEnabled)return res.status(503).json({error:"billing_not_enabled"});
 try{
  const row=await db.query("SELECT stripe_customer_id FROM billing_customers WHERE user_id=$1",[req.currentUser.id]);
  if(!row.rowCount)return res.status(404).json({error:"no_billing_account"});
  const portal=await stripe.billingPortal.sessions.create({customer:row.rows[0].stripe_customer_id,return_url:ORIGIN+"/account"});
  res.json({url:portal.url});
 }catch{res.status(503).json({error:"portal_unavailable"});}
});
app.get("/api/me/entitlements",session,async(req,res)=>{
 const row=await db.query("SELECT DISTINCT product_key FROM entitlements WHERE user_id=$1 AND is_active=TRUE",[req.currentUser.id]);
 res.json({products:row.rows.map(r=>r.product_key)});
});
app.get("/api/premium/lessons/:slug",session,async(req,res)=>{
 const slug=req.params.slug;
 if(typeof slug!=="string"||!/^[a-z0-9-]{3,80}$/.test(slug))return res.status(400).json({error:"invalid_lesson"});
 try{
  const lesson=await db.query(`SELECT slug,title,body_markdown,required_product_key
     FROM private_lessons WHERE slug=$1 AND published=TRUE`,[slug]);
  if(lesson.rowCount!==1)return res.status(404).json({error:"lesson_not_found"});
  const required=lesson.rows[0].required_product_key;
  const ent=await db.query("SELECT DISTINCT product_key FROM entitlements WHERE user_id=$1 AND is_active=TRUE",[req.currentUser.id]);
  if(!canAccessProduct(required,ent.rows.map(row=>row.product_key)))return res.status(403).json({error:"premium_access_required"});
  // This content is stored exclusively in the private DB. It must never be
  // included in GitHub Pages, cache/CDN public objects, or static assets.
  // The future frontend must escape or sanitize Markdown before rendering.
  res.json({slug:lesson.rows[0].slug,title:lesson.rows[0].title,markdown:lesson.rows[0].body_markdown});
 }catch{res.status(503).json({error:"content_unavailable"});}
});

mountLearningRoutes(app,{db,session,assertSameOrigin});
app.use((_req,res)=>res.status(404).json({error:"not_found"}));
app.listen(Number(process.env.PORT||3400),"127.0.0.1",()=>console.log("Notebooks platform listening on loopback"));
