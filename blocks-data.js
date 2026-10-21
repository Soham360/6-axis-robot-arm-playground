import {parseSketch} from './arduino.js';
export const BLOCK_TYPES={moveTo:{label:'Move tool',category:'motion'},moveJ:{label:'Move joints',category:'motion'},moveLinear:{label:'Straight-line move',category:'motion'},movePose:{label:'Tool position & orientation',category:'motion'},home:{label:'Go home',category:'motion'},grip:{label:'Close gripper',category:'gripper'},release:{label:'Open gripper',category:'gripper'},wait:{label:'Wait',category:'control'},repeat:{label:'Repeat',category:'control'},if:{label:'If / else',category:'control'},while:{label:'While condition',category:'control'},variable:{label:'Create variable',category:'variables'},set:{label:'Set variable',category:'variables'},change:{label:'Change variable',category:'variables'},print:{label:'Print value',category:'variables'},define:{label:'Define function',category:'functions'},call:{label:'Call function',category:'functions'},say:{label:'Print message',category:'output'}};
const sensors=new Set(['isHolding','objectCount','x','y','z','joint']);
const math=new Set(['abs','min','max','sin','cos','sqrt','constrain','map','millis']);
export function validName(name){if(typeof name!=='string'||!/^[A-Za-z_]\w{0,39}$/.test(name)||['setup','loop','Arm','Serial','delay','true','false','PI','int','double','void','bool','float','String',...math].includes(name)||name.startsWith('blockRepeat'))throw Error('Choose a variable/function name using letters, numbers and underscores, starting with a letter.');return name}
export function expressionCode(value){
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Expressions must be finite.');return String(value)}
 if(typeof value!=='string'||value.length>240||!value.trim())throw Error('Enter an expression under 240 characters.');
 const parsed=parseSketch(`void setup(){${value};}void loop(){}`),body=parsed.functions.get('setup').body.body;if(body.length!==1||body[0].kind!=='expr')throw Error('Enter one expression, without statements.');
 const check=n=>{if(n.kind==='literal'){if(!['number','boolean'].includes(typeof n.value))throw Error('Use a numeric or boolean expression.');return}if(n.kind==='id'){if(!['true','false','PI'].includes(n.name))validName(n.name);return}if(n.kind==='binary'){check(n.left);check(n.right);return}if(n.kind==='unary'&&['+','-','!'].includes(n.op)){check(n.arg);return}if(n.kind==='call'){const c=n.callee;if(c.kind==='id'&&math.has(c.name)||c.kind==='member'&&c.object.kind==='id'&&c.object.name==='Arm'&&sensors.has(c.key.value)){n.args.forEach(check);return}}throw Error('Use numbers, variables, math, comparisons or an Arm sensor expression.');};check(body[0].expr);return value.trim();
}
export function validateBlocks(program){
 if(!program||program.version!==1||!Array.isArray(program.blocks)||typeof program.forever!=='boolean')throw Error('Choose an AXIS block program version 1.');
 if(program.idle!==undefined&&typeof program.idle!=='boolean')throw Error('Invalid scheduler setting.');let count=0;const ids=new Set();
 const number=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${name} must be ${min}–${max}.`);return v};
 const expr=(v,min,max,name)=>typeof v==='number'?number(v,min,max,name):expressionCode(v);
 function visit(blocks,depth){if(!Array.isArray(blocks))throw Error('A block stack must be a list.');if(depth>5)throw Error('Use at most five nested control blocks.');return blocks.map(b=>{
  if(++count>150)throw Error('Use at most 150 blocks.');if(!b||!Object.hasOwn(BLOCK_TYPES,b.type)||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(b.id)||ids.has(b.id))throw Error('Invalid or duplicate block.');ids.add(b.id);const out={id:b.id,type:b.type};
  if(['moveTo','moveLinear','movePose'].includes(b.type)){if(!Array.isArray(b.xyz)||b.xyz.length!==3)throw Error('Move tool needs X, Y and Z.');out.xyz=b.xyz.map((v,i)=>expr(v,i===1?20:-3000,3000,'Tool coordinate'))}
  if(b.type==='movePose'){if(!Array.isArray(b.rpy)||b.rpy.length!==3)throw Error('Tool orientation needs roll, pitch and yaw.');out.rpy=b.rpy.map(v=>expr(v,-360,360,'Tool orientation'));}
  if(b.type==='moveJ'){if(!Array.isArray(b.angles)||b.angles.length!==6)throw Error('Move joints needs six angles.');out.angles=b.angles.map(v=>expr(v,-180,180,'Joint angle'))}
  if(['moveTo','moveJ','moveLinear','movePose','wait'].includes(b.type))out.seconds=expr(b.seconds,b.type==='wait'?0:.1,30,'Time in seconds');
  if(b.type==='repeat'){out.times=expr(b.times,1,100,'Repeat count');if(typeof out.times==='number'&&!Number.isInteger(out.times))throw Error('Repeat needs a whole number.');if(b.counter)out.counter=validName(b.counter);out.children=visit(b.children,depth+1)}
  if(['if','while'].includes(b.type)){out.condition=expressionCode(b.condition);out.children=visit(b.children,depth+1);if(b.type==='if')out.otherwise=visit(b.otherwise??[],depth+1)}
  if(['variable','set','change','define','call'].includes(b.type))out.name=validName(b.name);
  if(['variable','set','change','print'].includes(b.type))out.expression=expressionCode(b.expression);
  if(b.type==='variable'){out.scope=b.scope==='local'?'local':'global';out.constant=b.constant===true}
  if(b.type==='define'){if(depth>0)throw Error('Function definitions belong at the top level.');out.children=visit(b.children,depth+1)}
  if(b.type==='say'){if(typeof b.text!=='string'||b.text.length>200||/[\x00-\x1f]/.test(b.text))throw Error('Use a message under 200 characters without control characters.');out.text=b.text}
  return out;
 })}
 return {version:1,forever:program.forever,blocks:visit(program.blocks,0),...(program.setup?{setup:visit(program.setup,0)}:{}),...(program.idle!==undefined?{idle:program.idle}:{})};
}
export function compileBlocks(value){
 const p=validateBlocks(value),lines=['#include <Axis.h>',''],lineBlocks={};let sequence=0;const emit=(code,id)=>{lines.push(code);if(id)lineBlocks[lines.length]=id};
 const all=[...(p.setup??[]),...p.blocks],globals=new Set(),functions=new Set();
 function gather(list){for(const b of list){if(b.type==='variable'&&b.scope==='global'){if(globals.has(b.name)||functions.has(b.name))throw Error(`Duplicate name: ${b.name}`);globals.add(b.name);emit(`${b.constant?'const ':''}double ${b.name} = ${b.expression};`,b.id)}if(b.type==='define'){if(functions.has(b.name)||globals.has(b.name))throw Error(`Duplicate name: ${b.name}`);functions.add(b.name)}if(b.children)gather(b.children);if(b.otherwise)gather(b.otherwise)}}gather(all);emit('');
 const time=b=>typeof b.seconds==='number'?Math.round(b.seconds*1000):`(${b.seconds}) * 1000`;
 function stack(blocks,indent){for(const b of blocks){const pad='  '.repeat(indent);switch(b.type){
 case'moveTo':case'moveLinear':emit(`${pad}Arm.${b.type==='moveLinear'?'moveL':'moveTo'}(${b.xyz.map(expressionCode).join(', ')}, ${time(b)});`,b.id);break;
 case'movePose':emit(`${pad}Arm.movePose(${b.xyz.map(expressionCode).join(', ')}, ${b.rpy.map(expressionCode).join(', ')}, ${time(b)});`,b.id);break;
 case'moveJ':emit(`${pad}Arm.moveJ(${b.angles.map(expressionCode).join(', ')}, ${time(b)});`,b.id);break;
 case'home':case'grip':case'release':emit(`${pad}Arm.${b.type}();`,b.id);break;
 case'wait':emit(`${pad}delay(${time(b)});`,b.id);break;
 case'say':emit(`${pad}Serial.println(${JSON.stringify(b.text)});`,b.id);break;
 case'print':emit(`${pad}Serial.println(${b.expression});`,b.id);break;
 case'variable':if(b.scope==='local')emit(`${pad}${b.constant?'const ':''}double ${b.name} = ${b.expression};`,b.id);break;
 case'set':case'change':emit(`${pad}${b.name} ${b.type==='set'?'=':'+='} ${b.expression};`,b.id);break;
 case'call':if(!functions.has(b.name))throw Error(`Define function ${b.name} before running.`);emit(`${pad}${b.name}();`,b.id);break;
 case'repeat':{const counter=b.counter??`blockRepeat${sequence++}`;emit(`${pad}for (int ${counter} = 0; ${counter} < ${expressionCode(b.times)}; ${counter}++) {`,b.id);stack(b.children,indent+1);emit(`${pad}}`,b.id);break}
 case'if':case'while':emit(`${pad}${b.type} (${b.condition}) {`,b.id);stack(b.children,indent+1);if(b.type==='if'&&b.otherwise.length){emit(`${pad}} else {`,b.id);stack(b.otherwise,indent+1)}emit(`${pad}}`,b.id);break;
 }}}
 for(const b of all.filter(b=>b.type==='define')){emit(`void ${b.name}() {`,b.id);stack(b.children,1);emit('}');emit('')}
 emit('void setup() {');emit('  Serial.begin(9600);');if(p.setup)stack(p.setup,1);if(!p.forever)stack(p.blocks,1);emit('}');emit('');emit('void loop() {');if(p.forever)stack(p.blocks,1);if(p.idle!==false)emit('  delay(20);');emit('}');return {code:lines.join('\n')+'\n',lineBlocks};
}
export function starterBlocks(){return {version:1,forever:false,blocks:[{id:'start-home',type:'home'},{id:'start-wait',type:'wait',seconds:.5},{id:'start-repeat',type:'repeat',times:3,children:[{id:'start-close',type:'grip'},{id:'start-delay1',type:'wait',seconds:.5},{id:'start-open',type:'release'},{id:'start-delay2',type:'wait',seconds:.5}]},{id:'start-message',type:'say',text:'My first block program is complete!'}]}}
function nodeCode(n){switch(n.kind){case'literal':return typeof n.value==='string'?JSON.stringify(n.value):String(n.value);case'id':return n.name;case'unary':return `(${n.op}${nodeCode(n.arg)})`;case'binary':return `(${nodeCode(n.left)} ${n.op} ${nodeCode(n.right)})`;case'member':return `${nodeCode(n.object)}.${n.key.value}`;case'call':return `${nodeCode(n.callee)}(${n.args.map(nodeCode).join(', ')})`;default:throw Error('This expression cannot be converted to blocks.')}}
export function sketchToBlocks(source){
 const ast=parseSketch(source);let sequence=0;const id=()=>`converted-${++sequence}`;const fail=(n,message)=>{throw Error(`Line ${n?.line??1}: ${message} Keep editing this sketch in Arduino mode.`)};
 const numeric=n=>{if(n.kind==='literal'&&typeof n.value==='number')return n.value;if(n.kind==='unary'&&['-','+'].includes(n.op)&&n.arg.kind==='literal'&&typeof n.arg.value==='number')return n.op==='-'?-n.arg.value:+n.arg.value;return expressionCode(nodeCode(n))};
 const seconds=n=>{const v=numeric(n);return typeof v==='number'?v/1000:`(${v}) / 1000`};
 const statements=n=>n.kind==='block'?n.body:[n];
 function convert(n,scope='local'){
 if(n.kind==='empty')return [];if(n.kind==='block')return n.body.flatMap(v=>convert(v,scope));
 if(n.kind==='declaration'){return n.decls.map(d=>{if(d.size||n.datatype.name==='Servo'||!d.value)fail(n,'Use initialized scalar variables for conversion.');return {id:id(),type:'variable',name:d.name,scope,constant:n.datatype.constant,expression:nodeCode(d.value)}})}
 if(n.kind==='if'||n.kind==='while')return [{id:id(),type:n.kind,condition:nodeCode(n.test),children:statements(n.kind==='if'?n.yes:n.body).flatMap(v=>convert(v)),...(n.kind==='if'?{otherwise:n.no?statements(n.no).flatMap(v=>convert(v)):[]}:{})}];
 if(n.kind==='for'){const d=n.init?.kind==='declaration'&&n.init.decls.length===1?n.init.decls[0]:null,name=d?.name;if(!name||d.size||numeric(d.value)!==0||n.test?.kind!=='binary'||n.test.op!=='<'||n.test.left.name!==name||!['postfix','unary'].includes(n.step?.kind)||n.step.op!=='++'||n.step.arg?.name!==name)fail(n,'Use for (int i = 0; i < N; i++).');return [{id:id(),type:'repeat',times:numeric(n.test.right),...(name.startsWith('blockRepeat')?{}:{counter:name}),children:statements(n.body).flatMap(v=>convert(v))}]}
 if(n.kind!=='expr')fail(n,'This statement has no equivalent visual block.');const e=n.expr;
 if(e.kind==='assign'&&e.left.kind==='id'&&['=','+=','-='].includes(e.op))return [{id:id(),type:e.op==='='?'set':'change',name:e.left.name,expression:e.op==='-='?`-(${nodeCode(e.right)})`:nodeCode(e.right)}];
 if(['postfix','unary'].includes(e.kind)&&['++','--'].includes(e.op)&&e.arg.kind==='id')return [{id:id(),type:'change',name:e.arg.name,expression:e.op==='++'?'1':'-1'}];
 if(e.kind!=='call')fail(n,'This statement has no equivalent visual block.');const c=e.callee,args=e.args;let b;
 if(c.kind==='id'){if(c.name==='delay'&&args.length===1)b={type:'wait',seconds:seconds(args[0])};else if(ast.functions.has(c.name)&&!['setup','loop'].includes(c.name)&&!args.length)b={type:'call',name:c.name}}
 if(c.kind==='member'&&c.object.kind==='id'){const object=c.object.name,method=c.key.value;if(object==='Serial'&&method==='begin'&&args.length===1&&numeric(args[0])===9600)return [];if(object==='Serial'&&method==='println'&&args.length===1)b=args[0].kind==='literal'&&typeof args[0].value==='string'?{type:'say',text:args[0].value}:{type:'print',expression:nodeCode(args[0])};if(object==='Arm'){if(['home','grip','release'].includes(method)&&!args.length)b={type:method};if(['moveTo','moveL'].includes(method)&&[3,4].includes(args.length))b={type:method==='moveL'?'moveLinear':'moveTo',xyz:args.slice(0,3).map(numeric),seconds:args[3]?seconds(args[3]):1};if(method==='movePose'&&[6,7].includes(args.length))b={type:'movePose',xyz:args.slice(0,3).map(numeric),rpy:args.slice(3,6).map(numeric),seconds:args[6]?seconds(args[6]):1};if(method==='moveJ'&&[6,7].includes(args.length))b={type:method,angles:args.slice(0,6).map(numeric),seconds:args[6]?seconds(args[6]):1}}}
 if(!b)fail(n,'This command has no equivalent visual block.');return [{id:id(),...b}];
 }
 const declarations=ast.globals.flatMap(n=>convert(n,'global')),definitions=[...ast.functions].filter(([name])=>!['setup','loop'].includes(name)).map(([name,fn])=>{if(fn.params.length)fail(fn.body,'Function parameters are not yet supported in blocks.');return {id:id(),type:'define',name,children:statements(fn.body).flatMap(n=>convert(n))}}),setup=[...declarations,...definitions,...statements(ast.functions.get('setup').body).flatMap(n=>convert(n))],loop=statements(ast.functions.get('loop').body).flatMap(n=>convert(n));
 const schedulerYield=loop.at(-1)?.type==='wait'&&loop.at(-1).seconds===.02;if(schedulerYield)loop.pop();const p=loop.length?{version:1,forever:true,blocks:loop,...(setup.length?{setup}:{})}:{version:1,forever:false,blocks:setup};return validateBlocks({...p,...(schedulerYield?{}:{idle:false})});
}
