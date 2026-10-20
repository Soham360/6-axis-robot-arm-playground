# AXIS · 6-axis robot arm playground

A browser-based 3D robot sandbox with customizable limbs, motors and Arduino sketches.

Live: https://soham360.github.io/AXIS/

## Run locally

With Node.js 20+: run `node server.js`, then open http://127.0.0.1:5173. No build is needed. Any static HTTP server also works. JavaScript modules and workers require HTTP; opening index.html as a file does not work. An internet connection is required to load the version-pinned Three.js module from jsDelivr.

## Build your arm

Open **Build arm** to edit base height, upper-arm and forearm lengths, wrist/tool lengths and link width in millimeters. Apply rebuilds the actual model and inverse kinematics.

Choose a generic positional servo (180° or 270° travel) or 200-step/revolution stepper for each of six joints. Configure motor shaft speed, gear reduction, pin assignment, and stepper microsteps. Motor speed and gearing constrain movement duration; stepper targets are quantized. Gearing also reduces positional servo travel. Shoulder, elbow and wrist-pitch motor housings change size with the profile.

These are educational profiles, not specifications of actual products. Torque, electrical circuits and loading are not simulated. Scene objects respond to arm contacts, other objects, and gravity using conservative arm boxes and 75 mm round object proxies; this is simplified contact behavior rather than a rigid-body dynamics engine. Manual sliders directly pose the joints; programmed movements respect motor speeds.

Applied builds and sketches are saved locally in the browser. Export/import build JSON to share a configuration. Applying a build stops the sketch and releases any payload. Reset scene resets objects and pose while keeping your build.

## Arduino sketches

The editor interprets a bounded Arduino/C++ subset in a dedicated worker. `setup()` runs once and `loop()` repeats until Stop. This is **not** an AVR emulator or a compiler for arbitrary Arduino libraries. Unsupported syntax reports errors. Old JavaScript programs remain in their previous browser storage key but are not loaded into the Arduino editor.

```cpp
#include <Servo.h>
Servo base;

void setup() {
  base.attach(2);
}

void loop() {
  base.write(120);
  delay(500);
  base.write(60);
  delay(500);
}
```

Default joint pins are 2–7 for J1–J6. Pin 8 is reserved for the gripper. Servo.write accepts 0–180° with 90° mapped to joint neutral, subject to motor and mechanical limits. Servo writes set a target and return immediately; multiple axes can move together. Servo.read returns the last requested angle. Gripper angles below 90 close it; 90 or above open it. Servo objects cannot attach to stepper axes.

### Virtual Axis library

`#include <Axis.h>` exposes simulator-specific blocking commands:

- `Arm.moveJ(j1,j2,j3,j4,j5,j6,ms=1000)`: joint angles in degrees from neutral.
- `Arm.moveTo(x,y,z,ms=1000)`: tool position in **millimeters**, Y up. Uses current geometry and motor limits.
- `Arm.grip()`, `Arm.release()`, `Arm.home()`.

Motor speed may extend requested movement duration. Arm commands work with either servo or stepper axes. Axis.h is a virtual API; it requires a hardware-specific implementation before compiling for a physical robot. Changing dimensions/limits can make example coordinates unreachable; the console reports this.

### Supported subset

Scalar declarations (int, long, float, double, bool, String, char), const, fixed-size arrays, user functions, if/else, for/while, break/continue/return, arithmetic/comparison/logical expressions, comments, Servo arrays, attach/write/read/detach/attached, Serial.begin/print/println, delay, millis, abs/min/max/sin/cos/sqrt/constrain/map. Durations are 0–30000 ms. Numeric arithmetic uses browser numbers; AVR integer widths, overflow, exact hardware timing and integer-division semantics are not emulated.

Only Servo.h and Axis.h includes are supported. No pointers, classes, macros, arbitrary libraries, GPIO or interrupts. The interpreter cannot call JavaScript globals or execute JavaScript. Stop terminates the worker, including infinite loops. An instruction budget limits tight computations; use delay() in repeated loops.

## Workbench

Drag to orbit, scroll to zoom, right-drag to pan. Add cubes, cylinders and spheres; use the default Pick & place sketch to move the first cube. The gripper grabs within 160 mm of the tool. Released objects fall to the table. Ctrl/Cmd+Enter runs a sketch; API guide has the command reference and .ino download.

## Hosting and checks

All runtime files are static. Deploy the root with **all modules and vendor/OrbitControls.js** intact. The import map resolves Three.js r170 from a version-pinned CDN URL; OrbitControls and its MIT license are included. A loading/error message stays visible if the rendering module fails to load. Fonts are optional.

For tests, install the pinned development dependency with `npm install`, then run `npm test` (or `node --test tests/*.test.js`). Tests cover sketch semantics, worker interruption, input validation, geometry, inverse kinematics and motor behavior.

## Learn and teach

Use Learn robotics for lessons on joints, coordinates, reach, object handling, arm design, and teaching paths. Arduino examples contains four annotated sketches with links that load them into the simulator.

Drag the blue tool handle to teach on a horizontal plane. Adjust Tool height for vertical motion or use Joint controls. Click Record point at each pose, then Play path to interpolate the captured joint angles. Coordinates, angles, elapsed capture times and gripper state are saved locally. Motor limits can extend requested playback times. The blue polyline connects captured coordinates; interpolated joint motion may curve between them. Stop interrupts playback; Clear path removes the saved path. Export .ino creates an Axis.h sketch. Rerecord after changing the arm build.

Collision response runs in small angular steps during arm movement to reduce tunneling. Shapes are approximations, and contacts do not model friction, mass, torque, or self-collision.
