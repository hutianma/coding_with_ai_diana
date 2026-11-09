// "My stuff": everything you've made — photocards, badges and polaroids — on one shelf.
// Tap something to pick it up; Edit and Delete under each.
import { imageUrl } from '../cards/imageUrls.js';
import { cardName } from '../cards/Card.js';
import { openCardViewer } from '../cards/CardViewer.js';
import { createBadge, badgeName } from '../merch/Badge.js';
import { createPolaroid, polaroidName } from '../merch/Polaroid.js';
import { openMerchViewer } from '../merch/viewMerch.js';

const TABS = [
  { value: 'cards', name: 'Photocards', empty: 'No photocards yet.' },
  { value: 'badges', name: 'Badges', empty: 'No badges yet.' },
  { value: 'polaroids', name: 'Polaroids', empty: 'No polaroids yet.' },
];

let lastTab = 'cards';

// cards / merch: { id: item } (kept up to date by the caller).
// onEdit(kind, item), onDelete(kind, item): kind is 'card' or 'merch'.
// onMake(tab): make something new from an empty tab.
export function openMyCards({ cards, merch = {}, onEdit, onDelete, onMake, tab = lastTab }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'my-cards';
  dialog.setAttribute('aria-labelledby', 'my-cards-title');
  dialog.innerHTML = `
    <header class="my-cards__header">
      <h2 id="my-cards-title" class="my-cards__title">My stuff</h2>
      <button class="my-cards__close" type="button" aria-label="Close">✕</button>
    </header>
    <div class="my-cards__tabs" role="tablist">
      ${TABS.map((t) => `<button class="my-cards__tab" type="button" role="tab" data-tab="${t.value}">${t.name}</button>`).join('')}
    </div>
    <ul class="my-cards__list" role="tabpanel"></ul>
  `;
  const list = dialog.querySelector('.my-cards__list');
  let current = tab;

  function itemsFor(name) {
    const byDate = (a, b) => a.createdAt - b.createdAt;
    if (name === 'cards') return Object.values(cards).sort(byDate);
    const kind = name === 'badges' ? 'badge' : 'polaroid';
    return Object.values(merch).filter((m) => m.kind === kind).sort(byDate);
  }

  function draw() {
    lastTab = current;
    dialog.querySelectorAll('.my-cards__tab').forEach((t) => {
      const selected = t.dataset.tab === current;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const count = itemsFor(t.dataset.tab).length;
      t.textContent = `${TABS.find((x) => x.value === t.dataset.tab).name}${count ? ` (${count})` : ''}`;
    });
    list.dataset.tab = current;
    const items = itemsFor(current);
    if (!items.length) {
      const info = TABS.find((t) => t.value === current);
      const li = document.createElement('li');
      li.className = 'my-cards__empty';
      li.innerHTML = '<p></p><button class="toolbar__action toolbar__action--primary" type="button">＋ Make one</button>';
      li.querySelector('p').textContent = info.empty;
      li.querySelector('button').addEventListener('click', () => {
        close();
        onMake?.(current);
      });
      list.replaceChildren(li);
      return;
    }
    list.replaceChildren(...items.map((item, i) => createItem(item, i)));
  }

  function createItem(item, i) {
    const isCard = current === 'cards';
    const name = isCard ? (item.back?.text || `Card ${i + 1}`) : item.kind === 'badge' ? `${badgeName(item)} ${i + 1}` : `${polaroidName(item)} ${i + 1}`;
    const li = document.createElement('li');
    li.className = 'my-cards__item';
    li.innerHTML = `
      <button class="my-cards__thumb" type="button"></button>
      <div class="my-cards__buttons">
        <button type="button" data-action="edit">Edit</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
    `;
    const thumb = li.querySelector('.my-cards__thumb');
    thumb.setAttribute('aria-label', `Pick up ${isCard ? cardName(item) : name}`);
    if (isCard) {
      const img = document.createElement('img');
      img.src = imageUrl(item.front);
      img.alt = '';
      thumb.append(img);
    } else {
      thumb.classList.add(`my-cards__thumb--${item.kind}`);
      const art = item.kind === 'badge' ? createBadge(item) : createPolaroid(item);
      art.removeAttribute('role');
      art.removeAttribute('aria-label');
      thumb.append(art);
    }
    thumb.addEventListener('click', () => (isCard ? openCardViewer(item, thumb) : openMerchViewer(item, thumb)));
    li.querySelector('[data-action="edit"]').setAttribute('aria-label', `Edit ${name}`);
    li.querySelector('[data-action="delete"]').setAttribute('aria-label', `Delete ${name}`);
    li.querySelector('[data-action="edit"]').addEventListener('click', () => {
      close();
      onEdit(isCard ? 'card' : 'merch', item);
    });
    li.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
      try {
        await onDelete(isCard ? 'card' : 'merch', item);
      } catch (err) {
        alert(`Couldn't delete this. ${err.message ?? ''}`.trim());
        return;
      }
      draw();
    });
    return li;
  }

  dialog.querySelector('.my-cards__tabs').addEventListener('click', (event) => {
    const t = event.target.closest('[data-tab]');
    if (!t) return;
    current = t.dataset.tab;
    draw();
  });
  // ← → move between tabs, like a real tab list
  dialog.querySelector('.my-cards__tabs').addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const i = TABS.findIndex((t) => t.value === current);
    current = TABS[(i + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].value;
    draw();
    dialog.querySelector(`[data-tab="${current}"]`).focus();
  });

  function close() {
    dialog.close();
    dialog.remove();
  }

  dialog.querySelector('.my-cards__close').addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => {
    if (event.target !== dialog) return; // Esc in a viewer on top closes only that
    event.preventDefault();
    close();
  });

  document.body.append(dialog);
  draw();
  dialog.showModal();
}

// "＋ New": choose what to make
export function openMakeMenu(onChoose) {
  const dialog = document.createElement('dialog');
  dialog.className = 'make-menu';
  dialog.setAttribute('aria-label', 'Make something new');
  dialog.innerHTML = `
    <p class="make-menu__title">Make something new</p>
    <button class="make-menu__option" type="button" data-make="card"><span class="make-menu__icon make-menu__icon--card"></span>Photocard</button>
    <button class="make-menu__option" type="button" data-make="badge"><span class="make-menu__icon make-menu__icon--badge"></span>Badge <small>吧唧</small></button>
    <button class="make-menu__option" type="button" data-make="polaroid"><span class="make-menu__icon make-menu__icon--polaroid"></span>Polaroid <small>拍立得</small></button>
    <button class="make-menu__cancel" type="button">Cancel</button>
  `;
  const close = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener('click', (event) => {
    const option = event.target.closest('[data-make]');
    if (option) {
      close();
      onChoose(option.dataset.make);
    } else if (event.target === dialog || event.target.closest('.make-menu__cancel')) {
      close();
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  document.body.append(dialog);
  dialog.showModal();
}
