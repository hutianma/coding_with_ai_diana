import { imageUrl } from './imageUrls.js';

// Draws the front of one photocard: a placeholder (demo binder) or your photo.
export function createCard(card) {
  const el = document.createElement('div');
  el.className = 'card';

  if (card.placeholder) {
    el.classList.add('card--placeholder');
    el.style.setProperty('--hue', card.hue);
    el.innerHTML = `
      <span class="card__number" aria-hidden="true">${Number(card.number)}</span>
      <span class="card__label" aria-hidden="true">photocard</span>
    `;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `Placeholder card ${card.number}`);
    return el;
  }

  el.classList.add('card--photo');
  const img = document.createElement('img');
  img.className = 'card__photo';
  img.src = imageUrl(card.front);
  img.alt = card.back?.text ? `Photocard: ${card.back.text}` : 'Photocard';
  img.draggable = false;
  el.append(img);
  return el;
}
