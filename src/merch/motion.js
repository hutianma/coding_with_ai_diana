// Turning the phone's motion sensors into "which way is down on the screen" and
// "how hard is the phone being shaken", for the 流麻 shaker fill.
//
// Screen directions: x to the right, y down the screen, as the app is showing.

const G = 9.81;

// iPhones and iPads report devicemotion with the opposite sign to other browsers, for
// both accelerationIncludingGravity and acceleration (they pass on the sensor's own
// convention). iPadOS says it's a Mac, so check for touch too.
export function isAppleTouchDevice() {
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

// The screen's rotation (0 portrait, 90 / 270 landscape, 180 upside down)
export function screenAngle() {
  return screen.orientation?.angle ?? window.orientation ?? 0;
}

// Device axes (x right, y towards the top of the phone) → screen axes (x right, y down),
// allowing for the screen being rotated
function toScreen(x, y, angle) {
  const sx = x;
  const sy = -y;
  const a = (angle * Math.PI) / 180;
  return {
    x: sx * Math.cos(a) - sy * Math.sin(a),
    y: sx * Math.sin(a) + sy * Math.cos(a),
  };
}

// accelerationIncludingGravity → gravity on the screen, each axis -1 … 1.
// Upright phone: { x: 0, y: 1 }. Upside down: { x: 0, y: -1 }. Lying flat: about { 0, 0 }.
export function screenGravity(aig, { apple = isAppleTouchDevice(), angle = screenAngle() } = {}) {
  if (aig?.x == null || aig?.y == null) return null;
  const sign = apple ? 1 : -1;
  const g = toScreen((sign * aig.x) / G, (sign * aig.y) / G, angle);
  return { x: clamp(g.x), y: clamp(g.y) };
}

// acceleration (without gravity, m/s²) → how the phone is moving on the screen.
// The pieces inside lag behind, so they get pushed the opposite way.
export function screenAcceleration(acc, { apple = isAppleTouchDevice(), angle = screenAngle() } = {}) {
  if (acc?.x == null || acc?.y == null) return null;
  const sign = apple ? -1 : 1;
  return toScreen(sign * acc.x, sign * acc.y, angle);
}

function clamp(v) {
  return Math.max(-1, Math.min(1, v));
}

// ---------- Tilt for the shine (holo foil, glare) ----------
// Worked out from the direction of gravity in 3D, not from tilt angles: angles jump
// around when the phone is upright, and "how far from where it started" gets stuck at
// the edge after you change how you hold the phone.

// accelerationIncludingGravity → a unit vector pointing down, in the phone's own axes
// (x right, y towards the top, z out of the screen), allowing for screen rotation
export function deviceGravity(aig, { apple = isAppleTouchDevice(), angle = screenAngle() } = {}) {
  if (aig?.x == null || aig?.y == null || aig?.z == null) return null;
  const sign = apple ? 1 : -1;
  let x = sign * aig.x;
  let y = sign * aig.y;
  const z = sign * aig.z;
  const a = (angle * Math.PI) / 180;
  // Same rotation as toScreen, but keeping y pointing up
  [x, y] = [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];
  const len = Math.hypot(x, y, z);
  return len > 0.5 ? { x: x / len, y: y / len, z: z / len } : null;
}

// How far the phone has turned from `base` to `now` (both from deviceGravity):
// x > 0 when the right side has gone down, y < 0 when the top has gone down (away from you).
// Uses the cross product (the turn around each of the phone's axes), so it works the
// same lying flat, upright, or anywhere between:
//   x: turning around the phone's up-down axis (matters when it's lying flat) plus
//      turning it like a steering wheel (matters when it's upright)
//   y: tipping the top towards or away from you
export function tiltBetween(base, now) {
  return {
    x: (base.x * now.z - base.z * now.x) + (base.x * now.y - base.y * now.x),
    y: -(base.y * now.z - base.z * now.y),
  };
}

// Move the resting position a little towards how the phone is held now, so the shine
// comes back to the middle when you hold still (in any position)
export function recenter(base, now, rate) {
  const x = base.x + (now.x - base.x) * rate;
  const y = base.y + (now.y - base.y) * rate;
  const z = base.z + (now.z - base.z) * rate;
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
