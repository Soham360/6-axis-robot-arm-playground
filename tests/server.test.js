import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
test('static preview serves every app module, with a valid import map CSP',async()=>{
  process.env.PORT='0';const {server}=await import('../server.js');
  if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  try{const base=`http://127.0.0.1:${server.address().port}`,response=await fetch(base),html=await response.text();assert.equal(response.status,200);
    const map=html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];assert.ok(map);assert.equal(JSON.parse(map).imports.three,'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
    const hash=createHash('sha256').update(map).digest('base64');assert.ok(response.headers.get('content-security-policy').includes(`'sha256-${hash}'`));
    for(const file of ['app.js','arduino.js','examples.js','robot-config.js','robot-model.js','runner.js','vendor/OrbitControls.js','style.css']){const r=await fetch(base+'/'+file);assert.equal(r.status,200,file);assert.ok((await r.text()).length>100)}
    assert.equal((await fetch(base+'/.git/config')).status,403);
  }finally{await new Promise(r=>server.close(r));delete process.env.PORT}
});
