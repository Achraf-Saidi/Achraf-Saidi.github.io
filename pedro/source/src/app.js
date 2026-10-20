import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {buildArchitecture,SPEC} from './architecture.js';
import {buildLandscape,groundY,SITE} from './landscape.js';
import {makePerson} from './people.js';
import {textures} from './textures.js';
import {icon} from './icons.js';
import {photos} from './references.js';

const $=id=>document.getElementById(id),v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=matchMedia('(pointer:coarse)').matches||innerWidth<720;
const lowPower=mobile||(navigator.hardwareConcurrency??8)<=4;
let announceTimer;function announce(text){clearTimeout(announceTimer);$('status').textContent=text;announceTimer=setTimeout(()=>$('status').textContent='',5000);}
function button(parent,id,glyph,label,handler,{pressed=null,glass=false}={}){const b=document.createElement('button');b.id=id;b.className='tool'+(glass?' glass':'');b.innerHTML=icon(glyph);b.setAttribute('aria-label',label);if(pressed!==null)b.setAttribute('aria-pressed',pressed);b.addEventListener('click',handler);$(parent).appendChild(b);return b;}
const pressed=(b,on)=>b.setAttribute('aria-pressed',String(on));
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

async function main(){
 const canvas=$('scene');let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});}catch(error){showError('Ce navigateur ne peut pas afficher la scène 3D. Ouvre la page dans un navigateur avec WebGL 2.');return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.6:2));renderer.setSize(innerWidth,innerHeight,false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.localClippingEnabled=true;
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xd6dece,65,180);scene.background=new THREE.Color(0xcbd9d9);
 const camera=new THREE.PerspectiveCamera(innerWidth<700?44:38,innerWidth/innerHeight,.08,400);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=3;controls.maxDistance=100;controls.maxPolarAngle=Math.PI*.74;controls.minPolarAngle=.045;controls.target.set(1.2,7.2,0);camera.position.set(19,12.4,27);controls.update();controls.saveState();
 const hemi=new THREE.HemisphereLight(0xe6f0f3,0x7d7958,2);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffefce,3.25);sun.position.set(-24,35,19);sun.castShadow=true;sun.shadow.mapSize.set(lowPower?1024:2048,lowPower?1024:2048);Object.assign(sun.shadow.camera,{near:1,far:100,left:-28,right:28,top:31,bottom:-25});sun.shadow.normalBias=.055;sun.shadow.bias=-.00015;sun.shadow.radius=3;sun.target.position.set(1,5,0);scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight(0xd0e3f1,.45);fill.position.set(20,10,-30);scene.add(fill);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.3;room.dispose();pmrem.dispose();
 // A gentle procedural sky; the supplied landscape itself is rebuilt as geometry.
 const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0xb0c6ce)},bottom:{value:new THREE.Color(0xe5e7d9)},warm:{value:0}},vertexShader:'varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}',fragmentShader:`varying vec3 wp;uniform vec3 top;uniform vec3 bottom;uniform float warm;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec3 d=normalize(wp);float h=max(d.y,0.);vec3 c=mix(bottom,top,pow(h,.65));vec2 uv=d.xz/(max(d.y,.12))*.85;float n=noise(uv)+.5*noise(uv*2.1)+.2*noise(uv*5.);float cloud=smoothstep(.74,1.25,n)*.35*pow(h,.25);c=mix(c,vec3(.94,.95,.91),cloud*(1.-warm*.55));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(210,32,16),skyMat);sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
 await new Promise(requestAnimationFrame);
 const tex=textures(renderer),architecture=buildArchitecture(tex);architecture.root.position.y=SITE.foundationY;scene.add(architecture.root);
 const landscape=buildLandscape(tex,lowPower);scene.add(landscape.root);
 const actor=makePerson({height:1.3,child:true,shirt:0xa66e4e,pants:0x45545a,hair:0x3f3028});actor.root.position.set(1.7,groundY(1.7,4.6),4.6);actor.root.rotation.y=-.55;scene.add(actor.root);
 const studio=new THREE.Group();studio.visible=false;scene.add(studio);const studioGround=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:0xe9e5d9,roughness:1}));studioGround.rotation.x=-Math.PI/2;studioGround.position.y=-.02;studioGround.receiveShadow=true;studio.add(studioGround);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),gr=sc.createRadialGradient(64,64,3,64,64,64);gr.addColorStop(0,'rgba(30,30,18,.5)');gr.addColorStop(.25,'rgba(30,30,18,.25)');gr.addColorStop(1,'rgba(30,30,18,0)');sc.fillStyle=gr;sc.fillRect(0,0,128,128);const contact=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=SITE.foundationY+.018;scene.add(contact);
 const targetRing=new THREE.Mesh(new THREE.RingGeometry(.16,.21,40),new THREE.MeshBasicMaterial({color:0xf5edce,side:THREE.DoubleSide,transparent:true,opacity:.75}));targetRing.rotation.x=-Math.PI/2;targetRing.visible=false;scene.add(targetRing);
 renderer.shadowMap.needsUpdate=true;

 let walk=false,tour=false,context=true,cutaway=false,transition=null,route=null,walkTarget=null,photoIndex=0,lastFocus=null;
 const foundationY=()=>context?SITE.foundationY:0;
 const towerPoint=(x,y,z)=>v(x,y+foundationY(),z);
 let idle=true,frame=0,time=0,last=performance.now(),shadowTime=0;
 const keys=new Set(),joy={x:0,y:0,id:null},zero=v(),lastPos=v();
 const state={camera:'home',context:true,cutaway:false,walk:false,tour:false};
 const home=()=>({p:v(innerWidth<700?18:19,innerWidth<700?11.5:12.4,innerWidth<700?25:27),t:towerPoint(innerWidth<700?.4:1.2,7.2,0)});
 const views={home,ground:()=>({p:v(9,1.8,16),t:towerPoint(0,7.2,0)}),balcony:()=>({p:towerPoint(5,13.15,7.6),t:towerPoint(0,11.85,1.1)}),top:()=>({p:v(.05,35,8),t:v(0,5,0)})};
 function tween(p,t,duration=1500){transition={start:performance.now(),duration:reduced?1:duration,from:camera.position.clone(),to:p.clone(),a:controls.target.clone(),b:t.clone()};controls.enabled=false;}
 function stopTour(){tour=false;state.tour=false;tourBtn.innerHTML=icon('play');pressed(tourBtn,false);}
 function setView(name){stopTour();stopWalk();state.camera=name;for(const [id,b]of Object.entries(viewButtons))pressed(b,id===name);const a=views[name]();tween(a.p,a.t);}
 function stopWalk(){if(!walk)return;walk=false;state.walk=false;if(route?.restoreCut&&cutaway)cutBtn.click();route=null;walkTarget=null;targetRing.visible=false;pressed(walkBtn,false);pressed(orbitBtn,true);$('joystick').classList.add('hidden');$('walk-actions').classList.add('hidden');controls.enablePan=true;controls.minDistance=3;controls.maxDistance=100;joy.x=joy.y=0;keys.clear();}
 function startWalk(){stopTour();walk=true;state.walk=true;pressed(walkBtn,true);pressed(orbitBtn,false);controls.enablePan=false;controls.minDistance=1.8;controls.maxDistance=15;actor.root.visible=true;$('joystick').classList.remove('hidden');$('walk-actions').classList.remove('hidden');for(const b of Object.values(viewButtons))pressed(b,false);const p=actor.root.position.clone();tween(p.clone().add(v(3,2.9,5.3)),p.clone().add(v(0,.9,0)),1000);announce('Marche : joystick, flèches, ZQSD ou WASD. Toucher le sol pour avancer.');}
 function returnGround(){route=null;actor.root.position.set(1.7,context?groundY(1.7,4.6):0,4.6);actor.root.rotation.y=-.55;if(walk)startWalk();else setView('home');}
 function ascend(){if(!walk)startWalk();if(route)return;transition=null;controls.enabled=true;walkTarget=null;targetRing.visible=false;const restoreCut=!cutaway;if(restoreCut)cutBtn.click();route={t:0,descending:actor.root.position.y>5,start:actor.root.position.clone(),restoreCut};announce(route.descending?'Descente.':'Montée vers le balcon.');}

 button('topbar','capture','camera','Enregistrer une image',capture,{glass:true});
 const downloadBtn=button('topbar','download','download','Télécharger',()=>{$('downloads').classList.toggle('hidden');pressed(downloadBtn,!$('downloads').classList.contains('hidden'));},{glass:true,pressed:false});
 button('topbar','fullscreen','fullscreen','Plein écran',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else document.body.classList.toggle('immersive');}catch{document.body.classList.toggle('immersive');}},{glass:true});
 const orbitBtn=button('rail','orbit','orbit','Tourner autour de la maquette',()=>{stopTour();if(walk){stopWalk();setView('home');}},{pressed:true});
 const walkBtn=button('rail','walk','walk','Déplacer le personnage',()=>{walk?setView('home'):startWalk();},{pressed:false});
 const divider=document.createElement('span');divider.className='separator';$('rail').appendChild(divider);
 const landscapeBtn=button('rail','landscape','tree','Paysage / maquette seule',()=>{const wasHigh=actor.root.position.y>5,oldBase=foundationY();context=!context;state.context=context;architecture.root.position.y=foundationY();contact.position.y=foundationY()+.018;if(wasHigh||route)actor.root.position.y+=foundationY()-oldBase;else actor.root.position.y=context?groundY(actor.root.position.x,actor.root.position.z):0;if(route){route.start.y+=foundationY()-oldBase;}walkTarget=null;targetRing.visible=false;landscape.root.visible=context;studio.visible=!context;actor.root.visible=context||walk;sky.visible=context;scene.background.set(context?0xcbd9d9:0xe5e4d8);scene.fog=context?new THREE.Fog(0xd6dece,65,180):null;pressed(landscapeBtn,context);renderer.shadowMap.needsUpdate=true;},{pressed:true});
 const cutBtn=button('rail','cutaway','cut','Voir l’escalier intérieur',()=>{cutaway=!cutaway;state.cutaway=cutaway;const plane=new THREE.Plane(v(0,0,-1),0);architecture.cladding.traverse(o=>{if(o.isMesh){o.material.clippingPlanes=cutaway?[plane]:[];o.material.clipShadows=true;o.material.needsUpdate=true;}});pressed(cutBtn,cutaway);renderer.shadowMap.needsUpdate=true;},{pressed:false});
 const sunBtn=button('rail','sun','sun','Changer la lumière',()=>{$('lighting').classList.toggle('hidden');pressed(sunBtn,!$('lighting').classList.contains('hidden'));},{pressed:false});
 const tourBtn=button('rail','tour','play','Parcours autour de la tour',()=>{if(tour){stopTour();return;}stopWalk();transition=null;controls.enabled=true;tour=true;state.tour=true;tourBtn.innerHTML=icon('pause');pressed(tourBtn,true);tourStart=performance.now();},{pressed:false});
 const viewButtons={};for(const [name,glyph,label]of [['home','home','Vue d’ensemble'],['ground','ground','Vue depuis le chemin'],['balcony','balcony','Voir le père et sa fille'],['top','top','Vue aérienne']])viewButtons[name]=button('dock','view-'+name,glyph,label,()=>setView(name),{pressed:name==='home'});
 button('corners','reset','reset','Revenir au point de départ',()=>{returnGround();setView('home');},{glass:true});button('corners','gallery-btn','gallery','Voir les photographies de référence',openGallery,{glass:true});
 button('downloads','save-image','camera','Image PNG',capture);button('downloads','save-glb','cube','Modèle 3D GLB',exportModel);button('downloads','save-html','file','Page complète utilisable hors ligne',downloadPage);button('downloads','show-reference','gallery','Photographies de référence',openGallery);
 $('lighting').innerHTML=icon('sun')+'<input type="range" min="0" max="100" value="25" id="sun-range" aria-label="Lumière : journée vers coucher du soleil">'+icon('moon');
 $('sun-range').addEventListener('input',e=>lighting(Number(e.target.value)/100));
 button('walk-actions','climb','balcony','Monter ou descendre',ascend,{glass:true});button('walk-actions','walk-reset','home','Revenir sur le chemin',returnGround,{glass:true});
 $('ui-toggle').innerHTML=icon('eye');$('ui-toggle').onclick=()=>{document.body.classList.toggle('immersive');pressed($('ui-toggle'),document.body.classList.contains('immersive'));};
 $('touch-cue').innerHTML=icon(mobile?'hand':'mouse');
 function lighting(t){sun.position.set(-28+50*t,36-29*t,20+13*t);sun.intensity=3.45-1.25*t;sun.color.setHSL(.115-.06*t,.25+.40*t,.87);hemi.intensity=2-.7*t;fill.intensity=.45;renderer.toneMappingExposure=1.05+t*.13;skyMat.uniforms.warm.value=t;skyMat.uniforms.top.value.setHSL(.55-.06*t,.15+.07*t,.72-.13*t);skyMat.uniforms.bottom.value.setHSL(.17-.08*t,.12+.24*t,.85-.04*t);renderer.shadowMap.needsUpdate=true;}
 lighting(.25);

 const hotspots=[{point:v(0,1.45,1.44),label:'Entrée de la tour',action:()=>walk?ascend():setView('ground')},{point:v(.1,12.4,2.5),label:'Balcon',action:()=>walk?ascend():setView('balcony')}].map(h=>{const b=document.createElement('button');b.className='hotspot ui';b.setAttribute('aria-label',h.label);b.addEventListener('click',h.action);document.body.appendChild(b);return {...h,button:b};});
 const projected=v(),camDir=v();function updateHotspots(){for(const h of hotspots){const point=h.point.clone();point.y+=foundationY();projected.copy(point).project(camera);camDir.copy(camera.position).sub(point);const visible=camDir.z>1&&projected.z<1&&projected.z>-1&&!walk&&!tour&&camera.position.distanceTo(point)<60;h.button.style.display=visible?'block':'none';if(visible){h.button.style.left=(projected.x*.5+.5)*innerWidth+'px';h.button.style.top=(-projected.y*.5+.5)*innerHeight+'px';}}}

 // Gallery has no captions; accessible names retain the reference information.
 $('gallery-close').innerHTML=icon('close');$('gallery-prev').innerHTML=icon('left');$('gallery-next').innerHTML=icon('right');
 photos.forEach((p,i)=>{const b=document.createElement('button');b.className='dot';b.setAttribute('aria-label',p.alt);b.onclick=()=>showPhoto(i);$('gallery-dots').appendChild(b);});
 function showPhoto(index){photoIndex=(index+photos.length)%photos.length;$('gallery-image').src=photos[photoIndex].src;$('gallery-image').alt=photos[photoIndex].alt;[...$('gallery-dots').children].forEach((b,i)=>b.classList.toggle('selected',i===photoIndex));}
 function openGallery(){lastFocus=document.activeElement;stopTour();$('gallery').classList.remove('hidden');showPhoto(photoIndex);$('gallery-close').focus();keys.clear();}
 function closeGallery(){$('gallery').classList.add('hidden');lastFocus?.focus();}
 $('gallery-close').onclick=closeGallery;$('gallery-prev').onclick=()=>showPhoto(photoIndex-1);$('gallery-next').onclick=()=>showPhoto(photoIndex+1);$('gallery').onclick=e=>{if(e.target===$('gallery'))closeGallery();};

 async function capture(){const b=$('capture');b.disabled=true;try{renderer.render(scene,camera);const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const c=out.getContext('2d');c.drawImage(canvas,0,0);const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)throw new Error('Image indisponible');saveBlob(blob,'Pedro.png');$('flash').classList.add('on');setTimeout(()=>$('flash').classList.remove('on'),90);announce('Image enregistrée.');}catch{announce('L’image n’a pas pu être enregistrée. Réessaye.');}finally{b.disabled=false;}}
 async function exportModel(){const b=$('save-glb');b.disabled=true;try{const exportRoot=architecture.root.clone(true);exportRoot.position.set(0,0,0);const buffer=await new GLTFExporter().parseAsync(exportRoot,{binary:true,onlyVisible:true,maxTextureSize:512});saveBlob(new Blob([buffer],{type:'model/gltf-binary'}),'Pedro.glb');announce('Modèle 3D exporté.');}catch(e){announce('L’export 3D a échoué. Réessaye.');console.error('GLB export',e);}finally{b.disabled=false;}}
 async function downloadPage(){const b=$('save-html');b.disabled=true;try{const offlinePhotos=await Promise.all(photos.map(async p=>{if(p.src.startsWith('data:'))return p;const response=await fetch(p.src);if(!response.ok)throw new Error('Photo indisponible');const blob=await response.blob();const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});return {...p,src};}));const html=document.documentElement.cloneNode(true);for(const id of ['topbar','rail','dock','corners','downloads','lighting','walk-actions','gallery-dots'])html.querySelector('#'+id).innerHTML='';for(const h of html.querySelectorAll('.hotspot,.boot-error'))h.remove();html.querySelector('#gallery-image').removeAttribute('src');html.querySelector('#status').textContent='';html.querySelector('#loader').className='loader';html.querySelector('#loader').removeAttribute('style');for(const id of ['downloads','lighting','gallery','joystick','walk-actions'])html.querySelector('#'+id).classList.add('hidden');html.querySelector('body').classList.remove('immersive');const canvas=html.querySelector('#scene');canvas.removeAttribute('style');canvas.removeAttribute('width');canvas.removeAttribute('height');html.querySelector('#photo-data')?.remove();const photoData=document.createElement('script');photoData.id='photo-data';photoData.type='application/json';photoData.textContent=JSON.stringify(offlinePhotos).replaceAll('<','\\u003c');html.querySelector('body').prepend(photoData);saveBlob(new Blob(['<!doctype html>\n'+html.outerHTML],{type:'text/html;charset=utf-8'}),'Pedro-3D.html');announce('Page autonome téléchargée.');}catch{announce('Téléchargement indisponible. Réessaye avec une connexion.');}finally{b.disabled=false;}}

 // Orbit, click-to-walk, and mobile joystick all share one movement controller.
 let pointerStart=null,dragging=false,tourStart=0;
 controls.addEventListener('start',()=>{idle=false;if(tour)stopTour();transition=null;controls.enabled=true;$('touch-cue').style.display='none';});
 canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,t:performance.now()};dragging=false;});
 canvas.addEventListener('pointermove',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7)dragging=true;});
 const ray=new THREE.Raycaster();
 canvas.addEventListener('pointerup',e=>{if(walk&&!route&&!dragging&&pointerStart&&performance.now()-pointerStart.t<500){ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),camera);const hits=ray.intersectObject(context?landscape.terrain:studioGround);if(hits.length){const p=hits[0].point;if(actor.root.position.y>5){if(p.distanceTo(actor.root.position)>2)ascend();}else if(Math.hypot(p.x,p.z)>1.7){walkTarget=p.clone();targetRing.position.set(p.x,(context?groundY(p.x,p.z):0)+.055,p.z);targetRing.visible=true;}}}pointerStart=null;});
 canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
 const stick=$('joystick').querySelector('.stick');
 function updateJoy(e){const r=$('joystick').getBoundingClientRect(),limit=r.width*.32;let x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),len=Math.hypot(x,y);if(len>limit){x*=limit/len;y*=limit/len;}joy.x=x/limit;joy.y=-y/limit;stick.style.transform=`translate(${x}px,${y}px)`;walkTarget=null;targetRing.visible=false;}
 $('joystick').addEventListener('pointerdown',e=>{e.preventDefault();joy.id=e.pointerId;$('joystick').setPointerCapture(e.pointerId);updateJoy(e);});
 $('joystick').addEventListener('pointermove',e=>{if(joy.id===e.pointerId){e.preventDefault();updateJoy(e);}});
 const releaseJoy=()=>{joy.id=null;joy.x=joy.y=0;stick.style.transform='';};for(const event of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(event,releaseJoy);
 const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyZ','KeyQ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
 window.addEventListener('keydown',e=>{
  if(!$('gallery').classList.contains('hidden')){if(e.key==='Escape')closeGallery();if(e.key==='ArrowRight')showPhoto(photoIndex+1);if(e.key==='ArrowLeft')showPhoto(photoIndex-1);if(e.key==='Tab'){const items=[...$('gallery').querySelectorAll('button')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
  if(e.target instanceof HTMLInputElement)return;
  if(e.key==='Escape'){document.body.classList.remove('immersive');$('downloads').classList.add('hidden');$('lighting').classList.add('hidden');if(walk)setView('home');stopTour();}
  if(walk&&movementKeys.has(e.code)){e.preventDefault();keys.add(e.code);walkTarget=null;targetRing.visible=false;}if(e.code==='KeyE'&&walk)ascend();
 });
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();releaseJoy();});document.addEventListener('visibilitychange',()=>{keys.clear();releaseJoy();last=performance.now();});

 function canWalk(x,z){if(context&&!landscape.allowsWalking(x,z))return false;if(Math.abs(x)>58||Math.abs(z)>52)return false;if(Math.hypot(x,z)<1.58)return false;if(Math.hypot(x-8,z+3)<.55)return false;if(x>22.3&&x<31.8&&z>-12.5&&z<.4)return false;return true;}
 const direction=v(),forward=v(),side=v(),desired=v(),delta=v();
 function walkUpdate(dt,now){let speed=0;lastPos.copy(actor.root.position);
  if(route){
   route.t+=dt;const t=route.t;
   const total=20;
   if(t<2){const p=route.descending?towerPoint(0,SPEC.balconyY,1.7):towerPoint(0,.12,1.15);actor.root.position.lerpVectors(route.start,p,Math.min(t/2,1));actor.root.rotation.y=route.descending?Math.PI:Math.PI;}
   else if(t<18){let f=(t-2)/16;if(route.descending)f=1-f;const a=Math.PI/2-6*Math.PI*f;actor.root.position.set(Math.cos(a)*.8,foundationY()+.17+f*(SPEC.balconyY-.17),Math.sin(a)*.8);actor.root.rotation.y=-a+(route.descending?Math.PI:0);}
   else{const p=route.descending?towerPoint(0,.12,1.15):towerPoint(0,SPEC.balconyY,1.15);const q=route.descending?v(0,context?groundY(0,3.3):0,3.3):towerPoint(.02,SPEC.balconyY,1.9);actor.root.position.lerpVectors(p,q,Math.min((t-18)/2,1));actor.root.rotation.y=0;}
   speed=1.2;
   const target=actor.root.position.clone().add(v(0,.9,0));const offset=v(3.4,2.0,5.2);controls.target.lerp(target,1-Math.exp(-dt*4));camera.position.lerp(target.clone().add(offset),1-Math.exp(-dt*2));
   if(t>=total){const restore=route.restoreCut;route=null;if(restore)cutBtn.click();renderer.shadowMap.needsUpdate=true;announce(actor.root.position.y>5?'Balcon atteint.':'Retour au chemin.');}
  }else if(walk&&!transition){
   let x=joy.x,y=joy.y;if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;if(keys.has('KeyA')||keys.has('KeyQ')||keys.has('ArrowLeft'))x-=1;if(keys.has('KeyW')||keys.has('KeyZ')||keys.has('ArrowUp'))y+=1;if(keys.has('KeyS')||keys.has('ArrowDown'))y-=1;
   forward.copy(controls.target).sub(camera.position);forward.y=0;forward.normalize();side.crossVectors(forward,v(0,1,0));direction.copy(forward).multiplyScalar(y).addScaledVector(side,x);
   if(walkTarget){direction.copy(walkTarget).sub(actor.root.position);direction.y=0;if(direction.length()<.13){walkTarget=null;direction.set(0,0,0);targetRing.visible=false;}else direction.normalize();}
   const amount=Math.min(direction.length(),1);if(amount>.05){direction.normalize();speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3:1.65)*amount;desired.copy(actor.root.position).addScaledVector(direction,speed*dt);
    if(actor.root.position.y>5){const r=Math.hypot(desired.x,desired.z);if(r>1.4&&r<2.08&&desired.z>.35){actor.root.position.copy(desired);actor.root.position.y=foundationY()+SPEC.balconyY;}else speed=0;
    }else if(canWalk(desired.x,desired.z)){actor.root.position.copy(desired);actor.root.position.y=context?groundY(desired.x,desired.z):0;}else{speed=0;walkTarget=null;targetRing.visible=false;}
    const a=Math.atan2(direction.x,direction.z);actor.root.rotation.y+=Math.atan2(Math.sin(a-actor.root.rotation.y),Math.cos(a-actor.root.rotation.y))*(1-Math.exp(-dt*12));
   }
   delta.copy(actor.root.position).sub(lastPos);camera.position.add(delta);controls.target.lerp(actor.root.position.clone().add(v(0,.9,0)),1-Math.exp(-dt*8));
  }
  actor.update(now,speed);return speed;
 }

 function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<700?44:38;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.6:2));renderer.shadowMap.needsUpdate=true;}
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();showError('La scène a été interrompue. Recharge-la pour continuer.');});
 let stopped=false;
 function tick(now){if(stopped)return;requestAnimationFrame(tick);if(document.hidden){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;frame++;
  if(transition){const t=clamp((now-transition.start)/transition.duration,0,1),e=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.a,transition.b,e);if(t>=1){transition=null;controls.enabled=true;}}
  if(tour){const t=(now-tourStart)/1000,a=.62+t*.12;const r=25+Math.sin(t*.16)*4;camera.position.set(Math.sin(a)*r,11.5+Math.sin(t*.17)*6,Math.cos(a)*r);controls.target.set(0,foundationY()+7.2+Math.sin(t*.12),0);}
  const speed=walkUpdate(dt,time);for(const p of architecture.people)p.update(time,0);
  if(!reduced)for(const tree of landscape.trees){tree.rotation.z=Math.sin(time*.42+tree.userData.sway)*.0012;}
  if(!transition&&!tour&&!route)controls.update();else camera.lookAt(controls.target);
  camera.position.y=Math.max(camera.position.y,(context?groundY(camera.position.x,camera.position.z):0)+.28);
  if(walk&&speed>.01&&time-shadowTime>.25){renderer.shadowMap.needsUpdate=true;shadowTime=time;}
  if(frame%3===0){updateHotspots();$('compass').style.transform=`rotate(${-controls.getAzimuthalAngle()}rad)`;}
  renderer.render(scene,camera);
 }
 const initial=home();camera.position.copy(initial.p);controls.target.copy(initial.t);controls.update();renderer.render(scene,camera);$('loader').classList.add('done');setTimeout(()=>$('loader').style.display='none',750);requestAnimationFrame(tick);
 // Read-only diagnostics for future maintenance and numerical validation.
 window.__PEDRO__={get state(){return {...state,position:actor.root.position.toArray(),renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}};},spec:SPEC};
}
function showError(message){$('loader').style.display='none';const old=document.querySelector('.boot-error');old?.remove();const d=document.createElement('div');d.className='boot-error';const p=document.createElement('p');p.textContent=message;const b=document.createElement('button');b.textContent='Recharger';b.onclick=()=>location.reload();d.append(p,b);document.body.appendChild(d);}
main().catch(e=>{console.error(e);showError('La scène n’a pas pu démarrer. Recharge la page pour réessayer.');});
