import * as T from 'three';
import {jointSpecs} from './robot-config.js';
import {solvePosition} from './kinematics.js';
let source=null,buffers=null;
export async function loadThor(){
 if(source)return;
 const response=await fetch('./assets/thor/model.json');if(!response.ok)throw Error('Thor model manifest is unavailable.');
 const data=await response.json(),entries=await Promise.all(Object.keys(data.meshes).map(async name=>{const r=await fetch(`./assets/thor/${name}.bin`);if(!r.ok)throw Error(`Missing Thor mesh: ${name}`);return [name,await r.arrayBuffer()]}));
 buffers=Object.fromEntries(entries);source=data;
}
export function makeThor(config){
 if(!source)throw Error('Thor assets have not loaded.');
 const root=new T.Group();root.rotation.x=-Math.PI/2;
 const links=Object.fromEntries(source.links.map(l=>[l.name,new T.Group()])),pivots={},joints=[],fingers=[];
 root.add(links.world);
 for(const j of source.joints){const origin=new T.Group();origin.position.fromArray(j.xyz);origin.rotation.set(...j.rpy,'ZYX');links[j.parent].add(origin);const pivot=new T.Group();pivot.userData.axis=new T.Vector3(...j.axis);origin.add(pivot);pivot.add(links[j.child]);pivots[j.name]=pivot;if(/^joint_[1-6]$/.test(j.name))joints.push(pivot);else if(j.type==='revolute')fingers.push({pivot,definition:j})}
 const colliders=[];
 for(const l of source.links){const link=links[l.name];link.name=l.name;
  if(l.visual){const visual=new T.Group();visual.position.fromArray(l.visual.xyz);visual.rotation.set(...l.visual.rpy,'ZYX');visual.scale.setScalar(.001);link.add(visual);
   for(const d of source.meshes[l.visual.mesh]){const data=buffers[l.visual.mesh],geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(data.slice(d.offset,d.offset+d.vertices*12)),3));geometry.setIndex(new T.BufferAttribute(new Uint32Array(data.slice(d.offset+d.vertices*12,d.offset+d.vertices*12+d.indices*4)),1));geometry.computeVertexNormals();const material=new T.MeshStandardMaterial({color:new T.Color(...d.color),roughness:.48,metalness:.12});const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;visual.add(mesh)}
  }
  for(const c of l.collisions){const geometry=c.type==='box'?new T.BoxGeometry(...c.size):c.type==='sphere'?new T.SphereGeometry(c.radius,12,8):new T.CylinderGeometry(c.radius,c.radius,c.length,12);if(c.type==='cylinder')geometry.rotateX(Math.PI/2);const m=new T.Mesh(geometry,new T.MeshBasicMaterial({visible:false}));m.position.fromArray(c.xyz);m.rotation.set(...c.rpy,'ZYX');link.add(m);colliders.push(m)}
 }
 const specs=jointSpecs(config);
 let angles=[0,-25,65,0,35,0];const tip=links.gripper_mid_point;
 function pose(values){angles=[...values];joints.forEach((j,i)=>j.quaternion.setFromAxisAngle(j.userData.axis,T.MathUtils.degToRad(values[i])));root.updateWorldMatrix(true,true)}
 function position(){root.updateWorldMatrix(true,true);return tip.getWorldPosition(new T.Vector3())}
 function grip(closed){const primary=closed?-.12:-.8;for(const {pivot,definition:j} of fingers){const value=j.mimic?primary*Number(j.mimic.multiplier??1):primary;pivot.quaternion.setFromAxisAngle(pivot.userData.axis,value)}root.updateWorldMatrix(true,true)}
 pose(angles);grip(false);
 return {root,joints,tip,specs,pose,position,solve:(x,y,z)=>solvePosition({joints,specs,pose,position,angles:()=>angles},x,y,z),home:[...angles],grip,collisionRadius:.023,colliders,reach:.589,shoulderHeight:.202,dispose(){root.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}};
}
