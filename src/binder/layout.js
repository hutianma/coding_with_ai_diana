// How many pockets a page has for each binder layout
export function slotsPerPage(layout) {
  return layout === '3x3' ? 9 : 4;
}

export function emptySlots(layout) {
  return Array(slotsPerPage(layout)).fill(null);
}
