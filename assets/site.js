const year=document.querySelector('[data-year]');
if(year)year.textContent=new Date().getFullYear();

const toggle=document.querySelector('[data-menu-toggle]');
const nav=document.querySelector('[data-nav-links]');
if(toggle&&nav){
  const close=()=>{
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label','Open navigation');
  };
  toggle.addEventListener('click',()=>{
    const open=nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  });
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&nav.classList.contains('open')){close();toggle.focus();}
  });
  document.addEventListener('click',event=>{
    if(!toggle.contains(event.target)&&!nav.contains(event.target))close();
  });
  window.addEventListener('resize',()=>{if(window.innerWidth>700)close();});
}
