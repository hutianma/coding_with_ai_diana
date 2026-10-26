// All the maths that connects page numbers to leaves (sheets), in one place.
//
// Phone: one page per leaf.        Leaf i shows page i+1 on its front.
// Computer: two pages per leaf.    Leaf i shows page 2i+1 on its front and 2i+2 on its back.
// `current` = how many leaves are turned to the left.
export function createPaging(single, totalPages) {
  if (single) {
    return {
      leafCount: totalPages,
      maxCurrent: totalPages - 1,
      pageIndexOn: (leaf, side) => (side === 'front' ? leaf : -1),
      pagesShown: (current) => [current + 1],
      currentFor: (page) => clamp(page - 1, 0, totalPages - 1),
    };
  }

  const leafCount = Math.ceil(totalPages / 2);
  // With an odd page count the last leaf has a blank back, so don't turn to it
  const maxCurrent = totalPages % 2 === 1 ? leafCount - 1 : leafCount;
  return {
    leafCount,
    maxCurrent,
    pageIndexOn: (leaf, side) => 2 * leaf + (side === 'front' ? 0 : 1),
    // Left page is 2·current, right page is 2·current+1 (page 0 = inside the front cover)
    pagesShown: (current) =>
      [2 * current, 2 * current + 1].filter((page) => page >= 1 && page <= totalPages),
    currentFor: (page) => clamp(Math.floor(page / 2), 0, maxCurrent),
  };
}

// "Pages 2–3 of 4" or "Page 1 of 4"
export function pageLabel(pages, total) {
  return pages.length === 2
    ? `Pages ${pages[0]}–${pages[1]} of ${total}`
    : `Page ${pages[0]} of ${total}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
