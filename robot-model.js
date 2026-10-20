import * as T from 'three';
import {jointSpecs, normalizeTarget, MOTORS} from './robot-config.js';
export function makeRobot(config) {
  const root=new T.Group(), joints=[], fingers=[], specs=jointSpecs(config);
  const mat=(color,metalness=.2)=>new T.MeshStandardMaterial({color,metalness,roughness:.38});
  const green=mat('#c2e99c'), dark=mat('#353f46',.65), silver=mat('#a2adb0',.75);
  const d=Object.fromEntries(Object.entries(config.dimensions).map(([k,v])=>[k,v/1000]));
  function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  const box=(w,h,z,m,p,x=0,y=0)=>mesh(new T.BoxGeometry(w,h,z),m,p,x,y);
  const cyl=(r,h,m,p,y=0)=>mesh(new T.CylinderGeometry(r,r,h,32),m,p,0,y);
  function joint(parent,y,axis){const j=new T.Group();j.position.y=y;j.userData.axis=axis;parent.add(j);joints.push(j);return j}
  function bearing(parent,index,r){const size=MOTORS[config.motors[index].type].size;r*=size;const c=cyl(r,d.thickness*1.4,dark,parent);c.rotation.x=Math.PI/2;const cap=cyl(r*.58,d.thickness*1.45,silver,parent);cap.rotation.x=Math.PI/2;
    if(config.motors[index].type==='stepper')box(r*1.8,r*1.8,d.thickness,dark,parent,0,-r*.15);
  }
  cyl(.25,.09,dark,root,.045);const j1=joint(root,.1,'y');cyl(.16,d.base-.1,green,j1,(d.base-.1)/2);
  const j2=joint(j1,d.base-.1,'z');bearing(j2,1,.12);box(d.thickness,d.upper,d.thickness*1.2,green,j2,0,d.upper/2);box(d.thickness*.35,d.upper*.8,d.thickness*1.23,dark,j2,0,d.upper/2);
  const j3=joint(j2,d.upper,'z');bearing(j3,2,.105);box(d.thickness*.9,d.forearm,d.thickness,green,j3,0,d.forearm/2);
  const j4=joint(j3,d.forearm,'y');cyl(.09,.13,dark,j4,.065);const j5=joint(j4,.13,'z');bearing(j5,4,.075);box(d.thickness*.7,d.wrist,d.thickness*.7,green,j5,0,d.wrist/2);
  const j6=joint(j5,d.wrist,'y');cyl(.068,d.tool*.42,silver,j6,d.tool*.21);box(.22,.055,.09,dark,j6,0,d.tool*.48);
  fingers.push(box(.035,d.tool*.58,.065,silver,j6,-.09,d.tool*.79),box(.035,d.tool*.58,.065,silver,j6,.09,d.tool*.79));
  const tip=new T.Object3D();tip.position.y=d.tool;j6.add(tip);
  let angles=[0,-35,85,0,40,0].map((a,i)=>T.MathUtils.clamp(a,specs[i].min,specs[i].max));
  function pose(values){angles=[...values];joints.forEach((j,i)=>j.rotation[j.userData.axis]=T.MathUtils.degToRad(angles[i]));root.updateWorldMatrix(true,true)}
  function position(){root.updateWorldMatrix(true,true);return tip.getWorldPosition(new T.Vector3())}
  function solve(x,y,z){if(![x,y,z].every(Number.isFinite)||y<.06)throw Error('Target must be finite and above the table.');const saved=[...angles],target=new T.Vector3(x,y,z);let best=[...angles],distance=Infinity;
    try {for(let pass=0;pass<4;pass++){pose((pass===0?saved:[Math.atan2(z,-x)*180/Math.PI,pass===1?-45:45,pass===1?90:-90,0,pass===3?-70:45,0]).map((a,i)=>T.MathUtils.clamp(a,specs[i].min,specs[i].max)));
      for(let iter=0;iter<240;iter++){for(let i=5;i>=0;i--){const j=joints[i],origin=j.getWorldPosition(new T.Vector3()),q=j.parent.getWorldQuaternion(new T.Quaternion()),axis=new T.Vector3(0,j.userData.axis==='y'?1:0,j.userData.axis==='z'?1:0).applyQuaternion(q);const a=position().sub(origin),b=target.clone().sub(origin);a.addScaledVector(axis,-a.dot(axis));b.addScaledVector(axis,-b.dot(axis));if(a.lengthSq()<1e-10||b.lengthSq()<1e-10)continue;a.normalize();b.normalize();angles[i]=T.MathUtils.clamp(angles[i]+Math.atan2(axis.dot(a.clone().cross(b)),a.dot(b))*180/Math.PI,specs[i].min,specs[i].max);pose(angles)}
        const quantized=normalizeTarget(angles,specs);pose(quantized);const error=position().distanceTo(target);if(error<distance){distance=error;best=[...angles]}if(error<.008)break;
      }if(distance<.008)break;
    }} finally {pose(saved)}
    if(distance>.025)throw Error('Target is unreachable with these limb dimensions and motor limits.');return best;
  }
  pose(angles);
  return {root,joints,tip,specs,pose,position,solve,home:[...angles],grip(closed){fingers[0].position.x=closed?-.045:-.09;fingers[1].position.x=closed?.045:.09},dispose(){root.traverse(o=>o.geometry?.dispose());[green,dark,silver].forEach(m=>m.dispose())}};
}
