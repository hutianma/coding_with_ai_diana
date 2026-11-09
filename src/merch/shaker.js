// 流麻 (shaker) fill: little pieces floating in liquid inside a round badge.
// They sink slowly with gravity, drift when you tilt the phone, and swirl when shaken.
// The canvas is square; pieces stay inside the circle.

export const FILLS = [
  { value: 'none', name: 'None' },
  { value: 'glitter', name: 'Glitter' },
  { value: 'snow', name: 'Snow' },
  { value: 'stars', name: 'Stars' },
  { value: 'hearts', name: 'Hearts' },
  { value: 'sakura', name: 'Sakura' },
];

// How each fill looks and moves: colors, size range (px on a 600 px badge), how
// heavy it is in the liquid (1 = sinks normally, lower = floats more)
const STYLES = {
  glitter: { count: 95, size: [13, 24], weight: 1, colors: ['#ffd1ec', '#c9f0ff', '#fff4b8', '#d9ffd6', '#e8d4ff', '#ffffff'] },
  snow: { count: 100, size: [8, 20], weight: 0.55, colors: ['#ffffff', '#f2f8ff'] },
  stars: { count: 44, size: [22, 38], weight: 1.1, colors: ['#ffd84d', '#ffe98f', '#fff3c4'] },
  hearts: { count: 44, size: [22, 36], weight: 1.1, colors: ['#ff6fa8', '#ff9ec4', '#ffc2d9'] },
  sakura: { count: 40, size: [22, 34], weight: 0.7, colors: ['#ffc4d8', '#ffd9e6', '#ffb0cb'] },
};

const GRAVITY = 0.12; // px per frame²: still liquid, but lively (top to bottom in ~2.5 s)
const DRAG = 0.96; // liquid slows everything down
const RIM = 0.9; // pieces stay within 90% of the radius (inside the rim)

// A repeatable random number generator, so a badge always looks the same when settled
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createShaker(canvas, { fill, seed = 1 }) {
  const style = STYLES[fill];
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const k = size / 600; // sizes and speeds are tuned for a 600 px badge
  const center = size / 2;
  const radius = (size / 2) * RIM;
  const random = seeded(seed);
  let gravity = { x: 0, y: 1 };
  let frame = 0;
  let quietFrames = 0;

  const pieces = !style ? [] : Array.from({ length: style.count }, () => {
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * radius * 0.85;
    const s = (style.size[0] + random() * (style.size[1] - style.size[0])) * k;
    return {
      x: center + Math.cos(angle) * dist,
      y: center + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      size: s,
      rot: random() * Math.PI * 2,
      spin: (random() - 0.5) * 0.06,
      color: style.colors[Math.floor(random() * style.colors.length)],
      // Lighter pieces sink slower; a little variety looks more natural
      weight: style.weight * (0.7 + random() * 0.6),
    };
  });

  function step() {
    let energy = 0;
    for (const p of pieces) {
      p.vx = (p.vx + (gravity.x * GRAVITY * p.weight + (random() - 0.5) * 0.02) * k) * DRAG;
      p.vy = (p.vy + (gravity.y * GRAVITY * p.weight + (random() - 0.5) * 0.02) * k) * DRAG;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin + p.vx * 0.01;

      // Stay inside the badge: push back to the edge and bounce softly
      const dx = p.x - center;
      const dy = p.y - center;
      const dist = Math.hypot(dx, dy);
      const max = radius - p.size / 2;
      if (dist > max) {
        const nx = dx / dist;
        const ny = dy / dist;
        p.x = center + nx * max;
        p.y = center + ny * max;
        const along = p.vx * nx + p.vy * ny;
        if (along > 0) {
          p.vx -= 1.3 * along * nx;
          p.vy -= 1.3 * along * ny;
        }
      }
      energy += p.vx * p.vx + p.vy * p.vy;
    }
    return energy / Math.max(1, pieces.length);
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);
    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      drawPiece(ctx, fill, p);
      ctx.restore();
    }
  }

  function loop() {
    frame = 0;
    const energy = step();
    draw();
    // Stop when everything has settled (saves battery); a tilt or shake wakes it up
    quietFrames = energy < 0.0004 * k * k ? quietFrames + 1 : 0;
    if (quietFrames < 90) frame = requestAnimationFrame(loop);
  }

  return {
    get hasPieces() { return pieces.length > 0; },

    // Let everything sink to the bottom straight away (for still pictures)
    settle(steps = 900) {
      gravity = { x: 0, y: 1 };
      for (let i = 0; i < steps; i++) step();
      for (const p of pieces) p.vx = p.vy = 0;
      draw();
    },

    // Run a number of physics steps right away, then draw (used by tests)
    advance(steps = 1) {
      for (let i = 0; i < steps; i++) step();
      draw();
    },

    // Which way is "down" (x, y between -1 and 1; y = 1 is straight down the screen)
    setGravity(x, y) {
      const changed = Math.abs(x - gravity.x) + Math.abs(y - gravity.y) > 0.01;
      gravity = { x, y };
      if (changed) this.start();
    },

    // The badge moved by (dx, dy) canvas pixels: the pieces lag behind, so they're
    // pushed the other way (a little differently each, so they spread out)
    push(dx, dy) {
      const MAX = 30 * k;
      for (const p of pieces) {
        const spread = 0.6 + random() * 0.8;
        p.vx = Math.max(-MAX, Math.min(MAX, p.vx - dx * 0.45 * spread));
        p.vy = Math.max(-MAX, Math.min(MAX, p.vy - dy * 0.45 * spread));
      }
      this.start();
    },

    // Swirl everything up
    shake(strength = 6 * k) {
      for (const p of pieces) {
        p.vx += (random() - 0.5) * strength * 2;
        p.vy += (random() - 0.8) * strength * 2;
      }
      this.start();
    },

    start() {
      quietFrames = 0;
      if (!frame && pieces.length) frame = requestAnimationFrame(loop);
    },

    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },

    draw,
  };
}

function drawPiece(ctx, fill, p) {
  const s = p.size;
  switch (fill) {
    case 'glitter': {
      // A flat sequin: it catches the light as it turns
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.cos(p.rot * 2));
      hexagon(ctx, s / 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-s * 0.12, -s * 0.12, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'snow': {
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = s * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'stars':
      star(ctx, s / 2);
      ctx.fill();
      break;
    case 'hearts':
      heart(ctx, s);
      ctx.fill();
      break;
    case 'sakura':
      petal(ctx, s);
      ctx.fill();
      break;
  }
}

function hexagon(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

function heart(ctx, s) {
  const h = s / 2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  ctx.bezierCurveTo(-h * 1.2, -h * 0.1, -h * 0.6, -h * 1.1, 0, -h * 0.45);
  ctx.bezierCurveTo(h * 0.6, -h * 1.1, h * 1.2, -h * 0.1, 0, h * 0.7);
  ctx.closePath();
}

function petal(ctx, s) {
  const h = s / 2;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.bezierCurveTo(-h, h * 0.2, -h * 0.7, -h, -h * 0.15, -h * 0.8);
  ctx.lineTo(0, -h * 0.55);
  ctx.lineTo(h * 0.15, -h * 0.8);
  ctx.bezierCurveTo(h * 0.7, -h, h, h * 0.2, 0, h);
  ctx.closePath();
}
