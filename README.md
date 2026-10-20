# AXIS · 6-axis robot arm playground

A browser-based 3D robotics sandbox. Write JavaScript to control six articulated joints, grab objects, and create pick-and-place routines.

## Run

Install Node.js 20 or newer, then run `node server.js` and visit http://127.0.0.1:5173. No package installation or build is needed. Alternatively serve this folder with any static HTTP server. Opening index.html directly as a file will not work with JavaScript modules and workers.

## Explore

- Drag the scene to orbit, scroll to zoom, and right-drag to pan.
- Run the default Pick & place example, or choose Wave hello.
- Use Joint controls for all six axes and the gripper.
- Add cubes, cylinders, or spheres; Reset scene restores the original three objects.
- Programs are saved in this browser. Ctrl/Cmd+Enter runs the editor.
- Stop terminates the program worker, including infinite loops.

## Code API

```js
const item = world.objects()[0];
await robot.moveTo(item.position.x, 0.4, item.position.z);
await robot.moveTo(item.position.x, item.position.y, item.position.z);
await robot.grip();
await robot.moveTo(item.position.x, 0.5, item.position.z);
await robot.release();
await robot.home();
log('Done!');
```

`robot.moveJ([j1,j2,j3,j4,j5,j6], seconds=1)` moves joints in degrees. `robot.moveTo(x,y,z,seconds=1)` uses inverse kinematics in meters, with Y up. `robot.wait(seconds)` pauses. Await each command in sequence. `world.objects()` returns a snapshot from the start of the program.

Joint limits: J1 ±180°, J2 ±100°, J3 ±145°, J4 ±180°, J5 ±120°, J6 ±180°. Unreachable positions report an error. Motion and waits allow durations from 0 to 30 seconds.

This is an educational kinematic simulator. Grasping uses a 0.19 m proximity threshold; released objects settle on the table. It does not simulate rigid-body collisions, torque, self-collision, or real robot safety. Programs run in a worker, not a security boundary for untrusted code. Serve on a dedicated origin. The local server prevents outbound network connections through a Content Security Policy.

## Hosting

All app files are static. Deploy this directory to GitHub Pages or any static host. Keep `vendor/`, `app.js`, and `runner.js` next to `index.html`. Three.js r170 and OrbitControls are vendored with their MIT license, so the simulator needs no CDN to run. Optional Google Fonts fall back to system fonts offline.

## Checks

Run `node --test tests/*.test.js` to verify the worker command protocol, program errors, and loop termination.
