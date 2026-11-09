// Draws a badge (吧唧): a round photo with a glossy dome, a colored rim, and an
// optional 流麻 fill of floating pieces.
import { imageUrl } from '../cards/imageUrls.js';
import { createShaker } from './shaker.js';

export const BADGE_SIZE = 600; // saved photo size (square)

export const RIM_COLORS = [
  { value: '#f4f1ee', name: 'Pearl' },
  { value: '#f7c6d9', name: 'Pink' },
  { value: '#cfe3ff', name: 'Sky' },
  { value: '#e8c872', name: 'Gold' },
  { value: '#c9ccd3', name: 'Silver' },
  { value: '#2b2230', name: 'Night' },
];

// live: the fill moves (in the viewer and the workshop preview); otherwise it's drawn settled
export function createBadge(item, { live = false } = {}) {
  const el = document.createElement('div');
  el.className = 'badge';
  el.style.setProperty('--rim', item.rim ?? RIM_COLORS[0].value);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', badgeName(item));

  const photo = document.createElement('img');
  photo.className = 'badge__photo';
  photo.alt = '';
  photo.draggable = false;
  if (item.image) photo.src = imageUrl(item.image);
  el.append(photo);

  if (item.fill && item.fill !== 'none') {
    const canvas = document.createElement('canvas');
    canvas.className = 'badge__fill';
    canvas.width = canvas.height = BADGE_SIZE;
    el.append(canvas);
    const shaker = createShaker(canvas, { fill: item.fill, seed: item.seed ?? 1 });
    shaker.settle(170); // partly sunk: pieces drift in the lower half, like a badge just set down
    if (live) el.shaker = shaker; // the viewer moves it with the tilt
  }

  const dome = document.createElement('div');
  dome.className = 'badge__dome';
  el.append(dome);
  return el;
}

// The back of a badge: a metal pin back
export function createBadgeBack(item) {
  const el = document.createElement('div');
  el.className = 'badge-back';
  el.style.setProperty('--rim', item.rim ?? RIM_COLORS[0].value);
  el.innerHTML = '<span class="badge-back__pin"></span>';
  return el;
}

export function badgeName(item) {
  const fill = item.fill && item.fill !== 'none' ? ` with ${item.fill}` : '';
  return `Badge${fill}`;
}
