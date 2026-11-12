/* Original interactive figures for the statistics pilot modules. No third-party media. */
(()=>{
const previous=window.renderAcademyVisual;
const tasks={
 D3:{label:["Inférence bayésienne : prévalence et valeur prédictive","Bayesian inference: prevalence and positive predictive value"],
  description:["Même sensibilité et spécificité ne signifient pas même fiabilité pour toutes les prévalences.","Same sensitivity and specificity do not imply the same positive predictive value at every prevalence."],
  param:["Prévalence de la maladie","Disease prevalence"],min:.01,max:.5,step:.01,defaultValue:.1,
  curve:x=>(x*.9)/(x*.9+(1-x)*.05),domain:[0,.55],range:[0,1],
  metric:(x,y)=>"P(disease | positive) = "+y.toFixed(3)+" · sensitivity 0.90 · specificity 0.95"},
 D6:{label:["Intervalle de confiance : largeur et taille d'échantillon","Confidence interval: width and sample size"],
  description:["Moyenne observée fixée à 1,5 à des fins illustratives, σ=2 connu et valeur de référence μ=1. Les intervalles réels changeraient aussi de centre selon l'échantillon.","Illustrative fixed sample mean 1.5, known σ=2 and reference μ=1. Real intervals would change their centers as samples change."],
  param:["Taille d'échantillon n","Sample size n"],min:5,max:120,step:1,defaultValue:16,
  curve:x=>1.96*2/Math.sqrt(x),domain:[5,120],range:[0,2],
  metric:(x,y)=>"95% normal CI around 1.5: ["+(1.5-y).toFixed(3)+", "+(1.5+y).toFixed(3)+"] · reference μ=1"},
 D9:{label:["Régression logistique : pente et probabilité","Logistic regression: slope and probability"],
  description:["Le prédicteur η=0,5+βx est transformé en probabilité par la sigmoïde. β change les log-odds par unité de x.","Predictor η=0.5+βx is mapped to a probability by sigmoid. β changes log odds per unit of x."],
  param:["Coefficient β","Coefficient β"],min:-4,max:4,step:.1,defaultValue:1.2,
  curve:null,domain:[-3,3],range:[0,1],
  metric:(x)=>"At x=1: p="+(1/(1+Math.exp(-(.5+x)))).toFixed(3)+" · conditional odds ratio="+Math.exp(x).toFixed(3)},
 D13:{label:["Metropolis–Hastings : acceptation et log-rapport","Metropolis–Hastings: acceptance and log ratio"],
  description:["Pour une proposition symétrique, α=min(1, exp(log π(θ′)−log π(θ))). On accepte parfois une proposition de densité plus faible.","For a symmetric proposal, α=min(1, exp(log π(θ′)−log π(θ))). Lower-density proposals can still be accepted."],
  param:["Différence de log-densité","Log-density difference"],min:-3,max:3,step:.1,defaultValue:-1,
  curve:x=>Math.min(1,Math.exp(x)),domain:[-3,3],range:[0,1],
  metric:(x,y)=>"log ratio="+x.toFixed(2)+" · acceptance probability="+y.toFixed(3)}
};
const S=(x)=>Number(x).toFixed(2);
const graph=(task,v)=>{
 const width=690,height=312,l=68,t=25,w=585,h=239;
 const xmin=task.domain[0],xmax=task.domain[1],ymin=task.range[0],ymax=task.range[1];
 const xx=x=>l+(x-xmin)/(xmax-xmin)*w;
 const yy=y=>t+h-(y-ymin)/(ymax-ymin)*h;
 let shape='<rect width="'+width+'" height="'+height+'" fill="transparent"/>';
 for(let i=0;i<=5;i++){
  const a=l+i*w/5,b=t+i*h/5;
  shape+='<line x1="'+S(a)+'" y1="'+t+'" x2="'+S(a)+'" y2="'+(t+h)+'" stroke="currentColor" opacity=".12"/>';
  shape+='<line x1="'+l+'" y1="'+S(b)+'" x2="'+(l+w)+'" y2="'+S(b)+'" stroke="currentColor" opacity=".12"/>';
  shape+='<text x="'+S(a)+'" y="285" font-size="12" fill="currentColor" text-anchor="middle">'+S(xmin+i*(xmax-xmin)/5)+'</text>';
  shape+='<text x="55" y="'+S(b+4)+'" font-size="12" fill="currentColor" text-anchor="end">'+S(ymax-i*(ymax-ymin)/5)+'</text>';
 }
 const plot=func=>{
  const points=[];
  for(let i=0;i<160;i++){
   const x=xmin+(xmax-xmin)*i/159,y=func(x);
   points.push(S(xx(x))+','+S(yy(Math.max(ymin,Math.min(ymax,y)))));
  }
  return '<polyline fill="none" stroke="#3c9290" stroke-width="3" points="'+points.join(' ')+'"/>';
 };
 let yValue;
 if(task===tasks.D9){const p=x=>1/(1+Math.exp(-(.5+v*x)));shape+=plot(p);yValue=p(1);shape+='<circle cx="'+S(xx(1))+'" cy="'+S(yy(yValue))+'" r="6" fill="#c47f53"/>';}
 else if(task===tasks.D6){
  shape+=plot(task.curve);
  yValue=task.curve(v);
  shape+='<circle cx="'+S(xx(v))+'" cy="'+S(yy(yValue))+'" r="6" fill="#c47f53"/>';
 }else{
  shape+=plot(task.curve);yValue=task.curve(v);
  shape+='<circle cx="'+S(xx(v))+'" cy="'+S(yy(yValue))+'" r="6" fill="#c47f53"/>';
 }
 return {svg:shape,metric:task.metric(v,yValue)};
};
window.renderAcademyVisual=(id,node,lang)=>{
 const task=tasks[id];
 if(!task)return previous?.(id,node,lang);
 if(!node)return;
 const isEn=lang==="en",k=isEn?1:0;
 node.hidden=false;
 node.innerHTML='<section class="box" style="border-top:3px solid var(--accent);margin:26px 0">'+
 '<h3>'+task.label[k]+'</h3><p class="muted">'+task.description[k]+'</p>'+
 '<label for="stat-viz-control" style="display:block;font-weight:600;margin:16px 0">'+task.param[k]+
 ' <output id="stat-viz-val"></output></label><input id="stat-viz-control" type="range" min="'+task.min+
 '" max="'+task.max+'" step="'+task.step+'" value="'+task.defaultValue+
 '" style="width:100%;accent-color:var(--accent)">'+
 '<svg viewBox="0 0 690 312" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+task.label[k]+
 '" style="width:100%;background:var(--bg);border:1px solid var(--line);border-radius:8px;margin-top:20px"></svg>'+
 '<p class="viz-output muted"></p></section>';
 const control=node.querySelector("#stat-viz-control"),result=node.querySelector("svg");
 const redraw=()=>{
  const value=Number(control.value),r=graph(task,value);
  node.querySelector("#stat-viz-val").textContent=Number(value).toFixed(task.step<1?2:0);
  result.innerHTML=r.svg;
  node.querySelector(".viz-output").textContent=r.metric;
 };
 control.addEventListener("input",redraw);redraw();
};
})();
