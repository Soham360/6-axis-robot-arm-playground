"""Convert pinned upstream COLLADA display meshes to indexed browser buffers.
Print STLs are preserved separately, unchanged and in millimeters.
"""
from pathlib import Path
import xml.etree.ElementTree as E
import numpy as np,json,math,re
root=Path(__file__).resolve().parents[1]; source=root.parent/'outputs'; dest=root/'assets/thor'
meshes={}
for f in source.glob('*.dae'):
 r=E.parse(f).getroot();ns={'c':r.tag.split('}')[0][1:]}; geometries={e.attrib['id']:e for e in r.findall('c:library_geometries/c:geometry',ns)}
 effects={e.attrib['id']:[float(v) for v in e.find('.//c:diffuse/c:color',ns).text.split()][:3] for e in r.findall('c:library_effects/c:effect',ns)}
 materials={m.attrib['id']:effects[m.find('c:instance_effect',ns).attrib['url'][1:]] for m in r.findall('c:library_materials/c:material',ns)}
 chunks=[]; descriptors=[]; offset=0
 def walk(n,parent):
  global offset
  matrix=parent.copy()
  for e in n.findall('c:matrix',ns):matrix=matrix@np.array([float(v) for v in e.text.split()]).reshape(4,4).T
  for inst in n.findall('c:instance_geometry',ns):
   mesh=geometries[inst.attrib['url'][1:]].find('c:mesh',ns)
   sources={s.attrib['id']:np.array([float(v) for v in s.find('c:float_array',ns).text.split()]).reshape(-1,int(s.find('c:technique_common/c:accessor',ns).attrib.get('stride',1))) for s in mesh.findall('c:source',ns)}
   vertices={v.attrib['id']:v.find('c:input',ns).attrib['source'][1:] for v in mesh.findall('c:vertices',ns)}
   bindings={b.attrib['symbol']:materials[b.attrib['target'][1:]] for b in inst.findall('.//c:instance_material',ns)}
   for tri in mesh.findall('c:triangles',ns):
    inputs=tri.findall('c:input',ns);stride=max(int(i.attrib.get('offset',0)) for i in inputs)+1
    inp=next(i for i in inputs if i.attrib['semantic']=='VERTEX');ids=np.fromstring(tri.find('c:p',ns).text,dtype=int,sep=' ').reshape(-1,stride)[:,int(inp.attrib.get('offset',0))]
    positions=sources[vertices[inp.attrib['source'][1:]]][:,:3];world=(np.c_[positions,np.ones(len(positions))]@matrix.T)[:,:3]
    # Keep indexing; compute smooth normals in Three.js on load.
    data=world.astype('<f4').tobytes(); indices=ids.astype('<u4').tobytes();color=bindings.get(tri.attrib.get('material'),[.65,.65,.65])
    descriptors.append({'offset':offset,'vertices':len(world),'indices':len(ids),'color':color});chunks.extend([data,indices]);offset+=len(data)+len(indices)
  for c in n.findall('c:node',ns):walk(c,matrix)
 for node in r.findall('.//c:visual_scene/c:node',ns):walk(node,np.eye(4))
 (dest/(f.stem+'.bin')).write_bytes(b''.join(chunks));meshes[f.stem]=descriptors
r=E.parse(dest/'thor.urdf.xacro').getroot()
def nums(s):
 s=re.sub(r'\$\{PI\s*/\s*2\}',str(math.pi/2),s);s=s.replace('${PI}',str(math.pi));return [float(v) for v in s.split()]
links=[]
for l in r.findall('link'):
 visual=l.find('visual');v=None
 if visual is not None:
  o=visual.find('origin');v={'mesh':Path(visual.find('geometry/mesh').attrib['filename']).stem,'xyz':nums(o.attrib.get('xyz','0 0 0')),'rpy':nums(o.attrib.get('rpy','0 0 0'))}
 collisions=[]
 for c in l.findall('collision'):
  o=c.find('origin');g=list(c.find('geometry'))[0];collisions.append({'xyz':nums(o.attrib.get('xyz','0 0 0')),'rpy':nums(o.attrib.get('rpy','0 0 0')),'type':g.tag,**{k:nums(v) if k=='size' else float(v) for k,v in g.attrib.items()}})
 links.append({'name':l.attrib['name'],'visual':v,'collisions':collisions})
joints=[]
for j in r.findall('joint'):
 o=j.find('origin');a=j.find('axis');limit=j.find('limit');m=j.find('mimic');joints.append({'name':j.attrib['name'],'type':j.attrib['type'],'parent':j.find('parent').attrib['link'],'child':j.find('child').attrib['link'],'xyz':nums(o.attrib.get('xyz','0 0 0')),'rpy':nums(o.attrib.get('rpy','0 0 0')),'axis':nums(a.attrib['xyz']) if a is not None else [0,0,1],'limit':{k:nums(limit.attrib[k])[0] for k in ['lower','upper']} if limit is not None else None,'speed':float(limit.attrib['velocity']) if limit is not None and not limit.attrib['velocity'].startswith('$') else 1,'mimic':m.attrib if m is not None else None})
(dest/'model.json').write_text(json.dumps({'meshes':meshes,'links':links,'joints':joints},separators=(',',':')))
print('Converted',len(meshes),'meshes;',sum(f.stat().st_size for f in dest.glob('*.bin')),'bytes')
