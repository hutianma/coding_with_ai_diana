// Draw a signature with a finger, pen or mouse on a transparent canvas the size of
// the card. The result is a PNG drawn on top of the card front.
import { loadImage, unloadImage } from './imageTools.js';

export const PEN_COLORS = [
  { value: '#c9a227', name: 'Gold' },
  { value: '#1b1720', name: 'Black' },
  { value: '#ffffff', name: 'White' },
];

const LINE_WIDTH = 9; // in card pixels (the card is 600 px wide)

export function createSignaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let color = PEN_COLORS[0].value;
  let hasInk = false;
  let changed = false; // drawn on or cleared since reset()
  let last = null; // previous point of the stroke being drawn
  let lastMid = null;

  canvas.style.touchAction = 'none';

  // Screen position → card pixels
  function point(event) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - r.left) / r.width) * canvas.width,
      y: ((event.clientY - r.top) / r.height) * canvas.height,
    };
  }

  function stroke() {
    ctx.strokeStyle = color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // A soft shadow makes the ink readable on light and dark photos
    ctx.shadowColor = color === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 3;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    last = point(event);
    lastMid = last;
    // A dot, so a single tap leaves a mark
    stroke();
    ctx.beginPath();
    ctx.arc(last.x, last.y, LINE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    hasInk = changed = true;
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!last || !event.isPrimary) return;
    const p = point(event);
    // Smooth curve through the midpoints, so fast strokes don't look jagged
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    stroke();
    ctx.beginPath();
    ctx.moveTo(lastMid.x, lastMid.y);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.stroke();
    last = p;
    lastMid = mid;
  });

  const end = () => { last = lastMid = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    get color() { return color; },
    get hasInk() { return hasInk; },
    get changed() { return changed; },

    setColor(value) {
      if (PEN_COLORS.some((c) => c.value === value)) color = value;
    },

    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInk = false;
      changed = true;
    },

    // Start again, optionally showing an existing signature (a Blob) to add to
    async reset(signature) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInk = false;
      changed = false;
      if (signature) {
        const img = await loadImage(signature);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        unloadImage(img);
        hasInk = true;
      }
    },

    toDataUrl() {
      return canvas.toDataURL('image/png');
    },

    // The signature as a PNG, or null if there's nothing drawn
    toBlob() {
      if (!hasInk) return Promise.resolve(null);
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not save the signature.'))), 'image/png');
      });
    },
  };
}
