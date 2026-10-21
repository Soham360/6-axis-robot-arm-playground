import {validatePath,pathDuration} from './path-data.js';
import {normalizeTarget,durationFor} from './robot-config.js';
const $=s=>document.querySelector(s);
export function setupTeaching({T,arm,angles,pose,canvas,camera,scene,orbit,stop,moveJ,grip,release,closed,download,log}){
 const handle=new T.Mesh(new T.SphereGeometry(.022,20,16),new T.MeshBasicMaterial({color:0x245ac7,depthTest:false,transparent:true,opacity:.85}));handle.renderOrder=10;scene.add(handle);
 const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane();let dragging=false,path=[],start=null,playing=false,generation=0,pathLine=null;
 try{path=validatePath(JSON.parse(localStorage.getItem('axis-path-v1'))??[])}catch{}
 function message(text){$('#path-status').textContent=text}
 function durations(){return path.map((p,i)=>p.duration??(i?Math.min(30000,Math.max(100,p.time-path[i-1].time)):1000))}
 function retime(points,ms){let time=0;path=points.map((p,i)=>({...p,duration:ms[i],time:time+=i?ms[i]:0}));start=null}
 function refresh(){
  if(pathLine){scene.remove(pathLine);pathLine.geometry.dispose();pathLine.material.dispose()}
  pathLine=new T.Line(new T.BufferGeometry().setFromPoints(path.map(p=>new T.Vector3(...p.xyz.map(n=>n/1000)))),new T.LineBasicMaterial({color:0x245ac7,transparent:true,opacity:.65}));scene.add(pathLine);
  const list=$('#path-points');list.replaceChildren();
  const ms=durations();path.forEach((p,i)=>{
   const li=document.createElement('li');li.dataset.point=i;
   const name=document.createElement('input');name.value=p.name||`Point ${i+1}`;name.maxLength=80;name.setAttribute('aria-label',`Point ${i+1} name`);name.disabled=playing;name.onchange=()=>{p.name=name.value;persist()};
   const details=document.createElement('small');details.textContent=`${p.xyz.map(Math.round).join(', ')} mm`;
   const seconds=document.createElement('input');seconds.type='number';seconds.min='.1';seconds.max='30';seconds.step='.1';seconds.value=(ms[i]/1000).toFixed(1);seconds.disabled=playing;seconds.setAttribute('aria-label',`Travel to point ${i+1} in seconds`);seconds.onchange=()=>{const n=Number(seconds.value);if(!Number.isFinite(n)||n<.1||n>30){seconds.value=ms[i]/1000;return}ms[i]=n*1000;retime(path,ms);refresh()};
   const state=document.createElement('select');state.setAttribute('aria-label',`Point ${i+1} gripper`);for(const [v,t] of [['open','Open'],['closed','Closed']]){const o=new Option(t,v);state.add(o)}state.value=p.closed?'closed':'open';state.disabled=playing;state.onchange=()=>{p.closed=state.value==='closed';persist()};
   const actions=document.createElement('div');actions.className='point-actions';
   function action(label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled||playing;b.onclick=fn;actions.append(b)}
   action('Go',async()=>{cancel();try{await moveJ(normalizeTarget(p.angles,arm().specs),1000);p.closed?grip():release()}catch(e){if(e.message!=='Stopped')message(e.message)}});
   action('Update',()=>{cancel();const xyz=arm().position();Object.assign(p,{angles:[...angles()],xyz:[xyz.x*1000,xyz.y*1000,xyz.z*1000],closed:closed()});refresh()});
   action('↑',()=>reorder(i,-1),i===0);action('↓',()=>reorder(i,1),i===path.length-1);action('Delete',()=>{cancel();path.splice(i,1);ms.splice(i,1);retime(path,ms);refresh()});
   const travel=document.createElement('label');travel.textContent='Travel (s)';travel.append(seconds);
   li.append(name,details,travel,state,actions);list.append(li);
  });
  const speed=Number($('#path-speed').value);let actual=0,from=[...angles()];try{for(let i=0;i<path.length;i++){normalizeTarget(path[i].angles,arm().specs);actual+=durationFor(from,path[i].angles,Math.min(30000,ms[i]/speed),arm().specs);from=path[i].angles}message(`${path.length} points · ${(pathDuration(path,speed)/1000).toFixed(1)} s requested · ${(actual/1000).toFixed(1)} s motor-aware estimate`)}catch(e){message(`Path needs attention: ${e.message}`)}
  $('#play-path').disabled=path.length<1||playing;$('#undo-point').disabled=!path.length||playing;$('#clear-path').disabled=!path.length;$('#stop-path').disabled=!playing;persist();
 }
 function persist(){try{localStorage.setItem('axis-path-v1',JSON.stringify(path))}catch{message('Browser storage unavailable; export your path to keep it.')}}
 function reorder(i,delta){cancel();const ms=durations();[path[i],path[i+delta]]=[path[i+delta],path[i]];[ms[i],ms[i+delta]]=[ms[i+delta],ms[i]];retime(path,ms);refresh()}
 function cancel(){generation++;playing=false;stop();refresh()}
 function teach(p){try{pose(arm().solve(p.x,p.y,p.z));message('Pose ready · Record point to add it.')}catch(e){message(e.message)}}
 function aim(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera)}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;aim(e);if(!ray.intersectObject(handle).length)return;cancel();dragging=true;orbit.enabled=false;canvas.setPointerCapture(e.pointerId);plane.setFromNormalAndCoplanarPoint(new T.Vector3(0,1,0),arm().position());e.stopImmediatePropagation()},true);
 canvas.addEventListener('pointermove',e=>{if(!dragging)return;aim(e);const p=new T.Vector3();if(ray.ray.intersectPlane(plane,p))teach(p)});
 function end(){dragging=false;orbit.enabled=true}canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
 $('#tool-height').oninput=e=>{cancel();const p=arm().position();p.y=Number(e.target.value)/1000;teach(p)};
 $('#record-point').onclick=()=>{cancel();if(path.length>=2000){message('Path limit reached. Export or clear this path.');return}const now=performance.now();if(start===null)start=now-(path.at(-1)?.time??0);const p=arm().position();path.push({name:`Point ${path.length+1}`,angles:[...angles()],xyz:[p.x*1000,p.y*1000,p.z*1000],time:now-start,closed:closed()});refresh();log(`Recorded point ${path.length}`)};
 $('#play-path').onclick=async()=>{cancel();const points=structuredClone(path);try{points.forEach(p=>normalizeTarget(p.angles,arm().specs))}catch(e){message(e.message);return}playing=true;const token=generation;refresh();const speed=Number($('#path-speed').value);try{for(let i=0;i<points.length&&playing&&token===generation;i++){const p=points[i];const row=$(`[data-point="${i}"]`);row?.classList.add('playing');row?.scrollIntoView({block:'nearest'});message(`Playing ${p.name||`point ${i+1}`} / ${points.length}`);await moveJ(p.angles,Math.min(30000,Math.max(100,(p.duration??(i?p.time-points[i-1].time:1000))/speed)));row?.classList.remove('playing');if(!playing||token!==generation)break;p.closed?grip():release()}if(playing&&token===generation)log('Path complete.')}catch(e){if(e.message!=='Stopped')log(e.message,true)}finally{if(token===generation){playing=false;refresh()}}};
 $('#stop-path').onclick=()=>{cancel();message('Playback stopped.')};$('#clear-path').onclick=()=>{cancel();path=[];start=null;refresh()};
 $('#export-path').onclick=()=>{if(!path.length){message('Record a point first.');return}download('axis-recorded-path.ino','#include <Axis.h>\n\nvoid setup() {\n'+path.map((p,i)=>`  Arm.moveJ(${p.angles.map(n=>n.toFixed(3)).join(', ')}, ${Math.min(30000,Math.max(100,Math.round((p.duration??(i?p.time-path[i-1].time:1000))/Number($('#path-speed').value))))});\n  Arm.${p.closed?'grip':'release'}();`).join('\n')+'\n}\nvoid loop() { delay(1000); }\n','text/plain')};
 $('#undo-point').onclick=()=>{cancel();path.pop();start=null;refresh()};$('#path-speed').onchange=refresh;
 $('#save-path').onclick=()=>download('axis-path.json',JSON.stringify({version:1,points:path},null,2),'application/json');
 $('#load-path').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('Path file must be smaller than 2 MB.');const points=validatePath(JSON.parse(await file.text()));cancel();path=points;start=null;refresh();log(`Loaded ${path.length} path points`)}catch(err){message(err.message)}finally{e.target.value=''}};
 refresh();return {cancel,refresh,getPath:()=>structuredClone(path),setPath(value){const points=validatePath(value);cancel();path=points;start=null;refresh()},update(){const p=arm().position();handle.position.copy(p);$('#height-value').textContent=Math.round(p.y*1000);if(!dragging&&document.activeElement!==$('#tool-height'))$('#tool-height').value=p.y*1000}};
}
// Conservative link collision proxies and object sphere proxies, scaled to each model.
export function resolveContacts(T,arm,objects,held){
 const boxes=[];if(arm.colliders){for(const m of arm.colliders)boxes.push(new T.Box3().setFromObject(m))}else arm.root.traverse(m=>{if(m.isMesh&&m!==held)boxes.push(new T.Box3().setFromObject(m))});
 for(const o of objects)if(o.userData.fixed)o.traverse(m=>{if(m.isMesh)boxes.push(new T.Box3().setFromObject(m))});
 const radius=o=>o.userData.radius??.075;
 for(let pass=0;pass<4;pass++){
  for(const o of objects){if(o===held||o.userData.fixed)continue;const r=radius(o);for(const box of boxes){const q=box.clampPoint(o.position,new T.Vector3()),d=o.position.clone().sub(q),l=d.length();if(l>=r)continue;if(l<1e-7){const p=o.position;const exits=[[p.x-box.min.x,-1,0,0],[box.max.x-p.x,1,0,0],[p.y-box.min.y,0,-1,0],[box.max.y-p.y,0,1,0],[p.z-box.min.z,0,0,-1],[box.max.z-p.z,0,0,1]].sort((a,b)=>a[0]-b[0]);const e=exits[0];d.set(e[1],e[2],e[3]);o.position.addScaledVector(d,e[0]+r+.001)}else{o.position.addScaledVector(d.divideScalar(l),r+.001-l)}}o.position.y=Math.max(o.userData.halfHeight??r,o.position.y);o.position.x=T.MathUtils.clamp(o.position.x,-1.9,1.9);o.position.z=T.MathUtils.clamp(o.position.z,-1.55,1.55)}
  for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){const a=objects[i],b=objects[j];if(a.userData.fixed||b.userData.fixed)continue;const sum=radius(a)+radius(b);const d=b.getWorldPosition(new T.Vector3()).sub(a.getWorldPosition(new T.Vector3())),l=d.length();if(l>=sum)continue;if(l<1e-7)d.set(1,0,0);else d.divideScalar(l);if(a!==held)a.position.addScaledVector(d,-(sum+.001-l)/(b===held?1:2));if(b!==held)b.position.addScaledVector(d,(sum+.001-l)/(a===held?1:2));if(a!==held)a.position.y=Math.max(a.userData.halfHeight??radius(a),a.position.y);if(b!==held)b.position.y=Math.max(b.userData.halfHeight??radius(b),b.position.y)}
 }
}
