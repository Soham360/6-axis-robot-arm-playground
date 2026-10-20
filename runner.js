// Each run receives a fresh worker. Robot commands cross a narrow RPC boundary.
let sequence=0;const pending=new Map();
self.onmessage=async({data:m})=>{if(m.type!=='start'){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.value)}return}
 const call=(method,args)=>new Promise((resolve,reject)=>{const id=sequence++;pending.set(id,{resolve,reject});self.postMessage({id,method,args})});
 const robot=Object.fromEntries(['moveJ','moveTo','grip','release','home','wait'].map(method=>[method,(...args)=>call(method,args)]));
 const world={objects:()=>structuredClone(m.objects)},log=(...args)=>self.postMessage({type:'log',message:args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' ')});
 try{const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;await new AsyncFunction('robot','world','log',`"use strict";\n${m.code}`)(robot,world,log);self.postMessage({type:'done'})}catch(e){self.postMessage({type:'error',message:e.message})}
};
