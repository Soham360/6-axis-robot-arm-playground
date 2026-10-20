export function validatePath(value) {
 const points = Array.isArray(value) ? value : value?.points;
 if (!Array.isArray(points) || points.length > 2000) throw Error('Choose a path with at most 2,000 points.');
 let previous = 0;
 return points.map(p => {
  if (!p || !Array.isArray(p.angles) || p.angles.length !== 6 || !p.angles.every(n => Number.isFinite(n) && Math.abs(n) <= 360) || !Array.isArray(p.xyz) || p.xyz.length !== 3 || !p.xyz.every(Number.isFinite) || !Number.isFinite(p.time) || p.time < previous || typeof p.closed !== 'boolean') throw Error('Invalid path: check coordinates, angles, gripper state and increasing timestamps.');
  previous = p.time;
  return {angles:[...p.angles],xyz:[...p.xyz],time:p.time,closed:p.closed};
 });
}
export function pathDuration(points, speed = 1) {
 if (!Number.isFinite(speed) || speed <= 0) throw Error('Playback speed must be positive.');
 return points.reduce((total,p,i) => total + (i ? Math.max(100,(p.time-points[i-1].time)/speed) : 1000),0);
}
