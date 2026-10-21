import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {resolveContacts} from '../teaching.js';
const object=(x,y,z)=>{const m=new T.Mesh(new T.SphereGeometry(.075));m.position.set(x,y,z);return m};
test('arm surface pushes an object out of contact',()=>{const root=new T.Group();root.add(new T.Mesh(new T.BoxGeometry(.2,.2,.2)));const o=object(.13,.1,0);resolveContacts(T,{root},[o],null);assert.ok(o.position.x>=.175)});
test('object inside an arm part exits instead of passing through',()=>{const root=new T.Group();root.add(new T.Mesh(new T.BoxGeometry(.4,.4,.4)));const o=object(.1,.1,0);resolveContacts(T,{root},[o],null);assert.ok(o.position.x>=.275||o.position.y>=.275)});
test('objects separate and remain above the table',()=>{const a=object(.3,.075,0),b=object(.35,.075,0);resolveContacts(T,{root:new T.Group()},[a,b],null);assert.ok(a.position.distanceTo(b.position)>=.15);assert.ok(a.position.y>=.075&&b.position.y>=.075)});
test('held payload is preserved and pushes a free object',()=>{const a=object(.3,.075,0),b=object(.35,.075,0);resolveContacts(T,{root:new T.Group()},[a,b],a);assert.equal(a.position.x,.3);assert.ok(a.position.distanceTo(b.position)>=.15)});

import {selfContacts} from '../kinematics.js';
test('self-contact check flags nonadjacent crossing links',()=>{const points=[[-1,0,0],[1,0,0],[1,1,0],[0,-1,0],[0,1,0],[0,2,0]];const joints=points.map(p=>{const j=new T.Object3D();j.position.fromArray(p);return j});assert.ok(selfContacts({joints,position:()=>new T.Vector3(0,3,0),collisionRadius:.02}).some(m=>m.includes('1 and 4')))});
test('small objects use their model scale for floor and contact separation',()=>{const a=object(.3,.022,0),b=object(.32,.022,0);a.userData.radius=.022;b.userData.radius=.022;resolveContacts(T,{root:new T.Group()},[a,b],null);assert.ok(a.position.distanceTo(b.position)>=.044);assert.equal(a.position.y,.022)});
