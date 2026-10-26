
/* Achraf Notebooks original educational SVG labs: no dependencies or tracking. */
(()=>{
  const css='--viz-border:var(--line);--viz-ink:var(--ink);--viz-accent:var(--accent)';
  const wrap=(heading,description,controls)=>'<section class="box" style="border-top:3px solid var(--accent);margin:26px 0"><div class="eyebrow">LAB / '+heading+'</div><p class="muted">'+description+'</p>'+controls+'<div class="vizout" style="margin-top:16px;overflow:auto"></div><p class="vizmetric muted"></p></section>';
  const range=(id,label,min,max,step,val)=>'<label for="'+id+'" style="display:block;margin:13px 0;font-weight:600">'+label+' <output id="'+id+'-out"></output></label><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" style="width:100%;accent-color:var(--accent)">';
  const stroke='#377e88',soft='#aacbd0',red='#bd7352';
  const svg=(inner,w=700,h=310)=>'<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Original interactive mathematical visualization" viewBox="0 0 '+w+' '+h+'" style="width:100%;max-width:780px;border:1px solid var(--line);border-radius:8px;background:var(--card)">'+inner+'</svg>';
  const line=(x1,y1,x2,y2,color=soft,width=1)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="'+width+'"/>';
  const circ=(x,y,r,fill,edge='none')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+edge+'"/>';
  const text=(x,y,str,color='currentColor',size=12)=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-size="'+size+'" font-family="system-ui">'+str+'</text>';
  const path=(points,color,width=2)=>'<polyline fill="none" stroke="'+color+'" stroke-width="'+width+'" points="'+points.map(a=>a.join(',')).join(' ')+'"/>';
  const frame=(w=700,h=310)=>line(55,25,55,h-33)+line(55,h-33,w-20,h-33)+Array.from({length:6},(_,i)=>line(55+i*(w-75)/5,26,55+i*(w-75)/5,h-33,'#9ca9ab44')).join('')+Array.from({length:5},(_,i)=>line(55,26+i*(h-59)/4,w-20,26+i*(h-59)/4,'#9ca9ab44')).join('');
  const format=n=>Number(n).toFixed(3);
  function plotSeries(series,ymin,ymax,labels=['0','time'],caption=''){
    const w=700,h=310, x0=55,x1=679,y0=276,y1=27;
    let body=frame(w,h);
    for(let k=0;k<series.length;k++){
      const data=series[k].values, color=series[k].color||stroke;
      const pts=data.map((v,i)=>[x0+i/(data.length-1||1)*(x1-x0),y0-(v-ymin)/(ymax-ymin||1)*(y0-y1)]);
      body+=path(pts,color,k===0?3:2);
      body+=text(95+Math.min(k*180,490),18,series[k].name,color,12);
    }
    return svg(body+text(22,32,format(ymax))+text(22,y0,format(ymin))+text(632,300,labels[1])+text(30,300,labels[0])+text(74,299,caption));
  }
  const tasks={
    M1:{label:['Cinématique différentielle : vitesse des roues','Differential drive: wheel velocities'],desc:['Faire varier la vitesse de la roue droite et observer le trajet simulé en XY. Modèle sans glissement.','Change right-wheel speed and inspect the simulated XY path. No-slip model.'],controls:range('right','ωR (rad/s)',1,9,.1,7),draw(root,lang){
      const v=+root.querySelector('#right').value;const r=.05,b=.25,dt=.01,n=300;let x=0,y=0,q=0,points=[];
      for(let i=0;i<n;i++){let vx=r*(v+5)/2,om=r*(v-5)/b;x+=dt*vx*Math.cos(q);y+=dt*vx*Math.sin(q);q+=dt*om;points.push([350+x*160,200-y*160])}
      root.querySelector('.vizout').innerHTML=svg(line(60,200,650,200)+line(350,20,350,295)+path(points,stroke,3)+circ(points.at(-1)[0],points.at(-1)[1],6,red)+text(380,285,'x →')+text(360,25,'y ↑'));
      root.querySelector('.vizmetric').textContent='v='+format(r*(v+5)/2)+' m/s   Ω='+format(r*(v-5)/b)+' rad/s   θ='+format(q)+' rad';
    }},
    M3:{label:['Cinématique 2R : déplacer les deux articulations','2R kinematics: move two joints'],desc:['Regarder comment θ1 et θ2 modifient la pose de la pince. Les cercles montrent la frontière du workspace.','See how θ1 and θ2 alter the end-effector. Circles indicate workspace boundaries.'],controls:range('q1','q₁ (degrees)',-180,180,1,30)+range('q2','q₂ (degrees)',-180,180,1,60),draw(root){
      const a=+root.querySelector('#q1').value*Math.PI/180,b=+root.querySelector('#q2').value*Math.PI/180,s=132,ox=350,oy=155,l1=1,l2=.65;
      const elbow=[ox+s*l1*Math.cos(a),oy-s*l1*Math.sin(a)],end=[elbow[0]+s*l2*Math.cos(a+b),elbow[1]-s*l2*Math.sin(a+b)];
      root.querySelector('.vizout').innerHTML=svg(circ(ox,oy,s*(l1+l2),'none','#b2c4c4')+circ(ox,oy,s*Math.abs(l1-l2),'none','#b2c4c4')+line(80,oy,630,oy)+line(ox,16,ox,294)+line(ox,oy,...elbow,stroke,8)+line(...elbow,...end,red,8)+circ(ox,oy,9,stroke)+circ(...elbow,8,'#d4a75d')+circ(...end,9,red)+text(24,32,'l1=1.00 m; l2=0.65 m')+text(24,53,'q1='+root.querySelector('#q1').value+'°  q2='+root.querySelector('#q2').value+'°'));
      root.querySelector('.vizmetric').textContent='x='+format((end[0]-ox)/s)+' m, y='+format((oy-end[1])/s)+' m.  ρ ∈ [0.35,1.65] m.';
    }},
    M4:{label:['Singularité : déterminant de la Jacobienne','Jacobian determinant and singularity'],desc:['θ₂ proche de 0° ou 180° ⇒ det(J) proche de zéro ; l’inversion amplifie les vitesses articulaires.','When θ₂ approaches 0° or 180°, det(J) approaches zero; inverse solutions become ill-conditioned.'],controls:range('q2','q₂ (degrees)',-180,180,1,45),draw(root){
      const angle=+root.querySelector('#q2').value*Math.PI/180,det=.65*Math.sin(angle),angles=Array.from({length:241},(_,i)=>-180+i*1.5);
      const chart=plotSeries([{name:'det J = l1*l2*sin(q2)',color:stroke,values:angles.map(x=>.65*Math.sin(x*Math.PI/180))}],-.7,.7,['°','q2 (°)'],'angle');
      const markerX=55+(+root.querySelector('#q2').value+180)/360*624,markerY=276-(det+.7)/1.4*249;
      root.querySelector('.vizout').innerHTML=chart.replace('</svg>',circ(markerX,markerY,6,red)+'</svg>');
      root.querySelector('.vizmetric').textContent='det(J)='+format(det)+' m²   '+(Math.abs(det)<.02?'Near singularity / proche singularité':'Non-singular / non singulier');
    }},
    M5:{label:['Commande PD : simuler une réponse indicielle','PD control: simulate a step response'],desc:['Moteur simplifié I·θ¨+b·θ˙=u, avec saturation. Les courbes ne décrivent pas une sécurité matérielle.','Simplified motor Iθ¨+bθ˙=u with torque saturation. This does not model physical safety.'],controls:range('kp','Kp',.5,12,.1,6)+range('kd','Kd',0,5,.1,2),draw(root){
      const kp=+root.querySelector('#kp').value,kd=+root.querySelector('#kd').value;let th=0,om=0;const values=[],efforts=[],dt=.01,I=.15,b=.08;
      for(let i=0;i<400;i++){const u=Math.max(-1,Math.min(1,kp*(1-th)-kd*om));om+=dt*(u-b*om)/I;th+=dt*om;values.push(th);efforts.push(u)}
      root.querySelector('.vizout').innerHTML=plotSeries([{name:'position θ',values,color:stroke},{name:'target 1 rad',values:values.map(()=>1),color:red}],-.2,1.5,['0','4 seconds'],'');
      root.querySelector('.vizmetric').textContent='Final error='+format(1-th)+' rad. Max overshoot='+format(Math.max(0,Math.max(...values)-1))+' rad.';
    }},
    M6:{label:['Fusion bayésienne : une mesure plus ou moins précise','Kalman fusion: trust the measurement or the prior'],desc:['Distribution prévue N(10,4), mesure z=12 de variance R variable. Afficher la moyenne et l’incertitude corrigées.','Prior N(10,4), observation z=12 with adjustable variance R. Display updated mean and uncertainty.'],controls:range('R','Sensor variance R',.2,12,.2,1),draw(root){
      const R=+root.querySelector('#R').value,K=4/(4+R),mu=10+K*2,variance=(1-K)*4;const xs=Array.from({length:220},(_,i)=>4+i*14/219);
      const gaussian=(x,m,v)=>Math.exp(-.5*(x-m)**2/v)/Math.sqrt(2*Math.PI*v);
      const a=xs.map(x=>gaussian(x,10,4)),b=xs.map(x=>gaussian(x,12,R)),c=xs.map(x=>gaussian(x,mu,variance));
      root.querySelector('.vizout').innerHTML=plotSeries([{name:'prior',color:'#aa8d6b',values:a},{name:'sensor',color:red,values:b},{name:'posterior',color:stroke,values:c}],0,Math.max(.75,...a,...b,...c),['x','state value'],'');
      root.querySelector('.vizmetric').textContent='Kalman gain='+format(K)+'  μpost='+format(mu)+'  Ppost='+format(variance);
    }},
    M8:{label:['Recherche de chemin A* : heuristique et obstacles','A* grid search: heuristics and obstacles'],desc:['Explorer une grille fixe en comparant poids heuristique 0 (Dijkstra) et 1 (A*). Chemins de coût unitaire.','Explore a fixed grid using heuristic weight 0 (Dijkstra) or 1 (A*). Unit-cost steps.'],controls:range('weight','Heuristic weight',0,1,.1,1),draw(root){
      const W=14,H=9,start=[0,0],goal=[13,8],walls=new Set();
      for(let y=0;y<7;y++)if(y!==3)walls.add('4,'+y);
      for(let x=7;x<13;x++)if(x!==10)walls.add(x+',5');
      for(let y=2;y<8;y++)if(y!==6)walls.add('9,'+y);
      const key=([x,y])=>x+','+y,h=([x,y])=>Math.abs(x-13)+Math.abs(y-8),g=new Map([[key(start),0]]),from=new Map(),open=[{v:start,f:h(start)}],closed=new Set(),weight=+root.querySelector('#weight').value;
      let safety=0;
      while(open.length&&safety++<1000){open.sort((a,b)=>a.f-b.f);const node=open.shift(),v=node.v,k=key(v);if(closed.has(k))continue;closed.add(k);if(k===key(goal))break;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=[v[0]+dx,v[1]+dy],k2=key(q);if(q[0]<0||q[0]>=W||q[1]<0||q[1]>=H||walls.has(k2))continue;
      const alt=g.get(k)+1;if(alt<(g.get(k2)??Infinity)){g.set(k2,alt);from.set(k2,k);open.push({v:q,f:alt+weight*h(q)})}}
      }
      const route=new Set();let cur=key(goal),found=g.has(cur);if(found){for(let j=0;j<200&&cur;j++){route.add(cur);cur=from.get(cur)}}let grid='';
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=x+','+y;const fill=walls.has(k)?'#596b73':route.has(k)?'#e0ad65':closed.has(k)?'#a4cdd1':'#eee8dc';grid+='<rect x="'+(x*40+52)+'" y="'+(y*29+13)+'" width="37" height="26" fill="'+fill+'" stroke="#87989c" stroke-width=".5"/>'}
      grid+=text(52,298,'start (0,0) → goal (13,8)')+text(58,24,'S','#1f443b',13)+text(574,249,'G','#1f443b',13);
      root.querySelector('.vizout').innerHTML=svg(grid,680,310);
      root.querySelector('.vizmetric').textContent='Found='+found+'  path length='+(found?g.get(key(goal)):'none')+'  expanded nodes='+closed.size+'   w='+weight;
    }},
    D1:{label:['Bayes : effet de la prévalence','Bayes: base-rate sensitivity'],desc:['Sensibilité 90 %, spécificité 95 %. Déplacer la prévalence.','Sensitivity 90%, specificity 95%. Adjust prevalence.'],controls:range('prev','Prevalence %',1,70,1,5),draw(root){
      const p=+root.querySelector('#prev').value/100,ppv=.9*p/(.9*p+.05*(1-p));
      const points=Array.from({length:199},(_,i)=>{const x=(i+1)/200;return .9*x/(.9*x+.05*(1-x))});
      root.querySelector('.vizout').innerHTML=plotSeries([{name:'P(disease | positive)',values:points,color:stroke}],0,1,['0','prevalence 0..1'],'');
      root.querySelector('.vizmetric').textContent='Prevalence='+format(100*p)+'%  PPV='+format(100*ppv)+'%';
    }},
    G9:{label:['Softmax : la température change l’attention','Softmax: attention temperature'],desc:['Deux scores [2, 0]. Température τ petite : poids concentrés ; τ grande : poids plus uniformes.','Two scores [2,0]. Small temperature τ concentrates weights; large τ flattens them.'],controls:range('tau','Temperature τ',.1,5,.1,1),draw(root){
      const tau=+root.querySelector('#tau').value,p=1/(1+Math.exp(-2/tau));
      const bar=(x,h,c,n)=>'<rect x="'+x+'" y="'+(251-h)+'" width="120" height="'+h+'" fill="'+c+'" rx="8"/>'+text(x,271,n);
      root.querySelector('.vizout').innerHTML=svg(line(80,251,600,251)+bar(150,210*p,stroke,'Key 1')+bar(360,210*(1-p),red,'Key 2')+text(150,36,'Weight 1: '+format(p))+text(360,36,'Weight 2: '+format(1-p)));
      root.querySelector('.vizmetric').textContent='softmax([2,0]/τ)=('+format(p)+', '+format(1-p)+')';
    }}
  };
  window.renderAcademyVisual=(id,node,lang)=>{
    if(!node)return;
    const task=tasks[id];
    if(!task){node.innerHTML='';node.hidden=true;return;}
    node.hidden=false;
    const i=lang==='en'?1:0;
    node.innerHTML=wrap(task.label[i],task.desc[i],task.controls);
    const redraw=()=>{
      for(const input of node.querySelectorAll('input[type="range"]')){
        const out=node.querySelector('#'+input.id+'-out');
        if(out)out.textContent=Number(input.value).toFixed(input.step.includes('.')?1:0);
      }
      task.draw(node,lang);
    };
    node.addEventListener('input',redraw);
    redraw();
  };
})();
