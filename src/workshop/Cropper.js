// Frame a photo inside any shape: drag to move, pinch / scroll / slider to zoom.
// Used for photocards, badges, and each half of a two-photo polaroid.
//
// area:  the element that receives the fingers (can be bigger than the frame)
// frame: the element whose box is the crop (the photo is positioned inside it)
// img:   an <img> inside the frame that shows the photo
// zoomInput (optional): an <input type="range" min="1" max="5"> kept in sync
import { DEFAULT_CROP, placement, clampCrop, panCrop, zoomCrop } from './crop.js';

export function createCropper({ area, frame, img, zoomInput = null, onChange = null }) {
  let image = null; // the loaded <img> with the photo
  let crop = { ...DEFAULT_CROP };

  const frameSize = () => {
    const r = frame.getBoundingClientRect();
    return { width: r.width, height: r.height };
  };
  const imageSize = () => ({ width: image.naturalWidth, height: image.naturalHeight });

  function draw() {
    if (!image) return;
    const size = frameSize();
    if (!size.width) return;
    crop = clampCrop(imageSize(), size, crop);
    const box = placement(imageSize(), size, crop);
    Object.assign(img.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
    if (zoomInput) zoomInput.value = crop.zoom;
  }

  function changed() {
    draw();
    onChange?.(crop);
  }

  const pointers = new Map(); // pointerId → { x, y }

  function onDown(event) {
    if (!image) return;
    try { area.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function onMove(event) {
    const last = pointers.get(event.pointerId);
    if (!last || !image) return;
    const size = frameSize();
    if (pointers.size === 1) {
      crop = panCrop(imageSize(), size, crop, event.clientX - last.x, event.clientY - last.y);
    } else if (pointers.size === 2) {
      // Pinch: zoom by how much the two fingers spread, around the point between them
      const [a, b] = [...pointers.values()];
      const other = a === last ? b : a;
      const before = Math.hypot(last.x - other.x, last.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      const rect = frame.getBoundingClientRect();
      const midX = (event.clientX + other.x) / 2 - rect.left;
      const midY = (event.clientY + other.y) / 2 - rect.top;
      if (before > 0) crop = zoomCrop(imageSize(), size, crop, after / before, midX, midY);
      crop = panCrop(imageSize(), size, crop, (event.clientX - last.x) / 2, (event.clientY - last.y) / 2);
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    changed();
  }

  const onUp = (event) => pointers.delete(event.pointerId);

  function onWheel(event) {
    if (!image) return;
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    const factor = Math.exp(-event.deltaY * 0.002);
    crop = zoomCrop(imageSize(), frameSize(), crop, factor, event.clientX - rect.left, event.clientY - rect.top);
    changed();
  }

  function onZoomInput() {
    if (!image) return;
    crop = zoomCrop(imageSize(), frameSize(), crop, Number(zoomInput.value) / crop.zoom);
    changed();
  }

  area.style.touchAction = 'none';
  area.addEventListener('pointerdown', onDown);
  area.addEventListener('pointermove', onMove);
  area.addEventListener('pointerup', onUp);
  area.addEventListener('pointercancel', onUp);
  area.addEventListener('wheel', onWheel, { passive: false });
  zoomInput?.addEventListener('input', onZoomInput);
  addEventListener('resize', draw);

  return {
    get crop() { return crop; },
    get image() { return image; },

    // Show a loaded <img> (or null to empty the frame), optionally with a saved crop
    setImage(loaded, savedCrop = null) {
      image = loaded;
      crop = savedCrop ? { ...savedCrop } : { ...DEFAULT_CROP };
      if (loaded) img.src = loaded.src;
      else img.removeAttribute('src');
      img.hidden = !loaded;
      draw(); // place the photo right away (no flash of an unplaced photo)…
      requestAnimationFrame(draw); // …and again once the layout has settled
    },

    draw,

    destroy() {
      removeEventListener('resize', draw);
      area.removeEventListener('pointerdown', onDown);
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerup', onUp);
      area.removeEventListener('pointercancel', onUp);
      area.removeEventListener('wheel', onWheel);
      zoomInput?.removeEventListener('input', onZoomInput);
    },
  };
}
