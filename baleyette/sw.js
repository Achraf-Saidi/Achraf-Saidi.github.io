/* Offline shell only: no private profiles or chat data are cached by the worker. */
const VERSION="baleyette-shell-v1";
const ASSETS=["./","./index.html","./style.css","./app.js","./config.js","./favicon.svg","./manifest.webmanifest"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)));
 self.skipWaiting();
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("baleyette-shell-")&&k!==VERSION).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 const path=new URL(req.url).pathname;
 if(!path.startsWith(new URL("./",self.location).pathname))return;
 if(req.mode==="navigate"){
   event.respondWith(fetch(req).catch(()=>caches.match("./index.html")));
 }else{
   event.respondWith(fetch(req).then(resp=>{
      if(resp.ok){const copy=resp.clone();caches.open(VERSION).then(c=>c.put(req,copy));}return resp;
   }).catch(()=>caches.match(req)));
 }
});
