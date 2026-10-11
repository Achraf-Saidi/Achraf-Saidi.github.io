(() => {
 'use strict';
 document.documentElement.classList.add('js');
 const data=JSON.parse(document.getElementById('site-data').textContent);
 const menu=document.querySelector('.menu-button');
 const nav=document.getElementById('mobile-nav');
 const setMenu=open=>{
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?data.close:data.menu);
  nav.classList.toggle('open',open);
 };
 menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}});
 window.matchMedia('(min-width: 801px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});
 const language=document.getElementById('language');
 language.addEventListener('change',()=>{
  const option=language.selectedOptions[0];
  if(option?.dataset.url)window.location.assign(option.dataset.url+window.location.hash);
 });
 document.querySelectorAll('.footer-languages a').forEach(a=>a.addEventListener('click',()=>{a.hash=window.location.hash;}));
 const tabs=[...document.querySelectorAll('.demo-tabs [role=tab]')];
 const panels=[...document.querySelectorAll('.demo-panel')];
 const activate=(index,focus=false)=>{
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(index===i));tab.tabIndex=index===i?0:-1;panels[i].hidden=index!==i;});
  if(focus)tabs[index].focus();
  if(panels[index].animate&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches)panels[index].animate([{opacity:.4,transform:"translateY(5px)"},{opacity:1,transform:"translateY(0)"}],{duration:330,easing:"ease-out"});
 };
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activate(index));
  tab.addEventListener('keydown',e=>{
   const next={ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];
   if(next!==undefined){e.preventDefault();activate(next,true);}
  });
 });
 activate(0);
 // Interactive examples run entirely locally with fictional data.
 const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>motionQuery.matches;
 const board=document.getElementById('studio-board');
 const scrub=document.getElementById('studio-progress');
 const play=document.getElementById('studio-play');
 const scenarioButtons=[...document.querySelectorAll('[data-scenario]')];
 let scenarioIndex=0,progress=0,frame=0,running=false;
 const stageFor=value=>value>=100?3:value>=66?2:value>=33?1:0;
 const announce=document.getElementById('studio-announcement');
 const renderStudio=(value,notify=false)=>{
  progress=Math.max(0,Math.min(100,Number(value)||0));
  const stage=stageFor(progress),scenario=data.studio_scenarios[scenarioIndex];
  board.style.setProperty('--progress',String(progress));board.dataset.stage=String(stage);
  scrub.value=String(Math.round(progress));scrub.setAttribute('aria-valuetext',data.studio_states[stage]);
  document.getElementById('studio-state').textContent=data.studio_states[stage];
  document.getElementById('studio-result-title').textContent=stage===3?scenario.after:scenario.before;
  [...document.querySelectorAll('#studio-result-items li')].forEach((li,i)=>{li.firstElementChild.textContent=stage>i?'✓':'○';});
  if(!running)play.firstElementChild.textContent=progress>=100?data.studio_replay:data.studio_play;
  if(notify)announce.textContent=scenario.title+' — '+data.studio_states[stage];
 };
 const stopStudio=()=>{
  if(frame)cancelAnimationFrame(frame);frame=0;running=false;
  board.classList.remove('is-running');board.setAttribute('aria-busy','false');
  play.setAttribute('aria-pressed','false');renderStudio(progress);
 };
 const selectScenario=index=>{
  stopStudio();scenarioIndex=index;const scenario=data.studio_scenarios[index];
  scenarioButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(index===i)));
  document.getElementById('studio-source').textContent=scenario.source;
  document.getElementById('studio-input-title').textContent=scenario.title;
  document.getElementById('studio-input-items').replaceChildren(...scenario.items.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
  document.querySelectorAll('#studio-engine-steps li').forEach((li,i)=>{li.children[1].textContent=scenario.steps[i];});
  document.querySelectorAll('#studio-result-items li').forEach((li,i)=>{li.children[1].textContent=scenario.results[i];});
  document.getElementById('studio-case-note').textContent=scenario.note;
  renderStudio(0,true);
 };
 scenarioButtons.forEach((b,i)=>b.addEventListener('click',()=>selectScenario(i)));
 scrub.addEventListener('input',()=>{const value=scrub.value;stopStudio();renderStudio(value);});
 play.setAttribute('aria-pressed','false');
 play.addEventListener('click',()=>{
  if(running){stopStudio();return;}
  if(reduced()){renderStudio(100,true);return;}
  if(progress>=100)renderStudio(0);
  const initial=progress;let start=null;
  running=true;board.classList.add('is-running');board.setAttribute('aria-busy','true');play.setAttribute('aria-pressed','true');play.firstElementChild.textContent=data.studio_pause;
  const tick=time=>{
   if(!running)return;
   if(start===null)start=time;
   const next=Math.min(100,initial+(time-start)/42);renderStudio(next);
   if(next<100)frame=requestAnimationFrame(tick);
   else{stopStudio();renderStudio(100,true);}
  };
  frame=requestAnimationFrame(tick);
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopStudio();});
 motionQuery.addEventListener('change',()=>{if(reduced()&&running){stopStudio();renderStudio(100,true);}});
 const periods={7:{revenue:2850,orders:31,pending:2,bars:[23,42,36,70,59,87,75,45,68,90,81,100]},30:{revenue:12400,orders:128,pending:7,bars:[30,44,38,57,49,66,56,76,70,91,84,100]},90:{revenue:38600,orders:394,pending:12,bars:[21,31,46,38,54,61,69,65,84,77,94,100]}};
 const number=new Intl.NumberFormat(document.documentElement.lang);
 document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{
  const period=periods[b.dataset.period];
  document.querySelectorAll('[data-period]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  const values=document.querySelectorAll('#demo-panel-0 .metric strong');
  values[0].textContent=number.format(period.revenue)+' €';values[1].textContent=number.format(period.orders);values[2].textContent=String(period.pending).padStart(2,'0');
  document.querySelectorAll('#demo-panel-0 .bar-chart i').forEach((bar,i)=>bar.style.setProperty('--h',period.bars[i]+'%'));
 }));
 const reportButton=document.getElementById('report-toggle'),reportText=document.getElementById('report-text');
 reportButton.addEventListener('click',()=>{
  const expanded=reportText.hidden;reportText.hidden=!expanded;reportButton.setAttribute('aria-expanded',String(expanded));reportButton.textContent=(expanded?data.demo_report_hide:data.demo_report_button)+' ↗';
 });
 const basket=[0,0,0],prices=[45,89,249];
 const showBasket=()=>{
  const count=basket.reduce((a,b)=>a+b,0),total=basket.reduce((sum,qty,i)=>sum+qty*prices[i],0);
  document.getElementById('basket-total').textContent=count+' '+(count===1?data.demo_item:data.demo_items)+' · '+number.format(total)+' €';
  document.querySelectorAll('[data-add]').forEach(b=>{b.disabled=basket[Number(b.dataset.add)]>=10;});
 };
 document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.add);basket[i]=Math.min(10,basket[i]+1);showBasket();}));
 document.getElementById('basket-clear').addEventListener('click',()=>{basket.fill(0);showBasket();});
 const hero=document.querySelector('.hero-stage');
 const pointerQuery=window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 801px)');
 let pointerFrame=0;
 const resetHero=()=>{hero.style.removeProperty('--parallax-x');hero.style.removeProperty('--parallax-y');hero.style.removeProperty('--tilt-x');hero.style.removeProperty('--tilt-y');};
 hero.addEventListener('pointermove',e=>{
  if(reduced()||!pointerQuery.matches)return;
  const r=hero.getBoundingClientRect();const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  if(pointerFrame)cancelAnimationFrame(pointerFrame);
  pointerFrame=requestAnimationFrame(()=>{hero.style.setProperty('--spot-x',x*100+'%');hero.style.setProperty('--spot-y',y*100+'%');hero.style.setProperty('--parallax-x',(x-.5)*18+'px');hero.style.setProperty('--parallax-y',(y-.5)*12+'px');hero.style.setProperty('--tilt-x',(y-.5)*-3+'deg');hero.style.setProperty('--tilt-y',(x-.5)*4+'deg');pointerFrame=0;});
 },{passive:true});
 hero.addEventListener('pointerleave',()=>{if(pointerFrame)cancelAnimationFrame(pointerFrame);resetHero();});
 pointerQuery.addEventListener('change',resetHero);motionQuery.addEventListener('change',resetHero);
 if('IntersectionObserver' in window){
  const sceneObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.target===board&&!entry.isIntersecting&&running)stopStudio();
   if(entry.target===hero)hero.classList.toggle('motion-paused',!entry.isIntersecting);
  }),{threshold:0});
  sceneObserver.observe(board);sceneObserver.observe(hero);
 }

 const form=document.getElementById('contact-form');
 const preview=document.getElementById('email-preview');
 const emailBody=document.getElementById('email-body');
 const send=document.getElementById('send-email');
 const status=document.getElementById('copy-status');
 document.querySelectorAll('[data-need]').forEach(a=>a.addEventListener('click',()=>{
  const select=document.getElementById('contact-need');const option=select.options[Number(a.dataset.need)+1];
  if(option)select.value=option.value;
  preview.hidden=true;form.hidden=false;
 }));
 form.addEventListener('submit',e=>{
  e.preventDefault();if(!form.reportValidity())return;
  const values=new FormData(form);const get=k=>String(values.get(k)||'').trim();
  const labels=data.mail_labels;
  const parts=[data.mail_greeting,'',`${labels[0]} : ${get('name')}`,`${labels[1]} : ${get('email')}`];
  if(get('company'))parts.push(`${labels[2]} : ${get('company')}`);
  parts.push(`${labels[3]} : ${get('need')}`);
  if(get('budget'))parts.push(`${data.mail_extra[0]} : ${get('budget')}`);
  if(get('timing'))parts.push(`${data.mail_extra[1]} : ${get('timing')}`);
  parts.push('',`${labels[4]} :`,get('message'));
  const body=parts.join('\n');emailBody.textContent=body;
  send.href=`mailto:achraf@novalisai.com?subject=${encodeURIComponent(data.mail_subject+' — '+get('need'))}&body=${encodeURIComponent(body)}`;
  status.textContent='';form.hidden=true;preview.hidden=false;preview.focus();
 });
 form.hidden=false;
 document.getElementById('edit-email').addEventListener('click',()=>{preview.hidden=true;form.hidden=false;document.getElementById('contact-name').focus();});
 document.getElementById('copy-email').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(emailBody.textContent);status.textContent=data.copied;}
  catch{status.textContent=data.copy_error;}
 });
 const dialog=document.getElementById('policy-dialog');let trigger;
 document.querySelectorAll('[data-policy]').forEach(button=>button.addEventListener('click',()=>{
  const policy=data.policies[button.dataset.policy];if(!policy)return;
  document.getElementById('policy-title').textContent=policy.title;
  document.getElementById('policy-body').replaceChildren(...policy.text.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
  trigger=button;dialog.showModal();
 }));
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>trigger?.focus());
 document.querySelectorAll('[data-year]').forEach(el=>{el.textContent=new Date().getFullYear();});
 if('IntersectionObserver' in window){
  const dock=document.querySelector('.mobile-contact');
  const observer=new IntersectionObserver(entries=>{const hidden=entries[0].isIntersecting;dock.classList.toggle('in-contact',hidden);dock.tabIndex=hidden?-1:0;dock.setAttribute('aria-hidden',String(hidden));},{threshold:0});
  observer.observe(document.getElementById('contact'));
 }
})();
