import {THREE,TAU,v,mat,mesh,box,beam,tube,mergeStatic,rng,instanced,clamp} from './common.js';

function naturalGround(x,z){const r=Math.hypot(x,z),fade=clamp((r-7)/24,0,1);return fade*(.38*Math.sin(x*.051)*Math.cos(z*.037)+2.8*Math.exp(-((x-38)**2+(z+40)**2)/1100));}
export const SITE=Object.freeze({towerX:8.1,towerZ:5.8,foundationY:naturalGround(8.1,5.8),basinDepth:1.35,basinX:0,basinZ:-2,basinWidth:7.2,basinLength:8.3});
export const towerPoint=(x,y,z,context=true)=>v(x+SITE.towerX,y+(context?SITE.foundationY:0),z+SITE.towerZ);
export const towerDistance=(x,z)=>Math.hypot(x-SITE.towerX,z-SITE.towerZ);
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function basinRadius(x,z){return Math.hypot((x-SITE.basinX)/SITE.basinWidth,(z-SITE.basinZ)/SITE.basinLength);}
export function groundY(x,z){
 const natural=naturalGround(x,z);
 const q=clamp((basinRadius(x,z)-.48)/.52,0,1);
 const bank=smooth(q)+.010*Math.sin(q*6*Math.PI)*Math.sin(q*Math.PI);
 const terrain=natural-SITE.basinDepth*(1-bank);
 return SITE.foundationY+(terrain-SITE.foundationY)*smooth((towerDistance(x,z)-2.05)/.85);
}
export const roadPoints=[[-24,-45],[-11,-22],[-7.4,-8],[-7.7,0],[-4.5,8],[5,17],[22,30],[42,49]];
export const pathPoints=[[-4.5,8],[0,7.8],[7,9.8],[14,9.1],[27,5.4],[42,1],[61,-10]];
export const passagePoints=[[-10,51],[-.9,34.3],[6.2,21.6],[13.8,8.1],[19.5,-2.1],[20.5,-12],[20,-20.7]];
const roadCurve=new THREE.CatmullRomCurve3(roadPoints.map(([x,z])=>v(x,0,z)),false,'centripetal');
const pathCurve=new THREE.CatmullRomCurve3(pathPoints.map(([x,z])=>v(x,0,z)),false,'centripetal');
const crossCurve=new THREE.CatmullRomCurve3([[-39,-10],[-22,-11],[-8,-13],[6,-16],[26,-23],[53,-48]].map(([x,z])=>v(x,0,z)));
const passageCurve=new THREE.CatmullRomCurve3(passagePoints.map(([x,z])=>v(x,0,z)),false,'centripetal');
const approachCurve=new THREE.CatmullRomCurve3([v(SITE.towerX,0,9.8),v(SITE.towerX,0,8.5),v(SITE.towerX,0,SITE.towerZ+1.3)],false,'centripetal');
export const routes=[{name:'road',curve:roadCurve,width:3.6},{name:'path',curve:pathCurve,width:1.5},{name:'cross',curve:crossCurve,width:1.6},{name:'passage',curve:passageCurve,width:3},{name:'approach',curve:approachCurve,width:1.2}];
const routeSamples=routes.map(p=>({...p,points:p.curve.getSpacedPoints(400)}));
function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
export function routeDistance(x,z,exclude=null){let d=1e6;for(const route of routeSamples){if(route.name===exclude)continue;for(let i=1;i<route.points.length;i++)d=Math.min(d,segmentDistance(x,z,route.points[i-1],route.points[i])-route.width/2);}return d;}

function ribbon(parent,curve,width,material,curb=false,curbPoints=[]){
 const vertices=[],uv=[],indices=[],N=300;const left=[],right=[];
 for(let i=0;i<=N;i++){const t=i/N,p=curve.getPoint(t),d=curve.getTangent(t),normal=v(-d.z,0,d.x).normalize();for(const s of [-1,1]){const e=p.clone().addScaledVector(normal,width*.5*s);e.y=groundY(e.x,e.z)+(curb?.063:.034);vertices.push(e.x,e.y,e.z);uv.push(i*.4,s<0?0:1);if(s<0)left.push(e);else right.push(e);}if(i<N){const j=2*i;indices.push(j,j+2,j+1,j+1,j+2,j+3);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const o=mesh(g,material,parent);o.castShadow=false;
 if(curb){const m=mat(0xb4b2a5,.98);for(const edge of [left,right]){const curve=new THREE.CatmullRomCurve3(edge),count=Math.ceil(curve.getLength()/.48),kept=[];for(let i=0;i<count;i++){const t=(i+.5)/count,p=curve.getPointAt(t);if(routeDistance(p.x,p.z,'road')<.32)continue;kept.push({p,d:curve.getTangentAt(t)});curbPoints.push(p.clone());}instanced(parent,new THREE.BoxGeometry(.17,.14,.45),m,kept.length,(tmp,i)=>{const {p,d}=kept[i];tmp.position.copy(p).add(v(0,.018,0));tmp.rotation.y=Math.atan2(d.x,d.z);});}}
 return o;
}

function leafGeometry(){const p=[0,0,0, -.38,.35,.04, -.36,.73,0, 0,1,0, .36,.73,0, .38,.35,.04,0,.53,.09];const idx=[];for(let i=0;i<6;i++)idx.push(6,i,(i+1)%6);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;}

function makeTree(seed,{height=17,birch=true,detail=1}={},textures={}){
 const rand=rng(seed),root=new THREE.Group(),branches=new THREE.Group();root.add(branches);
 const bark=mat(birch?0xa19a7a:0x6a6551,.97,{map:textures.bark??null});
 const dark=mat(birch?0x585b46:0x625742,.98),leaves=[];
 const trunk=[];for(let i=0;i<=8;i++)trunk.push(v(.15*Math.sin(i*.8),height*.77*i/8,.13*Math.cos(i*.65)));
 for(let i=0;i<8;i++)beam(branches,trunk[i],trunk[i+1],.23*(1-i/10),bark,.23*(1-(i+1)/10),9);
 // Crown is built from branching limbs and hanging sprays, not opaque spheres.
 const limbN=birch?10:13;
 for(let i=0;i<limbN;i++){
  const a=i*2.399+(rand()-.5)*.6;const y=height*(.31+i/limbN*.53);const r=height*(birch?.245:.30)*(1-(i/limbN)*.45);
  const base=v(Math.sin(y)*.11,y,Math.cos(y)*.12),mid=v(Math.cos(a)*r*.65,y+height*.14,Math.sin(a)*r*.65),end=v(Math.cos(a)*r,y+height*.16,Math.sin(a)*r);
  beam(branches,base,mid,.095*(1-i/limbN*.7),bark,.043,7);beam(branches,mid,end,.043,dark,.016,6);
  const sprays=Math.round((birch?12:13)*Math.sqrt(detail));
  for(let j=0;j<sprays;j++){
    const f=.2+.8*j/sprays;const start=base.clone().lerp(end,f);start.y+=height*.07*Math.sin(f*Math.PI);
    const aa=a+(rand()-.5)*1.8,spread=height*(.055+rand()*.075);
    const tip=start.clone().add(v(Math.cos(aa)*spread,-(birch?height*(.08+rand()*.13):height*.025),Math.sin(aa)*spread));
    const bend=start.clone().lerp(tip,.4).add(v(0,birch?.35:.7,0));
    beam(branches,start,bend,.012,dark,.007,5);beam(branches,bend,tip,.007,dark,.002,4);
    const n=Math.round((birch?60:90)*Math.sqrt(detail));
    for(let k=0;k<n;k++){const t=rand(),center=start.clone().lerp(tip,t);center.y+=Math.sin(t*Math.PI)*(birch?.4:.8);const s=(birch?.45:.8);leaves.push({p:center.add(v((rand()-.5)*s,(rand()-.5)*s,(rand()-.5)*s)),a:rand()*TAU,b:rand()*TAU,size:birch?.15+rand()*.12:.22+rand()*.16,c:rand()});}
  }
 }
 // Light upper crown reaches the real crown height.
 for(let i=0;i<Math.round(750*detail);i++){const a=rand()*TAU,r=Math.sqrt(rand())*height*.13,y=height*(.78+rand()*.22);leaves.push({p:v(Math.cos(a)*r,y,Math.sin(a)*r),a:rand()*TAU,b:rand()*TAU,size:.16+rand()*.16,c:rand()});}
 mergeStatic(branches);
 const leafM=mat(0xffffff,.94,{side:THREE.DoubleSide});
 const color=new THREE.Color();instanced(root,leafGeometry(),leafM,leaves.length,(tmp,i,o)=>{const l=leaves[i];tmp.position.copy(l.p);tmp.rotation.set(l.a,l.b,l.a*.4);tmp.scale.setScalar(l.size*1.12);color.setHSL(.19+l.c*.055,.18+l.c*.15,.26+l.c*.18);o.setColorAt(i,color);});
 root.userData.sway=seed;return root;
}

function bench(parent,x,z,rotation=0){const g=new THREE.Group();g.position.set(x,groundY(x,z),z);g.rotation.y=rotation;parent.add(g);const wood=mat(0xbca881,.96),steel=mat(0x7c817a,.55,{metalness:.5});for(let i=0;i<12;i++)box(g,2.3,.065,.135,wood,0,.5,-.75+i*.14);const back=new THREE.Group();g.add(back);back.position.set(0,.52,-.72);back.rotation.x=-.52;for(let i=0;i<6;i++)box(back,2.3,.065,.13,wood,0,i*.13,-i*.015);for(const s of [-1,1]){for(const a of [-.72,.78])beam(g,v(s*1.03,.03,a),v(s*1.03,.5,a),.023,steel);beam(g,v(s*1.03,.48,-.78),v(s*1.03,.48,.86),.023,steel);}mergeStatic(g);}

function building(parent,x,z,w,d,h,rotation=0){const g=new THREE.Group();g.position.set(x,groundY(x,z),z);g.rotation.y=rotation;parent.add(g);const facade=mat(0xafa999,.99),concrete=mat(0xbab7a9,.98),glass=mat(0x5c6b6d,.32,{metalness:.28});box(g,w,h,d,facade,0,h/2,0);const floors=Math.floor(h/2.7);for(let f=0;f<floors;f++){const y=2.15+f*2.65;for(const side of [-1,1]){box(g,w+.25,.22,d+.2,concrete,0,y-1.2,0);for(let j=0;j<Math.floor(w/2.45);j++){const xx=-w/2+1.25+j*2.45;box(g,1.92,1.2,.035,glass,xx,y,side*(d/2+.026));box(g,1.97,.07,.09,concrete,xx,y-.65,side*(d/2+.05));}}}box(g,w+.45,.22,d+.45,mat(0x66675f,.98),0,h+.1,0);mergeStatic(g);}

function terrainGeometry(){
 const axis=[];
 for(let x=-135;x<-18;x+=3)axis.push(x);
 for(let i=0;i<=120;i++)axis.push(-18+i*.3);
 for(let x=21;x<=135;x+=3)axis.push(x);
 const positions=[],colors=[],uv=[],indices=[],c=new THREE.Color(),earth=new THREE.Color(0x948465),N=axis.length;
 for(let iz=0;iz<N;iz++)for(let ix=0;ix<N;ix++){
  const x=axis[ix],z=axis[iz],n=.5+.22*Math.sin(x*.54+z*.25)*Math.cos(z*.4)+.12*Math.sin(x*1.9-z*.51),r=basinRadius(x,z);
  c.setHSL(.228+n*.012,.22+n*.09,.30+n*.065);
  const exposed=(1-smooth((r-.91)/.15))*smooth((r-.39)/.16)*(.38+.12*Math.sin(x*2+z*.7));
  c.lerp(earth,exposed);
  positions.push(x,groundY(x,z)-.015,z);colors.push(c.r,c.g,c.b);uv.push((x+135)/270,1-(z+135)/270);
  if(ix<N-1&&iz<N-1){const a=iz*N+ix;indices.push(a,a+N,a+1,a+1,a+N,a+N+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function buildLandscape(textures={},lowPower=false){
 const root=new THREE.Group();root.name='Parc_reconstitue';const trees=[],curbPoints=[],rand=rng(96);
 const c=new THREE.Color();const terrain=mesh(terrainGeometry(),mat(0xffffff,1,{vertexColors:true,map:textures.grass??null}),root);terrain.name='Sol';terrain.castShadow=false;
 const asphalt=mat(0x9c9b8e,.98,{map:textures.asphalt??null}),gravel=mat(0xbfb19b,.98,{map:textures.gravel??null});ribbon(root,roadCurve,3.6,asphalt,true,curbPoints);for(const route of routes.slice(1))ribbon(root,route.curve,route.width,gravel);
 // Low, curved earth shelves follow the hollow visible in the site model.
 const soil=mat(0x9a8c70,1,{map:textures.gravel??null});
 for(const radius of [.65,.79,.91]){
  const pts=[];for(let i=0;i<=70;i++){const a=Math.PI*.12+Math.PI*.84*i/70,r=radius+.012*Math.sin(a*5);pts.push(v(SITE.basinWidth*r*Math.cos(a),0,SITE.basinZ-SITE.basinLength*r*Math.sin(a)));}
  ribbon(root,new THREE.CatmullRomCurve3(pts),.22,soil);
 }
 // Existing trees and hollow stay in place when the tower moves to the marked lawn.
 const positions=[[8,-3,18,true,71],[-15,-11,16,true,14],[14,-25,15,false,26],[0,-21,13,false,31],[-19,-22,13,false,37],[30,-18,20,false,32],[-25,-27,18,false,48],[-5,-35,14,true,55],[29,13,19,false,39],[42,-10,17,false,65],[-34,9,17,false,70],[-40,-35,20,false,82],[9,-48,18,false,92],[45,-36,21,false,94],[-18,-49,16,false,97],[60,15,23,false,112],[-55,-6,19,false,122]];
 for(const [x,z,h,birch,seed]of positions){const detail=(x===8?1:(Math.hypot(x,z)<34?.68:.4))*(lowPower?.65:1);const tree=makeTree(seed,{height:h,birch,detail},textures);tree.position.set(x,groundY(x,z),z);root.add(tree);trees.push(tree);}
 // Chestnut paling around the planted zone, with an opening beside the tower.
 const fence=new THREE.Group();root.add(fence);const fenceM=mat(0xb5ab8c,.98),wire=mat(0x686c55,.95),fencePath=new THREE.CatmullRomCurve3([v(1.05,0,6.5),v(5.2,0,4.5),v(9,0,-2),v(9.2,0,-7),v(4.5,0,-11),v(-2.5,0,-11.5),v(-4.8,0,-7),v(-4.9,0,-1.8),v(-3.9,0,3.5),v(-1.05,0,6.5)]);
 // Pickets, posts, wires and collisions use the same open fence runs.
 const fenceRuns=[];let run=[];
 for(const p of fencePath.getSpacedPoints(Math.ceil(fencePath.getLength()/.1))){
  if(routeDistance(p.x,p.z)>.55&&towerDistance(p.x,p.z)>2.6){run.push(p);}else{if(run.length>2)fenceRuns.push(run);run=[];}
 }if(run.length>2)fenceRuns.push(run);
 const fenceSamples=[];
 for(const points of fenceRuns){
  const curve=new THREE.CatmullRomCurve3(points),length=curve.getLength(),n=Math.max(2,Math.ceil(length/.25));
  const samples=curve.getSpacedPoints(n-1);fenceSamples.push(...samples);
  instanced(fence,new THREE.CylinderGeometry(.021,.03,1,5),fenceM,n,(o,i)=>{const p=samples[i],h=.8+rand()*.35;o.position.set(p.x,groundY(p.x,p.z)+h/2,p.z);o.scale.y=h;o.rotation.z=(rand()-.5)*.14;o.rotation.x=(rand()-.5)*.1;});
  for(const y of [.32,.7]){const pts=points.map(p=>p.clone().setY(groundY(p.x,p.z)+y));tube(fence,pts,.008,wire,points.length*2);}
  const posts=Math.max(2,Math.ceil(length/2.6)+1);instanced(fence,new THREE.CylinderGeometry(.05,.06,1.25,7),fenceM,posts,(o,i)=>{const p=curve.getPointAt(i/(posts-1));o.position.set(p.x,groundY(p.x,p.z)+.61,p.z);});
 }
 bench(root,10.6,-.8,-.1);bench(root,14,-.9,-.1);bench(root,-14,-6,.8);
 const fixtures=new THREE.Group();root.add(fixtures);const dark=mat(0x454f49,.83),metal=mat(0x9fa69e,.6,{metalness:.45});
 for(const [x,z]of [[13,-11],[-11,-18],[34,2]]){const y=groundY(x,z);beam(fixtures,v(x,y,z),v(x,y+4.4,z),.042,metal);box(fixtures,.55,.07,.22,metal,x,y+4.42,z);box(fixtures,.4,.025,.15,mat(0xe5e3ca,.3),x,y+4.38,z);}
 for(const t of [.1,.27,.47,.67,.84]){const p=pathCurve.getPoint(t);p.z+=1.05;if(routeDistance(p.x,p.z)<.22||towerDistance(p.x,p.z)<2.7)continue;box(fixtures,.1,.68,.1,dark,p.x,groundY(p.x,p.z)+.34,p.z);box(fixtures,.105,.025,.105,mat(0xd4ceac),p.x,groundY(p.x,p.z)+.63,p.z);}
 // Blank information panel: no added writing anywhere in the landscape.
 box(fixtures,.8,1.72,.18,dark,12,groundY(12,-11)+.88,-11);box(fixtures,.64,1.5,.02,mat(0x748b65),12,groundY(12,-11)+.88,-10.9);
 mergeStatic(fixtures);
 building(root,-42,-35,38,12,18,.25);building(root,-9,-61,38,12,17,-.09);building(root,41,-45,26,13,10,-.25);
 const house=new THREE.Group();house.position.set(27,groundY(27,-6),-6);house.rotation.y=-.08;root.add(house);box(house,8,4.8,11,mat(0xb8ad96,.97),0,2.4,0);const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute([-4.4,4.85,-5.9,4.4,4.85,-5.9,0,7.2,-5.9,-4.4,4.85,5.9,4.4,4.85,5.9,0,7.2,5.9],3));roof.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4]);roof.computeVertexNormals();mesh(roof,mat(0x69675e,.98),house);for(let x=-2.8;x<4;x+=2.8){box(house,1.4,1.5,.035,mat(0x6f7974,.4),x,2.7,5.52);}mergeStatic(house);
 // Fine grass near the visitor; geometry and density stay bounded on mobile.
 const count=lowPower?5000:11000,grass=[];for(let attempts=0;grass.length<count&&attempts<count*6;attempts++){const x=(rand()-.5)*84,z=(rand()-.5)*76;if(towerDistance(x,z)<2.15||routeDistance(x,z)<.16||x>22&&x<32&&z>-12&&z<0)continue;grass.push({x,z,h:.07+rand()*.15,a:rand()*TAU});}
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,.012,.7,.01,0,1,.04,0,0,-.025,0,0,.025,.01,.7,.012,.04,1,0],3));blade.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);blade.computeVertexNormals();const grassM=mat(0xffffff,.98,{side:THREE.DoubleSide});const blades=instanced(root,blade,grassM,grass.length,(o,i,im)=>{const g=grass[i];o.position.set(g.x,groundY(g.x,g.z),g.z);o.scale.set(.7,g.h,.7);o.rotation.y=g.a;c.setHSL(.20+rand()*.05,.22,.26+rand()*.12);im.setColorAt(i,c);});blades.castShadow=false;
 const fallen=[];for(let i=0;i<(lowPower?220:500);i++){const x=8+(rand()-.5)*17,z=-3+(rand()-.5)*15;if(towerDistance(x,z)<1.9)continue;fallen.push({x,z,a:rand()*TAU});}const leafM=mat(0xa4945a,.96,{side:THREE.DoubleSide});const leaves=instanced(root,leafGeometry(),leafM,fallen.length,(o,i)=>{const p=fallen[i];o.position.set(p.x,groundY(p.x,p.z)+.045,p.z);o.rotation.set(-Math.PI/2,0,p.a);o.scale.setScalar(.15+rand()*.12);});leaves.castShadow=false;
 const allowsWalking=(x,z)=>!fenceSamples.some(p=>Math.hypot(p.x-x,p.z-z)<.32);
 return {root,terrain,trees,groundY,routes,allowsWalking,fenceRuns,curbPoints};
}
