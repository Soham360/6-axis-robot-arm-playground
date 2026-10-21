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
