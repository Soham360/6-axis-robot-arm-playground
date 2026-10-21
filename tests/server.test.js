import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
test('static preview serves every app module, with a valid import map CSP',async()=>{
  process.env.PORT='0';const {server}=await import('../server.js');
  if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  try{const base=`http://127.0.0.1:${server.address().port}`,response=await fetch(base),html=await response.text();assert.equal(response.status,200);
    const map=html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];assert.ok(map);assert.equal(JSON.parse(map).imports.three,'./vendor/three.module.js');
    const hash=createHash('sha256').update(map).digest('base64');assert.ok(response.headers.get('content-security-policy').includes(`'sha256-${hash}'`));
    for(const file of ['app.js','arduino.js','examples.js','robot-config.js','robot-model.js','runner.js','teaching.js','path-data.js','project-data.js','workbench.js','block-editor.js','blocks-data.js','studio.js','motion-planner.js','scene-editor.js','fabrication.js','debugger.js','hardware.js','challenges.js','curriculum.js','learn-page.js','example-notes.js','assets/thor/parts/GripperFinger.bin','downloads/axis-servo-bridge.ino','kinematics.js','thor-model.js','assets/thor/model.json','assets/thor/Base.bin','assets/thor/parts.json','assets/thor/LICENSE.txt','downloads/thor-print-parts.zip','learn.html','examples.html','examples-page.js','vendor/three.module.js','vendor/OrbitControls.js','style.css','design.css','assistant.js','assistant-knowledge.js','assistant-config.js','lesson-details.js']){const r=await fetch(base+'/'+file);assert.equal(r.status,200,file);assert.ok((await r.text()).length>100)}
    assert.equal((await fetch(base+'/.git/config')).status,403);
    assert.equal((await fetch(base+'/.env')).status,403);
    const available=await fetch(base+'/api/assistant');assert.equal(available.status,200);assert.equal(typeof (await available.json()).available,'boolean');
    assert.equal((await fetch(base+'/api/assistant',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
    const savedKey=process.env.OPENAI_API_KEY,savedModel=process.env.OPENAI_MODEL;delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MODEL;
    try{assert.deepEqual(await (await fetch(base+'/api/assistant')).json(),{available:false});assert.equal((await fetch(base+'/api/assistant',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({question:'help'})})).status,503)}finally{if(savedKey!==undefined)process.env.OPENAI_API_KEY=savedKey;if(savedModel!==undefined)process.env.OPENAI_MODEL=savedModel}

  }finally{await new Promise(r=>server.close(r));delete process.env.PORT}
});
