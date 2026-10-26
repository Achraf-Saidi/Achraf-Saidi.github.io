/* Additional original interactive diagrams — no external assets or tracking. */
(()=>{
const previous=window.renderAcademyVisual;
const tasks={
 J8:{
  title:["Robot différentiel — simuler une trajectoire","Differential-drive robot — simulate a trajectory"],
  desc:["Vitesse des roues en rad/s, rayon 0,05 m, écartement 0,3 m, durée 6 s. Modèle idéal sans glissement.","Wheel rates in rad/s, radius 0.05 m, axle track 0.3 m, duration 6 s. Ideal no-slip model."],
  controls:[["wr","Roue droite ωR","Right wheel ωR",-10,10,6,.5],["wl","Roue gauche ωL","Left wheel ωL",-10,10,4,.5]],
  plot(v){
   const r=.05,b=.3,dt=.03,n=200,wr=v.wr,wl=v.wl,forward=r*(wr+wl)/2,yaw=r*(wr-wl)/b;
   let x=0,y=0,t=0;const pts=[[x,y]];
   for(let i=0;i<n;i++){let middle=t+yaw*dt/2;x+=forward*dt*Math.cos(middle);y+=forward*dt*Math.sin(middle);t+=yaw*dt;pts.push([x,y])}
   const bound=2.2, sx=x=>300+x/bound*170,sy=y=>210-y/bound*170,points=pts.map(p=>sx(p[0]).toFixed(1)+","+sy(p[1]).toFixed(1)).join(" ");
   const endX=sx(x),endY=sy(y),endTheta=t;
   const headX=endX+23*Math.cos(endTheta),headY=endY-23*Math.sin(endTheta);
   return {art:'<line x1="30" y1="210" x2="570" y2="210" stroke="#8aa4a7" stroke-width="1"/><line x1="300" y1="25" x2="300" y2="390" stroke="#8aa4a7" stroke-width="1"/><circle cx="300" cy="210" r="6" fill="#c47e52"/><polyline points="'+points+'" fill="none" stroke="#168fa0" stroke-width="3"/><circle cx="'+endX+'" cy="'+endY+'" r="11" fill="#176b76"/><line x1="'+endX+'" y1="'+endY+'" x2="'+headX+'" y2="'+headY+'" stroke="#e1b34f" stroke-width="4"/>',
   info:'v = '+forward.toFixed(3)+' m/s · yaw = '+yaw.toFixed(3)+' rad/s · final x = '+x.toFixed(3)+' m, y = '+y.toFixed(3)+' m · θ = '+t.toFixed(3)+' rad'};
  }
 },
 C7:{
  title:["Complexité : recherche linéaire et binaire","Complexity: linear versus binary search"],
  desc:["Comparaisons maximales théoriques sur n valeurs triées ; la recherche binaire suppose un tableau trié.","Worst-case theoretical comparisons for n sorted values; binary search requires sorting."],
  controls:[["n","Taille n","Size n",10,10000,1000,10]],
  plot(v){
   const n=v.n,l=n,b=Math.ceil(Math.log2(n+1)),bars=[{label:'O(n)',value:l,color:'#bb7750'},{label:'O(log n)',value:b,color:'#168fa0'}];
   return {art:'<line x1="70" y1="340" x2="550" y2="340" stroke="#829a9c"/>'+bars.map((e,i)=>{const h=270*e.value/l,x=130+i*220;return '<rect x="'+x+'" y="'+(340-h)+'" width="100" height="'+h+'" fill="'+e.color+'" rx="6"/><text x="'+(x+50)+'" y="365" text-anchor="middle" fill="currentColor" font-size="15">'+e.label+'</text>'}).join(''),info:'n = '+n+' · linear worst case = '+l+' comparisons · binary worst case ≈ '+b+' comparisons'};
  }
 }
};
window.renderAcademyVisual=(id,node,lang)=>{
 if(!tasks[id])return previous?.(id,node,lang);
 if(!node)return;
 const d=tasks[id],i=lang==="en"?1:0;
 node.hidden=false;
 node.innerHTML='<section class="box" style="border-top:3px solid var(--accent)"><h3>'+d.title[i]+'</h3><p class="muted">'+d.desc[i]+'</p>'+d.controls.map(c=>'<label style="display:block;margin:14px 0"><strong>'+c[i?2:1]+'</strong> <output id="'+c[0]+'out"></output><input style="display:block;width:100%;accent-color:var(--accent)" id="'+c[0]+'" type="range" min="'+c[3]+'" max="'+c[4]+'" value="'+c[5]+'" step="'+c[6]+'"></label>').join('')+'<svg class="extra-plot" role="img" aria-label="'+d.title[i]+'" viewBox="0 0 600 400" style="width:100%;background:var(--bg);border-radius:8px" xmlns="http://www.w3.org/2000/svg"></svg><p class="extra-info muted"></p></section>';
 const draw=()=>{
  const values={};for(const c of d.controls){const input=node.querySelector('#'+c[0]);values[c[0]]=Number(input.value);node.querySelector('#'+c[0]+'out').textContent=String(values[c[0]])}
  const out=d.plot(values);
  node.querySelector('.extra-plot').innerHTML=out.art;
  node.querySelector('.extra-info').textContent=out.info;
 };
 node.querySelectorAll('input[type="range"]').forEach(input=>input.addEventListener('input',draw));
 draw();
};
})();