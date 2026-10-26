/* Achraf Notebooks: original, deterministic, dependency-free scientific visualizations */
(()=>{
const previous=window.renderAcademyVisual;
const escapeHTML=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const frame=(t,desc,controls)=>'<section class="box" style="border-top:3px solid var(--accent)"><h3>'+t+'</h3><p class="muted">'+desc+'</p>'+controls+'<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+escapeHTML(t)+'" style="width:100%;max-height:370px;background:var(--bg);border-radius:8px"></svg><p class="viz-extra-info muted"></p></section>';
const slider=(id,label,min,max,step,value)=>'<label style="display:block;margin:10px 0"><strong>'+label+'</strong> <output id="'+id+'-value"></output><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'" style="display:block;width:100%;accent-color:var(--accent)"></label>';
const text=(x,y,s,size=13)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="'+size+'" fill="currentColor">'+escapeHTML(s)+'</text>';
const rect=(x,y,w,h,fill,opacity=1)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+fill+'" opacity="'+opacity+'"/>';
const blue="#277e8b",orange="#c47f53",pale="#d1e5e4",dark="#244a52";
const tasks={
G7:{title:["Convolution 2D : manipuler le filtre","2D convolution: adjust the kernel"],intro:["Image 5×5 et noyau 3×3 : corrélation croisée valide. Varie le poids central, vois les sorties et leurs signes.","5×5 input and 3×3 kernel with valid cross-correlation. Change center weight to see the output map."],controls:[["k","Poids central","Center weight",0,8,1,4]],draw(v){
const X=[[0,0,0,0,0],[0,2,2,2,0],[0,2,8,2,0],[0,2,2,2,0],[0,0,0,0,0]];
const K=[[0,-1,0],[-1,v.k,-1],[0,-1,0]];
const Y=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>{let sum=0;for(let a=0;a<3;a++)for(let b=0;b<3;b++)sum+=X[i+a][j+b]*K[a][b];return sum}));
const cells=(arr,xx,yy,w)=>arr.map((row,i)=>row.map((val,j)=>{
const bright=Math.min(1,Math.abs(val)/Math.max(1,w));
return rect(xx+j*45,yy+i*45,40,40,val>=0?blue:orange,.15+.75*bright)+text(xx+j*45+20,yy+i*45+26,String(val),13)
}).join("")).join("");
return{svg:text(143,24,"Image X · 5×5",15)+cells(X,30,42,8)+text(350,24,"Kernel K · 3×3",15)+cells(K,282,80,8)+text(555,24,"Output Y · 3×3",15)+cells(Y,485,80,32)+text(350,262,"Y[i,j] = Σ K[a,b] X[i+a,j+b]",13),
summary:"Kernel center="+v.k+" · output shape 3×3 · Y[1,1]="+Y[1][1]+"."
}}},
H14:{title:["Self-attention : masque causal et température","Self-attention: causal mask and temperature"],intro:["Sélectionne un token et observe quelles positions peuvent contribuer à sa prédiction. Les tokens futurs restent masqués.","Select a token; only previous and current positions can contribute. Future tokens stay blocked."],controls:[["pos","Position du token","Token position",0,5,1,3],["temp","Température τ","Temperature τ",.3,3,.1,1]],draw(v){
const n=6,cell=43,px=68,py=38;
let svg=text(200,20,"Causal scores · rows=query, cols=key",13);
for(let i=0;i<n;i++)for(let j=0;j<n;j++){
const allowed=j<=i,selected=i===v.pos;
svg+=rect(px+j*cell,py+i*cell,cell-3,cell-3,allowed?(selected?blue:pale):"#647781",allowed?(selected ? .75 : .45):.17);
if(!allowed)svg+=text(px+j*cell+20,py+i*cell+27,"×");
}
const logits=Array.from({length:v.pos+1},(_,j)=>j===v.pos?2:Math.cos((v.pos-j)*.7));
const max=Math.max(...logits),es=logits.map(s=>Math.exp((s-max)/v.temp)),z=es.reduce((a,b)=>a+b,0);
const probs=es.map(e=>e/z);
svg+=text(538,30,"Attention distribution",14);
for(let j=0;j<n;j++){
const p=j<probs.length?probs[j]:0,h=p*182;
svg+=rect(413+j*37,271-h,27,h,j<=v.pos?blue:"#647781",.8)+text(426+j*37,291,String(j),12);
}
svg+=text(530,315,"keys: 0 → 5",12);
return {svg,summary:"Query "+v.pos+" · allowed keys: "+(v.pos+1)+" · weight sum="+probs.reduce((a,b)=>a+b,0).toFixed(4)+" · future keys have zero weight."};
}},
J1:{title:["Détection : l'IoU de deux rectangles","Detection: intersection over union"],intro:["Déplace horizontalement la boîte prédite. Vois l'intersection et la valeur de l'IoU.","Shift the predicted box horizontally; inspect intersection and IoU."],controls:[["offset","Décalage horizontal (px)","Horizontal shift (px)",0,120,2,30]],draw(v){
const x=100, y=75, side=130, offset=v.offset;
const inter=Math.max(0,side-offset)*side,union=2*side*side-inter,iou=inter/union;
const svg=rect(x,y,side,side,blue,.27)+rect(x+offset,y,side,side,orange,.27)+
'<rect x="'+x+'" y="'+y+'" width="'+side+'" height="'+side+'" stroke="'+blue+'" stroke-width="3" fill="none"/>'+
'<rect x="'+(x+offset)+'" y="'+y+'" width="'+side+'" height="'+side+'" stroke="'+orange+'" stroke-width="3" fill="none"/>'+
text(163,55,"Reference",15)+text(165+offset,230,"Prediction",15)+
text(500,90,"Intersection = "+Math.round(inter),16)+text(500,125,"Union = "+Math.round(union),16)+text(500,175,"IoU = "+iou.toFixed(3),22)+
rect(370,205,240,20,"#647781",.2)+rect(370,205,240*iou,20,blue,.9)+text(490,260,"IoU ∈ [0,1]",14);
return{svg,summary:"Offset="+offset+" px · IoU="+iou.toFixed(4)+"; this is geometric overlap, not classification confidence."};
}},
C3:{title:["Conditionnement : un petit bruit, un grand effet","Conditioning: tiny noise, large effect"],intro:["A=[[1,1],[1,1+ε]], b=(2,2+ε). Une perturbation de 10⁻⁵ du second terme de b change fortement la solution lorsque ε devient petit.","A=[[1,1],[1,1+ε]], b=(2,2+ε). Perturbing the second component of b by 10⁻⁵ can strongly change the solution as ε becomes tiny."],controls:[["exponent","Exposant : ε = 10^(−k)","Exponent: ε = 10^(−k)",1,6,1,3]],draw(v){
const eps=10**(-v.exponent),dx=1e-5/eps,x1=1-dx,x2=1+dx;
const scale=Math.max(1.5,Math.abs(x1),Math.abs(x2)), zero=180;
const bar=(index,val,col)=>{const h=Math.abs(val)/scale*110;return rect(175+index*185,val>=0?zero-h:zero,75,h,col,.8)+text(212+index*185,285,index===0?"x₁":"x₂",16)};
return{svg:text(340,36,"Exact solution: (1, 1)",17)+text(340,61,"Perturbed solution:",14)+
'<line x1="100" y1="'+zero+'" x2="580" y2="'+zero+'" stroke="#8ca3a2"/>'+bar(0,x1,blue)+bar(1,x2,orange)+text(212,94,x1.toFixed(3),13)+text(397,94,x2.toFixed(3),13),
summary:"ε="+eps.toExponential(1)+" · perturbation δ=1e-5 · x₁="+x1.toFixed(4)+" · x₂="+x2.toFixed(4)+" · deviation magnitude="+dx.toFixed(4)};
}},
I8:{title:["Imitation : une erreur de commande répétée","Imitation: repeated action bias"],intro:["L'expert commande u=−0,8x ; la politique imitée commande u=−0,8x+b. Observe la dérive quand le biais b augmente.","The expert controls u=−0.8x; the cloned policy uses u=−0.8x+b. See the effect of small systematic action error."],controls:[["bias","Biais d'action b","Action bias b",0,1,.05,.2]],draw(v){
const dt=.2,expert=[2],cloned=[2];let xe=2,xc=2;
for(let i=0;i<60;i++){xe+=dt*(-.8*xe);xc+=dt*(-.8*xc+v.bias);expert.push(xe);cloned.push(xc)}
const xcoord=i=>50+i/60*570, ycoord=y=>280-y/2.5*230;
const draw=arr=>arr.map((x,i)=>xcoord(i).toFixed(2)+","+ycoord(x).toFixed(2)).join(" ");
return {svg:'<line x1="45" y1="280" x2="630" y2="280" stroke="#839e9c"/>'+
'<polyline fill="none" stroke="'+blue+'" stroke-width="3" points="'+draw(expert)+'"/>'+
'<polyline fill="none" stroke="'+orange+'" stroke-width="3" points="'+draw(cloned)+'"/>'+
text(190,25,"Expert",15)+text(340,25,"Cloned policy + bias",15)+rect(130,15,20,8,blue)+rect(245,15,20,8,orange),
summary:"Initial x=2 · expert final="+xe.toFixed(3)+" · learned final="+xc.toFixed(3)+" · asymptotic learned offset="+(v.bias/.8).toFixed(3)+" (linear model)."};
}}
};
window.renderAcademyVisual=(id,node,lang)=>{
if(!tasks[id])return previous?.(id,node,lang);
if(!node)return;
const spec=tasks[id],idx=lang==="en"?1:0;
const controls=spec.controls.map(c=>slider(c[0],c[idx+1],c[3],c[4],c[5],c[6])).join("");
node.hidden=false;node.innerHTML=frame(spec.title[idx],spec.intro[idx],controls);
const paint=()=>{
 const values={};
 for(const c of spec.controls){const input=node.querySelector('#'+c[0]);values[c[0]]=Number(input.value);node.querySelector('#'+c[0]+'-value').textContent=input.value}
 const figure=spec.draw(values);
 node.querySelector('svg').innerHTML=figure.svg;
 node.querySelector('.viz-extra-info').textContent=figure.summary;
};
node.querySelectorAll('input[type="range"]').forEach(input=>input.addEventListener('input',paint));
paint();
};
})();