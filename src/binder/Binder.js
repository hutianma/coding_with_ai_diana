import { createPage, createBlankPage } from './Sleeve.js';
import { PageFlip } from './PageFlip.js';
import { createPaging, pageLabel, clamp } from './paging.js';
import { emptySlots } from './layout.js';
import { openCardViewer } from '../cards/CardViewer.js';
import { decorateCover } from './CoverDesign.js';

const phoneQuery = matchMedia('(max-width: 700px)');

// Shows the binder as one book. It starts closed on its cover; open it by
// tapping or dragging the cover, or with the arrows / ← → keys.
// startPage: 0 = closed on the cover, 1+ = open at that page.
// toolbarEnd / notice: optional elements shown at the right of the toolbar / under it.
// fadeIn: fade the binder in (off when redrawing after a change).
// onEditCover: shows a "✎ Edit cover" button while the binder is closed.
export function mountBinder(root, binder, { startPage = 0, toolbarEnd = null, notice = null, fadeIn = true, onEditCover = null } = {}) {
  // A binder always has at least one (empty) page, so it can be opened
  const pages = binder.pages.length ? binder.pages : [emptyPage(binder.layout)];

  // The page you're looking at (kept when switching phone ↔ computer). 0 = cover.
  let focusPage = clamp(Math.floor(startPage) || 0, 0, pages.length);

  const view = document.createElement('div');
  view.className = fadeIn ? 'binder-view' : 'binder-view binder-view--still';

  const toolbar = document.createElement('header');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `
    <span class="toolbar__start">
      <button class="toolbar__back" type="button">‹ Cover</button>
      <button class="toolbar__action toolbar__edit" type="button" aria-label="Edit cover" hidden>✎ Edit</button>
    </span>
    <span class="toolbar__title"></span>
    <span></span>
  `;
  // textContent (not innerHTML) so names are always shown as plain text
  toolbar.querySelector('.toolbar__title').textContent = binder.name;
  const backBtn = toolbar.querySelector('.toolbar__back');
  const editBtn = toolbar.querySelector('.toolbar__edit');
  if (onEditCover) {
    editBtn.addEventListener('click', () => {
      // Only while the binder is closed and still (not while the cover is turning)
      if (flip.current !== 0 || flip.isDragging || flip.running) return;
      onEditCover();
    });
  }
  if (toolbarEnd) toolbar.lastElementChild.replaceWith(toolbarEnd);

  const stage = document.createElement('div');
  stage.className = 'stage';

  const nav = document.createElement('nav');
  nav.className = 'page-nav';
  nav.setAttribute('aria-label', 'Turn pages');
  nav.innerHTML = `
    <button class="page-nav__btn" type="button" data-dir="prev" aria-label="Previous page">‹</button>
    <span class="page-nav__label" aria-live="polite"></span>
    <button class="page-nav__btn" type="button" data-dir="next" aria-label="Next page">›</button>
  `;
  const prevBtn = nav.querySelector('[data-dir="prev"]');
  const nextBtn = nav.querySelector('[data-dir="next"]');
  const label = nav.querySelector('.page-nav__label');

  let flip = null;
  let paging = null;
  let focusBefore = null; // what had keyboard focus when the last turn started

  function updateNav() {
    label.textContent = pageLabel(paging.pagesShown(flip.current), pages.length);

    // If the arrow you're focused on gets disabled at the end, move focus to the other one
    const focused = document.activeElement;
    prevBtn.disabled = !flip.canPrev;
    nextBtn.disabled = !flip.canNext;
    if (focused?.disabled) (focused === prevBtn ? nextBtn : prevBtn).focus();
  }

  // Once the pages are at rest (and hidden faces are inert), make sure keyboard /
  // VoiceOver focus is on something that's still there
  function onSettle(current) {
    const closed = current === 0;
    backBtn.hidden = closed;
    editBtn.hidden = !closed || !onEditCover;
    const lost = !view.contains(document.activeElement) || document.activeElement.closest('[inert]') ||
      (document.activeElement === backBtn && closed);
    if (focusBefore && lost) {
      (closed ? stage.querySelector('.cover-face') : nextBtn)?.focus();
    }
    focusBefore = null;
  }

  function renderFace(leaf, side) {
    const face = paging.faceFor(leaf, side);
    if (face.type === 'cover') return createCoverFace();
    if (face.type === 'inside') return createInsideCover();
    if (face.type === 'page') return createPage(pages[face.number - 1], face.number, binder);
    return createBlankPage();
  }

  function createCoverFace() {
    const cover = document.createElement('button');
    cover.type = 'button';
    cover.className = 'cover-face';
    cover.setAttribute('aria-label', `Open binder: ${binder.name}`);
    cover.innerHTML = '<span class="cover-face__hint" aria-hidden="true">Tap or drag to open</span>';
    decorateCover(cover, binder, binder.cards, { count: plural(countCards(binder), 'card') });
    cover.addEventListener('click', () => flip.next());
    return cover;
  }

  // Build the book for the current screen size: two pages or one
  function buildBook() {
    flip?.destroy();
    const single = phoneQuery.matches;
    paging = createPaging(single, pages.length);

    flip = new PageFlip(stage, {
      single,
      cover: true,
      coverColor: binder.coverColor,
      leafCount: paging.leafCount,
      maxCurrent: paging.maxCurrent,
      start: paging.currentFor(focusPage),
      renderFace,
      onChange: (current) => {
        focusPage = paging.pagesShown(current)[0] ?? 0;
        if (view.contains(document.activeElement)) focusBefore = document.activeElement;
        updateNav();
      },
      onSettle,
    });
    updateNav();
  }

  // Pick up a card from its pocket
  function pickUp(cardEl) {
    const card = binder.cards?.[cardEl.dataset.cardId];
    if (card) openCardViewer(card, cardEl);
  }
  stage.addEventListener('click', (event) => {
    const cardEl = event.target.closest?.('.card[data-card-id]');
    if (cardEl) pickUp(cardEl);
  });
  stage.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const cardEl = event.target.closest?.('.card[data-card-id]');
    if (cardEl) {
      event.preventDefault();
      pickUp(cardEl);
    }
  });

  prevBtn.addEventListener('click', () => flip.prev());
  nextBtn.addEventListener('click', () => flip.next());
  // Close the binder: skip straight to page 1, then turn the cover back over it
  backBtn.addEventListener('click', () => {
    if (flip.isDragging) return;
    if (flip.current > 1) flip.jumpTo(1);
    flip.prev();
  });

  function onKey(event) {
    // Leave shortcuts like Cmd+← (browser Back) and keys used elsewhere alone
    if (event.defaultPrevented || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open]')) return; // a window is open on top of the binder
    if (event.key === 'ArrowRight') flip.next();
    if (event.key === 'ArrowLeft') flip.prev();
  }
  document.addEventListener('keydown', onKey);
  phoneQuery.addEventListener('change', buildBook);

  view.append(toolbar);
  let noticeObserver = null;
  if (notice) {
    view.append(notice);
    // The pages shrink to make room for the notice, however many lines it wraps to
    noticeObserver = new ResizeObserver(measureNotice);
    noticeObserver.observe(notice);
  }
  view.append(stage, nav);

  function measureNotice() {
    view.style.setProperty('--notice-h', `${notice.offsetHeight + 12}px`);
  }
  root.replaceChildren(view);
  if (notice) measureNotice(); // right away, so the first drawing is already the right size
  buildBook();

  return {
    // The page being looked at (0 = cover)
    get page() { return focusPage; },
    destroy() {
      noticeObserver?.disconnect();
      document.removeEventListener('keydown', onKey);
      phoneQuery.removeEventListener('change', buildBook);
      flip?.destroy();
      view.remove();
    },
  };
}

function emptyPage(layout) {
  return { id: 'empty', slots: emptySlots(layout) };
}

// The inside of the front cover (seen on the left once the binder is open)
function createInsideCover() {
  const el = document.createElement('div');
  el.className = 'page page--inside';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function countCards(binder) {
  return binder.pages.reduce(
    (sum, page) => sum + (page.slots?.filter(Boolean).length ?? 0),
    0,
  );
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
