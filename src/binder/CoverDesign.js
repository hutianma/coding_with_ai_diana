// A binder's cover: material, color, title and font, a window showing one of your
// cards, and stickers. Saved as binder.cover (settings, not a picture), so it can always
// be edited again.
import { imageUrl } from '../cards/imageUrls.js';
import { createSticker } from '../decor/stickers.js';

export const MATERIALS = [
  { value: 'pastel', name: 'Pastel' },
  { value: 'leather', name: 'Leather' },
  { value: 'glitter', name: 'Glitter' },
  { value: 'clear', name: 'Clear' },
];

export const COVER_COLORS = [
  { value: '#f2b8cc', name: 'Pink' },
  { value: '#c9b6ff', name: 'Lilac' },
  { value: '#a9d4ff', name: 'Sky' },
  { value: '#b9e8c8', name: 'Mint' },
  { value: '#ffe08a', name: 'Butter' },
  { value: '#f7f3ee', name: 'Cream' },
  { value: '#2b2230', name: 'Black' },
];

// Fonts already on phones and computers (nothing to download)
export const FONTS = [
  { value: 'rounded', name: 'Rounded', css: "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', 'Nunito', system-ui, sans-serif" },
  { value: 'cute', name: 'Cute', css: "'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', ui-rounded, sans-serif" },
  { value: 'handwritten', name: 'Handwritten', css: "'Noteworthy', 'Bradley Hand', 'Segoe Print', 'Segoe Script', cursive" },
  { value: 'elegant', name: 'Elegant', css: "'Snell Roundhand', 'Brush Script MT', 'Segoe Script', cursive" },
  { value: 'classic', name: 'Classic', css: "Georgia, 'Times New Roman', serif" },
];

export const WINDOW_SHAPES = [
  { value: 'rounded', name: 'Rounded' },
  { value: 'heart', name: 'Heart' },
  { value: 'circle', name: 'Circle' },
  { value: 'arch', name: 'Arch' },
];

export function defaultCover(color = COVER_COLORS[0].value) {
  return { material: 'pastel', color, font: 'rounded', window: null, stickers: [] };
}

// The binder's cover settings, filling in anything missing (older binders had only a color)
export function coverOf(binder) {
  return { ...defaultCover(binder.coverColor), ...(binder.cover ?? {}) };
}

export function fontCss(font) {
  return (FONTS.find((f) => f.value === font) ?? FONTS[0]).css;
}

// Fill a cover element (already sized) with the design.
// cards: { id: card }, to show the window card. count: a line under the title, or null.
export function decorateCover(el, binder, cards = {}, { count = null } = {}) {
  const cover = coverOf(binder);
  el.classList.add('cover-design', `cover-design--${cover.material}`);
  el.style.setProperty('--cover-color', cover.color);
  el.classList.toggle('cover-design--dark', isDark(cover.color));

  const windowCard = cover.window ? cards[cover.window.cardId] : null;
  el.classList.toggle('cover-design--has-window', Boolean(windowCard));

  const label = document.createElement('span');
  label.className = 'cover-design__label';
  const title = document.createElement('span');
  title.className = 'cover-design__title';
  title.style.fontFamily = fontCss(cover.font);
  title.textContent = binder.name; // plain text, never HTML
  label.append(title);
  if (count) {
    const small = document.createElement('span');
    small.className = 'cover-design__count';
    small.textContent = count;
    label.append(small);
  }

  const parts = [label];
  if (windowCard?.front) {
    const win = document.createElement('span');
    win.className = `cover-design__window cover-design__window--${cover.window.shape ?? 'rounded'}`;
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = imageUrl(windowCard.front);
    win.append(img);
    parts.push(win);
  }

  const stickers = document.createElement('span');
  stickers.className = 'cover-design__stickers';
  stickers.append(...cover.stickers.map(createSticker));
  parts.push(stickers);

  el.prepend(...parts);
  return el;
}

function isDark(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return false;
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 120;
}
