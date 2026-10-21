# AXIS — robotics workbench

Live website: https://soham360.github.io/AXIS/

Run `node server.js` with Node.js 20 or newer, then visit the printed local address (default http://127.0.0.1:5173). All display assets, Three.js, and robot geometry are included locally. No build or internet connection is needed for simulation. External documentation and individual upstream part links require internet.

## Models and printable hardware

The default model is **Thor**, an existing open-source six-axis printable robot by Ángel Larrañaga Muro and Thor contributors. Its assembly meshes, link origins, joint axes, gripper mimic joints, limits and velocity caps come from the official Thor-ROS model. Z-up upstream frames are transformed to the workbench's Y-up coordinates. Position and orientation can be constrained together using world XYZ Euler angles. Straight-line tool moves plan intermediate IK solutions. Original fixed geometry is preserved; changing motor settings can lower speed caps. Torque, loading, drivetrain coupling and electronics are not simulated.

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

Conversion supports Axis moveTo/moveJ/home/grip/release, delay, Serial.println messages, simple scalar constants, and fixed-count for loops starting at zero with ++ increments. Separate setup and loop actions appear as startup and repeating stacks. Conversion supports scalar variables, arithmetic, sensor expressions, if/else, while loops, fixed repeats and no-argument functions. Commands without visual equivalents, including Servo objects, arrays and functions with parameters, keep the editor in Arduino mode with a line-specific explanation and leave the source untouched. These sketches still run in Arduino mode.

Add blocks from Motion, Gripper, Control or Messages. Drag onto insertion slots to reorder or nest blocks; + buttons, up/down controls and Add inside repeat menus also work without dragging. Motion blocks can capture the current pose. Nested repeats, Undo, duplicate, remove, a starter program and Arduino download are included.

Block programs use the same motor-limited worker interpreter as sketches. Pause/Resume and Step highlight the executing block. A run-once stack finishes automatically; repeating stacks continue until Stop or Escape. Blocks and the synchronized sketch are included in project files.

## Expanded studio tools

The Tools tab contains Scene editor, Path planning, Debugger & telemetry, Practice challenges, Fabrication workspace and Hardware connection.

- Motion: the main positioning form offers world XYZ roll/pitch/yaw constraints and straight tool-line movement. Capture the current orientation as a starting point. `Arm.moveL(x,y,z,ms)` plans a line; `Arm.movePose(x,y,z,roll,pitch,yaw,ms)` constrains orientation. All intermediate poses must be reachable. Smooth interpolation and motor caps may extend the requested duration.
- Planning: every programmed joint move samples at up to two-degree steps. Preflight colors the tool route and flags conservative self/table/object/fixture contacts. Check taught path analyzes the whole timeline. Reject-on-contact is optional and applies to programmed/target moves; manual direct posing still reports warnings. Sampling and proxy geometry do not certify physical clearance.
- Scene: select by clicking or by name, edit position and dimensions, duplicate/delete, add fixed fixtures or bins. Scene properties are included in project files. Loose objects use approximate gravity, support heights and contact proxies; this is not a rigid-body dynamics engine.
- Blocks: variables, assignments, arithmetic/comparison/logic expressions, if/else, while, repeat, no-argument function definitions and calls, sensor reads, orientation and straight-line blocks. Zoom, Space-drag panning, insertion snapping, collapsible groups, a minimap and Alt-arrow reordering support larger programs. Delete removes the focused block; standard undo applies outside text fields.
- Debugging: toggle breakpoints in the gutter or enter comma-separated line numbers. The variable inspector shows scope before a statement; values are bounded for display. Command history retains 100 entries and telemetry retains 600 samples (about 60 seconds at 10 Hz). Export joint/tool CSV from the debugger.
- Fabrication: all 49 original STL designs have local indexed mesh previews with millimeter bounds. Assembly and exploded-link views illustrate the mechanism. Editable planned/printed quantities and a hardware shopping list persist locally and export to CSV. Planned quantities default to one per design and must be verified against the upstream BOM and instructions. No mechanical validation or purchase is implied.
- Challenges: grasp, sort, square tracing, fixture clearance, stacking and conditional logic have local completion tracking. Loading a challenge replaces scene objects.

Sensors `Arm.isHolding()`, `Arm.objectCount()`, `Arm.x()/y()/z()` and `Arm.joint(1..6)` read simulation state. They do not read a physical controller.

## Hardware bridge

Web Serial is available only in supported secure browser contexts. Connection requires a user-selected port and the `AXIS READY 1` handshake. Calibration maps six logical joints to unique servo channels, zeros, directions and output bounds. Explicit arming attaches outputs at the six calibrated neutral positions; Send current pose is a separate action. Simulation never streams commands automatically. A demo bridge exercises the UI without a physical device.

The included `downloads/axis-servo-bridge.ino` targets six positional servos on pins 2–7 at 115200 baud. It is a reference bridge for a matching servo controller, not Thor firmware. Thor's stepper hardware needs a separate controller-specific adapter. It has not been tested on physical hardware in this workspace. The firmware implements HELLO, ARM, MOVE, PING and STOP, interpolates commands, and detaches outputs when a 1.5-second heartbeat watchdog expires. STOP detaches outputs and requires rearming. Detaching can release holding torque: a physical cutoff and an appropriate mechanical setup remain necessary.

## Learning library

Learn robotics provides 20 searchable lessons across foundations, programming, motion, workflow, fabrication and hardware. Each lesson includes an exercise and an interactive knowledge check with local progress. Arduino examples provides 18 searchable, filterable programs with model selection, suggested experiments, copy and `.ino` download. Related examples open the appropriate robot model.

## Expanded lessons and assistant

All 20 lessons include full reading, worked examples, four-step practice, troubleshooting and reflection alongside the quiz and independent exercise. Expand Read the full lesson to continue. Ask about this lesson opens contextual help.

Ask AXIS is available on all three pages. The built-in guide works offline and clearly identifies its lesson-based guidance. Optional generative AI uses a server-only Responses API connection; sketches are shared only with explicit selection. See [AI_SETUP.md](AI_SETUP.md) for local and hosted configuration, privacy, limits and deployment verification. No API key is bundled and AI replies remain disabled until configured.
