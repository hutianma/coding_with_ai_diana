import { createCard } from '../cards/Card.js';

// One clear plastic pocket. Holds a card, or nothing.
export function createPocket(card) {
  const pocket = document.createElement('div');
  pocket.className = 'pocket';

  if (card) {
    pocket.append(createCard(card));
  } else {
    pocket.classList.add('pocket--empty');
    pocket.setAttribute('role', 'img');
    pocket.setAttribute('aria-label', 'Empty pocket');
  }

  // The plastic sleeve sits on top of the card
  const sleeve = document.createElement('div');
  sleeve.className = 'pocket__sleeve';
  pocket.append(sleeve);

  return pocket;
}

// A whole binder page: a grid of pockets.
// Slots hold card ids; the cards themselves live in binder.cards.
export function createPage(page, pageNumber, binder) {
  const el = document.createElement('section');
  el.className = `page page--${binder.layout}`;
  el.setAttribute('aria-label', `Page ${pageNumber}`);

  for (const cardId of page.slots) {
    el.append(createPocket(cardId ? binder.cards[cardId] : null));
  }

  const number = document.createElement('span');
  number.className = 'page__number';
  number.setAttribute('aria-hidden', 'true');
  number.textContent = pageNumber;
  el.append(number);

  return el;
}
