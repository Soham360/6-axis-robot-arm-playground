export const BLOCK_TYPES={
 moveTo:{label:'Move tool',category:'motion'},moveJ:{label:'Move joints',category:'motion'},home:{label:'Go home',category:'motion'},grip:{label:'Close gripper',category:'gripper'},release:{label:'Open gripper',category:'gripper'},wait:{label:'Wait',category:'control'},repeat:{label:'Repeat',category:'control'},say:{label:'Print message',category:'output'}
};
export function validateBlocks(program){
 if(!program||program.version!==1||!Array.isArray(program.blocks)||typeof program.forever!=='boolean')throw Error('Choose an AXIS block program version 1.');
 let count=0;const ids=new Set();
 const number=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${name} must be ${min}–${max}.`);return v};
 function visit(blocks,depth){if(depth>5)throw Error('Use at most five nested repeat blocks.');return blocks.map(b=>{
  if(++count>150)throw Error('Use at most 150 blocks.');
  if(!b||!Object.hasOwn(BLOCK_TYPES,b.type)||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(b.id)||ids.has(b.id))throw Error('Invalid or duplicate block.');ids.add(b.id);
  const out={id:b.id,type:b.type};
  if(b.type==='moveTo'){if(!Array.isArray(b.xyz)||b.xyz.length!==3)throw Error('Move tool needs X, Y and Z.');out.xyz=b.xyz.map((v,i)=>number(v,i===1?20:-3000,3000,'Tool coordinate'));}
  if(b.type==='moveJ'){if(!Array.isArray(b.angles)||b.angles.length!==6)throw Error('Move joints needs six angles.');out.angles=b.angles.map(v=>number(v,-180,180,'Joint angle'));}
  if(['moveTo','moveJ','wait'].includes(b.type))out.seconds=number(b.seconds,b.type==='wait'?0:.1,30,'Time in seconds');
  if(b.type==='repeat'){out.times=number(b.times,1,100,'Repeat count');if(!Number.isInteger(out.times)||!Array.isArray(b.children))throw Error('Repeat needs a whole number and a block stack.');out.children=visit(b.children,depth+1)}
  if(b.type==='say'){if(typeof b.text!=='string'||b.text.length>200||/[\x00-\x1f]/.test(b.text))throw Error('Use a message under 200 characters without control characters.');out.text=b.text}
  return out;
 })}
 return {version:1,forever:program.forever,blocks:visit(program.blocks,0)};
}
export function compileBlocks(value){
 const program=validateBlocks(value),lines=['#include <Axis.h>','','void setup() {','  Serial.begin(9600);'],lineBlocks={};let loop=0;
 const emit=(code,id)=>{lines.push(code);if(id)lineBlocks[lines.length]=id};
 function stack(blocks,indent){for(const b of blocks){const pad='  '.repeat(indent);switch(b.type){
  case'moveTo':emit(`${pad}Arm.moveTo(${b.xyz.join(', ')}, ${Math.round(b.seconds*1000)});`,b.id);break;
  case'moveJ':emit(`${pad}Arm.moveJ(${b.angles.join(', ')}, ${Math.round(b.seconds*1000)});`,b.id);break;
  case'home':emit(`${pad}Arm.home();`,b.id);break;
  case'grip':emit(`${pad}Arm.grip();`,b.id);break;
  case'release':emit(`${pad}Arm.release();`,b.id);break;
  case'wait':emit(`${pad}delay(${Math.round(b.seconds*1000)});`,b.id);break;
  case'say':emit(`${pad}Serial.println(${JSON.stringify(b.text)});`,b.id);break;
  case'repeat':{const name=`blockRepeat${loop++}`;emit(`${pad}for (int ${name} = 0; ${name} < ${b.times}; ${name}++) {`,b.id);stack(b.children,indent+1);emit(`${pad}}`,b.id);break;}
 }}}
 if(!program.forever)stack(program.blocks,1);emit('}');emit('');emit('void loop() {');if(program.forever)stack(program.blocks,1);emit('  delay(20);');emit('}');
 return {code:lines.join('\n')+'\n',lineBlocks};
}
export function starterBlocks(){return {version:1,forever:false,blocks:[{id:'start-home',type:'home'},{id:'start-wait',type:'wait',seconds:.5},{id:'start-repeat',type:'repeat',times:3,children:[{id:'start-close',type:'grip'},{id:'start-delay1',type:'wait',seconds:.5},{id:'start-open',type:'release'},{id:'start-delay2',type:'wait',seconds:.5}]},{id:'start-message',type:'say',text:'My first block program is complete!'}]}}
