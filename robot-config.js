export const JOINT_NAMES = ['Base', 'Shoulder', 'Elbow', 'Wrist roll', 'Wrist pitch', 'Tool'];
export const MECHANICAL_LIMITS = [180, 100, 145, 180, 120, 180];
// Generic educational profiles, not specifications of a particular product.
export const MOTORS = {
  servo180: { name: 'Positional servo · 180°', range: 90, speed: 300, size: 1, steps: 0 },
  servo270: { name: 'Positional servo · 270°', range: 135, speed: 220, size: 1.15, steps: 0 },
  stepper: { name: 'Stepper · 200 steps/rev', range: 180, speed: 120, size: 1.35, steps: 200 },
};
export const DIMENSIONS = {
  base: { label: 'Base height', min: 120, max: 500, value: 320 },
  upper: { label: 'Upper arm length', min: 200, max: 1000, value: 700 },
  forearm: { label: 'Forearm length', min: 200, max: 1000, value: 580 },
  wrist: { label: 'Wrist length', min: 80, max: 300, value: 160 },
  tool: { label: 'Tool length', min: 100, max: 350, value: 240 },
  thickness: { label: 'Link width', min: 40, max: 200, value: 140 },
};
export function defaultConfig() {
  return { dimensions: Object.fromEntries(Object.entries(DIMENSIONS).map(([k,v])=>[k,v.value])),
    motors: JOINT_NAMES.map((_,i)=>({ type: 'servo270', speed: 220, gear: 1, microsteps: 16, pin: i+2 })) };
}
export function validateConfig(config) {
  if(config?.model!==undefined&&!['thor','custom'].includes(config.model))throw Error('Choose Thor or the custom AXIS arm.');
  if (!config?.dimensions || !Array.isArray(config.motors) || config.motors.length!==6) throw Error('Configuration needs dimensions and six motors.');
  for (const [key, spec] of Object.entries(DIMENSIONS)) {
    const value=config.dimensions[key];
    if (!Number.isFinite(value)||value<spec.min||value>spec.max) throw Error(`${spec.label} must be ${spec.min}–${spec.max} mm.`);
  }
  const pins=new Set();
  for (const [i,m] of config.motors.entries()) {
    if (!MOTORS[m.type]) throw Error(`Choose a supported motor for J${i+1}.`);
    if (!Number.isFinite(m.speed)||m.speed<1||m.speed>720) throw Error(`J${i+1} motor speed must be 1–720°/s.`);
    if (!Number.isFinite(m.gear)||m.gear<1||m.gear>20) throw Error(`J${i+1} gear ratio must be 1–20.`);
    if (![1,2,4,8,16,32].includes(m.microsteps)) throw Error('Choose a supported microstep setting.');
    if (!Number.isInteger(m.pin)||m.pin<2||m.pin>13||m.pin===8||pins.has(m.pin)) throw Error('Use unique joint pins from 2–13; pin 8 is reserved for the gripper.');
    pins.add(m.pin);
  }
  return structuredClone(config);
}
export function thorConfig(){const c=defaultConfig();c.model='thor';c.motors=c.motors.map(m=>({...m,type:'stepper',speed:90}));return c}
export function jointSpecs(config) {
  if(config.model==='thor')return config.motors.map((m,i)=>({min:-([170,90,90,170,90,170][i]),max:[170,90,90,170,90,170][i],speed:Math.min([.58,.23,.23,.58,1.45,1.45][i]*180/Math.PI,m.speed/m.gear),step:0,pin:m.pin,type:'stepper'}));
  return config.motors.map((m,i)=>{
    const profile=MOTORS[m.type], range=Math.min(MECHANICAL_LIMITS[i],profile.steps?Infinity:profile.range/m.gear);
    return { min:-range, max:range, speed:m.speed/m.gear,
      step:profile.steps?360/(profile.steps*m.microsteps*m.gear):0, pin:m.pin, type:m.type };
  });
}
export function normalizeTarget(target, specs) {
  if (!Array.isArray(target)||target.length!==6) throw Error('Expected six joint angles.');
  return target.map((a,i)=>{const s=specs[i];if(!Number.isFinite(a)||a<s.min-1e-6||a>s.max+1e-6) throw Error(`J${i+1} must be ${s.min.toFixed(1)}–${s.max.toFixed(1)}°.`);
    return s.step?Math.max(s.min,Math.min(s.max,Math.round(a/s.step)*s.step)):a;
  });
}
export function durationFor(start,target,requestedMs,specs) {
  if (!Number.isFinite(requestedMs)||requestedMs<0||requestedMs>30000) throw Error('Duration must be 0–30000 ms.');
  // Smoothstep reaches 1.5x the average velocity at its midpoint.
  return Math.max(1,requestedMs,...target.map((a,i)=>1500*Math.abs(a-start[i])/specs[i].speed));
}
