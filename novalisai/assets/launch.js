(() => {'use strict';
 document.querySelectorAll('[data-launch]').forEach(root=>{
  const copy=JSON.parse(root.dataset.launch),scene=root.querySelector('.launch-scene'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),pause=root.querySelector('[data-launch-pause]'),run=root.querySelector('[data-launch-run]');
  let step=0,selected=0,timer,playing=false,done=false;
  const stop=()=>{clearTimeout(timer);playing=false;scene.dataset.launchPlaying='false';pause.textContent='▶';pause.setAttribute('aria-label',copy.resume);};
  const paint=()=>{scene.dataset.launchStep=step;['.launch-input','.launch-cards','.launch-result'].forEach((selector,i)=>root.querySelector(selector).setAttribute('aria-hidden',String(step!==i)));root.querySelectorAll('[data-launch-to]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.launchTo)===step)));root.querySelectorAll('[data-launch-case]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.launchCase)===selected)));root.querySelector('[data-launch-source]').textContent=copy.source[selected];root.querySelector('[data-launch-message]').textContent=copy.message[selected];root.querySelector('[data-launch-result]').textContent=copy.result[selected];root.querySelectorAll('[data-launch-card-title]').forEach((el,i)=>el.textContent=copy.cards[selected][2*i]);root.querySelectorAll('[data-launch-card-detail]').forEach((el,i)=>el.textContent=copy.cards[selected][2*i+1]);const approve=root.querySelector('[data-launch-approve]');approve.textContent=done?copy.done+' ✓':copy.action+' ✓';approve.disabled=done;approve.tabIndex=step===2?0:-1;run.textContent=(step===2?copy.replay:copy.next)+' ↗';};
  const schedule=()=>{clearTimeout(timer);if(step<2&&playing)timer=setTimeout(()=>{step++;paint();if(step===2)stop();else schedule();},step===0?2600:3200);};
  const play=()=>{if(step===2){step=0;done=false;paint();}playing=true;scene.dataset.launchPlaying='true';pause.textContent='Ⅱ';pause.setAttribute('aria-label',copy.pause);schedule();};
  root.querySelectorAll('[data-launch-case]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.launchCase);step=0;done=false;paint();if(!reduced.matches)play();else stop();}));
  root.querySelectorAll('[data-launch-to]').forEach(b=>b.addEventListener('click',()=>{stop();step=Number(b.dataset.launchTo);paint();}));
  run.addEventListener('click',()=>{stop();step=step===2?0:step+1;done=false;paint();});
  pause.addEventListener('click',()=>playing?stop():play());
  root.querySelector('[data-launch-approve]').addEventListener('click',()=>{done=true;paint();root.querySelector('[data-launch-announcement]').textContent=copy.done;scene.classList.add('is-approved');setTimeout(()=>scene.classList.remove('is-approved'),900);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();});paint();
  if(!reduced.matches){const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){play();io.disconnect();}},{threshold:.3});io.observe(root);}else stop();
 });
})();
