// Small helpers about binders: pockets per page, counting cards.

// How many pockets a page has for each binder layout
export function slotsPerPage(layout) {
  return layout === '3x3' ? 9 : 4;
}

export function emptySlots(layout) {
  return Array(slotsPerPage(layout)).fill(null);
}

// How many cards are in a binder's pockets
export function countCards(binder) {
  return binder.pages.reduce((sum, page) => sum + (page.slots?.filter(Boolean).length ?? 0), 0);
}

// "1 card", "12 cards"
export function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
