// Arrange existing controls before app.js wires up the shared workbench tabs.
const aside=document.querySelector('main>aside'),tabs=aside.querySelector('.tabs');
for(const [id,label,selector] of [['position-tool','Position tool','.positioning'],['path','Teach path','.recorder'],['scene-objects','Scene objects','.objects']]){
 const content=document.querySelector(selector),panel=document.createElement('section');panel.id=id;panel.className='panel workspace-control-panel';panel.hidden=true;
 const button=document.createElement('button');button.dataset.tab=id;button.textContent=label;tabs.append(button);panel.append(content);aside.insertBefore(panel,aside.querySelector('.console'));
}
document.body.classList.add('simulation-workspace');document.body.dataset.workspacePane='scene';
const switcher=document.createElement('div');switcher.className='workspace-pane-switch';switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Workspace view');
for(const [value,label] of [['scene','3D scene'],['controls','Controls']]){const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-pressed',String(value==='scene'));button.onclick=()=>{document.body.dataset.workspacePane=value;for(const b of switcher.children)b.setAttribute('aria-pressed',String(b===button))};switcher.append(button)}
document.querySelector('header').append(switcher);
