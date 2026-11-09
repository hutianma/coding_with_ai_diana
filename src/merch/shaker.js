// 流麻 (shaker) fill: little pieces floating in liquid inside a round badge.
// They sink with gravity, each at its own speed, flutter a little as they fall, and
// scatter in every direction when shaken — like a snow globe.
// The canvas is square; pieces stay inside the circle.

export const FILLS = [
  { value: 'none', name: 'None' },
  { value: 'glitter', name: 'Glitter' },
  { value: 'snow', name: 'Snow' },
  { value: 'stars', name: 'Stars' },
  { value: 'hearts', name: 'Hearts' },
  { value: 'sakura', name: 'Sakura' },
  { value: 'gold', name: 'Gold dust' },
];

// How each fill looks and moves (sizes in px on a 600 px badge):
//   weight  – how fast it sinks, a range so pieces separate as they fall (1 = normal)
//   flutter – how much it drifts side to side while falling (snow and petals the most)
const STYLES = {
  glitter: { count: 95, size: [13, 24], weight: [0.55, 1.3], flutter: 0.035, colors: ['#ffd1ec', '#c9f0ff', '#fff4b8', '#d9ffd6', '#e8d4ff', '#ffffff'] },
  snow: { count: 100, size: [8, 20], weight: [0.3, 0.75], flutter: 0.06, colors: ['#ffffff', '#f2f8ff'] },
  stars: { count: 44, size: [22, 38], weight: [0.7, 1.4], flutter: 0.02, colors: ['#ffd84d', '#ffe98f', '#fff3c4'] },
  hearts: { count: 44, size: [22, 36], weight: [0.7, 1.4], flutter: 0.02, colors: ['#ff6fa8', '#ff9ec4', '#ffc2d9'] },
  sakura: { count: 40, size: [22, 34], weight: [0.4, 0.95], flutter: 0.07, colors: ['#ffc4d8', '#ffd9e6', '#ffb0cb'] },
  // Fine gold powder: lots of tiny flecks that sparkle and hang in the liquid
  gold: { count: 320, size: [2.5, 6], weight: [0.2, 0.6], flutter: 0.03, colors: ['#ffd76a', '#f5c542', '#ffe9a8', '#e8b33a', '#fff6d6'] },
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
  let time = 0; // frames simulated, for the flutter

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
      // Each piece sinks at its own speed, so a cloud of them spreads out as it falls
      weight: style.weight[0] + random() * (style.weight[1] - style.weight[0]),
      // Its own side-to-side drift
      flutter: style.flutter * (0.5 + random()),
      freq: 0.03 + random() * 0.05,
      phase: random() * Math.PI * 2,
    };
  });

  function step() {
    let energy = 0;
    time++;
    for (const p of pieces) {
      // Drift across the direction of fall (a falling snowflake rocks side to side)
      const sway = Math.sin(time * p.freq + p.phase) * p.flutter;
      p.vx = (p.vx + (gravity.x * GRAVITY * p.weight - gravity.y * sway + (random() - 0.5) * 0.03) * k) * DRAG;
      p.vy = (p.vy + (gravity.y * GRAVITY * p.weight + gravity.x * sway + (random() - 0.5) * 0.03) * k) * DRAG;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin + p.vx * 0.01;

      energy += p.vx * p.vx + p.vy * p.vy;
    }
    separate();
    for (const p of pieces) keepInside(p); // after separating, which can nudge pieces outwards
    return energy / Math.max(1, pieces.length);
  }

  // Stay inside the badge: push back to the edge and bounce softly
  function keepInside(p) {
    const dx = p.x - center;
    const dy = p.y - center;
    const dist = Math.hypot(dx, dy) || 0.01;
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
  }

  // Pieces don't pass through each other: overlapping pieces are nudged apart, so they
  // pile up into a layer at the bottom instead of all sinking to one spot (and a shake
  // then scatters a whole layer, not a single clump). A grid keeps this quick.
  const cellSize = Math.max(...pieces.map((p) => p.size), 1);
  const OVERLAP = fill === 'gold' ? 0.6 : 0.85; // powder can pack tighter
  function separate() {
    const grid = new Map();
    for (const p of pieces) {
      const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
      let cell = grid.get(key);
      if (!cell) grid.set(key, (cell = []));
      cell.push(p);
    }
    for (const p of pieces) {
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          for (const q of grid.get(`${gx},${gy}`) ?? []) {
            if (q === p) continue;
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const min = ((p.size + q.size) / 2) * OVERLAP;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2) || 0.01;
            const push = (min - d) / 4; // each pair is visited twice
            const nx = d2 ? dx / d : random() - 0.5;
            const ny = d2 ? dy / d : random() - 0.5;
            p.x -= nx * push;
            p.y -= ny * push;
            q.x += nx * push;
            q.y += ny * push;
          }
        }
      }
    }
  }

  // Turn the liquid around the middle (clockwise or anticlockwise, picked at random)
  function swirl(amount) {
    const dir = random() < 0.5 ? -1 : 1;
    for (const p of pieces) {
      const dx = p.x - center;
      const dy = p.y - center;
      const r = Math.hypot(dx, dy) / radius;
      p.vx += -dy / radius * amount * dir * (0.5 + r);
      p.vy += dx / radius * amount * dir * (0.5 + r);
    }
  }

  function limit(p) {
    const MAX = 30 * k;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > MAX) {
      p.vx *= MAX / speed;
      p.vy *= MAX / speed;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);
    if (fill === 'gold') return drawDust();
    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      drawPiece(ctx, fill, p);
      ctx.restore();
    }
  }

  // Hundreds of tiny flecks: drawn quickly, each glinting as it turns
  function drawDust() {
    for (const p of pieces) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.cos(p.rot * 3));
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s * (0.6 + 0.4 * Math.abs(Math.sin(p.rot))));
    }
    ctx.globalAlpha = 1;
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
    // Not every piece moves the same way: each also gets a kick in its own random
    // direction, and the liquid swirls, so they scatter like a shaken snow globe
    push(dx, dy) {
      const strength = Math.hypot(dx, dy) * 0.45;
      swirl(strength * 0.12);
      for (const p of pieces) {
        const along = 0.4 + random() * 1.2;
        const angle = random() * Math.PI * 2;
        const kick = strength * random() * 0.9;
        p.vx += -dx * 0.45 * along + Math.cos(angle) * kick;
        p.vy += -dy * 0.45 * along + Math.sin(angle) * kick;
        limit(p);
      }
      this.start();
    },

    // Swirl everything up and out
    shake(strength = 9 * k) {
      swirl(strength * 0.15);
      for (const p of pieces) {
        const angle = random() * Math.PI * 2;
        const kick = strength * (0.5 + random() * 1.5);
        const lift = strength * (0.6 + random() * 1.2); // up, against gravity, by a different amount each
        p.vx += Math.cos(angle) * kick - gravity.x * lift;
        p.vy += Math.sin(angle) * kick - gravity.y * lift;
        limit(p);
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
