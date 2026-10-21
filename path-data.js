export function validatePath(value) {
 const points = Array.isArray(value) ? value : value?.points;
 if (!Array.isArray(points) || points.length > 2000) throw Error('Choose a path with at most 2,000 points.');
 let previous = 0;
 return points.map(p => {
  if (!p || !Array.isArray(p.angles) || p.angles.length !== 6 || !p.angles.every(n => Number.isFinite(n) && Math.abs(n) <= 360) || !Array.isArray(p.xyz) || p.xyz.length !== 3 || !p.xyz.every(Number.isFinite) || !Number.isFinite(p.time) || p.time < previous || typeof p.closed !== 'boolean') throw Error('Invalid path: check coordinates, angles, gripper state and increasing timestamps.');
  if(p.duration!==undefined&&(!Number.isFinite(p.duration)||p.duration<100||p.duration>30000))throw Error('Point duration must be 100–30000 ms.');
  previous = p.time;
  return {angles:[...p.angles],xyz:[...p.xyz],time:p.time,closed:p.closed,name:typeof p.name==='string'?p.name.slice(0,80):'',...(p.duration!==undefined?{duration:p.duration}:{})};
 });
}
export function pathDuration(points, speed = 1) {
 if (!Number.isFinite(speed) || speed <= 0) throw Error('Playback speed must be positive.');
 return points.reduce((total,p,i) => total + Math.min(30000,Math.max(100,(p.duration??(i?p.time-points[i-1].time:1000))/speed)),0);
}
