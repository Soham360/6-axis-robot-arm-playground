import {parseSketch} from './arduino.js';
export const BLOCK_TYPES={
 moveTo:{label:'Move tool',category:'motion'},moveJ:{label:'Move joints',category:'motion'},home:{label:'Go home',category:'motion'},grip:{label:'Close gripper',category:'gripper'},release:{label:'Open gripper',category:'gripper'},wait:{label:'Wait',category:'control'},repeat:{label:'Repeat',category:'control'},say:{label:'Print message',category:'output'}
};
export function validateBlocks(program){
 if(!program||program.version!==1||!Array.isArray(program.blocks)||typeof program.forever!=='boolean')throw Error('Choose an AXIS block program version 1.');
 if(program.idle!==undefined&&typeof program.idle!=='boolean')throw Error('Invalid scheduler setting.');
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
 return {version:1,forever:program.forever,blocks:visit(program.blocks,0),...(program.setup?{setup:visit(program.setup,0)}:{}),...(program.idle!==undefined?{idle:program.idle}:{})};
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
 if(program.setup)stack(program.setup,1);if(!program.forever)stack(program.blocks,1);emit('}');emit('');emit('void loop() {');if(program.forever)stack(program.blocks,1);if(program.idle!==false)emit('  delay(20);');emit('}');
 return {code:lines.join('\n')+'\n',lineBlocks};
}
export function starterBlocks(){return {version:1,forever:false,blocks:[{id:'start-home',type:'home'},{id:'start-wait',type:'wait',seconds:.5},{id:'start-repeat',type:'repeat',times:3,children:[{id:'start-close',type:'grip'},{id:'start-delay1',type:'wait',seconds:.5},{id:'start-open',type:'release'},{id:'start-delay2',type:'wait',seconds:.5}]},{id:'start-message',type:'say',text:'My first block program is complete!'}]}}

// Convert the interpreter AST; never execute source while converting.
export function sketchToBlocks(source){
 const ast=parseSketch(source),constants=new Map();let sequence=0;
 const fail=(n,message)=>{throw Error(`Line ${n?.line??1}: ${message} Keep editing this sketch in Arduino mode.`)};
 function value(n){if(n?.kind==='literal')return n.value;if(n?.kind==='id'&&constants.has(n.name))return constants.get(n.name);if(n?.kind==='unary'&&['-','+','!'].includes(n.op)){const v=value(n.arg);return n.op==='-'?-v:n.op==='+'?+v:!v}if(n?.kind==='binary'){const a=value(n.left),b=value(n.right);switch(n.op){case'+':return a+b;case'-':return a-b;case'*':return a*b;case'/':return a/b;case'%':return a%b}}fail(n,'Blocks need literal numbers or constant expressions here.')}
 for(const n of ast.globals){if(!n.datatype.constant)fail(n,'Global variables cannot be represented by these blocks.');for(const d of n.decls){if(d.size||!d.value)fail(n,'Use simple scalar constants for block conversion.');constants.set(d.name,value(d.value))}}
 if(ast.functions.size!==2)fail(null,'Custom functions cannot be represented by these blocks.');
 const statements=n=>n.kind==='block'?n.body:[n];
 function convert(n){
  if(n.kind==='empty')return [];
  if(n.kind==='block')return n.body.flatMap(convert);
  if(n.kind==='for'){
   const d=n.init?.kind==='declaration'&&n.init.decls.length===1?n.init.decls[0]:null,name=d?.name;
   if(!name||d.size||value(d.value)!==0||n.test?.kind!=='binary'||n.test.op!=='<'||n.test.left.kind!=='id'||n.test.left.name!==name||!['postfix','unary'].includes(n.step?.kind)||n.step.op!=='++'||n.step.arg?.name!==name)fail(n,'Use a repeat loop in the form for (int i = 0; i < N; i++).');
   const times=value(n.test.right),children=statements(n.body).flatMap(convert);return [{id:`converted-${++sequence}`,type:'repeat',times,children}];
  }
  if(n.kind!=='expr'||n.expr.kind!=='call')fail(n,'This statement has no equivalent visual block.');
  const call=n.expr,c=call.callee,args=call.args.map(value);let b;
  if(c.kind==='id'&&c.name==='delay'&&args.length===1)b={type:'wait',seconds:args[0]/1000};
  if(c.kind==='member'&&c.object.kind==='id'){
   const object=c.object.name,method=c.key.value;
   if(object==='Serial'&&method==='begin'&&args.length===1&&args[0]===9600)return [];
   if(object==='Serial'&&method==='println'&&args.length===1&&typeof args[0]==='string')b={type:'say',text:args[0]};
   if(object==='Arm'){
    if(['home','grip','release'].includes(method)&&args.length===0)b={type:method};
    if(method==='moveTo'&&[3,4].includes(args.length))b={type:method,xyz:args.slice(0,3),seconds:(args[3]??1000)/1000};
    if(method==='moveJ'&&[6,7].includes(args.length))b={type:method,angles:args.slice(0,6),seconds:(args[6]??1000)/1000};
   }
  }
  if(!b)fail(n,'This command has no equivalent visual block.');return [{id:`converted-${++sequence}`,...b}];
 }
 const setup=statements(ast.functions.get('setup').body).flatMap(convert),loop=statements(ast.functions.get('loop').body).flatMap(convert);
 // The generator's idle delay is a scheduler yield, not part of the visual stack.
 const schedulerYield=loop.at(-1)?.type==='wait'&&loop.at(-1).seconds===.02;if(schedulerYield)loop.pop();
 const program=loop.length?{version:1,forever:true,blocks:loop,...(setup.length?{setup}:{})}:{version:1,forever:false,blocks:setup};
 return validateBlocks({...program,...(schedulerYield?{}:{idle:false})});
}
