(() => {
 'use strict';
 const link=document.querySelector('[data-portal-link]');
 if(!link)return;
 fetch('../../runtime-config.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(c=>{
  if(!c?.portal_url)return;
  const url=new URL(c.portal_url);
  if(url.protocol==='https:'&&!url.username&&!url.password)link.href=url.href;
 }).catch(()=>{});
})();
