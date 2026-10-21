# AXIS — robotics workbench

Live website: https://soham360.github.io/AXIS/

Run `node server.js` with Node.js 20 or newer, then visit the printed local address (default http://127.0.0.1:5173). All display assets, Three.js, and robot geometry are included locally. No build or internet connection is needed for simulation. External documentation and individual upstream part links require internet.

## Models and printable hardware

The default model is **Thor**, an existing open-source six-axis printable robot by Ángel Larrañaga Muro and Thor contributors. Its assembly meshes, link origins, joint axes, gripper mimic joints, limits and velocity caps come from the official Thor-ROS model. Z-up upstream frames are transformed to the workbench's Y-up coordinates. The joint solver targets tool position, not a requested tool orientation. Original fixed geometry is preserved; changing motor settings can lower speed caps. Torque, loading, drivetrain coupling and electronics are not simulated.

Build arm provides a ZIP containing all 49 unchanged original STL files, attribution/license, and links to the original FreeCAD sources, bill of materials and assembly instructions. Parts use millimeters. Follow upstream instructions for quantities, orientation, material and supports; hardware and firmware must also be sourced. AXIS's virtual Axis.h library is not Thor firmware.

- Hardware: https://github.com/AngelLM/Thor at `286b081fe6f056d87c379b884781ef77ff6a0159`.
- Assembly display: https://github.com/AngelLM/Thor-ROS at `e11a56b5aa0d89f0b68a3ea7bd084eab4a050952`.
- Hardware/display attribution and CC BY-SA 4.0 license: `assets/thor/`.
- Printable originals: `downloads/thor-print-parts.zip`.
- Mesh conversion: `scripts/convert-thor.py`; converts original COLLADA vertices, transforms, materials and triangle indices to local binary buffers. It needs NumPy and the pinned source meshes in the sibling outputs directory. Print meshes are never modified by conversion.

Choose **AXIS · customizable geometry** for configurable link dimensions and generic servo/stepper profiles. This model is an educational mechanism; the Thor print files apply only to the fixed Thor model. Higher gear ratios lower output speed and servo travel. Stepper motion is quantized in the custom model. Geometry changes may invalidate stored path coordinates; validate or rerecord those points.

## Workbench

Drag the background to orbit, scroll to zoom, and right-drag to pan. Use Perspective, Front, Top, Side or Fullscreen. On desktop the viewport remains visible while editing the movement timeline. The reach overlay shows sampled tool positions within joint limits; it does not certify obstacle avoidance or continuous coverage.

Enter exact X/Y/Z coordinates in millimeters, with Y up. Choose travel time and Move to target, or use 1/5/10/25 mm jog buttons. Unreachable targets preserve the previous pose. Requested and motor-aware durations are shown separately; smoothstep interpolation respects peak motor speed.

Joint controls pose each joint directly. Joint-limit warnings and centerline-based self-contact checks flag possible intersections between nonadjacent links. These are approximate warnings, not collision prevention or a full physics model. Scene objects use conservative link collision shapes, round object proxies and simple gravity. Thor objects are scaled to its gripper; the larger custom model uses larger objects. No mass, friction, torque or complete mesh collision is modeled.

## Timeline and projects

Record point captures joint angles, coordinates and gripper state. Rename, reorder, update, delete or go to any point. Every point has an editable travel time (0.1–30 s) and open/closed gripper action. Play path highlights the active point; playback speed is 0.5×/1×/2×, subject to motor limits. The displayed estimate accounts for current joint pose and speeds. Tool paths between points can curve because playback interpolates joint angles. Undo removes the last point; Clear removes the path. Path JSON and virtual Axis.h .ino exports are available.

Save project downloads one `.axis.json` containing model/build, sketch, current angles, gripper state, scene objects and the complete path. Open project validates the whole file before restoring it. A snapshot is autosaved every five seconds; Restore autosave appears after reloading. Save a project file for a durable backup. Browser storage can be unavailable or cleared. Project files support up to 100 scene objects, 2,000 path points and 200,000 sketch characters.

Load demo restores a complete Thor pick-and-place experiment with six editable path points. Guided first task walks through joint motion, Cartesian positioning, object handling, path teaching and saving, with completion feedback.

## Arduino subset and debugging

The editor interprets a bounded Arduino/C++ subset in a dedicated worker. `setup()` runs once; `loop()` repeats until Stop. This is not an AVR compiler or arbitrary library runtime. Unsupported syntax produces a source-line error.

- Ctrl/Cmd+Enter runs; Escape stops all motion.
- Step starts paused before the first statement. Step executes a statement and its commanded motion/delay, then waits at the next statement. A loop/conditional header and its body may be separate steps.
- Pause freezes programmed movement, servo motion and simulated delays; Resume continues. Stop terminates the worker, including tight infinite loops.
- The gutter highlights the current statement. Errors identify and select the source line. The sketch and example selector are read-only while a sketch runs.

`#include <Axis.h>` exposes blocking `Arm.moveJ(j1,j2,j3,j4,j5,j6,ms=1000)`, `Arm.moveTo(x,y,z,ms=1000)`, `Arm.grip()`, `Arm.release()` and `Arm.home()`. Coordinates are millimeters, angles degrees from neutral; motor limits may lengthen a requested duration. `delay(ms)` supports 0–30000 ms. Serial.begin/print/println are supported.

`#include <Servo.h>` supports Servo.attach/write/read/detach/attached on servo-configured joints in the custom model. Pins 2–7 map to J1–J6 by default; pin 8 is the gripper. Write 90 is joint neutral, subject to limits; gripper values below 90 close it. Servo cannot drive the Thor stepper axes. Use the Thor or coordinated joints examples for Thor, and select the custom model for the servo example.

Also supported: scalar declarations, fixed arrays, functions, if/else, for/while, break/continue/return, arithmetic/comparisons/logical expressions, millis, abs/min/max/sin/cos/sqrt/constrain/map. Browser numeric arithmetic applies; AVR integer widths, timing and overflow are not emulated. Pointers, classes, macros, GPIO, interrupts and other libraries are unsupported.

## Tests and deployment

Run `npm test` or `node --test tests/*.test.js`. Tests cover sketch semantics and interruption, debugger statement gating, project validation, path timing, actual Thor frames and inverse kinematics, motor limits, collision proxies, and static delivery of every runtime asset and print archive.

Deploy the complete root, including `vendor/`, `assets/` and `downloads/`. The static site requires no backend. Local preview uses a restrictive Content Security Policy with self-only asset fetching. Three.js r170 and OrbitControls retain their MIT licenses. Robot mechanical/display assets retain their upstream attribution and licenses.

## Visual block coding

Code editor contains **Arduino** and **Blocks** mode buttons. Clicking Blocks parses the current sketch into visual blocks; clicking Arduino generates the sketch from any block changes. Switching without editing blocks preserves the original source, comments and formatting exactly. Block values synchronize into project autosaves as well.

Conversion supports Axis moveTo/moveJ/home/grip/release, delay, Serial.println messages, simple scalar constants, and fixed-count for loops starting at zero with ++ increments. Separate setup and loop actions appear as startup and repeating stacks. Commands without visual equivalents, including Servo objects, dynamic loops, conditionals and custom functions, keep the editor in Arduino mode with a line-specific explanation and leave the source untouched. These sketches still run in Arduino mode.

Add blocks from Motion, Gripper, Control or Messages. Drag onto insertion slots to reorder or nest blocks; + buttons, up/down controls and Add inside repeat menus also work without dragging. Motion blocks can capture the current pose. Nested repeats, Undo, duplicate, remove, a starter program and Arduino download are included.

Block programs use the same motor-limited worker interpreter as sketches. Pause/Resume and Step highlight the executing block. A run-once stack finishes automatically; repeating stacks continue until Stop or Escape. Blocks and the synchronized sketch are included in project files.
