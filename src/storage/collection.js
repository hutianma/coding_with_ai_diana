// Your collection: the cards you made and the binder they live in.
// Wraps db.js with the rules for where new cards go.
//
// A binder page is either a page of pockets, { id, slots: [cardId | null, …] }, or a
// journal page, { id, kind: 'journal', paper, items: [placed things] } (see journal/).
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

export const isJournal = (page) => page?.kind === 'journal';

// A copy of the binder's pages to change, so nothing changes if saving fails
function copyPages(binder) {
  return binder.pages.map((page) => (isJournal(page)
    ? { ...page, items: page.items.map((item) => ({ ...item })) }
    : { ...page, slots: [...page.slots] }));
}

// Load everything. Returns { binder, cards } where cards is { id: card }, or a
// fresh empty binder the first time.
export async function loadCollection() {
  const [binder, cardList] = await Promise.all([get('binders', BINDER_ID), getAll('cards')]);
  const cards = Object.fromEntries(cardList.map((card) => [card.id, card]));
  const result = binder ?? newBinder();
  // Cards saved without a pocket (e.g. if a save was interrupted) still go in the binder
  const placed = new Set(result.pages.flatMap((page) => page.slots ?? []));
  for (const card of cardList.sort((a, b) => a.createdAt - b.createdAt)) {
    if (!placed.has(card.id)) placeInNextPocket(result, card.id);
  }
  return { binder: result, cards };
}

// Put a card id in the first empty pocket, adding a page when the binder is full.
// Returns the page number (1-based) the card landed on.
export function placeInNextPocket(binder, cardId) {
  for (let p = 0; p < binder.pages.length; p++) {
    if (isJournal(binder.pages[p])) continue; // journal pages have no pockets
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

// Save a new name and cover design for the binder
export async function saveBinderDesign(binder, { name, cover }) {
  const next = { ...binder, name, cover, coverColor: cover.color };
  await writeMany([{ store: 'binders', value: next }]);
  Object.assign(binder, { name, cover, coverColor: cover.color }); // only once it's safely saved
}

// ---------- Badges and polaroids ----------

export async function loadMerch() {
  const list = await getAll('merch');
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export function saveMerch(item) {
  return writeMany([{ store: 'merch', value: item }]);
}

// Delete a badge or polaroid, and take it off any journal page it was on
export async function deleteMerch(binder, id) {
  const pages = withoutItems(binder, (item) => item.merchId === id);
  await writeMany([
    { store: 'binders', value: { ...binder, pages } },
    { store: 'merch', deleteId: id },
  ]);
  binder.pages = pages; // only once it's safely saved
}

// Delete a card: empty its pocket and take it off any journal page it was on
export async function deleteCard(binder, cardId) {
  const pages = withoutItems(binder, (item) => item.cardId === cardId).map((page) => (isJournal(page) ? page : {
    ...page,
    slots: page.slots.map((id) => (id === cardId ? null : id)),
  }));
  await writeMany([
    { store: 'binders', value: { ...binder, pages } },
    { store: 'cards', deleteId: cardId },
  ]);
  binder.pages = pages; // only once it's safely saved
}

// A copy of the pages with the matching things taken off every journal page
function withoutItems(binder, matches) {
  return copyPages(binder).map((page) => (isJournal(page)
    ? { ...page, items: page.items.filter((item) => !matches(item)) }
    : page));
}

// ---------- Journal pages ----------

// Save a new or edited journal page. A new page goes in at `insertAt` (0 = before
// page 1; past the end = last). Returns the page number it is on.
export async function saveJournalPage(binder, page, insertAt = binder.pages.length) {
  const pages = copyPages(binder);
  let index = pages.findIndex((p) => p.id === page.id);
  if (index === -1) {
    index = Math.max(0, Math.min(pages.length, insertAt));
    pages.splice(index, 0, page);
  } else {
    pages[index] = page;
  }
  await writeMany([{ store: 'binders', value: { ...binder, pages } }]);
  binder.pages = pages; // only once it's safely saved
  return index + 1;
}

export async function deleteJournalPage(binder, pageId) {
  const pages = copyPages(binder).filter((p) => p.id !== pageId);
  await writeMany([{ store: 'binders', value: { ...binder, pages } }]);
  binder.pages = pages; // only once it's safely saved
}
