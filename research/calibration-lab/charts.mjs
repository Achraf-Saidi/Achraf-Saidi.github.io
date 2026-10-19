/**
 * Native SVG charts, no CDN. Every export contains labels and experiment metadata.
 */
export const COLORS={full:'#315ca8',naive:'#bd5844',oracle:'#25816e',plugin:'#8655af',
  truth:'#192e48',secondary:'#a57927',grid:'#e7ebf0'};
const NS='http://www.w3.org/2000/svg';
export function el(name,attrs={},text){
  const node=document.createElementNS(NS,name);
  for(const [k,v] of Object.entries(attrs))if(v!==null&&v!==undefined)node.setAttribute(k,String(v));
  if(text!==undefined)node.textContent=String(text);return node;
}
export function number(v){
  if(!Number.isFinite(v))return '—';
  const a=Math.abs(v);
  if(a>9999||a>0&&a<.001)return v.toExponential(1);
  return new Intl.NumberFormat('fr-BE',{maximumFractionDigits:a<1?3:1}).format(v);
}
export function lineChart(target,{title,description='',series=[],xLabel='Patients évalués',yLabel='',
  xDomain=null,yDomain=null,xTicks=null,reference=[],shade=[],points=false,metadata='',height=310}){
  const W=860,H=height,pad={l:68,r:24,t:25,b:56},w=W-pad.l-pad.r,h=H-pad.t-pad.b;
  const finite=series.flatMap(s=>s.data).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
  let [xmin,xmax]=xDomain??[Math.min(...finite.map(p=>p[0]),0),Math.max(...finite.map(p=>p[0]),1)];
  const referenceY=reference.filter(r=>r.y!==undefined).map(r=>r.y);
  let [ymin,ymax]=yDomain??[Math.min(...finite.map(p=>p[1]),...referenceY,0),Math.max(...finite.map(p=>p[1]),...referenceY,1)];
  if(!Number.isFinite(ymin)||!Number.isFinite(ymax)){ymin=0;ymax=1;}
  if(xmin===xmax)xmax=xmin+1;
  if(ymin===ymax){ymin-=.1;ymax+=.1;}
  if(!yDomain){const m=(ymax-ymin)*.08;ymin-=m;ymax+=m;}
  const X=x=>pad.l+(x-xmin)/(xmax-xmin)*w,Y=y=>pad.t+(ymax-y)/(ymax-ymin)*h;
  const svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':title+' — '+description,class:'plot-svg',xmlns:NS});
  svg.setAttribute('data-legend',JSON.stringify(series.map(s=>({label:s.label,color:s.color||COLORS[s.key]||COLORS.truth}))));
  svg.append(el('title',{},title),el('desc',{},description),el('metadata',{},metadata));
  svg.append(el('rect',{width:W,height:H,fill:'#fff'}));
  for(let j=0;j<=4;j++){
    const y=ymin+(ymax-ymin)*j/4,px=Y(y);
    svg.append(el('line',{x1:pad.l,x2:W-pad.r,y1:px,y2:px,stroke:COLORS.grid}),
      el('text',{x:pad.l-10,y:px+4,'text-anchor':'end',fill:'#667387','font-size':11,'font-family':'system-ui'},number(y)));
  }
  for(const x of xTicks??Array.from({length:6},(_,j)=>xmin+(xmax-xmin)*j/5)){
    const px=X(x);
    svg.append(el('text',{x:px,y:H-30,'text-anchor':'middle',fill:'#667387','font-size':11,'font-family':'system-ui'},number(x)));
  }
  svg.append(el('text',{x:pad.l+w/2,y:H-9,'text-anchor':'middle',fill:'#5e6b80','font-size':12,'font-family':'system-ui'},xLabel),
    el('text',{x:pad.l,y:14,fill:'#5e6b80','font-size':11,'font-family':'system-ui'},yLabel));
  const clipId='clip-'+Math.random().toString(36).slice(2);
  const defs=el('defs'),clip=el('clipPath',{id:clipId});
  clip.append(el('rect',{x:pad.l,y:pad.t,width:w,height:h}));defs.append(clip);svg.append(defs);
  const layer=el('g',{'clip-path':'url(#'+clipId+')'});
  for(const sh of shade){
    const coords=sh.data.map(p=>[X(p[0]),Y(p[1]),Y(p[2])]);
    const d=coords.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join(' ')+
      coords.slice().reverse().map(p=>'L'+p[0]+','+p[2]).join(' ')+'Z';
    layer.append(el('path',{d,fill:sh.color||'#315ca8','fill-opacity':.08}));
  }
  for(const ref of reference){
    const attrs=ref.x!==undefined?{x1:X(ref.x),x2:X(ref.x),y1:pad.t,y2:pad.t+h}:
      {x1:pad.l,x2:pad.l+w,y1:Y(ref.y),y2:Y(ref.y)};
    layer.append(el('line',{...attrs,stroke:ref.color||'#8a96a8','stroke-dasharray':'5 5','stroke-width':1.1}));
    if(ref.label)svg.append(el('text',{
      x:ref.x!==undefined?Math.min(W-120,X(ref.x)+5):W-pad.r-3,
      y:ref.x!==undefined?pad.t+12:Math.max(pad.t+12,Y(ref.y)-6),
      'text-anchor':ref.x!==undefined?'start':'end',fill:ref.color||'#77869a','font-size':10,'font-family':'system-ui'
    },ref.label));
  }
  for(const s of series){
    const data=s.data.filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
    const d=data.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(2)+','+Y(p[1]).toFixed(2)).join(' ');
    if(!s.noLine)layer.append(el('path',{d,fill:'none',stroke:s.color||COLORS[s.key]||COLORS.truth,
      'stroke-width':s.width||2,'stroke-dasharray':s.dash||null,'stroke-linejoin':'round'}));
    if(points||s.points)for(const p of data){
      const dot=el('circle',{cx:X(p[0]),cy:Y(p[1]),r:s.radius||3.3,fill:s.color||COLORS[s.key]||COLORS.truth,stroke:'#fff','stroke-width':1});
      dot.append(el('title',{},s.label+' · x='+number(p[0])+' · y='+number(p[1])+(p[2]?' · '+p[2]:'')));
      layer.append(dot);
    }
  }
  svg.append(layer);
  const cross=el('line',{'data-interactive':'true',x1:pad.l,x2:pad.l,y1:pad.t,y2:pad.t+h,stroke:'#34445a','stroke-dasharray':'2 3',visibility:'hidden'});
  const tooltip=document.createElement('div');tooltip.className='chart-tooltip';tooltip.hidden=true;
  svg.append(cross);
  const hit=el('rect',{'data-interactive':'true',x:pad.l,y:pad.t,width:w,height:h,fill:'transparent',style:'cursor:crosshair'});
  svg.append(hit);
  const wrapper=document.createElement('div');wrapper.className='plot-wrap';
  wrapper.append(svg,tooltip);
  hit.addEventListener('pointermove',event=>{
    const rect=svg.getBoundingClientRect(),px=(event.clientX-rect.left)/rect.width*W;
    const x=xmin+(px-pad.l)/w*(xmax-xmin);cross.setAttribute('x1',X(x));cross.setAttribute('x2',X(x));cross.setAttribute('visibility','visible');
    tooltip.replaceChildren();
    const head=document.createElement('strong');head.textContent=xLabel+' : '+number(x);tooltip.append(head);
    for(const s of series){
      if(!s.data.length)continue;
      let best=s.data[0];
      for(const p of s.data)if(Math.abs(p[0]-x)<Math.abs(best[0]-x))best=p;
      const line=document.createElement('span');line.textContent=s.label+' : '+number(best[1]);
      line.style.color=s.color||COLORS[s.key]||COLORS.truth;tooltip.append(line);
    }
    tooltip.hidden=false;tooltip.style.left=Math.min(rect.width-230,Math.max(8,event.clientX-rect.left+10))+'px';
    tooltip.style.top='30px';
  });
  hit.addEventListener('pointerleave',()=>{tooltip.hidden=true;cross.setAttribute('visibility','hidden');});
  const legend=document.createElement('div');legend.className='plot-legend';
  for(const s of series){
    const label=document.createElement('span'),dot=document.createElement('i');
    dot.style.background=s.color||COLORS[s.key]||COLORS.truth;label.append(dot,document.createTextNode(s.label));legend.append(label);
  }
  target.replaceChildren(wrapper,legend);
  if(!finite.length){
    const empty=document.createElement('p');empty.className='empty-note';empty.textContent='Aucun patient encore évaluable à cet instant.';target.append(empty);
  }
  return svg;
}
export function timeline(target,patients,calendar,tau,metadata=''){
  const rows=patients.filter(r=>r.arrival<=calendar).slice(-18);
  const W=860,H=Math.max(170,rows.length*22+70),left=92,top=28,width=W-left-28;
  const X=t=>left+t/(tau*1.08)*width;
  const svg=el('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'Suivi individuel depuis l’arrivée',xmlns:NS,class:'plot-svg'});
  svg.append(el('rect',{width:W,height:H,fill:'#fff'}),el('metadata',{},metadata));
  for(let j=0;j<=4;j++){
    const x=tau*j/4;
    svg.append(el('line',{x1:X(x),x2:X(x),y1:top-10,y2:H-35,stroke:COLORS.grid}),
      el('text',{x:X(x),y:H-14,'text-anchor':'middle',fill:'#667387','font-size':11,'font-family':'system-ui'},number(x)));
  }
  svg.append(el('text',{x:X(tau),y:14,'text-anchor':'middle',fill:'#5e6b80','font-size':11,'font-family':'system-ui'},'Horizon τ'));
  for(let j=0;j<rows.length;j++){
    const r=rows[j],age=Math.max(0,calendar-r.arrival),end=Math.min(r.U,age),isKnown=age>=r.U;
    const cens=isKnown&&r.dc,event=isKnown&&r.de,surv=age>=tau&&r.R;
    const color=cens?COLORS.secondary:event?COLORS.naive:surv?COLORS.oracle:COLORS.full;
    const y=top+j*22;
    svg.append(el('text',{x:left-12,y:y+4,'text-anchor':'end',fill:'#667387','font-size':10,'font-family':'system-ui'},'Patient '+r.i),
      el('line',{x1:X(0),x2:X(end),y1:y,y2:y,stroke:color,'stroke-width':3,'stroke-linecap':'round'}));
    const marker=cens?el('path',{d:'M'+(X(end)-4)+','+(y-4)+'l8,8m0,-8l-8,8',stroke:color,'stroke-width':2}):
      el('circle',{cx:X(end),cy:y,r:3.5,fill:color});
    marker.append(el('title',{},'Patient '+r.i+' · '+(cens?'censuré':event?'événement observé':surv?'sans événement à τ':'suivi en cours')+' · suivi '+number(end)));
    svg.append(marker);
  }
  target.replaceChildren(svg);
  const key=document.createElement('div');key.className='plot-legend';
  for(const [label,color] of [['Suivi en cours',COLORS.full],['Événement',COLORS.naive],['Censure ×',COLORS.secondary],['Survie connue à τ',COLORS.oracle]]){
    const span=document.createElement('span'),i=document.createElement('i');i.style.background=color;span.append(i,document.createTextNode(label));key.append(span);
  }
  svg.setAttribute('data-legend',JSON.stringify([['Suivi en cours',COLORS.full],['Événement',COLORS.naive],['Censure ×',COLORS.secondary],['Survie à τ',COLORS.oracle]].map(([label,color])=>({label,color}))));
  target.append(key);return svg;
}
export function download(content,name,type='text/plain'){
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function exportSVG(svg,title,metadata){
  const copy=svg.cloneNode(true),vb=copy.viewBox.baseVal;
  const W=vb.width,H=vb.height;
  const legends=JSON.parse(copy.getAttribute('data-legend')||'[]');
  const footerRows=Math.ceil(legends.length/3),extra=70+footerRows*18;
  copy.setAttribute('viewBox','0 0 '+W+' '+(H+extra));copy.setAttribute('width',W);copy.setAttribute('height',H+extra);
  copy.querySelectorAll('[data-interactive]').forEach(r=>r.remove());
  const group=el('g',{transform:'translate(0 36)'});
  while(copy.firstChild)group.append(copy.firstChild);copy.append(group);
  copy.prepend(el('rect',{width:W,height:H+extra,fill:'#fff'}),
    el('text',{x:22,y:24,fill:'#192e48','font-size':15,'font-weight':600,'font-family':'system-ui'},title));
  for(let j=0;j<legends.length;j++){
    const x=24+(j%3)*275,y=H+48+Math.floor(j/3)*18;
    copy.append(el('line',{x1:x,x2:x+14,y1:y-4,y2:y-4,stroke:legends[j].color,'stroke-width':3}),
      el('text',{x:x+20,y,fill:legends[j].color,'font-size':10,'font-family':'system-ui'},legends[j].label));
  }
  copy.append(el('text',{x:22,y:H+extra-9,fill:'#667387','font-size':8,'font-family':'system-ui'},metadata.slice(0,190)));
  return new XMLSerializer().serializeToString(copy);
}
export async function exportPNG(svg,title,metadata,name){
  const source=exportSVG(svg,title,metadata);
  const img=new Image(),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    const canvas=document.createElement('canvas');canvas.width=1720;canvas.height=img.height*2;
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw Error('Export PNG indisponible');
    download(blob,name,'image/png');
  }finally{URL.revokeObjectURL(url);}
}

