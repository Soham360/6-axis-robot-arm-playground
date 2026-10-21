import {runSketch} from './arduino.js';
let sequence=0;const pending=new Map();
self.onmessage=async({data:m})=>{if(m.type!=='start'){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.value)}return}
 const call=(method,args)=>new Promise((resolve,reject)=>{const id=sequence++;pending.set(id,{resolve,reject});self.postMessage({id,method,args})});
 try{await runSketch(m.code,{loopLimit:m.loopLimit===0?0:Infinity,call,onStatement:(line,variables)=>call('_trace',[line,variables]),log:message=>self.postMessage({type:'log',message})});self.postMessage({type:'done'})}catch(e){self.postMessage({type:'error',message:e.message})}
};
