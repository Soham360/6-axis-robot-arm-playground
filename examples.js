export const examples={
thor:`#include <Axis.h>

// Thor printable arm: positions in mm, Y up.
// Reset scene before running to restore the first cube.
void setup() {
  Serial.begin(9600);
  Arm.moveTo(-220, 220, 200, 1500);
  Arm.moveTo(-220, 45, 200, 1000);
  Arm.grip();
  Arm.moveTo(-220, 270, 200, 1500);
  Arm.moveTo(180, 270, 200, 2000);
  Arm.moveTo(180, 45, 200, 1000);
  Arm.release();
  Arm.moveTo(180, 270, 200, 1000);
  Arm.home();
  Serial.println("Thor delivery complete!");
}
void loop() { delay(1000); }
`,
pick:`#include <Axis.h>

// Axis is this simulator's virtual arm library.
// Positions: mm. Angles: degrees. Duration: ms.
void setup() {
  Serial.begin(9600);
  Arm.moveTo(-650, 375, 450, 800);
  Arm.moveTo(-650, 75, 450, 800);
  Arm.grip();
  Arm.moveTo(-650, 500, 450, 800);
  Arm.moveTo(250, 500, 600, 1000);
  Arm.moveTo(250, 80, 600, 800);
  Arm.release();
  Arm.moveTo(250, 500, 600, 800);
  Arm.home();
  Serial.println("Delivery complete!");
}

void loop() {
  // The board keeps running until you press Stop.
  delay(1000);
}`,
wave:`#include <Servo.h>

Servo base;

void setup() {
  Serial.begin(9600);
  base.attach(2); // J1 default pin; use a servo motor
}

void loop() {
  for (int angle = 60; angle <= 120; angle += 5) {
    base.write(angle); // 90 = joint neutral
    delay(40);
  }
  for (int angle = 120; angle >= 60; angle -= 5) {
    base.write(angle);
    delay(40);
  }
  Serial.println("Hello, world!");
}`,
home:`#include <Axis.h>

void setup() {
  Arm.home();
  Serial.println("Home sweet home.");
}

void loop() {
  delay(1000);
}`,
stepper:`#include <Axis.h>

// Choose Stepper for J1 in Build arm, then Apply.
// Arm.moveJ works with both servos and steppers.
void setup() {
  Serial.begin(9600);
  Arm.home();
}

void loop() {
  Arm.moveJ(-30, -35, 85, 0, 40, 0, 1000);
  delay(300);
  Arm.moveJ(30, -35, 85, 0, 40, 0, 1000);
  delay(300);
}`
};

Object.assign(examples,{
 coordinates:`#include <Axis.h>\nvoid setup(){\n  Arm.home();\n  Arm.moveTo(0, 480, 220, 1500);\n  Serial.println(Arm.x());\n  Serial.println(Arm.y());\n  Serial.println(Arm.z());\n}\nvoid loop(){delay(1000);}`,
 counter:`#include <Axis.h>\nint counter = 0;\nvoid setup(){\n  for(int i=0; i<4; i++){\n    counter += 1;\n    Serial.println(counter);\n    delay(300);\n  }\n}\nvoid loop(){delay(1000);}`,
 whileCounter:`#include <Axis.h>\nint counter = 0;\nvoid setup(){\n  while(counter < 3){\n    Serial.println(counter);\n    counter += 1;\n    delay(300);\n  }\n}\nvoid loop(){delay(1000);}`,
 gripper:`#include <Axis.h>\nvoid setup(){\n  for(int i=0;i<3;i++){\n    Arm.grip();\n    delay(500);\n    Arm.release();\n    delay(500);\n  }\n}\nvoid loop(){delay(1000);}`,
 sensors:`#include <Axis.h>\nvoid setup(){\n  Serial.println(Arm.objectCount());\n  Serial.println(Arm.y());\n  Serial.println(Arm.joint(1));\n  if(Arm.isHolding()){\n    Serial.println("Object held");\n  }else{\n    Serial.println("Gripper is empty");\n  }\n}\nvoid loop(){delay(1000);}`,
 functions:`#include <Axis.h>\nvoid pulseGripper(){\n  Arm.grip();\n  delay(250);\n  Arm.release();\n  delay(250);\n}\nvoid setup(){\n  for(int i=0;i<3;i++){pulseGripper();}\n}\nvoid loop(){delay(1000);}`,
 square:`#include <Axis.h>\n// Load the Trace a square challenge to see target markers.\nvoid setup(){\n  Arm.moveTo(0,400,200,1500);\n  Arm.moveL(80,400,200,1500);\n  Arm.moveL(80,400,280,1500);\n  Arm.moveL(0,400,280,1500);\n  Arm.moveL(0,400,200,1500);\n}\nvoid loop(){delay(1000);}`,
 orientation:`#include <Axis.h>\n// Thor home orientation is approximately roll -15, pitch 0, yaw 0.\n// A custom model needs its own captured orientation.\nvoid setup(){\n  Arm.home();\n  Arm.movePose(0,529.657,184.101,-15,0,0,1500);\n  Serial.println("Home tool pose reached");\n}\nvoid loop(){delay(1000);}`,
 waypoints:`#include <Axis.h>\nvoid setup(){\n  Arm.moveTo(-100,400,200,1500);\n  Arm.moveTo(0,450,250,1500);\n  Arm.moveTo(100,400,200,1500);\n  Arm.home();\n}\nvoid loop(){delay(1000);}`,
 inspectScene:`#include <Axis.h>\nvoid setup(){\n  Serial.println("Loose objects:");\n  Serial.println(Arm.objectCount());\n  delay(500);\n}\nvoid loop(){\n  Serial.println(Arm.isHolding());\n  delay(1000);\n}`,
 jointSweep:`#include <Axis.h>\nvoid setup(){Arm.home();}\nvoid loop(){\n  Arm.moveJ(-20,-25,65,0,35,0,1500);\n  Arm.moveJ(20,-25,65,0,35,0,1500);\n  delay(500);\n}`,
 arithmetic:`#include <Axis.h>\ndouble distance = 40;\ndouble seconds = 0.5;\nvoid setup(){\n  Serial.println(distance * 2);\n  Serial.println(sin(PI / 2));\n  if(distance > 20 && seconds < 2){\n    Serial.println("Both comparisons are true");\n  }\n  delay(seconds * 1000);\n}\nvoid loop(){delay(1000);}`,
 decision:`#include <Axis.h>\nint attempts = 0;\nvoid setup(){\n  if(Arm.objectCount() > 0){\n    attempts += 1;\n    Arm.grip();\n    if(Arm.isHolding()){Serial.println("Pick succeeded");}\n    else{Serial.println("Move closer to an object and try again");}\n  }\n  Serial.println(attempts);\n  delay(500);\n}\nvoid loop(){delay(1000);}`
});
