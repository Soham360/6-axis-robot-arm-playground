import {validateSceneObject} from './scene-editor.js';
import {validateBlocks} from './blocks-data.js';
import {validateConfig,jointSpecs,normalizeTarget} from './robot-config.js';
import {validatePath} from './path-data.js';
export function validateProject(value){
 if(value?.format!=='axis-project'||value.version!==1)throw Error('Choose an AXIS project version 1 file.');
 const config=validateConfig(value.config),angles=normalizeTarget(value.angles,jointSpecs(config));
 if(typeof value.sketch!=='string'||value.sketch.length>200000)throw Error('Sketch must be text under 200,000 characters.');
 if(!Array.isArray(value.objects)||value.objects.length>100)throw Error('Project supports at most 100 scene objects.');
 const objects=value.objects.map(validateSceneObject);
 if(typeof value.closed!=='boolean')throw Error('Invalid gripper state.');
 return {format:'axis-project',version:1,name:typeof value.name==='string'?value.name.slice(0,80):'Untitled project',config,angles,closed:value.closed,sketch:value.sketch,path:validatePath(value.path),objects,...(value.blocks!==undefined?{blocks:validateBlocks(value.blocks)}:{})};
}
