// Original scientific SVG laboratories; all coordinates follow explicit mathematical functions.
const NS="http://www.w3.org/2000/svg";
function svgEl(tag,attrs={},text){
 const e=document.createElementNS(NS,tag);
 for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));
 if(text!==undefined)e.textContent=String(text);
 return e;
}
function chart(hostId,title,xMin,xMax,yMin,yMax){
 const host=document.getElementById(hostId);
 host.replaceChildren();
 const svg=svgEl("svg",{viewBox:"0 0 440 255",role:"img","aria-label":title});
 svg.append(svgEl("title",{},title));
 const box={l:45,t:18,w:375,h:202};
 const x=v=>box.l+(v-xMin)/(xMax-xMin)*box.w;
 const y=v=>box.t+box.h-(v-yMin)/(yMax-yMin)*box.h;
 svg.append(svgEl("rect",{x:0,y:0,width:440,height:255,fill:"#112023"}));
 for(let i=0;i<=4;i++){
  const gx=box.l+i*box.w/4,gy=box.t+i*box.h/4;
  svg.append(svgEl("line",{x1:gx,y1:box.t,x2:gx,y2:box.t+box.h,stroke:"#314b48","stroke-width":.6}));
  svg.append(svgEl("line",{x1:box.l,y1:gy,x2:box.l+box.w,y2:gy,stroke:"#314b48","stroke-width":.6}));
  svg.append(svgEl("text",{x:gx,y:239,"text-anchor":"middle"},(xMin+(xMax-xMin)*i/4).toFixed(1)));
  svg.append(svgEl("text",{x:35,y:gy+4,"text-anchor":"end"},(yMax-(yMax-yMin)*i/4).toFixed(2)));
 }
 svg.append(svgEl("line",{x1:box.l,y1:box.t+box.h,x2:box.l+box.w,y2:box.t+box.h,stroke:"#7faca0"}));
 svg.append(svgEl("line",{x1:box.l,y1:box.t,x2:box.l,y2:box.t+box.h,stroke:"#7faca0"}));
 host.append(svg);
 return {svg,x,y};
}
function line(c,values,color="#8ee0c8",strokeWidth=2.6){
 const d=values.map((v,i)=>(i?"L":"M")+c.x(v[0]).toFixed(2)+" "+c.y(v[1]).toFixed(2)).join(" ");
 c.svg.append(svgEl("path",{d,stroke:color,"stroke-width":strokeWidth,fill:"none","stroke-linecap":"round","stroke-linejoin":"round"}));
}
function dot(c,x,y,color="#dfcba1",r=4){
 c.svg.append(svgEl("circle",{cx:c.x(x),cy:c.y(y),r,fill:color,stroke:"#0c1518","stroke-width":1.4}));
}
function logistic(){
 const slope=Number(document.getElementById("slope").value);
 document.getElementById("slope-val").textContent=slope.toFixed(1);
 const c=chart("plot-logistic","Courbe sigmoïde p(x)=1/(1+exp(−βx))",-4,4,0,1);
 const samples=Array.from({length:201},(_,i)=>{
  const x=-4+i*8/200;
  return [x,1/(1+Math.exp(-slope*x))];
 });
 line(c,[[-4,.5],[4,.5]],"#6a807b",1);
 line(c,samples);
 dot(c,0,.5);
}
function gradient(){
 const eta=Number(document.getElementById("eta").value);
 document.getElementById("eta-val").textContent=eta.toFixed(2);
 const loss=w=>.5*Math.pow(w-2,2),derivative=w=>w-2;
 const c=chart("plot-gradient","Descente de gradient sur L(w)=0.5(w−2)^2",-3,6,0,13);
 line(c,Array.from({length:200},(_,i)=>{const w=-3+9*i/199;return [w,loss(w)];}));
 let w=-2.5;
 for(let step=0;step<11;step++){
  dot(c,w,loss(w),"#dfcba1",step===0?5:3);
  w=w-eta*derivative(w);
 }
 dot(c,2,0,"#8ee0c8",5);
}
function logFactorial(n){let sum=0;for(let i=2;i<=n;i++)sum+=Math.log(i);return sum;}
function betaPdf(x,a,b){
 if(x<=0||x>=1)return 0;
 return Math.exp((a-1)*Math.log(x)+(b-1)*Math.log(1-x)
  +logFactorial(a+b-1)-logFactorial(a-1)-logFactorial(b-1));
}
function bayes(){
 const successes=Number(document.getElementById("successes").value),trials=20;
 document.getElementById("success-val").textContent=String(successes);
 const prior=[2,2],post=[2+successes,2+trials-successes];
 const xs=Array.from({length:200},(_,i)=>.005+i*.99/199);
 const priorPoints=xs.map(x=>[x,betaPdf(x,...prior)]);
 const postPoints=xs.map(x=>[x,betaPdf(x,...post)]);
 const max=Math.max(3,...postPoints.map(x=>x[1]))*1.12;
 const c=chart("plot-beta","Prior Beta(2,2) en or, posterior Beta("+
   post[0]+","+post[1]+") en vert",0,1,0,max);
 line(c,priorPoints,"#dfcba1",1.8);line(c,postPoints,"#8ee0c8",2.8);
 dot(c,post[0]/(post[0]+post[1]),betaPdf(post[0]/(post[0]+post[1]),...post));
}
function attention(){
 const temp=Number(document.getElementById("temperature").value);
 document.getElementById("temperature-val").textContent=temp.toFixed(1);
 const host=document.getElementById("plot-attention");host.replaceChildren();
 const svg=svgEl("svg",{viewBox:"0 0 440 255",role:"img","aria-label":"Matrice de poids d'attention causale : futur masqué"});
 svg.append(svgEl("title",{},"Attention causale : chaque ligne ne voit que les colonnes précédentes ou égales."));
 for(let row=0;row<5;row++){
  const scores=Array.from({length:row+1},(_,col)=>-Math.pow(row-col,2)/(2*temp));
  const mx=Math.max(...scores);
  const exp=scores.map(s=>Math.exp(s-mx)),z=exp.reduce((a,b)=>a+b,0);
  for(let col=0;col<5;col++){
   const weight=col<=row?exp[col]/z:0;
   const cell=svgEl("rect",{x:90+col*54,y:13+row*43,width:49,height:38,rx:3,
    fill:col>row?"#2a3438":"#8ee0c8","fill-opacity":col>row?.55:.1+.9*weight,
    stroke:"#566e64","stroke-width":.8});
   cell.append(svgEl("title",{},col>row?"Token futur masqué":"Attention = "+weight.toFixed(3)));
   svg.append(cell);
   svg.append(svgEl("text",{x:114+col*54,y:37+row*43,"text-anchor":"middle",
    fill:col>row?"#88918e":"#071914","font-size":12},col>row?"×":weight.toFixed(2)));
  }
  svg.append(svgEl("text",{x:52,y:38+row*43}, "Q"+(row+1)));
 }
 for(let col=0;col<5;col++)svg.append(svgEl("text",{x:114+col*54,y:245,"text-anchor":"middle"},"K"+(col+1)));
 host.append(svg);
}
window.renderScienceLabs=function(){
 for(const [id,draw] of [["slope",logistic],["eta",gradient],["successes",bayes],["temperature",attention]]){
  const input=document.getElementById(id);
  input.addEventListener("input",draw);draw();
 }
};
