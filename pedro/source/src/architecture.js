import {THREE,TAU,v,mat,mesh,box,beam,tube,arcPoints,mergeStatic} from './common.js';
import {makePerson} from './people.js';

export const SPEC=Object.freeze({height:15,modelHeight:.75,scale:20,diameters:[8,6,4],coreRadius:1.32,balconyY:11.08,baseRadius:1.87});
export const PLATES=[
 {radius:4,y:6.55,sx:.12,sz:-.075,t:.15},
 {radius:3,y:10.2,sx:-.22,sz:.09,t:.14},
 {radius:2,y:15-2*Math.hypot(.21,.18)-.07,sx:.21,sz:.18,t:.14}
];
export const plateY=(p,x,z)=>p.y+p.sx*x+p.sz*z;
const openings=[{angle:Math.PI/2,width:.94,bottom:.08,spring:1.72,r:.47},{angle:Math.PI/2,width:.96,bottom:SPEC.balconyY,spring:SPEC.balconyY+1.68,r:.48},{angle:.05,width:.7,bottom:7.65,spring:8.37,r:.35}];

function plateGeo(p){const shape=new THREE.Shape();shape.absarc(0,0,p.radius,0,TAU,false);if(p!==PLATES[2]){const hole=new THREE.Path();hole.absarc(0,0,1.27,0,TAU,true);shape.holes.push(hole);}const g=new THREE.ExtrudeGeometry(shape,{depth:p.t,bevelEnabled:false,curveSegments:96});g.rotateX(Math.PI/2);const pos=g.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)+p.y+p.t/2+p.sx*pos.getX(i)+p.sz*pos.getZ(i));g.computeVertexNormals();return g;}

function ringSector(inner,outer,y,thickness,start,end){const s=new THREE.Shape();s.absarc(0,0,outer,start,end,false);s.absarc(0,0,inner,end,start,true);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:true,bevelSegments:1,bevelSize:.017,bevelThickness:.012,curveSegments:Math.max(3,Math.ceil(Math.abs(end-start)/TAU*96))});g.rotateX(Math.PI/2);g.translate(0,y,0);return g;}

export function buildArchitecture(textures={}){
 const root=new THREE.Group();root.name='Belvedere_Pedro_15m';
 const structure=new THREE.Group();structure.name='Structure';root.add(structure);
 const cladding=new THREE.Group();cladding.name='Fut';root.add(cladding);
 const inside=new THREE.Group();inside.name='Interieur_interprete';root.add(inside);
 const wood=mat(0xb88b57,.84,{map:textures.wood??null});const pale=mat(0xd9be8b,.73,{map:textures.wood??null});const edge=mat(0xa57446,.88);const metal=mat(0x706b60,.52,{metalness:.55});const dark=mat(0x5b4631,.94);
 const woods=[0xb78b5c,0xc29462,0xb18a62,0xbb946d,0xc49b70,0xa97d53].map(c=>mat(c,.92,{map:textures.wood??null}));
 const bottom=mesh(new THREE.CylinderGeometry(SPEC.baseRadius,SPEC.baseRadius,.12,96),wood,structure,v(0,.06,0));
 bottom.name='Socle';
 // Individually profiled vertical slats: true openings, not black decals.
 const N=192,R=SPEC.coreRadius;
 for(let i=0;i<N;i++){
  const angle=TAU*i/N,x=Math.cos(angle)*R,z=Math.sin(angle)*R;
  const top=plateY(PLATES[2],x,z)-PLATES[2].t/2;
  let intervals=[[.12,top]];
  for(const o of openings){const d=Math.atan2(Math.sin(angle-o.angle),Math.cos(angle-o.angle))*R;if(Math.abs(d)<o.width/2){const up=o.spring+Math.sqrt(Math.max(0,o.r**2-d*d));intervals=intervals.flatMap(([a,b])=>{if(b<=o.bottom||a>=up)return[[a,b]];const out=[];if(a<o.bottom)out.push([a,o.bottom]);if(b>up)out.push([up,b]);return out;});}}
  for(const [a,b]of intervals){if(b-a<.006)continue;const slat=box(cladding,.10,b-a,TAU*R/N*.9,woods[i%woods.length],x,(a+b)/2,z);slat.rotation.y=-angle;}
 }
 for(const [i,p]of PLATES.entries()){
  const pl=mesh(plateGeo(p),wood,structure);pl.name=`Disque_${p.radius*2}m`;
  // Fine exposed edge and join, preserving the inclined circular silhouette.
  const pts=Array.from({length:193},(_,j)=>{const a=j/192*TAU,x=p.radius*Math.cos(a),z=p.radius*Math.sin(a);return v(x,plateY(p,x,z),z);});tube(structure,pts,.037,edge,192);
  if(i===2){for(const a of [.56,3.72]){const x=p.radius*Math.cos(a),z=p.radius*Math.sin(a);beam(structure,v(0,p.y+p.t/2+.002,0),v(x,plateY(p,x,z)+p.t/2+.002,z),.009,edge,.009,5);}}
 }
 const tiers=[{n:22,low:.15,r0:1.76,r1:3.92,p:PLATES[0],phase:.07,twist:.07},{n:13,low:6.64,r0:1.37,r1:2.93,p:PLATES[1],phase:.08,twist:.13},{n:11,low:10.32,r0:1.36,r1:1.94,p:PLATES[2],phase:.19,twist:-.06}];
 for(let k=0;k<tiers.length;k++){
  const tier=tiers[k];for(let i=0;i<tier.n;i++){
   const a=TAU*i/tier.n+tier.phase,b=a+tier.twist;
   // The balcony opening stays clear of the last set of diagonal rods.
   if(k===2&&Math.sin(a)>.58)continue;
   const x=tier.r1*Math.cos(b),z=tier.r1*Math.sin(b);let ly=tier.low;if(k>0)ly=plateY(PLATES[k-1],tier.r0*Math.cos(a),tier.r0*Math.sin(a))+.07;
   const start=v(tier.r0*Math.cos(a),ly,tier.r0*Math.sin(a)),end=v(x,plateY(tier.p,x,z)-.075,z);
   beam(structure,start,end,k===0?.046:.045,pale,.042,9);
   for(const point of [start,end]){const ferrule=mesh(new THREE.SphereGeometry(.064,8,6),metal,structure,point);ferrule.scale.set(.8,.8,.8);}
  }
 }
 // Outward leaning, finely spaced balustrade on a separate level.
 const start=.02*Math.PI,end=.98*Math.PI,y=SPEC.balconyY,outer=2.24;
 mesh(ringSector(R-.02,outer,y,.12,start,end),wood,structure).name='Balcon';
 tube(structure,arcPoints(outer,y-.03,start,end),.048,edge);
 tube(structure,arcPoints(2.49,y+1.05,start,end),.044,pale);
 for(let i=0;i<=59;i++){const a=start+(end-start)*i/59;beam(structure,v(outer*Math.cos(a),y,outer*Math.sin(a)),v(2.49*Math.cos(a),y+1.05,2.49*Math.sin(a)),.021,pale,.021,7);}
 for(const a of [start,end]){beam(structure,v(R*Math.cos(a),y+1.05,R*Math.sin(a)),v(2.49*Math.cos(a),y+1.05,2.49*Math.sin(a)),.035,pale);for(let j=0;j<9;j++){const r=R+(2.4-R)*j/8;beam(structure,v(r*Math.cos(a),y,r*Math.sin(a)),v((r+.08)*Math.cos(a),y+1.05,(r+.08)*Math.sin(a)),.021,pale);}}
 for(const a of [.45,Math.PI-.45]){beam(structure,v(R*Math.cos(a),y-1.25,R*Math.sin(a)),v(2.14*Math.cos(a),y-.08,2.14*Math.sin(a)),.055,pale);}
 // Portal reveals and curved shallow hoods, seen on the source model.
 for(const [i,o] of openings.entries()){
   const normal=v(Math.cos(o.angle),0,Math.sin(o.angle)),tangent=v(-Math.sin(o.angle),0,Math.cos(o.angle));
   const pts=[];for(let k=0;k<=40;k++){const a=Math.PI-k/40*Math.PI;const d=o.r*Math.cos(a),h=o.spring+o.r*Math.sin(a);pts.push(normal.clone().multiplyScalar(R+.055).add(tangent.clone().multiplyScalar(d)).setY(h));}
   tube(structure,pts,.037,edge,40);
   for(const side of [-1,1]){const base=normal.clone().multiplyScalar(R+.03).add(tangent.clone().multiplyScalar(side*o.r));beam(structure,base.clone().setY(o.bottom),base.clone().setY(o.spring),.036,edge);}
   const hoodGeo=new THREE.BufferGeometry(),arr=[],inds=[];
   for(let k=0;k<=32;k++){const a=Math.PI-k/32*Math.PI;const dx=(o.r+.08)*Math.cos(a),h=o.spring+(o.r+.08)*Math.sin(a);for(const r of [R,R+.38]){const p=normal.clone().multiplyScalar(r).add(tangent.clone().multiplyScalar(dx));arr.push(p.x,h+.025,p.z);}}
   for(let k=0;k<32;k++){const j=k*2;inds.push(j,j+1,j+2,j+1,j+3,j+2);}hoodGeo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));hoodGeo.setIndex(inds);hoodGeo.computeVertexNormals();mesh(hoodGeo,mat(0xad7d4c,.88,{side:THREE.DoubleSide}),structure);
   if(i===2){for(let j=-2;j<=2;j++){const p=normal.clone().multiplyScalar(R+.03).add(tangent.clone().multiplyScalar(j*.115));beam(structure,p.clone().setY(o.bottom),p.clone().setY(o.bottom+.45),.018,pale);}const a=normal.clone().multiplyScalar(R+.05);beam(structure,a.clone().addScaledVector(tangent,-.34).setY(o.bottom+.46),a.clone().addScaledVector(tangent,.34).setY(o.bottom+.46),.027,pale);}
 }
 // Interior is an interpretation (hidden by default), with a continuous walkable spiral.
 const floor=mesh(new THREE.CylinderGeometry(1.25,1.25,.1,80),dark,inside,v(0,.14,0));
 beam(inside,v(0,.15,0),v(0,y,0),.085,metal,.085,16);
 const steps=68,delta=TAU*3/steps;for(let i=0;i<steps;i++){const a=Math.PI/2-i*delta;const g=ringSector(.16,1.18,.17+(i+1)*(y-.17)/steps,.065,a-delta/2,a+delta/2);mesh(g,wood,inside);}
 const rail=[];for(let i=0;i<=240;i++){const t=i/240,a=Math.PI/2-TAU*3*t;rail.push(v(Math.cos(a)*1.1,.18+t*(y-.18)+.87,Math.sin(a)*1.1));}tube(inside,rail,.025,metal,240);
 mesh(ringSector(.08,1.22,y-.025,.075,-Math.PI,Math.PI),wood,inside);
 mergeStatic(structure);mergeStatic(cladding);mergeStatic(inside);
 const father=makePerson({height:1.78,shirt:0x536b77,pants:0x36464f});father.root.position.set(-.4,y+.015,1.75);father.root.rotation.y=.22;root.add(father.root);
 const daughter=makePerson({height:1.15,child:true,girl:true,shirt:0xc38c48,pants:0x62554a});daughter.root.position.set(.38,y+.015,1.78);daughter.root.rotation.y=-.15;root.add(daughter.root);
 root.userData={name:'Pedro',units:'meters',height:15,diameters_m:[8,6,4],scale:20,interpretation:'Reconstruction manuelle depuis photographies. Niveaux, noyau, inclinaisons et interieur estimes.'};
 return {root,cladding,structure,inside,people:[father,daughter],woodMaterials:[wood,pale,...woods]};
}
