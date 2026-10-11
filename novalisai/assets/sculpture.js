(() => {
 'use strict';
 const canvas=document.getElementById('copper-canvas');if(!canvas)return;
 let ctx;try{ctx=canvas.getContext('2d',{alpha:true});}catch{return;}if(!ctx)return;
 const data=JSON.parse(document.getElementById('site-data').textContent);
 document.getElementById('art-fallback').hidden=true;
 const pause=document.getElementById('art-pause'),reset=document.getElementById('art-reset');
 const media=window.matchMedia('(prefers-reduced-motion: reduce)');
 pause.hidden=media.matches;
 let width=1,height=1,ratio=1,frame=0,last=0,visible=true,paused=false,dragging=false,pointer=null,px=0,py=0,targetYaw=.14,targetPitch=.32,yaw=.14,pitch=.32,spin=0;
 const TAU=Math.PI*2,slices=96,sides=12;
 const normalise=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const centre=t=>{const r=1.78+.48*Math.cos(3*t);return [r*Math.cos(2*t),r*Math.sin(2*t),.70*Math.sin(3*t)];};
 const vertices=[];
 for(let i=0;i<slices;i++){
  const t=i/slices*TAU,c=centre(t),d=centre(t+.001),tangent=normalise(d.map((x,n)=>x-c[n]));
  const n=normalise(cross(tangent,[0,0,1])),b=normalise(cross(tangent,n));
  for(let j=0;j<sides;j++){
   const v=j/sides*TAU,cv=Math.cos(v),sv=Math.sin(v);
   vertices.push({p:c.map((x,k)=>x+.31*cv*n[k]+.145*sv*b[k]),n:normalise(n.map((x,k)=>cv*x/.31+sv*b[k]/.145))});
  }
 }
 const light=normalise([-.5,-.65,-1]),half=normalise([light[0],light[1],light[2]-1]);
 const index=(i,j)=>((i+slices)%slices)*sides+(j+sides)%sides;
 const wake=()=>{if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);};
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;};
 function draw(now){
  frame=0;if(!visible||document.hidden)return;
  const animate=!paused&&!media.matches&&!dragging;
  if(animate&&now-last<1000/28){wake();return;}
  const dt=Math.min(.08,last?Math.max(0,(now-last)/1000):0);last=now;
  if(animate)spin+=dt*.16;
  if(media.matches){yaw=targetYaw;pitch=targetPitch;}else{yaw+=(targetYaw-yaw)*.13;pitch+=(targetPitch-pitch)*.13;}
  const cy=Math.cos(yaw+spin),sy=Math.sin(yaw+spin),cx=Math.cos(pitch),sx=Math.sin(pitch),cr=Math.cos(-.18),sr=Math.sin(-.18);
  const rotate=v=>{const x=v[0]*cy+v[2]*sy,z=-v[0]*sy+v[2]*cy,y=v[1]*cx-z*sx,zz=v[1]*sx+z*cx;return [x*cr-y*sr,x*sr+y*cr,zz];};
  const mobile=width<600,ox=width*(mobile?.50:.68),oy=height*(mobile?.52:.50);
  const raw=vertices.map(v=>{const p=rotate(v.p),n=rotate(v.n),perspective=7/(7+p[2]);return {x:p[0]*perspective,y:p[1]*perspective,z:p[2],n};});
  const minX=Math.min(...raw.map(p=>p.x)),maxX=Math.max(...raw.map(p=>p.x)),minY=Math.min(...raw.map(p=>p.y)),maxY=Math.max(...raw.map(p=>p.y));
  const scale=Math.min(width*(mobile?.86:.50)/(maxX-minX),height*(mobile?.58:.86)/(maxY-minY));
  const projected=raw.map(p=>({...p,x:ox+(p.x-(minX+maxX)/2)*scale,y:oy+(p.y-(minY+maxY)/2)*scale}));
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
  ctx.save();ctx.filter='blur(15px)';ctx.fillStyle='rgba(94,56,24,.12)';ctx.beginPath();ctx.ellipse(ox,height*.78,scale*1.10,scale*.17,0,0,TAU);ctx.fill();ctx.restore();
  const faces=[];
  for(let i=0;i<slices;i++)for(let j=0;j<sides;j++){
   const ids=[index(i,j),index(i+1,j),index(i+1,j+1),index(i,j+1)],points=ids.map(id=>projected[id]);
   const n=normalise([0,1,2].map(k=>points.reduce((s,p)=>s+p.n[k],0)));if(n[2]>.25)continue;
   const diffuse=Math.max(0,n.reduce((s,x,k)=>s+x*light[k],0)),spec=Math.pow(Math.max(0,n.reduce((s,x,k)=>s+x*half[k],0)),28),rim=Math.pow(1-Math.abs(n[2]),3);
   const r=Math.min(255,70+139*diffuse+46*spec+22*rim),g=Math.min(255,35+108*diffuse+100*spec+18*rim),b=Math.min(255,17+62*diffuse+153*spec+11*rim);
   faces.push({points,z:points.reduce((s,p)=>s+p.z,0)/4,colour:`rgb(${r|0},${g|0},${b|0})`});
  }
  faces.sort((a,b)=>b.z-a.z);
  for(const face of faces){ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=face.colour;ctx.fill();ctx.strokeStyle=face.colour;ctx.lineWidth=.55;ctx.stroke();}
  if(animate||dragging||Math.abs(yaw-targetYaw)>.001||Math.abs(pitch-targetPitch)>.001)wake();
 }
 const resize=()=>{const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);ratio=Math.min(window.devicePixelRatio||1,width<600?1.5:2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);last=0;wake();};
 if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize,{passive:true});
 canvas.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture?.(pointer);canvas.classList.add('is-dragging');wake();});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;targetYaw+=(e.clientX-px)/width*5;targetPitch=Math.max(-1.1,Math.min(1.1,targetPitch+(e.clientY-py)/height*3));px=e.clientX;py=e.clientY;wake();},{passive:true});
 const release=e=>{if(e.pointerId!==pointer)return;pointer=null;dragging=false;canvas.classList.remove('is-dragging');wake();};
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 canvas.addEventListener('keydown',e=>{const delta={ArrowLeft:[-.2,0],ArrowRight:[.2,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]}[e.key];if(!delta)return;e.preventDefault();targetYaw+=delta[0];targetPitch=Math.max(-1.1,Math.min(1.1,targetPitch+delta[1]));wake();});
 pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?data.art_resume:data.art_pause;wake();});
 reset.addEventListener('click',()=>{targetYaw=.14;targetPitch=.32;spin=0;wake();});
 media.addEventListener('change',()=>{pause.hidden=media.matches;stop();last=0;wake();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=null;dragging=false;canvas.classList.remove('is-dragging');stop();}else{last=0;wake();}});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;wake();}else stop();},{threshold:0}).observe(canvas);
 resize();
})();
