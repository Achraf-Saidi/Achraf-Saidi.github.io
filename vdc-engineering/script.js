/* VDC Engineering — accessible, dependency-free interactions */
(function(){
  "use strict";
  const header=document.getElementById("header");
  const toggle=document.getElementById("nav-toggle");
  const nav=document.getElementById("nav-links");
  const icon=toggle.querySelector("use");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setMenu(open){
    header.classList.toggle("open",open);
    toggle.setAttribute("aria-expanded",String(open));
    toggle.setAttribute("aria-label",open?"Fermer le menu":"Ouvrir le menu");
    icon.setAttribute("href",open?"#close":"#menu");
  }
  toggle.addEventListener("click",()=>setMenu(toggle.getAttribute("aria-expanded")!=="true"));
  nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>setMenu(false)));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")setMenu(false)});
  document.addEventListener("click",event=>{if(header.classList.contains("open")&&!header.contains(event.target))setMenu(false)});
  window.addEventListener("resize",()=>{if(innerWidth>780)setMenu(false)});

  function syncHeader(){header.classList.toggle("scrolled",scrollY>30)}
  addEventListener("scroll",syncHeader,{passive:true});syncHeader();

  document.getElementById("year").textContent=String(new Date().getFullYear());

  document.querySelectorAll(".service-button").forEach(button=>{
    button.addEventListener("click",()=>{
      const expanded=button.getAttribute("aria-expanded")==="true";
      const details=document.getElementById(button.getAttribute("aria-controls"));
      button.setAttribute("aria-expanded",String(!expanded));
      details.hidden=expanded;
      button.querySelector("span").textContent=expanded?button.dataset.open:button.dataset.close;
    });
  });

  const reveals=document.querySelectorAll("[data-reveal]");
  if("IntersectionObserver" in window&&!reduced){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.08,rootMargin:"0px 0px -35px 0px"});
    reveals.forEach(el=>observer.observe(el));
  }else{
    reveals.forEach(el=>el.classList.add("visible"));
  }

  const counts=document.querySelectorAll("[data-count]");
  if("IntersectionObserver" in window&&!reduced){
    const counterObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const element=entry.target;
        const target=Number(element.dataset.count);
        const start=performance.now();
        function animate(now){
          const progress=Math.min((now-start)/1100,1);
          const eased=1-Math.pow(1-progress,3);
          element.textContent=String(Math.round(target*eased));
          if(progress<1)requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
        counterObserver.unobserve(element);
      });
    },{threshold:.5});
    counts.forEach(el=>counterObserver.observe(el));
  }

  if("IntersectionObserver" in window){
    const menuLinks=Array.from(nav.querySelectorAll('a:not(.nav-contact)'));
    const activeObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          menuLinks.forEach(link=>link.classList.toggle("is-current",link.getAttribute("href")==="#"+entry.target.id));
        }
      });
    },{rootMargin:"-30% 0px -60% 0px",threshold:0});
    document.querySelectorAll("main section[id]").forEach(section=>activeObserver.observe(section));
  }

  // Lightweight tilt on photo cards — pointer devices only.
  if(!reduced&&window.matchMedia("(hover:hover) and (pointer:fine)").matches){
    document.querySelectorAll(".service").forEach(card=>{
      card.addEventListener("pointermove",event=>{
        const rect=card.getBoundingClientRect();
        const x=(event.clientX-rect.left)/rect.width-.5;
        const y=(event.clientY-rect.top)/rect.height-.5;
        card.style.setProperty("transform","translateY(-6px) perspective(900px) rotateY("+(-x*2)+"deg) rotateX("+(y*2)+"deg)");
      },{passive:true});
      card.addEventListener("pointerleave",()=>{card.style.removeProperty("transform")});
    });
  }
})();