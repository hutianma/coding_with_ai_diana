// Stickers: a built-in set (simple drawings made for this app) and your own images.
// A sticker placed somewhere is saved as:
//   { id, kind: 'builtin', name } or { id, kind: 'image', image: Blob },
//   plus x, y (its centre, as fractions 0–1 of the surface), scale and rotation (degrees)
import { imageUrl } from '../cards/imageUrls.js';

// Every built-in sticker has a white die-cut outline, like a real vinyl sticker
const OUTLINE = 'stroke="#fff" stroke-width="7" stroke-linejoin="round" paint-order="stroke"';

export const BUILTIN_STICKERS = {
  heart: { name: 'Heart', svg: `<path ${OUTLINE} fill="#ff6fa8" d="M50 86 C18 64 8 44 16 28 C24 13 43 14 50 30 C57 14 76 13 84 28 C92 44 82 64 50 86Z"/><ellipse cx="33" cy="32" rx="7" ry="4.5" fill="#fff" opacity=".65" transform="rotate(-30 33 32)"/>` },
  star: { name: 'Star', svg: `<path ${OUTLINE} fill="#ffd84d" d="M50 8 L61 37 L92 38 L67 57 L76 88 L50 70 L24 88 L33 57 L8 38 L39 37Z"/><circle cx="41" cy="40" r="4" fill="#fff" opacity=".7"/>` },
  sparkle: { name: 'Sparkle', svg: `<path ${OUTLINE} fill="#fff4b8" d="M50 6 C54 36 64 46 94 50 C64 54 54 64 50 94 C46 64 36 54 6 50 C36 46 46 36 50 6Z"/><path fill="#ffd84d" d="M50 26 C52 42 58 48 74 50 C58 52 52 58 50 74 C48 58 42 52 26 50 C42 48 48 42 50 26Z"/>` },
  bow: { name: 'Bow', svg: `<g ${OUTLINE}><path fill="#ff9ec4" d="M50 50 C36 30 14 26 12 40 C10 56 32 62 50 50Z"/><path fill="#ff9ec4" d="M50 50 C64 30 86 26 88 40 C90 56 68 62 50 50Z"/><path fill="#ff7ab2" d="M46 52 L34 86 L44 82 L50 92 L54 54Z"/><path fill="#ff7ab2" d="M54 52 L66 86 L56 82 L50 92 L46 54Z"/></g><circle cx="50" cy="50" r="9" fill="#ff6fa8" stroke="#fff" stroke-width="4"/>` },
  flower: { name: 'Flower', svg: `<g ${OUTLINE} fill="#c9b6ff"><circle cx="50" cy="26" r="17"/><circle cx="73" cy="43" r="17"/><circle cx="64" cy="71" r="17"/><circle cx="36" cy="71" r="17"/><circle cx="27" cy="43" r="17"/></g><g fill="#c9b6ff"><circle cx="50" cy="26" r="17"/><circle cx="73" cy="43" r="17"/><circle cx="64" cy="71" r="17"/><circle cx="36" cy="71" r="17"/><circle cx="27" cy="43" r="17"/></g><circle cx="50" cy="50" r="12" fill="#ffd84d"/>` },
  cloud: { name: 'Cloud', svg: `<path ${OUTLINE} fill="#eaf4ff" d="M26 74 C10 74 8 54 22 50 C20 32 42 26 50 38 C56 22 82 26 80 44 C96 46 94 74 76 74Z"/><path fill="#cfe3ff" d="M30 68 C22 68 20 60 26 58 L74 58 C80 60 78 68 72 68Z"/>` },
  crown: { name: 'Crown', svg: `<path ${OUTLINE} fill="#ffd24d" d="M14 76 L10 30 L32 50 L50 18 L68 50 L90 30 L86 76Z"/><rect x="16" y="70" width="68" height="10" rx="3" fill="#f0b429"/><circle cx="50" cy="56" r="6" fill="#ff6fa8"/><circle cx="30" cy="62" r="4" fill="#6ed8ff"/><circle cx="70" cy="62" r="4" fill="#6ed8ff"/>` },
  cherry: { name: 'Cherry', svg: `<path d="M38 64 C40 40 50 22 70 12 M62 64 C62 44 66 30 70 12" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M38 64 C40 40 50 22 70 12 M62 64 C62 44 66 30 70 12" fill="none" stroke="#5a9e4b" stroke-width="4" stroke-linecap="round"/><circle cx="36" cy="70" r="16" fill="#ff4f6d" ${OUTLINE}/><circle cx="64" cy="70" r="16" fill="#ff4f6d" ${OUTLINE}/><circle cx="30" cy="64" r="4" fill="#fff" opacity=".7"/><circle cx="58" cy="64" r="4" fill="#fff" opacity=".7"/>` },
  butterfly: { name: 'Butterfly', svg: `<g ${OUTLINE} fill="#8cc8ff"><path d="M50 48 C34 20 10 18 12 36 C14 52 34 54 50 50Z"/><path d="M50 48 C66 20 90 18 88 36 C86 52 66 54 50 50Z"/><path d="M50 52 C36 58 20 70 28 80 C36 88 46 72 50 56Z"/><path d="M50 52 C64 58 80 70 72 80 C64 88 54 72 50 56Z"/></g><rect x="47" y="34" width="6" height="40" rx="3" fill="#3b4a7a"/>` },
  note: { name: 'Music note', svg: `<path ${OUTLINE} fill="#b48cff" d="M40 22 L80 14 L80 64 C80 74 68 80 60 76 C52 72 54 60 64 58 C68 57 70 58 72 59 L72 30 L48 35 L48 72 C48 82 36 88 28 84 C20 80 22 68 32 66 C36 65 38 66 40 67Z"/>` },
  loveTag: { name: 'Love tag', svg: `<rect ${OUTLINE} x="8" y="30" width="84" height="40" rx="20" fill="#ff8fbf"/><text x="50" y="58" text-anchor="middle" font-family="ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif" font-size="24" font-weight="800" fill="#fff">LOVE</text>` },
  biasTag: { name: 'Bias tag', svg: `<rect ${OUTLINE} x="8" y="30" width="84" height="40" rx="20" fill="#6ec3ff"/><text x="50" y="58" text-anchor="middle" font-family="ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif" font-size="22" font-weight="800" fill="#fff">♡ BIAS</text>` },
};

const svgUrls = new Map();

// A built-in sticker as an image URL (made once)
export function builtinUrl(name) {
  if (!svgUrls.has(name)) {
    const sticker = BUILTIN_STICKERS[name] ?? BUILTIN_STICKERS.heart;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${sticker.svg}</svg>`;
    svgUrls.set(name, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  }
  return svgUrls.get(name);
}

export const STICKER_BASE_WIDTH = 0.24; // a sticker at scale 1 is 24% of the surface's width

// Draw one placed sticker (inside a surface that is position: relative)
export function createSticker(sticker) {
  const el = document.createElement('div');
  el.className = 'sticker';
  el.dataset.stickerId = sticker.id;
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  img.src = sticker.kind === 'image' ? imageUrl(sticker.image) : builtinUrl(sticker.name);
  el.append(img);
  placeSticker(el, sticker);
  return el;
}

export function placeSticker(el, sticker) {
  el.style.left = `${sticker.x * 100}%`;
  el.style.top = `${sticker.y * 100}%`;
  el.style.width = `${STICKER_BASE_WIDTH * sticker.scale * 100}%`;
  el.style.transform = `translate(-50%, -50%) rotate(${sticker.rotation}deg)`;
}
