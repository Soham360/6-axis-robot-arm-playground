import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProject} from '../project-data.js';
import {thorConfig} from '../robot-config.js';
import {runSketch} from '../arduino.js';
const project=()=>({format:'axis-project',version:1,name:'Test',config:thorConfig(),angles:[0,-25,65,0,35,0],closed:false,sketch:'void setup(){}void loop(){}',path:[],objects:[{shape:'cube',position:[.2,.075,.2]}]});
test('projects round-trip all workspace data without retaining input references',()=>{const input=project(),out=validateProject(JSON.parse(JSON.stringify(input)));assert.deepEqual(out,input);out.objects[0].position[0]=1;assert.equal(input.objects[0].position[0],.2)});
test('project validation rejects invalid geometry, poses, objects and path data',()=>{for(const patch of [{version:2},{angles:[0,200,0,0,0,0]},{objects:[{shape:'script',position:[0,0,0]}]},{objects:[{shape:'cube',position:[Infinity,0,0]}]},{path:[{}]}])assert.throws(()=>validateProject({...project(),...patch}))});
test('debugger pauses before statements and resumes without skipping commands',async()=>{const order=[];let release,entered;const waiting=new Promise(r=>entered=r);const execution=runSketch('void setup(){\nArm.home();\nArm.grip();\n}void loop(){}',{loopLimit:0,log:()=>{},call:async method=>order.push(method),onStatement:async line=>{order.push(line);if(line===2){entered();await new Promise(r=>release=r)}}});await waiting;assert.deepEqual(order,[2]);release();await execution;assert.deepEqual(order,[2,'home',3,'grip'])});
