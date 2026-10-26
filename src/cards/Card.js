// Draws one photocard. For now only placeholder cards exist;
// real photos arrive in M4.
export function createCard(card) {
  const el = document.createElement('div');
  el.className = 'card';

  if (card.placeholder) {
    el.classList.add('card--placeholder');
    el.style.setProperty('--hue', card.hue);
    el.innerHTML = `
      <span class="card__number">${card.number}</span>
      <span class="card__label">photocard</span>
    `;
    el.setAttribute('aria-label', `Placeholder card ${card.number}`);
  }

  return el;
}
