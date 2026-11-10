// Faux fur, drawn strand by strand: thousands of short, soft hairs in lighter and darker
// shades of the cover color, lying loosely the same way (like a plush toy), on a tile
// that repeats seamlessly. Made once per color and then reused.

const TILE = 256; // px (shown at half size, so it stays sharp on phone screens)
const HAIRS = 5600; // short hairs, so more of them to keep the fur thick
const cache = new Map();

export function furTexture(color) {
  if (cache.has(color)) return cache.get(color);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  const base = parseColor(color);
  const random = seeded(hash(color));

  ctx.fillStyle = shade(base, -0.07);
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.lineCap = 'round';

  // Back to front: dark undercoat first, then mid tones, then light tips on top
  const layers = [
    { count: HAIRS * 0.3, light: [-0.15, -0.04], alpha: [0.45, 0.75], width: [1.6, 2.4] },
    { count: HAIRS * 0.4, light: [0, 0.16], alpha: [0.45, 0.75], width: [1.3, 2] },
    { count: HAIRS * 0.3, light: [0.22, 0.5], alpha: [0.4, 0.75], width: [1, 1.6] },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const x = random() * TILE;
      const y = random() * TILE;
      // Hairs lie loosely downwards with a gentle wave across the tile: short and a bit
      // tousled, so it looks soft and plush rather than long and brushed
      const flow = Math.sin((x / TILE) * Math.PI * 2) * 0.35 + Math.cos((y / TILE) * Math.PI * 2) * 0.2;
      const angle = Math.PI / 2 - 0.35 + flow + (random() - 0.5) * 1.2;
      const length = 4 + random() * 5;
      const bend = (random() - 0.5) * 4;
      const light = layer.light[0] + random() * (layer.light[1] - layer.light[0]);
      ctx.strokeStyle = shade(base, light);
      ctx.globalAlpha = layer.alpha[0] + random() * (layer.alpha[1] - layer.alpha[0]);
      ctx.lineWidth = layer.width[0] + random() * (layer.width[1] - layer.width[0]);
      // Draw it again shifted by the tile size where it crosses an edge, so tiles join up
      for (const dx of [-TILE, 0, TILE]) {
        for (const dy of [-TILE, 0, TILE]) {
          const x0 = x + dx;
          const y0 = y + dy;
          const x1 = x0 + Math.cos(angle) * length;
          const y1 = y0 + Math.sin(angle) * length;
          if (Math.max(x0, x1) < -4 || Math.min(x0, x1) > TILE + 4 || Math.max(y0, y1) < -4 || Math.min(y0, y1) > TILE + 4) continue;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo((x0 + x1) / 2 + Math.cos(angle + Math.PI / 2) * bend, (y0 + y1) / 2 + Math.sin(angle + Math.PI / 2) * bend, x1, y1);
          ctx.stroke();
        }
      }
    }
  }
  ctx.globalAlpha = 1;
  const url = `url("${canvas.toDataURL('image/png')}")`;
  cache.set(color, url);
  return url;
}

export const FUR_TILE_CSS = TILE / 2; // shown size in CSS px

function parseColor(hex) {
  const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0xf2b8cc;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// amount < 0 darkens towards black, > 0 lightens towards white
function shade([r, g, b], amount) {
  const t = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const mix = (c) => Math.round(c + (t - c) * k);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

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
