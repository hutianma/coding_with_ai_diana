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
