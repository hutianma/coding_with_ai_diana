// Placing stickers on a surface: drag to move, pinch (or the buttons) to resize and
// turn, ✕ to remove. Used by the cover editor (and later the journal page).
import { createSticker, placeSticker } from './stickers.js';
import { makeId } from '../storage/ids.js';

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3;

// surface: the element the stickers sit on (position: relative).
// stickers: the array of placed stickers; it is changed in place.
// onChange(): called after every change.
export function createStickerLayer(surface, stickers, { onChange = () => {} } = {}) {
  const layer = document.createElement('div');
  layer.className = 'sticker-layer';
  surface.append(layer);

  const tools = document.createElement('div');
  tools.className = 'sticker-tools';
  tools.hidden = true;
  tools.innerHTML = `
    <button type="button" data-tool="smaller" aria-label="Make the sticker smaller">−</button>
    <button type="button" data-tool="bigger" aria-label="Make the sticker bigger">+</button>
    <button type="button" data-tool="left" aria-label="Turn the sticker left">⟲</button>
    <button type="button" data-tool="right" aria-label="Turn the sticker right">⟳</button>
    <button type="button" data-tool="front" aria-label="Bring the sticker to the front">⬆︎</button>
    <button type="button" data-tool="delete" aria-label="Remove the sticker">✕</button>
  `;

  let selectedId = null;

  function draw() {
    layer.replaceChildren(...stickers.map((sticker) => {
      const el = createSticker(sticker);
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Sticker: drag to move');
      el.classList.toggle('is-selected', sticker.id === selectedId);
      return el;
    }));
    tools.hidden = !selectedId;
  }

  const byId = (id) => stickers.find((s) => s.id === id);

  function select(id) {
    selectedId = id;
    for (const el of layer.children) el.classList.toggle('is-selected', el.dataset.stickerId === id);
    tools.hidden = !id;
  }

  function update(sticker) {
    sticker.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, sticker.scale));
    sticker.x = Math.min(1, Math.max(0, sticker.x));
    sticker.y = Math.min(1, Math.max(0, sticker.y));
    const el = layer.querySelector(`[data-sticker-id="${sticker.id}"]`);
    if (el) placeSticker(el, sticker);
    onChange();
  }

  // ---------- Fingers and mouse ----------
  const pointers = new Map(); // pointerId → { x, y }
  let grabbed = null; // the sticker being moved

  layer.addEventListener('pointerdown', (event) => {
    const el = event.target.closest('.sticker');
    if (!el) {
      select(null);
      return;
    }
    event.preventDefault();
    grabbed = byId(el.dataset.stickerId);
    select(grabbed.id);
    try { layer.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });

  layer.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId);
    if (!last || !grabbed) return;
    const rect = surface.getBoundingClientRect();
    if (pointers.size === 1) {
      grabbed.x += (event.clientX - last.x) / rect.width;
      grabbed.y += (event.clientY - last.y) / rect.height;
    } else if (pointers.size === 2) {
      // Pinch to resize, twist to turn
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = { d: Math.hypot(last.x - other.x, last.y - other.y), a: Math.atan2(last.y - other.y, last.x - other.x) };
        const after = { d: Math.hypot(event.clientX - other.x, event.clientY - other.y), a: Math.atan2(event.clientY - other.y, event.clientX - other.x) };
        if (before.d > 0) grabbed.scale *= after.d / before.d;
        grabbed.rotation += ((after.a - before.a) * 180) / Math.PI;
      }
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    update(grabbed);
  });

  const release = (event) => {
    pointers.delete(event.pointerId);
    if (!pointers.size) grabbed = null;
  };
  layer.addEventListener('pointerup', release);
  layer.addEventListener('pointercancel', release);

  // Scroll wheel on a computer: resize the selected sticker
  layer.addEventListener('wheel', (event) => {
    const sticker = byId(selectedId);
    if (!sticker || !event.target.closest('.sticker')) return;
    event.preventDefault();
    sticker.scale *= Math.exp(-event.deltaY * 0.002);
    update(sticker);
  }, { passive: false });

  // ---------- Buttons (and keyboard) ----------
  tools.addEventListener('click', (event) => {
    const tool = event.target.closest('[data-tool]')?.dataset.tool;
    const sticker = byId(selectedId);
    if (!tool || !sticker) return;
    if (tool === 'smaller') sticker.scale /= 1.15;
    if (tool === 'bigger') sticker.scale *= 1.15;
    if (tool === 'left') sticker.rotation -= 15;
    if (tool === 'right') sticker.rotation += 15;
    if (tool === 'front' || tool === 'delete') {
      stickers.splice(stickers.indexOf(sticker), 1);
      if (tool === 'front') stickers.push(sticker);
      else selectedId = null;
      draw();
      onChange();
      return;
    }
    update(sticker);
  });

  layer.addEventListener('focusin', (event) => {
    const el = event.target.closest('.sticker');
    if (el) select(el.dataset.stickerId);
  });

  // Arrow keys move the selected sticker; Delete removes it
  layer.addEventListener('keydown', (event) => {
    const sticker = byId(selectedId);
    if (!sticker) return;
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      sticker.x += moves[event.key][0];
      sticker.y += moves[event.key][1];
      update(sticker);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      stickers.splice(stickers.indexOf(sticker), 1);
      selectedId = null;
      draw();
      onChange();
    }
  });

  draw();

  return {
    tools, // put this element wherever the editor wants its sticker buttons

    // Add a sticker in the middle, a little tilted, and select it
    add(kind, value) {
      const sticker = {
        id: makeId('sticker'),
        kind,
        ...(kind === 'image' ? { image: value } : { name: value }),
        x: 0.5 + (Math.random() - 0.5) * 0.2,
        y: 0.45 + (Math.random() - 0.5) * 0.2,
        scale: 1,
        rotation: Math.round((Math.random() - 0.5) * 24),
      };
      stickers.push(sticker);
      selectedId = sticker.id;
      draw();
      onChange();
      return sticker;
    },

    deselect() { select(null); },
    redraw: draw,
  };
}
