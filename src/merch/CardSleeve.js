// Draws a card sleeve with one of your photocards inside: a clear toploader, a fabric
// sleeve with bunny ears, a plush animal, or a puffy leather sleeve. It can have a little
// charm hanging from it and stickers on the front.
//
// Saved in "merch" as { id, kind: 'sleeve', cardId, style, animal, pattern, color, charm,
// stickers, createdAt }. animal is for plush sleeves, pattern for puffy leather ones.
//
// Every shape is measured in millimetres (a photocard is 55 × 85 mm), so the card always
// sits in the same place, at any size on screen.
import { createCard } from '../cards/Card.js';
import { createCardBack, DEFAULT_BACK } from '../cards/CardBack.js';
import { createSticker } from '../decor/stickers.js';
import { furTexture, FUR_TILE_CSS } from '../binder/furTexture.js';
import { isDark } from '../binder/CoverDesign.js';

export const CARD_MM = [55, 85];

export const STYLES = [
  { value: 'toploader', name: 'Toploader' },
  { value: 'fabric', name: 'Bunny fabric' },
  { value: 'plush', name: 'Plush' },
  { value: 'puffy', name: 'Puffy leather' },
];

// Plush animals, with the color each one starts in
export const ANIMALS = [
  { value: 'bear', name: 'Bear', color: '#c49a72' },
  { value: 'fox', name: 'Fox', color: '#f2a65a' },
  { value: 'puppy', name: 'Puppy', color: '#fbf8f4' },
  { value: 'snowman', name: 'Snowman', color: '#fbf8f4' },
];

export const PATTERNS = [
  { value: 'dots', name: 'Polka dots' },
  { value: 'cakes', name: 'Little cakes' },
  { value: 'hearts', name: 'Hearts' },
  { value: 'plain', name: 'Plain' },
];

export const SLEEVE_COLORS = [
  { value: '#f7c6d9', name: 'Pink' },
  { value: '#d6c8ff', name: 'Lilac' },
  { value: '#cfe3ff', name: 'Sky' },
  { value: '#c8eed8', name: 'Mint' },
  { value: '#ffe9a8', name: 'Butter' },
  { value: '#fbf8f4', name: 'White' },
  { value: '#c49a72', name: 'Brown' },
  { value: '#f2a65a', name: 'Orange' },
  { value: '#2b2230', name: 'Black' },
];

export const CHARMS = [
  { value: 'none', name: 'None' },
  { value: 'heart', name: 'Heart' },
  { value: 'star', name: 'Star' },
  { value: 'bow', name: 'Bow' },
  { value: 'bear', name: 'Bear' },
  { value: 'moon', name: 'Moon' },
];

// The color a style starts in
export function startColor(style, animal = 'bear') {
  if (style === 'plush') return (ANIMALS.find((a) => a.value === animal) ?? ANIMALS[0]).color;
  if (style === 'toploader') return '#fbf8f4';
  return SLEEVE_COLORS[0].value;
}

export function newSleeve(cardId = null) {
  return { kind: 'sleeve', cardId, style: 'toploader', animal: 'bear', pattern: 'dots', color: startColor('toploader'), charm: 'heart', stickers: [] };
}

// The sleeve's settings, filling in anything missing or unknown
export function sleeveOf(item) {
  const pick = (list, value) => (list.some((x) => x.value === value) ? value : list[0].value);
  const style = pick(STYLES, item.style);
  const animal = pick(ANIMALS, item.animal);
  return {
    ...item,
    style,
    animal,
    pattern: pick(PATTERNS, item.pattern),
    charm: pick(CHARMS, item.charm),
    color: /^#[0-9a-f]{6}$/i.test(item.color ?? '') ? item.color : startColor(style, animal),
    stickers: item.stickers ?? [],
  };
}

export function sleeveName(item) {
  const s = sleeveOf(item);
  if (s.style === 'plush') return `Plush ${ANIMALS.find((a) => a.value === s.animal).name.toLowerCase()} card sleeve`;
  if (s.style === 'toploader') return 'Toploader';
  return `${STYLES.find((x) => x.value === s.style).name} card sleeve`;
}

// ---------- Shapes (millimetres) ----------

// A rounded rectangle as a path
function rr(x, y, w, h, r) {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

// box: the whole sleeve [w, h]. card: where the card's top-left corner sits.
// window: the clear hole in the front [x, y, w, h, r]. body: the outline (SVG, filled).
// charm: where a charm hangs from.
const PLUSH_BODY = [7, 16, 66, 116, 16];
const SHAPES = {
  toploader: {
    box: [65, 95],
    card: [5, 6],
    body: () => `<path d="${rr(0, 0, 65, 95, 3)}"/>`,
    charm: [60, 4],
  },
  fabric: {
    box: [70, 124],
    card: [7.5, 32],
    window: [10, 35, 50, 79, 5],
    body: () => `<path d="${rr(0, 26, 70, 98, 12)}"/>
      <ellipse cx="22" cy="17" rx="8" ry="17" transform="rotate(-12 22 17)"/>
      <ellipse cx="48" cy="17" rx="8" ry="17" transform="rotate(12 48 17)"/>`,
    charm: [64, 31],
  },
  plush: {
    box: [80, 132],
    card: [12.5, 42],
    window: [15, 45, 50, 79, 6],
    body: (animal) => {
      if (animal === 'snowman') return `<path d="${rr(7, 32, 66, 100, 22)}"/><circle cx="40" cy="20" r="18"/>`;
      const body = `<path d="${rr(...PLUSH_BODY)}"/>`;
      if (animal === 'bear') return `${body}<circle cx="19" cy="17" r="9.5"/><circle cx="61" cy="17" r="9.5"/>`;
      if (animal === 'fox') return `${body}<path d="M9 30Q10 8 15 3Q18 1 21 4L35 18Z"/><path d="M71 30Q70 8 65 3Q62 1 59 4L45 18Z"/>`;
      return `${body}<ellipse cx="8" cy="48" rx="7.5" ry="27" transform="rotate(8 8 48)"/><ellipse cx="72" cy="48" rx="7.5" ry="27" transform="rotate(-8 72 48)"/>`;
    },
    charm: [68, 26],
  },
  puffy: {
    box: [74, 104],
    card: [9.5, 9.5],
    window: [12, 12, 50, 80, 8],
    body: () => `<path d="${rr(0, 0, 74, 104, 14)}"/>`,
    charm: [66, 7],
  },
};

export function sleeveBox(item) {
  return SHAPES[sleeveOf(item).style].box;
}

// Width / height of the sleeve
export function sleeveRatio(item) {
  const [w, h] = sleeveBox(item);
  return w / h;
}

// How wide the sleeve is compared with the card inside
export function sleeveWidthPerCard(item) {
  return sleeveBox(item)[0] / CARD_MM[0];
}

// The outline as a mask image (front: with the clear window cut out). Plush sleeves get a
// fuzzy edge. Made once for each shape.
const masks = new Map();
function maskUrl(style, animal, withWindow) {
  const key = `${style}/${animal}/${withWindow}`;
  if (masks.has(key)) return masks.get(key);
  const shape = SHAPES[style];
  const [w, h] = shape.box;
  let body = shape.body(animal);
  if (withWindow && shape.window) {
    // The window is cut out of the main body (the first path) with an even-odd fill
    body = body.replace(/^<path d="([^"]+)"\/>/, (_, d) => `<path fill-rule="evenodd" d="${d}${rr(...shape.window)}"/>`);
  }
  if (withWindow && style === 'toploader') {
    // The thumb notch: a U cut into the top of the front sheet
    body = `<path fill-rule="evenodd" d="${rr(0, 0, 65, 95, 3)}M25.5 0Q25.5 6 32.5 6Q39.5 6 39.5 0Z"/>`;
  }
  const fuzzy = style === 'plush'
    ? `<filter id="f" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.8" xChannelSelector="R" yChannelSelector="G"/></filter>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${fuzzy}<g ${fuzzy ? 'filter="url(#f)"' : ''}>${body}</g></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  masks.set(key, url);
  return url;
}

// ---------- Drawing ----------

// card: the photocard inside (or missing). side: 'front' or 'back'.
// stickers: false leaves them off (the editor draws them so they can be moved).
export function createCardSleeve(item, card, { side = 'front', stickers = true } = {}) {
  const s = sleeveOf(item);
  const shape = SHAPES[s.style];
  const [w, h] = shape.box;
  const front = side === 'front';
  const pct = (v, of) => `${(v / of) * 100}%`;

  const el = document.createElement('div');
  el.className = `card-sleeve card-sleeve--${s.style} card-sleeve--${side}`;
  if (s.style === 'plush') el.classList.add(`card-sleeve--${s.animal}`);
  if (s.style === 'puffy') el.classList.add(`card-sleeve--pattern-${s.pattern}`);
  el.style.setProperty('--ratio', w / h);
  el.style.setProperty('--sleeve-color', s.color);
  el.classList.toggle('card-sleeve--dark', isDark(s.color));
  if (s.style === 'plush') {
    el.style.setProperty('--fur', furTexture(s.color));
    el.style.setProperty('--fur-size', `${FUR_TILE_CSS / 2}px`);
  }
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', sleeveName(s));

  const layer = (name) => {
    const part = document.createElement('div');
    part.className = `card-sleeve__${name}`;
    el.append(part);
    return part;
  };
  const masked = (part, withWindow) => {
    const url = maskUrl(s.style, s.animal, withWindow);
    part.style.webkitMaskImage = url;
    part.style.maskImage = url;
  };

  // The card shows through the front (and through the back of a clear toploader)
  const seeThrough = front || s.style === 'toploader';
  if (s.style === 'toploader') masked(layer('plastic-back'), false);
  if (seeThrough) {
    const slot = layer('card');
    const [cx, cy] = shape.card;
    Object.assign(slot.style, { left: pct(cx, w), top: pct(cy, h), width: pct(CARD_MM[0], w), height: pct(CARD_MM[1], h) });
    if (front && card) {
      const cardEl = createCard(card);
      cardEl.removeAttribute('role');
      cardEl.removeAttribute('aria-label');
      slot.append(cardEl);
    } else if (card) {
      slot.append(createCardBack(card.back ?? DEFAULT_BACK));
    } else {
      slot.classList.add('card-sleeve__card--empty');
    }
  }

  // The front (or back) panel
  const body = layer(s.style === 'toploader' ? 'plastic' : 'body');
  masked(body, front);
  if (front && shape.window) {
    const [x, y, ww, wh] = shape.window;
    const win = layer('window');
    Object.assign(win.style, { left: pct(x, w), top: pct(y, h), width: pct(ww, w), height: pct(wh, h) });
  }

  el.insertAdjacentHTML('beforeend', `<svg class="card-sleeve__art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${art(s, front)}</svg>`);
  masked(layer('shine'), front);

  if (front && stickers) {
    const box = layer('stickers');
    box.append(...s.stickers.map(createSticker));
  }

  if (s.charm !== 'none') {
    const [ax, ay] = shape.charm;
    const charm = layer('charm');
    // The back is seen from behind: the charm hangs from the other side
    Object.assign(charm.style, { left: pct(front ? ax : w - ax, w), top: pct(ay, h), width: pct(CHARM_MM, w) });
    charm.innerHTML = charmSvg(s.charm);
  }
  return el;
}

// Details drawn on top: stitching, faces, ears, the toploader's edges
function art(s, front) {
  const stitch = (d) => `<path class="card-sleeve__stitch" d="${d}"/>`;
  if (s.style === 'toploader') {
    return `<path class="card-sleeve__edge" d="${rr(0.6, 0.6, 63.8, 93.8, 2.6)}"/>
      <path class="card-sleeve__edge card-sleeve__edge--inner" d="${rr(3.6, 4.6, 57.8, 87.8, 2)}"/>
      ${front ? '<path class="card-sleeve__edge" d="M25.5 0.4Q25.5 6 32.5 6Q39.5 6 39.5 0.4"/>' : ''}`;
  }
  if (s.style === 'fabric') {
    return `${stitch(rr(2.5, 28.5, 65, 93, 10))}
      ${front ? stitch(rr(7.6, 32.6, 54.8, 83.8, 6.5)) : ''}
      <ellipse class="card-sleeve__inner-ear" cx="22" cy="17" rx="4" ry="12" transform="rotate(-12 22 17)"/>
      <ellipse class="card-sleeve__inner-ear" cx="48" cy="17" rx="4" ry="12" transform="rotate(12 48 17)"/>
      ${front ? '<path class="card-sleeve__bow" d="M35 29C30 24 25 25 25.5 29.5 26 33.5 31 32.5 35 29ZM35 29C40 24 45 25 44.5 29.5 44 33.5 39 32.5 35 29Z"/><circle class="card-sleeve__bow" cx="35" cy="29" r="2"/>' : ''}`;
  }
  if (s.style === 'puffy') {
    const [x, y, ww, wh, r] = SHAPES.puffy.window;
    return `${stitch(rr(3.5, 3.5, 67, 97, 11))}
      ${front ? `<path class="card-sleeve__rim-shadow" d="${rr(x, y, ww, wh, r)}"/>
        <path class="card-sleeve__rim-light" d="${rr(x - 1.6, y - 1.6, ww + 3.2, wh + 3.2, r + 1.6)}"/>` : ''}`;
  }
  return plushFace(s.animal, front);
}

const eye = (x, y) => `<ellipse class="card-sleeve__eye" cx="${x}" cy="${y}" rx="1.9" ry="2.3"/><circle class="card-sleeve__eye-light" cx="${x + 0.6}" cy="${y - 0.8}" r="0.6"/>`;
const blush = (x, y) => `<ellipse class="card-sleeve__blush" cx="${x}" cy="${y}" rx="3" ry="1.8"/>`;

function plushFace(animal, front) {
  if (animal === 'bear') {
    const ears = '<circle class="card-sleeve__inner-ear" cx="19" cy="17" r="5"/><circle class="card-sleeve__inner-ear" cx="61" cy="17" r="5"/>';
    if (!front) return '';
    return `${ears}<ellipse class="card-sleeve__muzzle" cx="40" cy="34" rx="6.5" ry="4.6"/>
      ${eye(32, 28.5)}${eye(48, 28.5)}
      <ellipse class="card-sleeve__nose" cx="40" cy="32.2" rx="2.2" ry="1.5"/>
      <path class="card-sleeve__mouth" d="M38 35.2Q40 37 42 35.2"/>
      ${blush(26, 33.5)}${blush(54, 33.5)}`;
  }
  if (animal === 'fox') {
    const ears = '<path class="card-sleeve__inner-ear card-sleeve__inner-ear--fox" d="M13 24Q14 11 17 7L28 18Z"/><path class="card-sleeve__inner-ear card-sleeve__inner-ear--fox" d="M67 24Q66 11 63 7L52 18Z"/>';
    if (!front) return '';
    return `${ears}<path class="card-sleeve__muzzle card-sleeve__muzzle--fox" d="M22 30Q31 27 40 34Q49 27 58 30Q56 41 40 41Q24 41 22 30Z"/>
      ${eye(31, 27.5)}${eye(49, 27.5)}
      <ellipse class="card-sleeve__nose" cx="40" cy="34.5" rx="2" ry="1.5"/>
      ${blush(25, 33)}${blush(55, 33)}`;
  }
  if (animal === 'puppy') {
    const ears = '<path class="card-sleeve__ear-line" d="M14 25Q17 50 12 73M66 25Q63 50 68 73"/>';
    if (!front) return ears;
    return `${ears}${eye(32, 29)}${eye(48, 29)}
      <ellipse class="card-sleeve__nose card-sleeve__nose--pink" cx="40" cy="33" rx="1.8" ry="1.3"/>
      <path class="card-sleeve__mouth" d="M37.6 35Q38.8 36.6 40 35Q41.2 36.6 42.4 35"/>
      ${blush(26, 34)}${blush(54, 34)}`;
  }
  // Snowman: a knitted scarf, and on the front a face with a carrot nose
  const scarf = '<path class="card-sleeve__scarf" d="M14 34Q40 42 66 34L67 39.5Q40 47.5 13 39.5Z"/><path class="card-sleeve__scarf" d="M54 40L62 39L64 58L57 59Z"/><path class="card-sleeve__scarf-stripe" d="M57 47L63 46.4M57.5 52L63.6 51.4"/>';
  if (!front) return scarf;
  return `${scarf}${eye(34, 16)}${eye(46, 16)}
    <path class="card-sleeve__carrot" d="M39.5 20.5L48 23L39.5 24Z"/>
    <path class="card-sleeve__mouth" d="M35 27Q40 29.5 45 27"/>
    ${blush(30, 23)}${blush(50, 23)}`;
}

// ---------- Charms ----------

const CHARM_MM = 20; // a charm is 20 mm wide
const OUTLINE = 'stroke="#fff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"';
const CHARM_ART = {
  heart: `<path ${OUTLINE} fill="#ff7fb1" d="M20 70C6 60 3 50 7 43 11 36 18 37 20 43 22 37 29 36 33 43 37 50 34 60 20 70Z"/><ellipse cx="13" cy="45" rx="3" ry="2" fill="#fff" opacity=".7" transform="rotate(-30 13 45)"/>`,
  star: `<path ${OUTLINE} fill="#ffd84d" d="M20 37L24.5 49L37 49.5L27 57L30.5 70L20 62.5L9.5 70L13 57L3 49.5L15.5 49Z"/><circle cx="16" cy="50" r="2" fill="#fff" opacity=".75"/>`,
  bow: `<g ${OUTLINE}><path fill="#ff9ec4" d="M20 52C14 42 4 40 3 47 2 55 12 58 20 52Z"/><path fill="#ff9ec4" d="M20 52C26 42 36 40 37 47 38 55 28 58 20 52Z"/><path fill="#ff7ab2" d="M18 53L12 70L17 68L20 73L21 54Z"/><path fill="#ff7ab2" d="M22 53L28 70L23 68L20 73L19 54Z"/></g><circle cx="20" cy="52" r="4" fill="#ff6fa8" stroke="#fff" stroke-width="1.6"/>`,
  bear: `<g ${OUTLINE} fill="#c49a72"><circle cx="9" cy="44" r="6"/><circle cx="31" cy="44" r="6"/><circle cx="20" cy="56" r="14"/></g><circle cx="9" cy="44" r="3" fill="#f2c6a8"/><circle cx="31" cy="44" r="3" fill="#f2c6a8"/><ellipse cx="20" cy="61" rx="6" ry="4.5" fill="#f2dcc4"/><circle cx="15" cy="54" r="1.6" fill="#3a2a30"/><circle cx="25" cy="54" r="1.6" fill="#3a2a30"/><ellipse cx="20" cy="59.4" rx="2" ry="1.4" fill="#3a2a30"/>`,
  moon: `<path ${OUTLINE} fill="#d6c8ff" d="M26 38C15 40 10 52 15 61 20 70 32 72 38 66 28 66 21 58 22 50 22.5 45 24 41 26 38Z"/><circle cx="31" cy="44" r="2.2" fill="#fff6b8" ${OUTLINE}/>`,
};

// A ring and a little bead chain at the top, the charm below (viewBox 40 × 76)
function charmSvg(name) {
  const beads = [12, 17, 22, 27, 32].map((y) => `<circle cx="20" cy="${y}" r="1.7"/>`).join('');
  return `<svg class="card-sleeve__charm-art" viewBox="0 0 40 76" aria-hidden="true">
    <circle cx="20" cy="5" r="3.6" fill="none" stroke="#d9d4dc" stroke-width="1.6"/>
    <g fill="#e6e1e8" stroke="#b9b2bf" stroke-width=".5">${beads}</g>
    ${CHARM_ART[name] ?? CHARM_ART.heart}
  </svg>`;
}
