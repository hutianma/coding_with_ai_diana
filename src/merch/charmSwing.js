// A charm hanging from a sleeve, swinging like a little pendulum: it leans the way the phone
// is tilted (down is down) and swings when the sleeve is shaken, then settles.
// Only used when Reduce Motion is off.

const MAX_ANGLE = 70; // degrees either way
const STIFFNESS = 40; // how strongly it's pulled back to hanging straight down
const DAMPING = 2.6; // how quickly a swing dies down

// charms: the charm elements (front and back) that get --swing
export function createCharmSwing(charms) {
  let angle = 0; // degrees, clockwise
  let speed = 0; // degrees per second
  let rest = 0; // where it would hang still
  let frame = 0;
  let last = 0;

  function step(now) {
    frame = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    speed += (-STIFFNESS * (angle - rest) - DAMPING * speed) * dt;
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle + speed * dt));
    for (const charm of charms) charm.style.setProperty('--swing', `${angle.toFixed(2)}deg`);
    if (Math.abs(speed) > 0.5 || Math.abs(angle - rest) > 0.2) frame = requestAnimationFrame(step);
  }

  function wake() {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(step);
  }

  return {
    // Which way is down on the screen (x, y)
    setGravity(x, y) {
      if (!Math.hypot(x, y)) return;
      rest = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, (Math.atan2(-x, y) * 180) / Math.PI));
      wake();
    },
    // The sleeve was moved by (dx, dy) screen px: the charm lags behind and swings
    push(dx) {
      speed += dx * 6;
      wake();
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
