import { imageUrl } from './imageUrls.js';

export const FINISHES = [
  { value: 'matte', name: 'Matte' },
  { value: 'glossy', name: 'Glossy' },
  { value: 'holo', name: 'Holo' },
];

// The card's finish, falling back to glossy for unknown values
export function finishOf(card) {
  return FINISHES.some((f) => f.value === card.finish) ? card.finish : 'glossy';
}

// A short name for a card, for screen readers and lists
export function cardName(card) {
  const name = card.placeholder ? `Sample card ${card.number}`
    : card.back?.text ? `Photocard: ${card.back.text}` : 'Photocard';
  return card.signature ? `${name} (signed)` : name;
}

// Draws the front of one photocard: a placeholder (demo binder) or your photo,
// with its signature and finish.
export function createCard(card) {
  const el = document.createElement('div');
  el.className = `card card--${finishOf(card)}`;

  if (card.placeholder) {
    el.classList.add('card--placeholder');
    el.style.setProperty('--hue', card.hue);
    el.innerHTML = `
      <span class="card__number" aria-hidden="true">${Number(card.number)}</span>
      <span class="card__label" aria-hidden="true">photocard</span>
    `;
  } else {
    el.classList.add('card--photo');
    const img = document.createElement('img');
    img.className = 'card__photo';
    img.src = imageUrl(card.front);
    img.alt = '';
    img.draggable = false;
    el.append(img);
  }

  if (card.signature) {
    const sig = document.createElement('img');
    sig.className = 'card__signature';
    sig.src = imageUrl(card.signature);
    sig.alt = '';
    sig.draggable = false;
    el.append(sig);
  }

  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', cardName(card));
  return el;
}
