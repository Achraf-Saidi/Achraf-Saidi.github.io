import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {serializeCatalog} from "../src/learning/catalog.mjs";
import {publicCapstones} from "../src/learning/capstones.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../public");
const reportDir=path.resolve("ui-artifacts");
await fs.mkdir(reportDir,{recursive:true});
const contentType={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,"http://localhost").pathname;
  const mapped=pathname==="/"?"/index.html":
    pathname==="/dashboard"?"/learning.html":pathname;
  const name=path.resolve(root,"."+mapped);
  if(!name.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const body=await fs.readFile(name);
  res.writeHead(200,{"Content-Type":contentType[path.extname(name)]||"application/octet-stream",
   "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(body);
 }catch{res.writeHead(404,{"Content-Type":"text/plain"});res.end("not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const url="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true});
const errors=[];
async function mockAPI(page){
 page.on("pageerror",err=>errors.push(err.message));
 await page.route("**/api/auth/get-session",route=>route.fulfill({json:{user:null}}));
 await page.route("**/api/learning/catalog*",route=>route.fulfill({json:serializeCatalog("fr")}));
 await page.route("**/api/learning/capstones*",route=>route.fulfill({json:{capstones:publicCapstones("fr")}}));
}
async function hasNoHorizontalOverflow(page,label){
 const dimensions=await page.evaluate(()=>({
  scroll:document.documentElement.scrollWidth,inner:window.innerWidth
 }));
 assert.ok(dimensions.scroll<=dimensions.inner+2,
  label+" horizontal overflow "+JSON.stringify(dimensions));
}
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:920},deviceScaleFactor:1});
 await mockAPI(desktop);
 await desktop.goto(url,{waitUntil:"networkidle"});
 assert.equal(await desktop.locator(".track-tile").count(),7);
 assert.equal(await desktop.locator(".price-card").count(),3);
 await desktop.locator("#billing-yearly").click();
 assert.match(await desktop.locator(".price-card.highlighted .digits").textContent(),/49 €/);
 await desktop.locator("#billing-monthly").click();
 assert.match(await desktop.locator(".price-card.highlighted .digits").textContent(),/4,90 €/);
 await desktop.locator("input[name=goal][value=llm]").check();
 await desktop.locator("#orientation-form button[type=submit]").click();
 assert.match(await desktop.locator("#suggested-track").textContent(),/Mathématiques/);
 assert.match(await desktop.locator("#suggestion-link").getAttribute("href"),/mathematical-foundations/);
 await desktop.screenshot({path:path.join(reportDir,"homepage-desktop.png"),fullPage:true});
 await hasNoHorizontalOverflow(desktop,"homepage desktop");
 await desktop.close();

 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await mockAPI(mobile);
 await mobile.goto(url,{waitUntil:"networkidle"});
 await mobile.locator("#menu-toggle").click();
 assert.equal(await mobile.locator("#menu-toggle").getAttribute("aria-expanded"),"true");
 await mobile.locator("#main-nav a[href='#parcours']").click();
 assert.equal(await mobile.locator("#menu-toggle").getAttribute("aria-expanded"),"false");
 await mobile.screenshot({path:path.join(reportDir,"homepage-mobile.png"),fullPage:true});
 await hasNoHorizontalOverflow(mobile,"homepage mobile");
 await mobile.close();

 const dash=await browser.newPage({viewport:{width:1440,height:920},deviceScaleFactor:1});
 await mockAPI(dash);
 await dash.goto(url+"/dashboard",{waitUntil:"networkidle"});
 await dash.locator(".track").first().waitFor();
 assert.equal(await dash.locator("#track-cards .track").count(),7);
 assert.equal(await dash.locator("#capstone-cards .capstone-card").count(),7);
 assert.match(await dash.locator("#module-count").textContent(),/151 modules/);
 await dash.locator("#track-quick-select").selectOption("deep-learning-llm");
 assert.match(await dash.locator("#current-track-title").textContent(),/Deep learning/);
 assert.match(await dash.locator("#mastery-percent").textContent(),/—/);
 await dash.locator("#focus-button").click();
 assert.equal(await dash.locator("#focus-button").getAttribute("aria-pressed"),"true");
 await dash.locator("#focus-button").click();
 await dash.screenshot({path:path.join(reportDir,"dashboard-desktop.png"),fullPage:true});
 await hasNoHorizontalOverflow(dash,"dashboard desktop");
 await dash.close();

 const dashboardMobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 await mockAPI(dashboardMobile);
 await dashboardMobile.goto(url+"/dashboard",{waitUntil:"networkidle"});
 await dashboardMobile.locator("#track-cards .track").first().waitFor();
 await dashboardMobile.screenshot({path:path.join(reportDir,"dashboard-mobile.png"),fullPage:true});
 await hasNoHorizontalOverflow(dashboardMobile,"dashboard mobile");
 await dashboardMobile.close();

 assert.deepEqual(errors,[],"browser runtime exceptions: "+errors.join(", "));
 console.log("Browser smoke passed: desktop/mobile home & dashboard; pricing, orientation, modules and focus.");
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
