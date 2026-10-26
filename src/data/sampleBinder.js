// Demo binder filled with placeholder cards (colored gradients, no real photos).
// Follows the Binder / Page / Card shape described in the README's data model.

const PAGE_COUNT = 4;
const SLOTS_PER_PAGE = 4; // 2×2 layout

function makePlaceholderCard(number) {
  return {
    id: `placeholder-${number}`,
    placeholder: true,
    number,
    // Spread the colors evenly around the color wheel
    hue: (number * 47) % 360,
    finish: 'glossy',
  };
}

export function createSampleBinder() {
  const pages = [];
  const cards = {}; // every card, looked up by its id
  let cardNumber = 1;

  for (let p = 0; p < PAGE_COUNT; p++) {
    const slots = [];
    for (let s = 0; s < SLOTS_PER_PAGE; s++) {
      // Leave the last pocket empty so we can see what an empty pocket looks like
      const isLastSlot = p === PAGE_COUNT - 1 && s === SLOTS_PER_PAGE - 1;
      if (isLastSlot) {
        slots.push(null);
      } else {
        const card = makePlaceholderCard(cardNumber++);
        cards[card.id] = card;
        slots.push(card.id); // pages only store the card's id
      }
    }
    pages.push({ id: `page-${p + 1}`, slots });
  }

  return {
    id: 'sample',
    name: 'My Photocards',
    coverColor: '#f2b8cc',
    layout: '2x2',
    pages,
    cards,
  };
}
