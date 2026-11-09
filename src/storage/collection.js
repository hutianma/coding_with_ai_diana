// Your collection: the cards you made and the binder they live in.
// Wraps db.js with the rules for where new cards go.
import { getAll, get, writeMany } from './db.js';
import { makeId } from './ids.js';
import { emptySlots } from '../binder/layout.js';

const BINDER_ID = 'mine';

export function newBinder() {
  return {
    id: BINDER_ID,
    name: 'My Photocards',
    coverColor: '#f2b8cc',
    layout: '2x2',
    pages: [emptyPage('2x2')],
  };
}

function emptyPage(layout) {
  return { id: makeId('page'), slots: emptySlots(layout) };
}

// A copy of the binder's pages to change, so nothing changes if saving fails
function copyPages(binder) {
  return binder.pages.map((page) => ({ ...page, slots: [...page.slots] }));
}

// Load everything. Returns { binder, cards } where cards is { id: card }, or a
// fresh empty binder the first time.
export async function loadCollection() {
  const [binder, cardList] = await Promise.all([get('binders', BINDER_ID), getAll('cards')]);
  const cards = Object.fromEntries(cardList.map((card) => [card.id, card]));
  const result = binder ?? newBinder();
  // Cards saved without a pocket (e.g. if a save was interrupted) still go in the binder
  const placed = new Set(result.pages.flatMap((page) => page.slots));
  for (const card of cardList.sort((a, b) => a.createdAt - b.createdAt)) {
    if (!placed.has(card.id)) placeInNextPocket(result, card.id);
  }
  return { binder: result, cards };
}

// Put a card id in the first empty pocket, adding a page when the binder is full.
// Returns the page number (1-based) the card landed on.
export function placeInNextPocket(binder, cardId) {
  for (let p = 0; p < binder.pages.length; p++) {
    const s = binder.pages[p].slots.indexOf(null);
    if (s !== -1) {
      binder.pages[p].slots[s] = cardId;
      return p + 1;
    }
  }
  const page = emptyPage(binder.layout);
  page.slots[0] = cardId;
  binder.pages.push(page);
  return binder.pages.length;
}

// Save a new or edited card. New cards go into the next empty pocket.
// Returns the page number the card is on.
export async function saveCard(binder, card) {
  const next = { ...binder, pages: copyPages(binder) };
  let pageNumber = next.pages.findIndex((page) => page.slots.includes(card.id)) + 1;
  if (!pageNumber) pageNumber = placeInNextPocket(next, card.id);
  await writeMany([
    { store: 'cards', value: card },
    { store: 'binders', value: next },
  ]);
  binder.pages = next.pages; // only once it's safely saved
  return pageNumber;
}

// Delete a card and empty its pocket
export async function deleteCard(binder, cardId) {
  const pages = copyPages(binder).map((page) => ({
    ...page,
    slots: page.slots.map((id) => (id === cardId ? null : id)),
  }));
  await writeMany([
    { store: 'binders', value: { ...binder, pages } },
    { store: 'cards', deleteId: cardId },
  ]);
  binder.pages = pages; // only once it's safely saved
}
