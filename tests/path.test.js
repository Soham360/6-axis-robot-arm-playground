import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePath,pathDuration} from '../path-data.js';
const point = time => ({angles:[0,0,0,0,0,0],xyz:[100,200,300],time,closed:false});
test('path import accepts an envelope and copies data',()=>{const p=point(0),out=validatePath({points:[p]});out[0].angles[0]=10;assert.equal(p.angles[0],0)});
test('path import rejects malformed or unordered points',()=>{for(const value of [[point(-1)],[point(100),point(0)],[{...point(0),closed:'false'}],[{...point(0),angles:[NaN]}],{}])assert.throws(()=>validatePath(value))});
test('duration follows speed and minimum movement duration',()=>{assert.equal(pathDuration([point(0),point(1000)],2),1000);assert.equal(pathDuration([point(0),point(10)],2),600)});

test('explicit point durations survive import and drive timing',()=>{const p={...point(0),duration:2500};assert.equal(validatePath([p])[0].duration,2500);assert.equal(pathDuration([p],.5),5000);assert.throws(()=>validatePath([{...p,duration:0}]))});
