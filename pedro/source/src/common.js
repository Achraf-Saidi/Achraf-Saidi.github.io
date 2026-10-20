import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };
export const TAU=Math.PI*2;
export const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export const clamp=THREE.MathUtils.clamp;
export function rng(seed=18){let n=seed;return()=>{n=(Math.imul(1664525,n)+1013904223)|0;return(n>>>0)/4294967296;};}
export function mat(color,roughness=.8,extra={}){return new THREE.MeshStandardMaterial({color,roughness,...extra});}
export function mesh(geo,material,parent,pos){const o=new THREE.Mesh(geo,material);if(pos)o.position.copy(pos);o.castShadow=true;o.receiveShadow=true;if(parent)parent.add(o);return o;}
export function box(parent,w,h,d,material,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,v(x,y,z));}
export function beam(parent,a,b,r,material,r2=r,segments=7){const d=b.clone().sub(a);const o=mesh(new THREE.CylinderGeometry(r2,r,d.length(),segments),material,parent,a.clone().add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;}
export function tube(parent,pts,r,material,segments=80){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),segments,r,6,false),material,parent);}
export function arcPoints(radius,y,from,to,n=80){return Array.from({length:n+1},(_,i)=>{const a=from+(to-from)*i/n;return v(Math.cos(a)*radius,y,Math.sin(a)*radius);});}
export function mergeStatic(group){const batches=new Map();group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert();const children=[];group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&!o.userData.dynamic){const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow; if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);children.push(o);}});for(const list of batches.values()){const indexed=list.every(o=>o.geometry.index);const geometries=list.map(o=>(!indexed&&o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));const geo=mergeGeometries(geometries,false);if(!geo)continue;const o=new THREE.Mesh(geo,list[0].material);o.castShadow=list[0].castShadow;o.receiveShadow=list[0].receiveShadow;group.add(o);for(const old of list)old.removeFromParent();for(const g of geometries)g.dispose();}}
export function instanced(parent,geometry,material,count,configure){const o=new THREE.InstancedMesh(geometry,material,count);const tmp=new THREE.Object3D();for(let i=0;i<count;i++){tmp.position.set(0,0,0);tmp.rotation.set(0,0,0);tmp.scale.set(1,1,1);configure(tmp,i,o);tmp.updateMatrix();o.setMatrixAt(i,tmp.matrix);}o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;o.castShadow=true;o.receiveShadow=true;o.computeBoundingSphere();parent.add(o);return o;}

