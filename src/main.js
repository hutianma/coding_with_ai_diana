// App entry point: load your cards and show your binder.
import { createSampleBinder } from './data/sampleBinder.js';
import { mountBinder } from './binder/Binder.js';
import { loadCollection, saveCard, deleteCard } from './storage/collection.js';
import { askToKeepData, savingIsAvailable } from './storage/db.js';
import { releaseImage } from './cards/imageUrls.js';
import { pickPhotosForNewCards, editCard } from './workshop/Workshop.js';
import { openMyCards } from './workshop/MyCards.js';

const app = document.getElementById('app');

// Link options (handy for testing):
//   ?open   opens at page 1        ?page=3  opens at page 3
//   ?demo   shows the sample binder with placeholder cards and never touches saved data
const params = new URLSearchParams(location.search);
let startPage = 0; // rounded and kept in range by mountBinder
if (params.has('page')) startPage = Number(params.get('page')) || 1;
else if (params.has('open')) startPage = 1;

if (params.has('demo')) {
  mountBinder(app, createSampleBinder(), { startPage });
} else {
  start();
}

async function start() {
  let collection;
  try {
    collection = await loadCollection();
  } catch (err) {
    showProblem(`Your saved cards couldn't be loaded. ${err.message ?? ''}`);
    return;
  }
  if (savingIsAvailable()) askToKeepData();
  const { binder, cards } = collection;
  let view = null;

  // Draw the binder. Until you've made a card, show the sample cards with a hint.
  function show(page, fadeIn = false) {
    view?.destroy();
    const hasCards = Object.keys(cards).length > 0;
    let notice = null;
    if (!savingIsAvailable()) {
      notice = createNotice("This browser isn't letting the app save (private browsing?). Cards you make will disappear when you close the page.");
      notice.classList.add('notice--warning');
    } else if (!hasCards) {
      notice = createNotice('These are sample cards. Tap “＋ New card” to make your own from your photos.');
    }
    view = mountBinder(app, hasCards ? { ...binder, cards } : createSampleBinder(), {
      startPage: page,
      fadeIn,
      toolbarEnd: createActions(),
      notice,
    });
  }

  function createActions() {
    const box = document.createElement('div');
    box.className = 'toolbar__actions';
    box.innerHTML = `
      <button class="toolbar__action" type="button" data-action="list">My cards</button>
      <button class="toolbar__action toolbar__action--primary" type="button" data-action="new">＋ New card</button>
    `;
    box.querySelector('[data-action="new"]').addEventListener('click', () => pickPhotosForNewCards(onSave));
    box.querySelector('[data-action="list"]').addEventListener('click', () =>
      openMyCards({ cards, onEdit: (card) => editCard(card, onSave), onDelete }),
    );
    return box;
  }

  // Save a new or edited card, then show the page it's on
  async function onSave(card, previous) {
    const page = await saveCard(binder, card);
    if (previous && previous.front !== card.front) releaseImage(previous.front);
    cards[card.id] = card;
    show(page);
  }

  async function onDelete(card) {
    await deleteCard(binder, card.id);
    releaseImage(card.front);
    delete cards[card.id];
    show(view?.page ?? 0);
  }

  show(startPage, true);
}

function createNotice(text) {
  const p = document.createElement('p');
  p.className = 'notice';
  p.textContent = text;
  return p;
}

function showProblem(text) {
  const p = createNotice(text);
  p.setAttribute('role', 'alert');
  app.replaceChildren(p);
}
