import {THREE,mesh,mat,v,box,beam} from './common.js';

// Procedural, fully volumetric figures. No photographs or generated textures.
export function makePerson({height=1.78,child=false,girl=false,shirt=0x496577,pants=0x34424c,hair=0x392b23}={}){
 const root=new THREE.Group();root.name=girl?'Fille':child?'Promeneur':'Pere';
 const scale=height/1.78;root.scale.setScalar(scale);
 const skin=mat(0xc59676,.91),cloth=mat(shirt,.98),denim=mat(pants,.98),dark=mat(0x353a38,.85),hairM=mat(hair,.98),white=mat(0xe6e1d6,.95);
 const body=new THREE.Group();root.add(body);
 function ell(parent,x,y,z,sx,sy,sz,m){const o=mesh(new THREE.SphereGeometry(1,12,10),m,parent,v(x,y,z));o.scale.set(sx,sy,sz);return o;}
 const torso=ell(body,0,1.19,0,.225,.32,.13,cloth);
 ell(body,0,.93,0,.18,.13,.12,denim);
 box(body,.018,.46,.014,white,0,1.23,.134);
 for(const s of [-1,1])box(body,.076,.09,.012,cloth,s*.105,1.32,.13);
 beam(body,v(0,1.44,0),v(0,1.53,0),.057,skin);
 const head=new THREE.Group();head.position.y=1.61;body.add(head);
 ell(head,0,0,0,.105,.137,.104,skin);
 const cap=mesh(new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*.53),hairM,head,v(0,.022,-.009));cap.scale.set(.109,.124,.106);
 ell(head,0,-.007,.101,.021,.026,.025,skin);
 ell(head,-.103,-.005,0,.018,.031,.019,skin);ell(head,.103,-.005,0,.018,.031,.019,skin);
 for(const s of [-1,1]){ell(head,s*.039,.013,.095,.009,.007,.006,dark);const brow=box(head,.026,.005,.006,hairM,s*.039,.037,.095);brow.rotation.z=s*.07;}
 if(girl){ell(head,0,-.012,-.099,.09,.12,.043,hairM);const pony=ell(head,.075,-.085,-.14,.047,.13,.045,hairM);pony.rotation.x=-.3;ell(head,.074,-.02,-.13,.043,.027,.037,mat(0xbe805a));}
 const limbs={};
 for(const s of [-1,1]){
   const arm=new THREE.Group();arm.position.set(s*.22,1.4,0);arm.rotation.z=s*.08;body.add(arm);
   const elbow=new THREE.Group();elbow.position.y=-.27;arm.add(elbow);
   beam(arm,v(0,-.01,0),v(0,-.27,0),.068,cloth,.079,10);ell(arm,0,-.27,0,.065,.065,.065,cloth);
   beam(elbow,v(0,0,0),v(0,-.245,.012),.043,cloth,.06,10);ell(elbow,0,-.278,.018,.043,.069,.031,skin);
   const leg=new THREE.Group();leg.position.set(s*.095,.93,0);body.add(leg);
   const knee=new THREE.Group();knee.position.y=-.4;leg.add(knee);
   beam(leg,v(0,0,0),v(0,-.4,0),.074,denim,.102,12);ell(leg,0,-.4,0,.075,.075,.072,denim);
   beam(knee,v(0,0,0),v(0,-.39,0),.054,denim,.073,12);
   const shoe=ell(knee,0,-.43,.055,.07,.053,.135,dark);box(knee,.14,.022,.23,white,0,-.474,.045);
   limbs[s<0?'left':'right']={arm,elbow,leg,knee};
 }
 if(girl){const skirt=mesh(new THREE.CylinderGeometry(.18,.25,.29,20),mat(0xc3a48b,.97),body,v(0,.9,0));}
 const person={root,body,head,limbs,height,phase:0,update(time,speed=0){const a=Math.min(speed/2,1);this.phase+=speed*.038;const p=time*7.8;for(const [key,s]of [['left',1],['right',-1]]){const l=limbs[key];l.leg.rotation.x=Math.sin(p)*.51*a*s;l.knee.rotation.x=Math.max(0,-Math.sin(p)*s)*.56*a;l.arm.rotation.x=-Math.sin(p)*.38*a*s;l.elbow.rotation.x=-.12-Math.max(0,Math.sin(p)*s)*.16*a;}body.position.y=Math.sin(p*2)*.018*a+Math.sin(time*1.7)*.003;head.rotation.y=Math.sin(time*.35)*.045;}};
 return person;
}

