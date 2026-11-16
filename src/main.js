// App entry point: load your cards and show the binder you last looked at (or the bookshelf).
import { createSampleBinder } from './data/sampleBinder.js';
import { mountBinder } from './binder/Binder.js';
import { mountShelf } from './binder/Shelf.js';
import { loadCollection, newBinder, saveBinder, deleteBinder, findCard, moveCard, saveCard, deleteCard, loadMerch, saveMerch, deleteMerch, saveBinderDesign, saveJournalPage, deleteJournalPage, isJournal, journalUses } from './storage/collection.js';
import { openJournalEditor } from './journal/JournalEditor.js';
import { newJournalPage } from './journal/JournalPage.js';
import { openCoverEditor } from './binder/CoverEditor.js';
import { askToKeepData, savingIsAvailable, remember, recall } from './storage/db.js';
import { releaseImage } from './cards/imageUrls.js';
import { stickerImages } from './decor/stickers.js';
import { pickPhotosForNewCards, editCard } from './workshop/Workshop.js';
import { openMyCards, openMakeMenu } from './workshop/MyCards.js';
import { openBadgeWorkshop, openPolaroidWorkshop } from './merch/MerchWorkshop.js';
import { openSleeveWorkshop } from './merch/SleeveWorkshop.js';

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
      // Badges, polaroids and sleeves failing to load shouldn't hide your cards
      loadMerch().catch(() => { merchProblem = true; return {}; }),
    ]);
  } catch (err) {
    showProblem(`Your saved cards couldn't be loaded. ${err.message ?? ''}`);
    return;
  }
  if (savingIsAvailable()) askToKeepData();
  const { binders, cards } = collection;
  let binder = binders.find((b) => b.id === recall('binder')) ?? binders[0]; // the open binder
  // A sleeve whose card was deleted while the sleeves couldn't be loaded: it'd be empty,
  // so it goes too (as it would have then)
  for (const sleeve of Object.values(merch)) {
    if (sleeve.kind !== 'sleeve' || cards[sleeve.cardId]) continue;
    try {
      await deleteMerch(binders, sleeve.id);
      delete merch[sleeve.id];
    } catch { /* try again next time */ }
  }
  let view = null; // the open binder, or the bookshelf
  let showingSamples = false; // the sample binder is shown (you haven't made anything yet)

  // Open a binder (and remember it, to open it next time)
  function openBinder(chosen, page = 0, fadeIn = true) {
    binder = chosen;
    remember('binder', binder.id);
    show(page, fadeIn);
  }

  // Draw the open binder. Until you've made something (a card, a journal page or a second
  // binder), show the sample cards with a hint.
  function show(page, fadeIn = false) {
    view?.destroy();
    const hasCards = Object.keys(cards).length > 0 || binders.length > 1 || binders.some((b) => b.pages.some(isJournal));
    showingSamples = !hasCards;
    let notice = null;
    if (!savingIsAvailable()) {
      notice = createNotice("Saving isn't working in this browser right now (private browsing?). Cards you make won't be kept. Try reloading the page.");
      notice.classList.add('notice--warning');
    } else if (merchProblem) {
      notice = createNotice("Your badges, polaroids and card sleeves couldn't be loaded. Try reloading the page.");
      notice.classList.add('notice--warning');
    } else if (!hasCards) {
      notice = createNotice('These are sample cards. Tap “＋ New” to make your own from your photos.');
    }
    // Until you've made a card, the sample cards are shown in your binder's own cover
    const shown = hasCards
      ? { ...binder, cards, merch }
      : { ...createSampleBinder(), name: binder.name, cover: binder.cover, coverColor: binder.coverColor };
    view = mountBinder(app, shown, {
      startPage: page,
      fadeIn,
      toolbarEnd: createActions(),
      notice,
      onEditCover: () => openCoverEditor({
        binder,
        cards,
        onSave: async (design) => {
          await saveBinderDesign(binder, design);
          show(0);
        },
        onDelete: binders.length > 1 ? removeBinder : null,
      }),
      onEditJournal: hasCards ? editJournal : null,
      onShelf: showBookshelf,
    });
  }

  // ---------- The bookshelf ----------

  function showBookshelf() {
    view?.destroy();
    view = mountShelf(app, { binders, cards, current: binder, onOpen: (chosen) => openBinder(chosen), onNew: makeBinder });
  }

  // A new binder: design its cover (and choose its pockets), then open it
  function makeBinder() {
    openCoverEditor({
      binder: newBinder({ name: 'New binder' }),
      cards,
      isNew: true,
      onSave: async ({ name, cover, layout }) => {
        const made = newBinder({ name, cover, layout });
        await saveBinder(made);
        binders.push(made);
        openBinder(made);
      },
    });
  }

  // Delete the open binder: its cards move to another binder (the first one left)
  async function removeBinder() {
    const keepIn = binders.find((b) => b !== binder);
    await deleteBinder(binder, keepIn);
    stickerImages(binder.cover?.stickers ?? []).forEach(releaseImage);
    binders.splice(binders.indexOf(binder), 1);
    binder = keepIn;
    remember('binder', binder.id);
    showBookshelf();
  }

  // ---------- Journal pages ----------

  // A new journal page goes right after the page you're looking at (at the end while
  // the sample cards are shown: those pages aren't in your binder)
  function newJournal() {
    const insertAt = showingSamples ? binder.pages.length : view?.lastPage ?? 0;
    openJournalEditor({
      page: newJournalPage(),
      isNew: true,
      cards,
      merch,
      onSave: async (page) => show(await saveJournalPage(binder, page, insertAt)),
    });
  }

  function editJournal(index) {
    const page = binder.pages[index];
    if (!isJournal(page)) return;
    openJournalEditor({
      page,
      cards,
      merch,
      onSave: async (edited) => show(await saveJournalPage(binder, edited)),
      onDelete: async () => {
        await deleteJournalPage(binder, page.id);
        show(Math.min(index + 1, binder.pages.length));
      },
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
    box.querySelector('[data-action="list"]').addEventListener('click', () => openMyStuff());
    return box;
  }

  function openMyStuff(tab) {
    openMyCards({
      cards,
      merch,
      tab,
      binders,
      binderOf: (card) => findCard(binders, card.id)?.binder ?? null,
      onMove: moveToBinder,
      onEdit: (kind, item) => {
        if (kind === 'card') editCard(item, onSave);
        else if (item.kind === 'badge') openBadgeWorkshop({ existing: item, onSave: onSaveMerch });
        else if (item.kind === 'sleeve') openSleeveWorkshop({ existing: item, cards, onSave: onSaveMerch });
        else openPolaroidWorkshop({ existing: item, onSave: onSaveMerch });
      },
      onDelete: (kind, item) => (kind === 'card' ? onDelete(item) : onDeleteMerch(item)),
      deleteNote: (kind, item) => {
        const count = kind === 'card' ? sleevesWith(item.id).length : 0;
        if (!count) return '';
        return count === 1 ? 'It\'s in a card sleeve, which will be deleted too.' : `It's in ${count} card sleeves, which will be deleted too.`;
      },
      onMake: (shelfTab) => make({ cards: 'card', badges: 'badge', polaroids: 'polaroid', sleeves: 'sleeve' }[shelfTab]),
    });
  }

  // Make something new: a photocard, badge, polaroid, card sleeve or journal page
  function make(kind) {
    if (kind === 'journal') newJournal();
    else if (kind === 'card') pickPhotosForNewCards(onSave);
    else if (kind === 'badge') openBadgeWorkshop({ onSave: onSaveMerch });
    else if (kind === 'sleeve') openSleeveWorkshop({ cards, onSave: onSaveMerch });
    else openPolaroidWorkshop({ onSave: onSaveMerch });
  }

  const SHELF_TABS = { badge: 'badges', polaroid: 'polaroids', sleeve: 'sleeves' };
  const sleevesWith = (cardId) => Object.values(merch).filter((m) => m.kind === 'sleeve' && m.cardId === cardId);

  // Badges, polaroids and sleeves live in My stuff; after saving, show them there
  async function onSaveMerch(item, previous) {
    await saveMerch(item);
    if (previous) {
      if (previous.image !== item.image) releaseImage(previous.image);
      if (previous.caption !== item.caption) releaseImage(previous.caption);
    }
    merch[item.id] = item;
    redrawIfOnAPage(item.id);
    openMyStuff(SHELF_TABS[item.kind]);
  }

  async function onDeleteMerch(item) {
    const wasOnAPage = isOnAPage(item.id);
    await deleteMerch(binders, item.id);
    releaseImage(item.image);
    releaseImage(item.caption);
    stickerImages(item.stickers ?? []).forEach(releaseImage);
    delete merch[item.id];
    if (wasOnAPage) show(view?.page ?? 0);
  }

  const isOnAPage = (merchId) => journalUses(binders, (item) => item.merchId === merchId);

  // A journal page shows this badge / polaroid: draw the binder again so it's up to date
  function redrawIfOnAPage(merchId) {
    if (isOnAPage(merchId)) show(view?.page ?? 0);
  }

  // Save a new or edited card (a new one goes in the open binder), then show the page it's on
  async function onSave(card, previous) {
    const { binder: where, page } = await saveCard(binders, binder, card);
    if (previous) {
      releaseImage(previous.front); // the edited card has a new front image
      if (previous.signature !== card.signature) releaseImage(previous.signature);
    }
    cards[card.id] = card;
    openBinder(where, page, where !== binder);
  }

  // Move a card into the next empty pocket of another binder
  async function moveToBinder(card, to) {
    const from = findCard(binders, card.id)?.binder;
    if (!from || from === to) return;
    await moveCard(from, to, card.id);
    if (from === binder || to === binder) show(view?.page ?? 0);
  }

  // Deleting a card also deletes the sleeves it's in (My stuff says so first)
  async function onDelete(card) {
    const sleeves = sleevesWith(card.id);
    await deleteCard(binders, card.id, sleeves.map((m) => m.id));
    for (const sleeve of sleeves) {
      stickerImages(sleeve.stickers).forEach(releaseImage);
      delete merch[sleeve.id];
    }
    releaseImage(card.front);
    releaseImage(card.signature);
    delete cards[card.id];
    show(view?.page ?? 0);
  }

  openBinder(binder, startPage);
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
