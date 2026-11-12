import {betterAuth} from "better-auth";
import {Pool} from "pg";
import {sendEmail} from "./email.mjs";
export const db=new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
export const auth=betterAuth({
 database:db,
 baseURL:process.env.APP_ORIGIN,
 secret:process.env.BETTER_AUTH_SECRET,
 trustedOrigins:[process.env.APP_ORIGIN],
 emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:12},
 emailVerification:{
  sendOnSignUp:true,
  sendVerificationEmail:async ({user,url})=>sendEmail({
   to:user.email,subject:"Verify your Achraf Notebooks email",
   text:"Verify your address by opening this link: "+url+"\nIf you did not sign up, ignore this message."
  })
 },
 session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
 rateLimit:{enabled:true,window:60,max:30},
 advanced:{useSecureCookies:process.env.NODE_ENV==="production"}
});
