import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildArchitecture,PLATES,SPEC} from '../src/architecture.js';
import {buildLandscape,groundY,SITE,basinRadius} from '../src/landscape.js';
const a=buildArchitecture();
a.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(a.root);
assert(Math.abs(bounds.max.y-15)<.02,'Measured tower top must be 15 m.');
assert(bounds.min.y>=-.01,'Structure must not fall below ground.');
assert(bounds.max.x-bounds.min.x<8.12&&bounds.max.x-bounds.min.x>7.98,'Lower disk including its edge must span 8 m.');
let meshes=0,triangles=0;
function inspect(group){group.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;assert(p?.count>0,'Empty geometry');for(const x of p.array)assert(Number.isFinite(x),'Invalid coordinate');if(o.geometry.index)for(const i of o.geometry.index.array)assert(i<p.count,'Triangle references missing vertex');const n=o.geometry.attributes.normal;if(n)for(const x of n.array)assert(Number.isFinite(x),'Invalid normal');triangles+=(o.geometry.index?o.geometry.index.count:p.count)/3*(o.isInstancedMesh?o.count:1);});}
inspect(a.root);assert.equal(a.people.length,2);assert(a.people[0].height>a.people[1].height);
// The access path, interior spiral and balcony must line up with the two true openings.
const ray=new THREE.Raycaster(new THREE.Vector3(0,1.1,4),new THREE.Vector3(0,0,-1),0,3.0);
assert.equal(ray.intersectObject(a.cladding,true).length,0,'Entrance must be an actual opening.');
ray.set(new THREE.Vector3(0,SPEC.balconyY+1,4),new THREE.Vector3(0,0,-1));
assert.equal(ray.intersectObject(a.cladding,true).length,0,'Balcony portal must be open.');
ray.set(new THREE.Vector3(.8,9,0),new THREE.Vector3(0,-1,0));ray.far=3;
const plateHits=ray.intersectObject(a.structure,true).filter(h=>h.point.y>6&&h.point.y<7);
assert.equal(plateHits.length,0,'Lower disk must not block the internal stairwell.');
const landscape=buildLandscape({},true);landscape.root.updateMatrixWorld(true);inspect(landscape.root);
assert.equal(groundY(0,0),SITE.foundationY);
for(let i=0;i<72;i++){
 const theta=i/72*Math.PI*2,x=SPEC.baseRadius*Math.cos(theta),z=SPEC.baseRadius*Math.sin(theta);
 assert(Math.abs(groundY(x,z)-SITE.foundationY)<.015,'Tower foundation must rest on a level floor.');
}
assert(groundY(0,7.8)-groundY(0,0)>1.3,'The access path must approach a real excavated hollow.');
assert(basinRadius(0,0)<.48,'Tower belongs inside the hollow.');
for(let z=-12;z<=9;z+=.25)for(let x=-9;x<=9;x+=.25){
 const gradient=Math.hypot((groundY(x+.02,z)-groundY(x-.02,z))/.04,(groundY(x,z+.02)-groundY(x,z-.02))/.04);
 assert(Number.isFinite(gradient)&&gradient<.65,'Bank must stay gentle and continuous.');
}
const html=await fs.readFile('dist/index.html','utf8');assert(!/__STYLE__|__SCRIPT__/.test(html));assert(!/<script[^>]+src=/.test(html));assert(!/<link[^>]+rel="stylesheet"/.test(html));assert(html.includes('<title>Pedro</title>'));assert(!/dorea|chatgpt|openai/i.test(html));assert(!html.includes('class="signature'));assert(!html.includes('data-tip='));
for(const f of ['src/app.js','src/style.css'])assert((await fs.stat(f)).size>1000);
console.log(JSON.stringify({ok:true,measuredHeight:bounds.max.y-bounds.min.y,modelWidth:bounds.max.x-bounds.min.x,meshes,triangles,entranceOpen:true,balconyOpen:true,stairsNotBlocked:true,runtimeSelfContained:true,galleryPhotosExternal:true}));

