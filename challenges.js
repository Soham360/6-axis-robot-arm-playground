export const CHALLENGES=[
 {id:'grasp',title:'First grasp',description:'Close the gripper around a loose object. Use the payload readout to verify the grasp.'},
 {id:'sort',title:'Sort by shape',description:'Place the cube in the blue zone and the sphere in the green zone. Release both on the table.'},
 {id:'square',title:'Trace a square',description:'Visit the four numbered tool targets in sequence. Record a path or use straight-line commands.'},
 {id:'obstacle',title:'Clear the fixture',description:'Move to the blue target without a detected contact. The fixed fixture must stay in place.'},
 {id:'stack',title:'Stack two cubes',description:'Stack both small cubes in the blue zone. This exercise uses simplified object contacts.'},
 {id:'logic',title:'Make a decision',description:'Create a variable and an if/else block, then run the program to make a sensor-based decision.'}
];
export function setupChallenges({T,container,scene,objects,held,arm,addObject,clearObjects,reset,stop,blocks,contacts}){
 container.innerHTML='<h2>Practice challenges</h2><p>Load a challenge scene, then solve it with the controls, a taught path, blocks or Arduino. Loading a challenge replaces the scene objects.</p><div id="challenge-list"></div><p id="challenge-status" role="status"></p><progress id="challenge-progress" max="1" value="0"></progress><p id="challenge-completed"></p>';
 const $=id=>container.querySelector('#'+id);let active=null,markers=[],goal=0,collision=false,completed=new Set(),last=0,ranLogic=false;
 try{const saved=JSON.parse(localStorage.getItem('axis-challenges-v1'));if(Array.isArray(saved))completed=new Set(saved.filter(id=>CHALLENGES.some(c=>c.id===id)))}catch{}
 function summary(){$('challenge-completed').textContent=`${completed.size} / ${CHALLENGES.length} challenges completed`}
 function clean(){for(const m of markers){scene.remove(m);m.geometry.dispose();m.material.dispose()}markers=[]}
 function marker(x,y,z,color,r=.045){const m=new T.Mesh(new T.SphereGeometry(r,20,12),new T.MeshBasicMaterial({color,transparent:true,opacity:.3,depthWrite:false}));m.position.set(x,y,z);scene.add(m);markers.push(m);return m}
 const square=[[0,.4,.2],[.08,.4,.2],[.08,.4,.28],[0,.4,.28]];
 function load(challenge){stop();clean();reset();clearObjects();active=challenge;goal=0;collision=false;ranLogic=false;$('challenge-progress').value=0;$('challenge-progress').max=challenge.id==='square'?4:challenge.id==='sort'?2:1;
  if(['grasp','sort','stack'].includes(challenge.id)){addObject('cube',-.22,.2);addObject(challenge.id==='stack'?'cube':'sphere',-.2,challenge.id==='sort'?.05:-.18)}
  if(['sort','stack'].includes(challenge.id)){marker(.2,.01,.2,0x3769cb,.065);if(challenge.id==='sort')marker(-.2,.01,-.2,0x3a936c,.065)}
  if(challenge.id==='square')square.forEach((p,i)=>marker(...p,i===0?0x3a936c:0x3769cb,.012));
  if(challenge.id==='obstacle'){const o=addObject('cube',.1,.12);if(o){o.scale.set(1.8,3,1.8);o.userData.size=[79.2,132,79.2];o.userData.radius=.066;o.userData.halfHeight=.066;o.position.y=.066;o.userData.fixed=true;o.userData.name='Challenge fixture'}marker(.25,.35,-.1,0x3769cb,.02)}
  $('challenge-status').textContent=challenge.description;summary();
 }
 for(const c of CHALLENGES){const button=document.createElement('button');button.textContent=c.title;button.onclick=()=>load(c);$('challenge-list').append(button)}
 function complete(){if(!active)return;completed.add(active.id);try{localStorage.setItem('axis-challenges-v1',JSON.stringify([...completed]))}catch{}$('challenge-status').textContent='✓ '+active.title+' complete';$('challenge-progress').value=$('challenge-progress').max;summary();active=null;clean()}
 return {onProgram(program){const types=[];const scan=list=>list.forEach(b=>{types.push(b.type);if(b.children)scan(b.children);if(b.otherwise)scan(b.otherwise)});scan([...(program.setup??[]),...program.blocks]);ranLogic=types.includes('variable')&&types.includes('if')},update(){if(!active||performance.now()-last<150)return;last=performance.now();const p=arm().position(),list=objects();switch(active.id){
 case'grasp':if(held())complete();break;
 case'square':if(p.distanceTo(new T.Vector3(...square[goal]))<.018){markers[goal].material.color.set(0x3a936c);goal++;$('challenge-progress').value=goal;$('challenge-status').textContent=`${goal} / 4 targets visited`;if(goal===4)complete()}break;
 case'sort':{const cube=list.find(o=>o.userData.shape==='cube'),sphere=list.find(o=>o.userData.shape==='sphere');const inZone=(o,x,z)=>o&&o!==held()&&Math.hypot(o.position.x-x,o.position.z-z)<.06&&o.position.y<.06;const n=Number(inZone(cube,.2,.2))+Number(inZone(sphere,-.2,-.2));$('challenge-progress').value=n;if(n===2)complete();break}
 case'stack':{const cubes=list.filter(o=>o.userData.shape==='cube'&&o!==held()&&Math.hypot(o.position.x-.2,o.position.z-.2)<.06);if(cubes.length===2&&Math.abs(cubes[0].position.y-cubes[1].position.y)>.03&&Math.max(...cubes.map(o=>o.position.y))<.1)complete();break}
 case'obstacle':if(contacts().length)collision=true;if(p.distanceTo(new T.Vector3(.25,.35,-.1))<.02){if(!collision)complete();else $('challenge-status').textContent='A contact was detected. Reload the challenge and try another route.'}break;
 case'logic':if(ranLogic)complete();break;
 }} };
}
