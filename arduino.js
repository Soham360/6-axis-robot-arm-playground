// Bounded Arduino/C++ interpreter. No eval and no JavaScript fallback.
export function parseSketch(source) {
  const tokens=[];let i=0,line=1;
  const fail=message=>{throw Error(`Line ${line}: ${message}`)};
  while(i<source.length){const s=source.slice(i),c=source[i];if(c==='\n'){line++;i++;continue}if(/\s/.test(c)){i++;continue}
    if(s.startsWith('//')){while(i<source.length&&source[i]!=='\n')i++;continue}
    if(s.startsWith('/*')){const end=source.indexOf('*/',i+2);if(end<0)fail('Unclosed comment.');line+=(source.slice(i,end).match(/\n/g)||[]).length;i=end+2;continue}
    if(c==='#'){const end=source.indexOf('\n',i),directive=source.slice(i,end<0?source.length:end).trim();if(!/^#\s*include\s*[<"](?:Servo|Axis)\.h[>"]$/.test(directive))fail('Only #include <Servo.h> and <Axis.h> are supported. Use const variables instead of #define.');i=end<0?source.length:end;continue}
    if(c==='"'||c==="'"){const quote=c;let value='';i++;while(i<source.length&&source[i]!==quote){if(source[i]==='\n')fail('Unclosed string.');if(source[i]==='\\'){i++;const escapes={n:'\n',t:'\t',r:'\r','\\':'\\','"':'"',"'":"'"};if(!(source[i] in escapes))fail('Unsupported string escape.');value+=escapes[source[i++]]}else value+=source[i++]}if(source[i]!==quote)fail('Unclosed string.');i++;tokens.push({kind:'literal',value,line});continue}
    const num=s.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);if(num){tokens.push({kind:'literal',value:Number(num[0]),line});i+=num[0].length;continue}
    const id=s.match(/^[A-Za-z_]\w*/);if(id){tokens.push({kind:'id',value:id[0],line});i+=id[0].length;continue}
    const op=['++','--','+=','-=','*=','/=','==','!=','<=','>=','&&','||'].find(o=>s.startsWith(o))||c;
    if(!'{}()[];,.+-*/%<>=!&|'.includes(c))fail(`Unsupported character '${c}'.`);tokens.push({kind:'op',value:op,line});i+=op.length;
  }
  tokens.push({kind:'eof',value:'<end>',line});let p=0;
  const peek=()=>tokens[p], at=v=>peek().value===v, take=()=>tokens[p++], accept=v=>at(v)?take():null;
  const error=(m,t=peek())=>{throw Error(`Line ${t.line}: ${m}`)}, expect=v=>{if(!at(v))error(`Expected '${v}', found '${peek().value}'.`);return take()};
  const types=new Set(['void','int','float','double','long','bool','String','char','Servo']);
  const isType=()=>at('const')||at('unsigned')||types.has(peek().value);
  function type(){const constant=!!accept('const');accept('unsigned');const name=take();if(!types.has(name.value))error('Expected an Arduino type.',name);return {name:name.value,constant}}
  function identifier(){const t=take();if(t.kind!=='id')error('Expected a name.',t);return t.value}
  const prec={'=':1,'+=':1,'-=':1,'*=':1,'/=':1,'||':2,'&&':3,'==':4,'!=':4,'<':5,'>':5,'<=':5,'>=':5,'+':6,'-':6,'*':7,'/':7,'%':7};
  function expression(min=1){let node,t=take();if(t.kind==='op'&&['!','-','+','++','--'].includes(t.value)){node={kind:'unary',op:t.value,arg:expression(8),line:t.line}}
    else if(t.kind==='literal')node={kind:'literal',value:t.value,line:t.line};else if(t.kind==='id')node={kind:'id',name:t.value,line:t.line};else if(t.value==='('){node=expression();expect(')')}else error('Expected an expression.',t);
    while(true){if(accept('.')){node={kind:'member',object:node,key:{kind:'literal',value:identifier()},line:t.line};continue}if(accept('[')){const key=expression();expect(']');node={kind:'member',object:node,key,line:t.line};continue}if(accept('(')){const args=[];if(!at(')')){do{args.push(expression())}while(accept(','))}expect(')');node={kind:'call',callee:node,args,line:t.line};continue}if(at('++')||at('--')){node={kind:'postfix',op:take().value,arg:node,line:t.line};continue}
      const op=peek().value,level=prec[op];if(!level||level<min)break;take();node={kind:level===1?'assign':'binary',op,left:node,right:expression(level+(level===1?0:1)),line:t.line};
    }return node;
  }
  function declaration(semicolon=true){const datatype=type(),decls=[];do{const name=identifier();let size=null,value=null;if(accept('[')){size=expression();expect(']')}if(accept('=')){if(accept('{')){const values=[];if(!at('}'))do{values.push(expression())}while(accept(','));expect('}');value={kind:'array',values}}else value=expression()}decls.push({name,size,value})}while(accept(','));if(semicolon)expect(';');return {kind:'declaration',datatype,decls,line:peek().line}}
  function statement(){const t=peek();if(accept('{')){const body=[];while(!at('}')){if(peek().kind==='eof')error('Unclosed block.');body.push(statement())}expect('}');return {kind:'block',body,line:t.line}}if(isType())return declaration();
    if(accept('if')){expect('(');const test=expression();expect(')');const yes=statement(),no=accept('else')?statement():null;return {kind:'if',test,yes,no,line:t.line}}
    if(accept('for')){expect('(');let init=null;if(!at(';'))init=isType()?declaration(false):{kind:'expr',expr:expression()};expect(';');const test=at(';')?null:expression();expect(';');const step=at(')')?null:expression();expect(')');return {kind:'for',init,test,step,body:statement(),line:t.line}}
    if(accept('while')){expect('(');const test=expression();expect(')');return {kind:'while',test,body:statement(),line:t.line}}
    if(accept('return')){const value=at(';')?null:expression();expect(';');return {kind:'return',value,line:t.line}}
    if(accept('break')){expect(';');return {kind:'break',line:t.line}}if(accept('continue')){expect(';');return {kind:'continue',line:t.line}}if(accept(';'))return {kind:'empty'};const expr=expression();expect(';');return {kind:'expr',expr,line:t.line};
  }
  const globals=[],functions=new Map();while(peek().kind!=='eof'){if(!isType())error('Expected a variable or function declaration. JavaScript is not supported.');const start=p;type();const name=identifier();if(accept('(')){const params=[];if(!at(')')){if(at('void')&&tokens[p+1].value===')')take();else do{type();params.push(identifier())}while(accept(','))}expect(')');if(functions.has(name))error(`Duplicate function ${name}.`);functions.set(name,{params,body:statement()})}else{p=start;globals.push(declaration())}}
  if(!functions.has('setup')||!functions.has('loop'))error('Sketch must define void setup() and void loop().');return {globals,functions};
}
class Scope {
  constructor(parent=null){this.parent=parent;this.values=new Map()}
  define(name,value,constant=false){if(this.values.has(name))throw Error(`Duplicate variable '${name}'.`);this.values.set(name,{value,constant})}
  entry(name){if(this.values.has(name))return this.values.get(name);if(this.parent)return this.parent.entry(name);throw Error(`Unknown name '${name}'.`)}
  get(name){return this.entry(name).value}
  set(name,value){const entry=this.entry(name);if(entry.constant)throw Error(`Cannot assign to constant '${name}'.`);entry.value=value;return value}
}
export async function runSketch(source,{call,log,shouldStop=()=>false,loopLimit=Infinity}) {
  const program=parseSketch(source),global=new Scope();let ticks=0,depth=0;
  async function tick(){if(shouldStop())throw Error('Sketch stopped.');if(++ticks%512===0)await new Promise(r=>setTimeout(r,0));if(ticks>2000000)throw Error('Sketch instruction limit reached. Add delay() or simplify the loop.');}
  function servo(){let pin=null,setpoint=90;return Object.freeze({
    attach:async p=>{await call('attach',[p]);pin=p;return p},
    write:async angle=>{if(pin===null)throw Error('Call attach(pin) before write().');if(!Number.isFinite(angle)||angle<0||angle>180)throw Error('Servo.write expects 0–180 degrees.');await call('servo',[pin,angle]);setpoint=angle},
    read:()=>setpoint,detach:()=>{pin=null},attached:()=>pin!==null,
  })}
  const Arm=Object.freeze(Object.fromEntries(['moveJ','moveTo','grip','release','home'].map(name=>[name,(...args)=>call(name,args)])));
  const started=Date.now();const Serial=Object.freeze({begin:()=>{},print:(...args)=>log(args.join(' ')),println:(...args)=>log(args.join(' '))});
  for(const [name,value] of Object.entries({Arm,Serial,true:true,false:false,HIGH:1,LOW:0,OUTPUT:1,INPUT:0,PI:Math.PI,
    delay:async ms=>{if(!Number.isFinite(ms)||ms<0||ms>30000)throw Error('delay must be 0–30000 ms.');ticks=0;return call('wait',[ms])},
    millis:()=>Date.now()-started,abs:Math.abs,min:Math.min,max:Math.max,sin:Math.sin,cos:Math.cos,sqrt:Math.sqrt,
    constrain:(v,a,b)=>Math.max(a,Math.min(b,v)),map:(v,a,b,c,d)=>Math.trunc((v-a)*(d-c)/(b-a)+c),
  }))global.define(name,value,true);
  const safeKey=(o,k)=>{if(o===null||typeof o!=='object'||['__proto__','prototype','constructor'].includes(String(k))||!Object.hasOwn(o,k))throw Error(`Unsupported member '${k}'.`);return o[k]};
  async function assign(node,scope,value){if(node.kind==='id')return scope.set(node.name,value);if(node.kind==='member'){const object=await evaluate(node.object,scope),key=await evaluate(node.key,scope);if(!Array.isArray(object)||!Number.isInteger(key)||key<0||key>=object.length)throw Error('Only valid array elements can be assigned.');object[key]=value;return value}throw Error('Expected an assignable variable.');}
  async function evaluate(n,s){await tick();switch(n.kind){case'literal':return n.value;case'id':return s.get(n.name);case'array':{const values=[];for(const v of n.values)values.push(await evaluate(v,s));return values}case'member':return safeKey(await evaluate(n.object,s),await evaluate(n.key,s));
    case'call':{const fn=await evaluate(n.callee,s);if(typeof fn!=='function')throw Error('Value is not callable.');const args=[];for(const arg of n.args)args.push(await evaluate(arg,s));return fn(...args)}
    case'assign':{const rhs=await evaluate(n.right,s);const value=n.op==='='?rhs:binary(n.op[0],await evaluate(n.left,s),rhs);return assign(n.left,s,value)}
    case'unary':case'postfix':{const v=await evaluate(n.arg,s);if(n.op==='++'||n.op==='--'){const next=Number(v)+(n.op==='++'?1:-1);await assign(n.arg,s,next);return n.kind==='postfix'?v:next}return n.op==='!'?!v:n.op==='-'?-v:+v}
    case'binary':{const a=await evaluate(n.left,s);if(n.op==='&&')return a&&await evaluate(n.right,s);if(n.op==='||')return a||await evaluate(n.right,s);return binary(n.op,a,await evaluate(n.right,s))}
    default:throw Error('Unsupported expression.');}}
  function binary(op,a,b){switch(op){case'+':return a+b;case'-':return a-b;case'*':return a*b;case'/':if(b===0)throw Error('Division by zero.');return a/b;case'%':return a%b;case'<':return a<b;case'>':return a>b;case'<=':return a<=b;case'>=':return a>=b;case'==':return a===b;case'!=':return a!==b;default:throw Error('Unsupported operator.')}}
  async function execute(n,s){await tick();try{switch(n.kind){case'empty':return;case'expr':await evaluate(n.expr,s);return;case'block':{const local=new Scope(s);for(const stmt of n.body){const signal=await execute(stmt,local);if(signal)return signal}return}
    case'declaration':for(const decl of n.decls){let value;if(decl.size){const size=await evaluate(decl.size,s);if(!Number.isInteger(size)||size<1||size>256)throw Error('Array size must be 1–256.');value=Array.from({length:size},()=>n.datatype.name==='Servo'?servo():0);if(decl.value){const initial=await evaluate(decl.value,s);if(!Array.isArray(initial)||initial.length>size)throw Error('Invalid array initializer.');initial.forEach((v,i)=>value[i]=v)}}else value=decl.value?await evaluate(decl.value,s):n.datatype.name==='Servo'?servo():0;s.define(decl.name,value,n.datatype.constant)}return;
    case'if':return await evaluate(n.test,s)?execute(n.yes,s):n.no?execute(n.no,s):undefined;
    case'for':{const local=new Scope(s);if(n.init)await execute(n.init,local);while(!n.test||await evaluate(n.test,local)){const signal=await execute(n.body,local);if(signal?.kind==='return')return signal;if(signal?.kind==='break')break;if(n.step)await evaluate(n.step,local)}return}
    case'while':while(await evaluate(n.test,s)){const signal=await execute(n.body,s);if(signal?.kind==='return')return signal;if(signal?.kind==='break')break}return;
    case'return':return {kind:'return',value:n.value?await evaluate(n.value,s):undefined};case'break':case'continue':return {kind:n.kind};default:throw Error('Unsupported statement.');}}
    catch(e){if(!/^Line \d+:/.test(e.message))e.message=`Line ${n.line??1}: ${e.message}`;throw e}}
  for(const [name,fn] of program.functions)global.define(name,async(...args)=>{if(++depth>64){depth--;throw Error('Function call depth exceeded.')}try{if(args.length!==fn.params.length)throw Error(`${name} expects ${fn.params.length} arguments.`);const scope=new Scope(global);fn.params.forEach((p,i)=>scope.define(p,args[i]));return (await execute(fn.body,scope))?.value}finally{depth--}},true);
  for(const stmt of program.globals)await execute(stmt,global);await global.get('setup')();
  for(let i=0;i<loopLimit;i++){await global.get('loop')();await new Promise(r=>setTimeout(r,10));}
}
