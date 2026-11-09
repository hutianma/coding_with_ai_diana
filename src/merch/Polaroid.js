// Draws a polaroid (拍立得): a photo (or two, for a 合拍 shot together) in a white frame,
// with a handwritten caption on the bottom strip. Sizes follow instant-film prints.
import { imageUrl } from '../cards/imageUrls.js';

const PX_PER_MM = 10; // saved images are 10 px per millimetre

// Each layout, in millimetres: the print, where the photo sits, and how it's split
export const LAYOUTS = {
  single: { name: 'Single', print: [54, 86], photo: [4, 7, 46, 62], cells: [[0, 0, 1, 1]] },
  side: { name: 'Side by side', print: [108, 86], photo: [4.5, 7, 99, 62], cells: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
  stack: { name: 'Top & bottom', print: [54, 86], photo: [4, 7, 46, 62], cells: [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] },
};

export const FRAME_COLORS = [
  { value: '#fbfaf7', name: 'White' },
  { value: '#f6eedd', name: 'Cream' },
  { value: '#f7d3e1', name: 'Pink' },
  { value: '#d6e6fb', name: 'Sky' },
  { value: '#26222b', name: 'Black' },
];

export function layoutOf(item) {
  return LAYOUTS[item.layout] ?? LAYOUTS.single;
}

// Width / height of the whole print
export function polaroidRatio(item) {
  const [w, h] = layoutOf(item).print;
  return w / h;
}

// Pixel sizes for saving: the photo area, each cell inside it, and the caption strip
export function polaroidSizes(layoutName) {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS.single;
  const [, top, pw, ph] = layout.photo;
  const photo = { width: Math.round(pw * PX_PER_MM), height: Math.round(ph * PX_PER_MM) };
  const cells = layout.cells.map(([x, y, w, h]) => ({
    x: Math.round(x * photo.width),
    y: Math.round(y * photo.height),
    width: Math.round(w * photo.width),
    height: Math.round(h * photo.height),
  }));
  const [printW, printH] = layout.print;
  const caption = { width: Math.round(printW * PX_PER_MM), height: Math.round((printH - top - ph) * PX_PER_MM) };
  return { photo, cells, caption };
}

// Position of the photo and caption as percentages of the print (for CSS)
export function polaroidBoxes(layoutName) {
  const layout = LAYOUTS[layoutName] ?? LAYOUTS.single;
  const [printW, printH] = layout.print;
  const [left, top, pw, ph] = layout.photo;
  const pct = (v, of) => `${(v / of) * 100}%`;
  return {
    photo: { left: pct(left, printW), top: pct(top, printH), width: pct(pw, printW), height: pct(ph, printH) },
    caption: { left: '0%', top: pct(top + ph, printH), width: '100%', height: pct(printH - top - ph, printH) },
  };
}

export function createPolaroid(item) {
  const el = document.createElement('div');
  el.className = `polaroid polaroid--${item.layout ?? 'single'}`;
  el.style.setProperty('--ratio', polaroidRatio(item));
  el.style.setProperty('--frame', item.frame ?? FRAME_COLORS[0].value);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', polaroidName(item));
  const boxes = polaroidBoxes(item.layout);

  const photo = document.createElement('img');
  photo.className = 'polaroid__photo';
  photo.alt = '';
  photo.draggable = false;
  if (item.image) photo.src = imageUrl(item.image);
  Object.assign(photo.style, boxes.photo);
  el.append(photo);

  if (item.caption) {
    const caption = document.createElement('img');
    caption.className = 'polaroid__caption';
    caption.alt = '';
    caption.draggable = false;
    caption.src = imageUrl(item.caption);
    Object.assign(caption.style, boxes.caption);
    el.append(caption);
  }
  return el;
}

// The back of an instant-film print: plain paper
export function createPolaroidBack(item) {
  const el = document.createElement('div');
  el.className = 'polaroid-back';
  el.style.setProperty('--ratio', polaroidRatio(item));
  if (item.createdAt) {
    const date = document.createElement('span');
    date.className = 'polaroid-back__date';
    date.textContent = new Date(item.createdAt).toLocaleDateString();
    el.append(date);
  }
  return el;
}

export function polaroidName(item) {
  return item.layout === 'side' || item.layout === 'stack' ? 'Polaroid of two photos (合拍)' : 'Polaroid';
}
