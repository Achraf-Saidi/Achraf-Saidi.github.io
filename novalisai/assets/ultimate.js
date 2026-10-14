(() => {
 'use strict';
 const d=document,$=id=>d.getElementById(id),data=JSON.parse($('site-data')?.textContent||'{}'),t=data.ultimate;
 if(!t)return;
 let graphProfile=0;
 d.querySelectorAll('[data-studio-profile]').forEach(b=>b.addEventListener('click',()=>{graphProfile=Number(b.dataset.studioProfile);d.querySelectorAll('[data-graph-label]').forEach(el=>el.textContent=t.graph_scenarios[graphProfile][Number(el.dataset.graphLabel)]);const layouts=[[[16,20],[50,30],[84,20],[16,67],[50,78],[84,67],[50,53]],[[16,20],[50,20],[84,40],[16,60],[50,80],[84,80],[50,48]],[[16,40],[50,20],[84,20],[16,80],[50,80],[84,60],[50,50]]],pos=layouts[graphProfile],edges=[[0,1],[1,2],[1,3],[1,4],[2,5],[2,6],[6,5],[3,4],[4,5]];d.querySelectorAll('[data-graph-node]').forEach((node,i)=>{node.style.setProperty('--x',pos[i][0]+'%');node.style.setProperty('--y',pos[i][1]+'%');});d.querySelectorAll('.graph-map path').forEach((path,i)=>{const [a,b]=edges[i];path.setAttribute('d',`M ${pos[a][0]} ${pos[a][1]} L ${pos[b][0]} ${pos[b][1]}`);});}));
 d.querySelectorAll('[data-graph-node]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.graphNode);d.querySelectorAll('[data-graph-node]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('graph-selected').textContent=t.graph_nodes[n];$('graph-description').textContent=t.graph_descriptions[n];}));
 d.querySelectorAll('[data-method-phase]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.methodPhase);d.querySelectorAll('[data-method-phase]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('method-number').textContent=String(n+1).padStart(2,'0');$('method-name').textContent=t.method_phases[n];$('method-detail').textContent=t.method_details[n];$('method-deliverable').textContent=t.method_deliverables[n];$('method-decision').textContent=t.method_decisions[n];}));
 d.querySelectorAll('[data-crew-stage]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.crewStage);d.querySelectorAll('[data-crew-stage]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('crew-handoff').textContent=t.crew_handoffs[n];}));
 const mobileContact=d.querySelector('.mobile-contact');if(mobileContact&&'IntersectionObserver' in window){new IntersectionObserver(entries=>mobileContact.classList.toggle('in-lab',entries.some(e=>e.isIntersecting)),{rootMargin:'-80px 0px -80px 0px'}).observe($('lab'));}
 if(!$('play-canvas'))return;
 const L=window.NovalisLab,canvas=$('play-canvas'),ctx=canvas.getContext('2d'),names=['circles','xor','moons','spirals'];
 const money=new Intl.NumberFormat(d.documentElement.lang,{style:'currency',currency:'EUR'});
 let kind='circles',k=3,tool=0,points=[],test=[],probe={x:0,y:0},undo=[],reveal=false,ready=false,hintNumber=0;
 const goals={circles:90,xor:90,moons:98,spirals:80};
 const clamp=v=>Math.max(-1,Math.min(1,v));
 function start(){if(ready)return;ready=true;points=L.sample(kind,1042,12);test=L.sample(kind,890123,128);
  try{const imported=JSON.parse(new URLSearchParams(location.search).get('lab')||'null');if(imported&&names.includes(imported.dataset)&&[1,3,7,9].includes(imported.k)&&Array.isArray(imported.points)&&imported.points.length>=1&&imported.points.length<=160&&imported.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&[0,1].includes(p.label))){kind=imported.dataset;k=imported.k;points=imported.points;test=L.sample(kind,890123,128);$('play-dataset').value=kind;$('play-k').value=String(k);}}catch{}
  update();
 }
 function pointAt(event){const r=canvas.getBoundingClientRect();return {x:clamp(2*(event.clientX-r.left)/r.width-1),y:clamp(1-2*(event.clientY-r.top)/r.height)};}
 function act(p){start();probe=p;if(tool<2){if(points.length>=160){$('play-status').textContent=t.limit;return;}undo.push(points.slice());points.push({...p,label:tool});}update();}
 function draw(){
  if(!ctx)return;const w=canvas.width,h=canvas.height,cols=48,rows=32;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const px=2*(x+.5)/cols-1,py=1-2*(y+.5)/rows;
   const vote=reveal?L.truth(kind,px,py):L.predict(points,px,py,k).vote;
   const a=[183,117,68],b=[52,147,142],c=a.map((v,i)=>Math.round(v*(1-vote)+b[i]*vote));
   ctx.fillStyle=`rgb(${c[0]} ${c[1]} ${c[2]} / .32)`;ctx.fillRect(x*w/cols,y*h/rows,w/cols+1,h/rows+1);
  }
  ctx.strokeStyle='rgba(224,224,207,.1)';ctx.lineWidth=1;
  for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(i*w/8,0);ctx.lineTo(i*w/8,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*h/8);ctx.lineTo(w,i*h/8);ctx.stroke();}
  const cx=p=>(p.x+1)*w/2,cy=p=>(1-p.y)*h/2;
  if(tool===2){ctx.strokeStyle='#faf1dd99';ctx.lineWidth=1.2;L.predict(points,probe.x,probe.y,k).neighbors.forEach(p=>{ctx.beginPath();ctx.moveTo(cx(probe),cy(probe));ctx.lineTo(cx(p),cy(p));ctx.stroke();});}
  points.forEach(p=>{const x=cx(p),y=cy(p);ctx.beginPath();if(p.label){ctx.moveTo(x,y-6);ctx.lineTo(x+6,y);ctx.lineTo(x,y+6);ctx.lineTo(x-6,y);ctx.closePath();}else ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle=p.label?'#72e1d1':'#f3ad72';ctx.fill();ctx.strokeStyle='#1a2623';ctx.lineWidth=1.5;ctx.stroke();});
  ctx.beginPath();ctx.arc(cx(probe),cy(probe),11,0,Math.PI*2);ctx.strokeStyle='#fff5df';ctx.lineWidth=2;ctx.stroke();
 }
 function update(){
  const score=L.evaluate(points,test,k),percent=Math.round(score.accuracy*100);$('play-score').textContent=String(percent);$('play-mobile-score').textContent=percent+' %';try{const key='novalis_lab_record_'+kind,previous=Number(localStorage.getItem(key))||0,record=Math.max(percent,Math.min(100,previous));localStorage.setItem(key,String(record));$('play-record').textContent=t.record+' · '+record+' %';}catch{$('play-record').textContent='';}$('play-correct').textContent=String(score.correct);$('play-examples').textContent=String(points.length);$('play-goal').value=percent;$('play-target').textContent=goals[kind]+' %';$('play-mission').textContent=percent>=goals[kind]?t.goal_done:t.goal_work;
  $('play-undo').disabled=!undo.length;
  const result=L.predict(points,probe.x,probe.y,k);$('play-probe').textContent=t.class_names[result.label||0]+` · X ${probe.x.toFixed(2)} / Y ${probe.y.toFixed(2)}`;
  $('play-neighbors').replaceChildren(...result.neighbors.map(n=>{const li=d.createElement('li');li.className=n.label?'neighbor-b':'neighbor-a';li.textContent=t.class_names[n.label]+` · d = ${Math.sqrt(n.d2).toFixed(3)}`;return li;}));
  $('play-vote').textContent=t.vote+` · A ${Math.round((1-result.vote)*100)} % / B ${Math.round(result.vote*100)} %`;
  $('play-x').value=String(Math.round((probe.x+1)*50));$('play-y').value=String(Math.round((probe.y+1)*50));draw();
 }
 const tabs=[...d.querySelectorAll('[data-play-tab]')];
 function showTab(n){tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===n));b.tabIndex=i===n?0:-1;$('play-panel-'+i).hidden=i!==n;});if(n===0)start();}
 tabs.forEach((b,i)=>{b.addEventListener('click',()=>showTab(i));b.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;showTab(n);tabs[n].focus();}});});
 d.querySelectorAll('[data-play-tool]').forEach(b=>b.addEventListener('click',()=>{start();tool=Number(b.dataset.playTool);d.querySelectorAll('[data-play-tool]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));draw();}));
 let down;
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<12)act(pointAt(e));down=null;});
 canvas.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key)){e.preventDefault();start();if(e.key==='Enter')act(probe);else{probe.x=clamp(probe.x+(e.key==='ArrowRight'?.05:e.key==='ArrowLeft'?-.05:0));probe.y=clamp(probe.y+(e.key==='ArrowUp'?.05:e.key==='ArrowDown'?-.05:0));update();}}});
 $('play-place').addEventListener('click',()=>act({x:(Number($('play-x').value)-50)/50,y:(Number($('play-y').value)-50)/50}));
 $('play-dataset').addEventListener('change',()=>{kind=$('play-dataset').value;points=L.sample(kind,1042,12);test=L.sample(kind,890123,128);undo=[];probe={x:0,y:0};hintNumber=0;ready=true;reveal=false;$('play-reveal').setAttribute('aria-pressed','false');$('play-status').textContent='';update();});
 $('play-k').addEventListener('change',()=>{start();k=Number($('play-k').value);update();});
 $('play-undo').addEventListener('click',()=>{if(undo.length){points=undo.pop();update();}});
 $('play-reset').addEventListener('click',()=>{ready=false;reveal=false;undo=[];hintNumber=0;points=L.sample(kind,1042,12);test=L.sample(kind,890123,128);ready=true;$('play-reveal').setAttribute('aria-pressed','false');$('play-status').textContent='';update();});
 $('play-hint').addEventListener('click',()=>{start();if(points.length>=160){$('play-status').textContent=t.limit;return;}const pool=L.sample(kind,550100+(++hintNumber),48),candidate=pool.find(p=>L.predict(points,p.x,p.y,k).label!==p.label)||pool[0];undo.push(points.slice());points.push(candidate);probe=candidate;update();});
 $('play-reveal').addEventListener('click',()=>{start();reveal=!reveal;$('play-reveal').setAttribute('aria-pressed',String(reveal));$('play-status').textContent=reveal?t.reveal_note:'';draw();});
 $('play-export').disabled=!ctx;$('play-export').addEventListener('click',()=>{start();canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=d.createElement('a');a.href=url;a.download='novalis-lab-'+kind+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');});
 $('play-share').addEventListener('click',async()=>{start();const state=JSON.stringify({dataset:kind,k,points:points.map(p=>({x:p.x,y:p.y,label:p.label}))}),url=new URL(d.querySelector('link[rel=canonical]').href);url.searchParams.set('lab',state);url.hash='lab';try{await navigator.clipboard.writeText(url.href);$('play-status').textContent=t.shared;}catch{$('play-status').textContent=t.share_failed;const input=d.createElement('input');input.readOnly=true;input.value=url.href;input.setAttribute('aria-label',t.share);$('play-status').append(input);input.focus();input.select();}});
 if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){start();io.disconnect();}},{rootMargin:'100px'});io.observe(canvas);}else start();
 // A six-item integer knapsack; the 64 combinations are enumerated exactly.
 function optimize(){const costs=[4,3,3,5,2,2],values=[[7,7,9,8,5,6],[10,10,5,5,3,3],[4,5,10,5,7,10]][Number($('opt-priority').value)],items=costs.map((cost,i)=>({cost,value:values[i]})),capacity=Number($('opt-capacity').value),result=L.optimize(items,capacity);$('opt-capacity-value').textContent=String(capacity);$('opt-items').replaceChildren(...items.map((item,i)=>{const row=d.createElement('div');row.className='opt-item';row.dataset.selected=String(result.best.selected.includes(i));const label=d.createElement('strong'),note=d.createElement('span');label.textContent=t.opt_items[i];note.textContent=`${item.cost} · ${t.opt_cost} / ${item.value} · ${t.opt_value}`;row.append(label,note);return row;}));$('opt-baseline').textContent=String(result.baseline.value);$('opt-best').textContent=String(result.best.value);$('opt-details').textContent=`${result.best.cost} / ${capacity} · ${t.opt_cost}. ${result.best.selected.map(i=>t.opt_items[i]).join(' + ')||'—'}`;}
 $('opt-capacity').addEventListener('input',optimize);$('opt-priority').addEventListener('change',optimize);optimize();
 let extraction=null;
 $('doc-input').addEventListener('input',()=>{extraction=null;$('doc-approve').disabled=true;$('doc-status').textContent=t.doc_stale;});
 $('doc-analyze').addEventListener('click',()=>{extraction=L.extractDocument($('doc-input').value);$('doc-fields').replaceChildren();Object.entries(extraction.fields).forEach(([key,value],i)=>{const row=d.createElement('div'),term=d.createElement('dt'),def=d.createElement('dd');term.textContent=t.doc_fields[i];def.textContent=extraction.errors.includes(key)?t.doc_missing:String(value);row.dataset.invalid=String(extraction.errors.includes(key));row.append(term,def);$('doc-fields').append(row);});$('doc-total').textContent=extraction.total===null?'—':money.format(extraction.total);$('doc-approve').disabled=!!extraction.errors.length;$('doc-status').textContent=extraction.errors.length?t.doc_missing:t.doc_ready;});
 $('doc-approve').addEventListener('click',()=>{if(!extraction||extraction.errors.length)return;$('doc-status').textContent=t.doc_validated;$('doc-approve').disabled=true;});
})();
