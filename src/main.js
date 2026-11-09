// App entry point: load your cards and show your binder.
import { createSampleBinder } from './data/sampleBinder.js';
import { mountBinder } from './binder/Binder.js';
import { loadCollection, saveCard, deleteCard, loadMerch, saveMerch, deleteMerch } from './storage/collection.js';
import { askToKeepData, savingIsAvailable } from './storage/db.js';
import { releaseImage } from './cards/imageUrls.js';
import { pickPhotosForNewCards, editCard } from './workshop/Workshop.js';
import { openMyCards, openMakeMenu } from './workshop/MyCards.js';
import { openBadgeWorkshop, openPolaroidWorkshop } from './merch/MerchWorkshop.js';

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
  let merch = {};
  let merchProblem = false;
  try {
    [collection, merch] = await Promise.all([
      loadCollection(),
      // Badges and polaroids failing to load shouldn't hide your cards
      loadMerch().catch(() => { merchProblem = true; return {}; }),
    ]);
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
      notice = createNotice("Saving isn't working in this browser right now (private browsing?). Cards you make won't be kept. Try reloading the page.");
      notice.classList.add('notice--warning');
    } else if (merchProblem) {
      notice = createNotice("Your badges and polaroids couldn't be loaded. Try reloading the page.");
      notice.classList.add('notice--warning');
    } else if (!hasCards) {
      notice = createNotice('These are sample cards. Tap “＋ New” to make your own from your photos.');
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
      <button class="toolbar__action" type="button" data-action="list">My stuff</button>
      <button class="toolbar__action toolbar__action--primary" type="button" data-action="new">＋ New</button>
    `;
    box.querySelector('[data-action="new"]').addEventListener('click', () => openMakeMenu(make));
    box.querySelector('[data-action="list"]').addEventListener('click', () => openShelf());
    return box;
  }

  function openShelf(tab) {
    openMyCards({
      cards,
      merch,
      tab,
      onEdit: (kind, item) => {
        if (kind === 'card') editCard(item, onSave);
        else if (item.kind === 'badge') openBadgeWorkshop({ existing: item, onSave: onSaveMerch });
        else openPolaroidWorkshop({ existing: item, onSave: onSaveMerch });
      },
      onDelete: (kind, item) => (kind === 'card' ? onDelete(item) : onDeleteMerch(item)),
      onMake: (shelfTab) => make({ cards: 'card', badges: 'badge', polaroids: 'polaroid' }[shelfTab]),
    });
  }

  // Make something new: a photocard, badge or polaroid
  function make(kind) {
    if (kind === 'card') pickPhotosForNewCards(onSave);
    else if (kind === 'badge') openBadgeWorkshop({ onSave: onSaveMerch });
    else openPolaroidWorkshop({ onSave: onSaveMerch });
  }

  // Badges and polaroids live on the shelf; after saving, show it there
  async function onSaveMerch(item, previous) {
    await saveMerch(item);
    if (previous) {
      if (previous.image !== item.image) releaseImage(previous.image);
      if (previous.caption !== item.caption) releaseImage(previous.caption);
    }
    merch[item.id] = item;
    openShelf(item.kind === 'badge' ? 'badges' : 'polaroids');
  }

  async function onDeleteMerch(item) {
    await deleteMerch(item.id);
    releaseImage(item.image);
    releaseImage(item.caption);
    delete merch[item.id];
  }

  // Save a new or edited card, then show the page it's on
  async function onSave(card, previous) {
    const page = await saveCard(binder, card);
    if (previous) {
      releaseImage(previous.front); // the edited card has a new front image
      if (previous.signature !== card.signature) releaseImage(previous.signature);
    }
    cards[card.id] = card;
    show(page);
  }

  async function onDelete(card) {
    await deleteCard(binder, card.id);
    releaseImage(card.front);
    releaseImage(card.signature);
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
