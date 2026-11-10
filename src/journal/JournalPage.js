// A journal (手帐) page: a sheet of paper in the binder where you arrange your cards,
// badges, polaroids, stickers, washi tape and text however you like.
//
// Saved as { id, kind: 'journal', paper, items }. Each item is placed like a sticker
// (x, y as fractions of the page, scale, rotation) and is one of:
//   { kind: 'builtin', name } / { kind: 'image', image }   a sticker
//   { kind: 'card', cardId } / { kind: 'merch', merchId }  one of your things
//   { kind: 'tape', pattern }                              a strip of washi tape
//   { kind: 'text', text, font, color }
import { createSticker, placeSticker } from '../decor/stickers.js';
import { createCard, cardName } from '../cards/Card.js';
import { createBadge, badgeName } from '../merch/Badge.js';
import { createPolaroid, polaroidName, polaroidRatio } from '../merch/Polaroid.js';
import { fontCss, FONTS } from '../binder/CoverDesign.js';
import { makeId } from '../storage/ids.js';

export const PAPERS = [
  { value: 'plain', name: 'Plain' },
  { value: 'lined', name: 'Lined' },
  { value: 'grid', name: 'Grid' },
  { value: 'dots', name: 'Dots' },
  { value: 'kraft', name: 'Kraft' },
  { value: 'floral', name: 'Floral' },
];

export const TAPES = [
  { value: 'stripes', name: 'Pink stripes' },
  { value: 'dots', name: 'Mint dots' },
  { value: 'grid', name: 'Lilac grid' },
  { value: 'gingham', name: 'Butter gingham' },
  { value: 'hearts', name: 'Sky hearts' },
];

export const TEXT_COLORS = [
  { value: '#2b2230', name: 'Ink' },
  { value: '#d9608f', name: 'Pink' },
  { value: '#7a5cc4', name: 'Purple' },
  { value: '#3f7fc4', name: 'Blue' },
  { value: '#3f8f5f', name: 'Green' },
  { value: '#ffffff', name: 'White' },
];

export const TEXT_MAX = 80;

// How wide things are at scale 1, as a fraction of the page's width
const WIDTH = { card: 0.34, badge: 0.3, polaroid: 0.36, polaroidWide: 0.62, tape: 0.46 };

export function newJournalPage() {
  return { id: makeId('page'), kind: 'journal', paper: 'lined', items: [] };
}

export function paperOf(page) {
  return PAPERS.some((p) => p.value === page.paper) ? page.paper : 'plain';
}

// things: { cards, merch } (to find the card / badge / polaroid an item shows)
export function canShow(item, { cards = {}, merch = {} } = {}) {
  if (item.kind === 'card') return Boolean(cards[item.cardId]);
  if (item.kind === 'merch') return Boolean(merch[item.merchId]);
  if (item.kind === 'text') return Boolean(item.text?.trim());
  return ['builtin', 'image', 'tape'].includes(item.kind);
}

// Draw one placed item, or null if it can't be shown (e.g. its card was deleted)
export function createPiece(item, things = {}) {
  if (!canShow(item, things)) return null;
  if (item.kind === 'builtin' || item.kind === 'image') return createSticker(item);

  const el = document.createElement('div');
  el.className = `sticker piece piece--${item.kind}`;
  el.dataset.stickerId = item.id;

  if (item.kind === 'card') {
    const card = things.cards[item.cardId];
    const cardEl = createCard(card);
    cardEl.dataset.cardId = card.id;
    el.append(cardEl);
    el.dataset.width = WIDTH.card;
    el.dataset.name = cardName(card);
  } else if (item.kind === 'merch') {
    const thing = things.merch[item.merchId];
    if (thing.kind === 'badge') {
      el.classList.add('piece--badge');
      el.append(createBadge(thing));
      el.dataset.width = WIDTH.badge;
      el.dataset.name = badgeName(thing);
    } else {
      el.classList.add('piece--polaroid');
      el.style.setProperty('--ratio', polaroidRatio(thing));
      el.append(createPolaroid(thing));
      el.dataset.width = thing.layout === 'side' ? WIDTH.polaroidWide : WIDTH.polaroid;
      el.dataset.name = polaroidName(thing);
    }
    el.firstElementChild.dataset.merchId = thing.id;
  } else if (item.kind === 'tape') {
    const tape = TAPES.find((t) => t.value === item.pattern) ?? TAPES[0];
    const strip = document.createElement('span');
    strip.className = `tape tape--${tape.value}`;
    el.append(strip);
    el.dataset.width = WIDTH.tape;
    el.dataset.name = `${tape.name} washi tape`;
  } else if (item.kind === 'text') {
    const text = document.createElement('span');
    text.className = 'piece__text';
    text.textContent = item.text; // plain text, never HTML
    text.style.fontFamily = fontCss(item.font ?? FONTS[0].value);
    text.style.color = item.color ?? TEXT_COLORS[0].value;
    el.append(text);
    el.dataset.width = 'auto';
    el.dataset.name = `Text “${item.text}”`;
  }
  placeSticker(el, item);
  return el;
}

// The paper with everything on it (no moving things here; that's the editor's job)
export function createJournalSurface(page, things) {
  const surface = document.createElement('div');
  surface.className = `journal-surface journal-paper--${paperOf(page)}`;
  const items = document.createElement('div');
  items.className = 'journal-surface__items';
  items.append(...page.items.map((item) => createPiece(item, things)).filter(Boolean));
  surface.append(items);
  return surface;
}

// A journal page in the binder. Cards, badges and polaroids on it can be picked up
// (see Binder.js). editable: show the ✎ button that opens the editor.
export function createJournalPage(page, pageNumber, things, { editable = false } = {}) {
  const el = document.createElement('section');
  el.className = 'page page--journal';
  el.setAttribute('aria-label', `Page ${pageNumber}: journal page`);

  const surface = createJournalSurface(page, things);
  for (const thing of surface.querySelectorAll('[data-card-id], [data-merch-id]')) {
    const piece = thing.closest('.piece');
    thing.tabIndex = 0;
    thing.setAttribute('role', 'button');
    thing.setAttribute('aria-label', `Pick up ${piece.dataset.name}`);
  }
  el.append(surface);

  const number = document.createElement('span');
  number.className = 'page__number';
  number.setAttribute('aria-hidden', 'true');
  number.textContent = pageNumber;
  el.append(number);

  if (editable) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'journal-page__edit';
    edit.dataset.page = pageNumber;
    edit.setAttribute('aria-label', `Edit journal page ${pageNumber}`);
    edit.textContent = '✎';
    el.append(edit);
  }
  return el;
}
