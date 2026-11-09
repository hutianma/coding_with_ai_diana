// "My cards": every card you've made, with Edit and Delete.
import { imageUrl } from '../cards/imageUrls.js';

export function openMyCards({ cards, onEdit, onDelete }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'my-cards';
  dialog.setAttribute('aria-labelledby', 'my-cards-title');
  dialog.innerHTML = `
    <header class="my-cards__header">
      <h2 id="my-cards-title" class="my-cards__title">My cards</h2>
      <button class="my-cards__close" type="button" aria-label="Close">✕</button>
    </header>
    <ul class="my-cards__list"></ul>
  `;
  const list = dialog.querySelector('.my-cards__list');

  function draw() {
    const sorted = Object.values(cards).sort((a, b) => a.createdAt - b.createdAt);
    if (!sorted.length) {
      list.replaceWith(Object.assign(document.createElement('p'), {
        className: 'my-cards__empty',
        textContent: 'No cards yet. Tap "＋ New card" to make your first one.',
      }));
      return;
    }
    list.replaceChildren(...sorted.map((card, i) => {
      const item = document.createElement('li');
      item.className = 'my-cards__item';
      item.innerHTML = `
        <div class="my-cards__thumb"><img alt=""></div>
        <div class="my-cards__buttons">
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="delete">Delete</button>
        </div>
      `;
      const name = card.back?.text || `Card ${i + 1}`;
      const img = item.querySelector('img');
      img.src = imageUrl(card.front);
      img.alt = name;
      item.querySelector('[data-action="edit"]').setAttribute('aria-label', `Edit ${name}`);
      item.querySelector('[data-action="delete"]').setAttribute('aria-label', `Delete ${name}`);
      item.querySelector('[data-action="edit"]').addEventListener('click', () => {
        close();
        onEdit(card);
      });
      item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
        try {
          await onDelete(card);
        } catch (err) {
          alert(`Couldn't delete this card. ${err.message ?? ''}`.trim());
          return;
        }
        draw();
      });
      return item;
    }));
  }

  function close() {
    dialog.close();
    dialog.remove();
  }

  dialog.querySelector('.my-cards__close').addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  document.body.append(dialog);
  draw();
  dialog.showModal();
}
