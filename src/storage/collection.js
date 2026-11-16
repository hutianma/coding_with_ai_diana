// Your collection: the cards you made and the binders they live in.
// Wraps db.js with the rules for where cards go.
//
// You can have many binders (shown on the bookshelf). A card is in a pocket of one binder;
// journal pages can show any of your cards, badges, polaroids and sleeves.
// A binder page is either a page of pockets, { id, slots: [cardId | null, …] }, or a
// journal page, { id, kind: 'journal', paper, items: [placed things] } (see journal/).
import { getAll, writeMany } from './db.js';
import { makeId } from './ids.js';
import { emptySlots } from '../binder/layout.js';

export const LAYOUTS = ['2x2', '3x3'];

// A new, empty binder. (The first binder ever made has the id 'mine'.)
export function newBinder({ id = makeId('binder'), name = 'My Photocards', layout = '2x2', cover = null, createdAt = Date.now() } = {}) {
  const binder = {
    id,
    name,
    coverColor: cover?.color ?? '#f2b8cc',
    layout: LAYOUTS.includes(layout) ? layout : '2x2',
    pages: [],
    createdAt,
  };
  if (cover) binder.cover = cover;
  binder.pages.push(emptyPage(binder.layout));
  return binder;
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

// Load everything. Returns { binders, cards }: the binders in the order they were made
// (a fresh empty one the first time), and cards as { id: card }.
export async function loadCollection() {
  const [binderList, cardList] = await Promise.all([getAll('binders'), getAll('cards')]);
  const cards = Object.fromEntries(cardList.map((card) => [card.id, card]));
  const binders = binderList.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  if (!binders.length) binders.push(newBinder({ id: 'mine', createdAt: 0 }));
  // Cards saved without a pocket (e.g. if a save was interrupted) go in the first binder
  const placed = new Set(binders.flatMap((b) => b.pages.flatMap((page) => page.slots ?? [])));
  for (const card of cardList.sort((a, b) => a.createdAt - b.createdAt)) {
    if (!placed.has(card.id)) placeInNextPocket(binders[0], card.id);
  }
  return { binders, cards };
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

// How many cards are in a binder's pockets
export function countCards(binder) {
  return binder.pages.reduce((sum, page) => sum + (page.slots?.filter(Boolean).length ?? 0), 0);
}

const pageWith = (binder, cardId) => binder.pages.findIndex((page) => page.slots?.includes(cardId)) + 1;

// Which binder a card is in (and on which page): { binder, page }, or null
export function findCard(binders, cardId) {
  for (const binder of binders) {
    const page = pageWith(binder, cardId);
    if (page) return { binder, page };
  }
  return null;
}

// Save a new or edited card. A new card goes into the next empty pocket of `into`; an
// edited one stays where it is. Returns { binder, page }: where the card is.
export async function saveCard(binders, into, card) {
  const found = findCard(binders, card.id);
  const binder = found?.binder ?? into;
  const next = { ...binder, pages: copyPages(binder) };
  const page = found?.page ?? placeInNextPocket(next, card.id);
  await writeMany([
    { store: 'cards', value: card },
    { store: 'binders', value: next },
  ]);
  binder.pages = next.pages; // only once it's safely saved
  return { binder, page };
}

// Save a whole binder (a new one, or one whose name or cover changed)
export async function saveBinder(binder) {
  await writeMany([{ store: 'binders', value: binder }]);
}

// Move a card into the next empty pocket of another binder. Returns the page it's on there.
export async function moveCard(from, to, cardId) {
  if (from === to) return pageWith(from, cardId);
  const fromPages = withoutCard(from, cardId);
  const toNext = { ...to, pages: copyPages(to) };
  const page = placeInNextPocket(toNext, cardId);
  await writeMany([
    { store: 'binders', value: { ...from, pages: fromPages } },
    { store: 'binders', value: toNext },
  ]);
  from.pages = fromPages; // only once it's safely saved
  to.pages = toNext.pages;
  return page;
}

// Delete a binder. Its cards aren't deleted: they move into `keepIn` (another binder).
// Its journal pages go with it.
export async function deleteBinder(binder, keepIn) {
  const cardIds = binder.pages.flatMap((page) => page.slots ?? []).filter(Boolean);
  const next = { ...keepIn, pages: copyPages(keepIn) };
  for (const id of cardIds) placeInNextPocket(next, id);
  await writeMany([
    { store: 'binders', deleteId: binder.id },
    { store: 'binders', value: next },
  ]);
  keepIn.pages = next.pages; // only once it's safely saved
}

// The pages with a card's pocket emptied
function withoutCard(binder, cardId) {
  return copyPages(binder).map((page) => (isJournal(page) ? page : {
    ...page,
    slots: page.slots.map((id) => (id === cardId ? null : id)),
  }));
}

// Save a new name and cover design for the binder
export async function saveBinderDesign(binder, { name, cover }) {
  const next = { ...binder, name, cover, coverColor: cover.color };
  await writeMany([{ store: 'binders', value: next }]);
  Object.assign(binder, { name, cover, coverColor: cover.color }); // only once it's safely saved
}

// ---------- Badges, polaroids and card sleeves ----------

export async function loadMerch() {
  const list = await getAll('merch');
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export function saveMerch(item) {
  return writeMany([{ store: 'merch', value: item }]);
}

// Delete a badge, polaroid or sleeve, and take it off any journal page it was on
export async function deleteMerch(binders, id) {
  const matches = (item) => item.merchId === id;
  const changed = binders.filter((binder) => journalUses([binder], matches))
    .map((binder) => ({ binder, pages: withoutItems(binder, matches) }));
  await writeMany([
    ...changed.map(({ binder, pages }) => ({ store: 'binders', value: { ...binder, pages } })),
    { store: 'merch', deleteId: id },
  ]);
  for (const { binder, pages } of changed) binder.pages = pages; // only once it's safely saved
}

// Delete a card: empty its pocket, take it off any journal page it was on and out of any
// cover window. The card sleeves it's in (sleeveIds) go too, as there'd be nothing in them.
export async function deleteCard(binders, cardId, sleeveIds = []) {
  const sleeves = new Set(sleeveIds);
  const gone = (item) => item.cardId === cardId || sleeves.has(item.merchId);
  const changed = binders.filter((binder) => pageWith(binder, cardId) || journalUses([binder], gone) || binder.cover?.window?.cardId === cardId)
    .map((binder) => {
      const next = { ...binder, pages: withoutItems({ pages: withoutCard(binder, cardId) }, gone) };
      if (binder.cover?.window?.cardId === cardId) next.cover = { ...binder.cover, window: null };
      return { binder, next };
    });
  await writeMany([
    ...changed.map(({ next }) => ({ store: 'binders', value: next })),
    { store: 'cards', deleteId: cardId },
    ...sleeveIds.map((id) => ({ store: 'merch', deleteId: id })),
  ]);
  for (const { binder, next } of changed) { // only once it's safely saved
    binder.pages = next.pages;
    if (next.cover !== binder.cover) binder.cover = next.cover;
  }
}

// Is anything matching on a journal page in any of these binders?
export function journalUses(binders, matches) {
  return binders.some((binder) => binder.pages.some((page) => isJournal(page) && page.items.some(matches)));
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
