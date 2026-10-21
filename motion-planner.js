import * as T from 'three';
import {normalizeTarget} from './robot-config.js';
import {selfContacts} from './kinematics.js';
function angularError(target,current){const q=target.clone().multiply(current.clone().invert());if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const length=Math.hypot(q.x,q.y,q.z);return length<1e-9?new T.Vector3():new T.Vector3(q.x,q.y,q.z).multiplyScalar(2*Math.atan2(length,q.w)/length)}
function solveMatrix(a,b){const m=a.map((r,i)=>[...r,b[i]]);for(let i=0;i<b.length;i++){let pivot=i;for(let j=i+1;j<b.length;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;[m[i],m[pivot]]=[m[pivot],m[i]];if(Math.abs(m[i][i])<1e-12)return null;const scale=m[i][i];for(let k=i;k<=b.length;k++)m[i][k]/=scale;for(let j=0;j<b.length;j++)if(j!==i){const f=m[j][i];for(let k=i;k<=b.length;k++)m[j][k]-=f*m[i][k]}}return m.map(r=>r[b.length])}
export function solveToolPose(arm,current,xyz,rpy){
 if(!rpy)return arm.solve(...xyz);
 if(xyz.length!==3||rpy.length!==3||![...xyz,...rpy].every(Number.isFinite)||xyz[1]<.02)throw Error('Enter finite coordinates and orientation above the table.');
 const saved=[...current],target=new T.Vector3(...xyz),rotation=new T.Quaternion().setFromEuler(new T.Euler(...rpy.map(T.MathUtils.degToRad),'XYZ'));let best=null,bestScore=Infinity;
 const error=()=>{const p=target.clone().sub(arm.position()),r=angularError(rotation,arm.tip.getWorldQuaternion(new T.Quaternion()));return [p.x*4,p.y*4,p.z*4,r.x*.5,r.y*.5,r.z*.5]};
 try{let positionSeed;try{positionSeed=arm.solve(...xyz)}catch{positionSeed=saved}
 for(const seed of [positionSeed,saved,...[45,-45,90,-90].map(v=>positionSeed.map((a,i)=>i===3||i===5?T.MathUtils.clamp(a+v,arm.specs[i].min,arm.specs[i].max):a))]){
  let values=[...seed];arm.pose(values);
  for(let iter=0;iter<180;iter++){
   const e=error(),score=e.reduce((s,v)=>s+v*v,0);if(score<bestScore){bestScore=score;best=[...values]}
   if(arm.position().distanceTo(target)<.003&&angularError(rotation,arm.tip.getWorldQuaternion(new T.Quaternion())).length()<.035){const result=normalizeTarget(values,arm.specs);arm.pose(result);if(arm.position().distanceTo(target)<.005&&angularError(rotation,arm.tip.getWorldQuaternion(new T.Quaternion())).length()<.05)return result}
   const columns=[];for(let j=0;j<6;j++){const v=[...values],delta=values[j]+.2<=arm.specs[j].max ? .2 : -.2;v[j]+=delta;arm.pose(v);const next=error();columns.push(next.map((x,i)=>(x-e[i])/delta))}arm.pose(values);
   const a=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>columns.reduce((s,c)=>s+c[i]*c[j],0)+(i===j?1e-6:0))),y=solveMatrix(a,e);if(!y)break;
   values=values.map((v,j)=>T.MathUtils.clamp(v-T.MathUtils.clamp(columns[j].reduce((s,x,i)=>s+x*y[i],0),-8,8),arm.specs[j].min,arm.specs[j].max));arm.pose(values);
  }
 }
 throw Error('That position and orientation cannot be reached within joint limits. Try a different wrist angle or unlock orientation.');
 }finally{arm.pose(saved)}
}
export function collisionReport(arm,objects=[],held=null){
 const warnings=selfContacts(arm),points=arm.joints.map(j=>j.getWorldPosition(new T.Vector3()));points.push(arm.position());
 if(points.slice(1).some(p=>p.y<.005))warnings.push('Arm crosses the table');
 const boxes=arm.colliders?.filter(m=>!/^gripper|link_6/.test(m.parent.name)).map(m=>new T.Box3().setFromObject(m))??[];
 for(const o of objects){if(o===held)continue;const center=o.getWorldPosition(new T.Vector3()),radius=o.userData.radius??.075;
  if(o.userData.fixed){const obstacle=new T.Box3().setFromObject(o);if(boxes.some(b=>b.intersectsBox(obstacle)))warnings.push(`Fixture contact: ${o.userData.name??o.userData.id}`)}
  else if(boxes.some(b=>b.distanceToPoint(center)<radius))warnings.push(`Object contact: ${o.userData.name??o.userData.id}`);
 }
 return [...new Set(warnings)];
}
export function sampleJointPath(arm,start,target,objects=[],held=null){
 normalizeTarget(start,arm.specs);normalizeTarget(target,arm.specs);const count=Math.max(2,Math.min(180,Math.ceil(Math.max(...target.map((v,i)=>Math.abs(v-start[i])))/2)));const samples=[];
 try{for(let i=0;i<=count;i++){const t=i/count,angles=start.map((v,j)=>v+(target[j]-v)*t);arm.pose(angles);samples.push({angles,xyz:arm.position().toArray(),warnings:collisionReport(arm,objects,held)})}}finally{arm.pose(start)}
 return {samples,firstUnsafe:samples.findIndex(s=>s.warnings.length>0)};
}
export function planLinearPath(arm,current,xyz,rpy,step=.015){
 const saved=[...current],from=arm.position(),to=new T.Vector3(...xyz),count=Math.max(2,Math.ceil(from.distanceTo(to)/step));if(count>160)throw Error('Straight-line move exceeds the planning limit.');const poses=[];let angles=[...current];
 try{for(let i=1;i<=count;i++){const p=from.clone().lerp(to,i/count);angles=solveToolPose(arm,angles,p.toArray(),rpy);arm.pose(angles);poses.push([...angles])}return poses}finally{arm.pose(saved)}
}
