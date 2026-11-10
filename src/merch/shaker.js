// 流麻 (shaker) fill: little pieces suspended in gel inside a round badge.
// The gel itself flows: a shake makes it slosh and turn in big, slow swirls that calm
// down gradually, and the pieces are carried along by it (easing into its motion, never
// jumping), while each one slowly sinks at its own speed.
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
//   overlap – how closely pieces can pack (powder packs tighter)
//   dust    – drawn as tiny glinting flecks (fast to draw in large numbers)
const STYLES = {
  glitter: { count: 135, size: [12, 22], weight: [0.6, 1.25], flutter: 0.012, colors: ['#ffd1ec', '#c9f0ff', '#fff4b8', '#d9ffd6', '#e8d4ff', '#ffffff'] },
  snow: { count: 140, size: [7, 18], weight: [0.4, 0.8], flutter: 0.02, colors: ['#ffffff', '#f2f8ff'] },
  stars: { count: 62, size: [20, 34], weight: [0.75, 1.3], flutter: 0.008, colors: ['#ffd84d', '#ffe98f', '#fff3c4'] },
  hearts: { count: 62, size: [20, 32], weight: [0.75, 1.3], flutter: 0.008, colors: ['#ff6fa8', '#ff9ec4', '#ffc2d9'] },
  sakura: { count: 56, size: [20, 30], weight: [0.5, 0.95], flutter: 0.025, colors: ['#ffc4d8', '#ffd9e6', '#ffb0cb'] },
  // Fine gold powder: lots of tiny flecks that sparkle and hang in the gel
  gold: { count: 440, size: [2.5, 6], weight: [0.4, 0.75], flutter: 0.01, overlap: 0.6, dust: true, colors: ['#ffd76a', '#f5c542', '#ffe9a8', '#e8b33a', '#fff6d6'] },
};

// How the gel behaves (speeds in px per frame on a 600 px badge)
const SINK_SPEED = 1.0; // how fast a normal piece sinks through the gel (~6 s top to bottom)
const FOLLOW = 0.09; // how quickly a piece takes on the gel's motion (lower = more inertia; varies per piece)
const FLOW_CALM = 0.965; // the gel's sloshing dies down a little every frame…
const SPIN_CALM = 0.975; // …and so does its turning…
const STIR_CALM = 0.985; // …and its swirls
const EDDY_SPEED = 5.5; // how fast the swirls move pieces when fully stirred
const MAX_FLOW = 16; // the fastest the gel sloshes
const SLEEP_FRAMES = 30; // still for half a second → asleep
const QUIET = 0.0036; // average movement under 0.06 px a frame counts as still (far too small to see)
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
  let lastEnergy = Infinity;
  const swirlDir = random() < 0.5 ? -1 : 1; // this badge's gel always turns the same way

  // ---------- The gel ----------
  //   flow – the gel sloshing one way (the contents lag behind when the badge moves)
  //   spin – the gel turning around the middle
  //   stir – how stirred up it is: a few big swirls that slowly change shape
  const flow = { x: 0, y: 0 };
  let spin = 0; // radians per frame
  let stir = 0; // 0 = calm, 1 = well stirred
  // Several swirls of different sizes, so different parts of the badge move differently
  // and a layer of pieces breaks up into a cloud instead of lifting as one sheet
  const eddies = Array.from({ length: 4 }, (_, i) => ({
    kx: (Math.PI * (1.5 + i * 0.6 + random())) / size,
    ky: (Math.PI * (1.5 + i * 0.6 + random())) / size,
    px: random() * Math.PI * 2,
    py: random() * Math.PI * 2,
    driftX: (random() - 0.5) * 0.012,
    driftY: (random() - 0.5) * 0.012,
    amp: 0.6 + random() * 0.8,
  }));

  // How the gel is moving at a point. The swirls come from a "stream function", which
  // keeps the motion smooth and never squeezes pieces together or pulls them apart.
  function gelAt(x, y) {
    let u = flow.x - (y - center) * spin;
    let v = flow.y + (x - center) * spin;
    if (stir > 0.002) {
      for (const e of eddies) {
        const ax = e.kx * x + e.px;
        const ay = e.ky * y + e.py;
        const kn = (e.kx + e.ky) / 2;
        const speed = stir * EDDY_SPEED * k * e.amp;
        u += speed * (e.ky / kn) * Math.sin(ax) * Math.cos(ay);
        v -= speed * (e.kx / kn) * Math.cos(ax) * Math.sin(ay);
      }
    }
    return { u, v };
  }

  function gelIsCalm() {
    return Math.hypot(flow.x, flow.y) < 0.05 * k && stir < 0.02 && Math.abs(spin) < 0.0002;
  }

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
      // How readily it goes with the gel: lighter pieces more, heavier ones lag behind,
      // so a stirred cloud spreads out
      follow: FOLLOW * (1.4 - 0.5 * (style.weight[0] + random() * (style.weight[1] - style.weight[0]))),
      freq: 0.015 + random() * 0.025, // slow, gentle rocking
      phase: random() * Math.PI * 2,
    };
  });

  function step() {
    time++;
    // The gel calms down gradually; its swirls slowly change shape
    flow.x *= FLOW_CALM;
    flow.y *= FLOW_CALM;
    spin *= SPIN_CALM;
    stir *= STIR_CALM;
    for (const e of eddies) {
      e.px += e.driftX;
      e.py += e.driftY;
    }
    const calm = gelIsCalm();

    for (const p of pieces) {
      p.px = p.x;
      p.py = p.y;
      // A piece that has been still for a while (in a calm gel) "sleeps": it no longer
      // presses into the pile, so the pile stays perfectly still. Tilting, shaking or
      // being bumped wakes it up.
      if (calm && p.still > SLEEP_FRAMES) {
        p.vx = p.vy = 0;
        continue;
      }
      // Where the gel would carry it, plus its own slow sinking and a gentle rocking
      const gel = gelAt(p.x, p.y);
      const sink = SINK_SPEED * p.weight * k;
      const falling = Math.min(1, (p.moved ?? 1) / (1.5 * k));
      const sway = Math.sin(time * p.freq + p.phase) * p.flutter * falling * 20 * k;
      const targetX = gel.u + gravity.x * sink - gravity.y * sway;
      const targetY = gel.v + gravity.y * sink + gravity.x * sway;
      // Ease into that motion: pieces have a little inertia, so everything stays smooth
      p.vx += (targetX - p.vx) * p.follow;
      p.vy += (targetY - p.vy) * p.follow;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin + p.vx * 0.01;
    }
    separate();
    // How much things actually moved this frame (pieces resting in the pile don't, even
    // though they keep sinking into it)
    let energy = 0;
    for (const p of pieces) {
      keepInside(p); // after separating, which can nudge pieces outwards
      const mx = p.x - p.px;
      const my = p.y - p.py;
      p.moved = Math.hypot(mx, my);
      p.still = p.moved < 0.12 * k ? (p.still ?? 0) + 1 : 0;
      energy += mx * mx + my * my;
    }
    lastEnergy = calm ? energy / Math.max(1, pieces.length) : Infinity;
    return lastEnergy;
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
        // Fast pieces bounce softly off the rim; slow ones just come to rest against it
        const bounce = along > 2 * k ? 1.3 : 1;
        p.vx -= bounce * along * nx;
        p.vy -= bounce * along * ny;
        p.vx *= 0.9; // a little friction along the rim
        p.vy *= 0.9;
        // …and when it's only creeping, it sticks (static friction), so a pile on the
        // curved bottom stays put instead of slowly sliding and re-settling forever
        // (only when it's barely moving: slow-sinking pieces still slide down the wall)
        if (Math.hypot(p.vx, p.vy) < 0.12 * k) p.vx = p.vy = 0;
      }
    }
  }

  // Pieces don't pass through each other: overlapping pieces are nudged apart, so they
  // pile up into a layer at the bottom instead of all sinking to one spot (and a shake
  // then scatters a whole layer, not a single clump). A grid keeps this quick.
  const cellSize = Math.max(...pieces.map((p) => p.size), 1);
  const cols = Math.ceil(size / cellSize) + 2;
  const OVERLAP = style?.overlap ?? 0.85;
  const grid = new Map(); // cell number → pieces in it (reused every frame)
  const cellOf = (x, y) => (Math.floor(y / cellSize) + 1) * cols + Math.floor(x / cellSize) + 1;
  function separate() {
    for (const cell of grid.values()) cell.length = 0;
    for (const p of pieces) {
      const key = cellOf(p.x, p.y);
      let cell = grid.get(key);
      if (!cell) grid.set(key, (cell = []));
      cell.push(p);
    }
    for (const p of pieces) {
      const here = cellOf(p.x, p.y);
      for (let row = -1; row <= 1; row++) {
        for (let col = -1; col <= 1; col++) {
          const cell = grid.get(here + row * cols + col);
          if (!cell) continue;
          for (const q of cell) {
            if (q === p) continue;
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const min = ((p.size + q.size) / 2) * OVERLAP;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2) || 0.01;
            if (d2 && min - d < 0.25 * k) continue; // barely touching: leave them be, so a pile can rest
            const push = (min - d) / 4; // each pair is visited twice
            const nx = d2 ? dx / d : random() - 0.5;
            const ny = d2 ? dy / d : random() - 0.5;
            p.x -= nx * push;
            p.y -= ny * push;
            q.x += nx * push;
            q.y += ny * push;
            if (push > 0.8 * k) p.still = q.still = 0; // a real bump wakes sleeping pieces
            // Touching pieces stop moving into each other (no build-up of speed in the pile)
            const closing = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
            if (closing < 0) {
              p.vx += (nx * closing) / 2;
              p.vy += (ny * closing) / 2;
              q.vx -= (nx * closing) / 2;
              q.vy -= (ny * closing) / 2;
            }
          }
        }
      }
    }
  }

  function wakeAll() {
    for (const p of pieces) p.still = 0;
  }

  function limitFlow() {
    const f = Math.hypot(flow.x, flow.y);
    const max = MAX_FLOW * k;
    if (f > max) {
      flow.x *= max / f;
      flow.y *= max / f;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);
    if (style?.dust) return drawDust();
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
    quietFrames = energy < QUIET * k * k ? quietFrames + 1 : 0; // see isSettled
    if (quietFrames < 90) frame = requestAnimationFrame(loop);
  }

  return {
    get hasPieces() { return pieces.length > 0; },

    // True once nothing is moving any more (the animation loop stops then)
    get isSettled() { return gelIsCalm() && lastEnergy < QUIET * k * k; },

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
      if (changed) {
        wakeAll();
        this.start();
      }
    },

    // The badge moved by (dx, dy) canvas pixels: the pieces lag behind, so they're
    // pushed the other way (a little differently each, so they spread out)
    // The badge moved by (dx, dy) canvas px (a finger or the phone): the gel and its
    // contents lag behind, sloshing the other way, and it gets a little stirred up
    push(dx, dy) {
      wakeAll();
      flow.x -= dx * 0.3;
      flow.y -= dy * 0.3;
      limitFlow();
      const amount = Math.hypot(dx, dy) / (20 * k);
      stir = Math.min(1.5, stir + amount * 0.25);
      spin += swirlDir * amount * 0.0006;
      this.start();
    },

    // A good shake: the gel surges up (against gravity), turns, and swirls
    shake() {
      wakeAll();
      flow.x -= gravity.x * 7 * k;
      flow.y -= gravity.y * 7 * k;
      limitFlow();
      stir = Math.min(1.5, stir + 1.1);
      spin += swirlDir * 0.003;
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
