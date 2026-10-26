import { createCard } from '../cards/Card.js';

// One clear plastic pocket. Holds a card, or nothing.
export function createPocket(card) {
  const pocket = document.createElement('div');
  pocket.className = 'pocket';

  if (card) {
    pocket.append(createCard(card));
  } else {
    pocket.classList.add('pocket--empty');
    pocket.setAttribute('aria-label', 'Empty pocket');
  }

  // The plastic sleeve sits on top of the card
  const sleeve = document.createElement('div');
  sleeve.className = 'pocket__sleeve';
  pocket.append(sleeve);

  return pocket;
}

// A whole binder page: a grid of pockets.
export function createPage(page, pageNumber, layout) {
  const el = document.createElement('section');
  el.className = `page page--${layout}`;
  el.setAttribute('aria-label', `Page ${pageNumber}`);

  for (const card of page.slots) {
    el.append(createPocket(card));
  }

  const number = document.createElement('span');
  number.className = 'page__number';
  number.textContent = pageNumber;
  el.append(number);

  return el;
}
