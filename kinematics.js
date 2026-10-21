import * as T from 'three';
export function solvePosition({joints,specs,pose,position,angles},x,y,z) {
 if(![x,y,z].every(Number.isFinite)||y<.02)throw Error('Target must be finite and above the table.');
 const saved=[...angles()],target=new T.Vector3(x,y,z);let best=[...saved],distance=Infinity,values=[...saved];
 try{for(let pass=0;pass<9;pass++){
  values=pass===0?[...saved]:specs.map((s,i)=>T.MathUtils.clamp(i===0?Math.atan2(x,z)*180/Math.PI+(pass>4?180:0):(i===1?(pass%2?25:-25):i===2?(pass%2?65:-65):i===4?(pass%3?45:-45):0),s.min,s.max));pose(values);
  for(let iter=0;iter<200;iter++){
   for(let i=5;i>=0;i--){const j=joints[i],origin=j.getWorldPosition(new T.Vector3()),q=j.parent.getWorldQuaternion(new T.Quaternion());const axis=(typeof j.userData.axis==='string'?new T.Vector3(j.userData.axis==='x'?1:0,j.userData.axis==='y'?1:0,j.userData.axis==='z'?1:0):j.userData.axis.clone()).applyQuaternion(q);const a=position().sub(origin),b=target.clone().sub(origin);a.addScaledVector(axis,-a.dot(axis));b.addScaledVector(axis,-b.dot(axis));if(a.lengthSq()<1e-12||b.lengthSq()<1e-12)continue;a.normalize();b.normalize();values[i]=T.MathUtils.clamp(values[i]+Math.atan2(axis.dot(a.clone().cross(b)),a.dot(b))*180/Math.PI,specs[i].min,specs[i].max);pose(values)}
   const error=position().distanceTo(target);if(error<distance){distance=error;best=[...values]}if(error<.002)break;
  }if(distance<.002)break;
 }}finally{pose(saved)}
 if(distance>.01)throw Error(`Target unreachable: closest solution is ${Math.round(distance*1000)} mm away. Change coordinates or joint limits.`);
 return best;
}
// Conservative centerline capsules. Adjacent joints intentionally share hardware.
export function selfContacts(arm){
 const points=arm.joints.map(j=>j.getWorldPosition(new T.Vector3()));points.push(arm.position());const warnings=[];
 for(let i=0;i<points.length-1;i++)for(let j=i+3;j<points.length-1;j++){
  if(points[i].distanceTo(points[i+1])<.025||points[j].distanceTo(points[j+1])<.025)continue;
  let distance=Infinity;
  const b=new T.Line3(points[j],points[j+1]);for(let n=0;n<=12;n++){const p=points[i].clone().lerp(points[i+1],n/12);distance=Math.min(distance,p.distanceTo(b.closestPointToPoint(p,true,new T.Vector3())))}
  if(distance<(arm.collisionRadius??.025)*2)warnings.push(`Links ${i+1} and ${j+1} may intersect`);
 }
 return warnings;
}
