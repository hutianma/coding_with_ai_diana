// All the maths that connects page numbers to leaves (sheets), in one place.
//
// Leaf 0 is the front cover: the cover design on its front, the inside of the cover on its back.
// `current` = how many leaves are turned to the left, so current 0 = the binder is closed.
// Page numbers start at 1; "page 0" means the cover.
//
// Phone: one page per leaf.       Leaf k (k ≥ 1) shows page k on its front.
// Computer: two pages per leaf.   Leaf k (k ≥ 1) shows page 2k-1 on its front and 2k on its back,
//                                 so an open spread shows page 2k-2 on the left and 2k-1 on the right.
export function createPaging(single, totalPages) {
  if (single) {
    return {
      leafCount: totalPages + 1,
      maxCurrent: totalPages,
      faceFor: (leaf, side) => {
        if (leaf === 0) return side === 'front' ? { type: 'cover' } : { type: 'blank' };
        return side === 'front' ? { type: 'page', number: leaf } : { type: 'blank' };
      },
      pagesShown: (current) => (current === 0 ? [] : [current]),
      currentFor: (page) => clamp(page, 0, totalPages),
    };
  }

  const leafCount = 1 + Math.ceil(totalPages / 2);
  // With an odd page count the last leaf has a blank back, so don't turn to it
  const maxCurrent = totalPages % 2 === 1 ? leafCount - 1 : leafCount;
  return {
    leafCount,
    maxCurrent,
    faceFor: (leaf, side) => {
      if (leaf === 0) return side === 'front' ? { type: 'cover' } : { type: 'inside' };
      const number = side === 'front' ? 2 * leaf - 1 : 2 * leaf;
      return number <= totalPages ? { type: 'page', number } : { type: 'blank' };
    },
    pagesShown: (current) =>
      current === 0
        ? []
        : [2 * current - 2, 2 * current - 1].filter((page) => page >= 1 && page <= totalPages),
    currentFor: (page) => (page <= 0 ? 0 : clamp(Math.floor(page / 2) + 1, 1, maxCurrent)),
  };
}

// "Cover", "Pages 2–3 of 4" or "Page 1 of 4"
export function pageLabel(pages, total) {
  if (pages.length === 0) return 'Cover';
  return pages.length === 2
    ? `Pages ${pages[0]}–${pages[1]} of ${total}`
    : `Page ${pages[0]} of ${total}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
