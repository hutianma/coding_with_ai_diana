import { createPage, createBlankPage } from './Sleeve.js';
import { PageFlip } from './PageFlip.js';

const phoneQuery = matchMedia('(max-width: 700px)');

// Shows the binder: first the cover, then the open pages you can turn.
export function mountBinder(root, binder, { startOpen = false, startPage = 1 } = {}) {
  let isOpen = startOpen;
  let focusPage = Math.max(1, Math.min(startPage, binder.pages.length)); // the page you're looking at (kept when switching phone ↔ computer)
  let cleanup = null; // removes listeners when leaving the open view

  function render({ moveFocus = false } = {}) {
    cleanup?.();
    cleanup = null;
    root.replaceChildren(isOpen ? renderOpen() : renderCover());

    // Keep keyboard / VoiceOver focus in a sensible place after switching views
    if (moveFocus) {
      root.querySelector(isOpen ? '.toolbar__back' : '.cover')?.focus();
    }
  }

  function renderCover() {
    const cover = document.createElement('button');
    cover.className = 'cover';
    cover.style.setProperty('--cover-color', binder.coverColor);
    cover.setAttribute('aria-label', `Open binder: ${binder.name}`);
    cover.innerHTML = `
      <span class="cover__spine" aria-hidden="true"></span>
      <span class="cover__label">
        <span class="cover__title"></span>
        <span class="cover__count"></span>
      </span>
      <span class="cover__hint">Tap to open</span>
    `;
    // textContent (not innerHTML) so names are always shown as plain text
    cover.querySelector('.cover__title').textContent = binder.name;
    cover.querySelector('.cover__count').textContent = plural(countCards(binder), 'card');

    cover.addEventListener('click', () => {
      isOpen = true;
      focusPage = 1;
      render({ moveFocus: true });
    });
    return cover;
  }

  function renderOpen() {
    const view = document.createElement('div');
    view.className = 'binder-view';

    const toolbar = document.createElement('header');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
      <button class="toolbar__back" type="button">‹ Cover</button>
      <span class="toolbar__title"></span>
      <span></span>
    `;
    toolbar.querySelector('.toolbar__title').textContent = binder.name;
    toolbar.querySelector('.toolbar__back').addEventListener('click', () => {
      isOpen = false;
      render({ moveFocus: true });
    });

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

    function updateNav() {
      label.textContent = pageLabel(flip, binder.pages.length);
      prevBtn.disabled = !flip.canPrev;
      nextBtn.disabled = !flip.canNext;
    }

    // Build the book for the current screen size: two pages or one
    function buildBook() {
      flip?.destroy();
      const single = phoneQuery.matches;
      const pages = binder.pages;

      flip = new PageFlip(stage, {
        single,
        coverColor: binder.coverColor,
        // Phone: one page per leaf. Computer: two pages per leaf (front + back).
        leafCount: single ? pages.length : Math.ceil(pages.length / 2),
        start: single ? focusPage - 1 : Math.floor(focusPage / 2),
        renderFace: (i, side) => {
          const index = single ? (side === 'front' ? i : -1) : 2 * i + (side === 'front' ? 0 : 1);
          return pages[index] ? createPage(pages[index], index + 1, binder) : createBlankPage();
        },
        onChange: (current) => {
          focusPage = single ? current + 1 : Math.max(1, Math.min(2 * current, pages.length));
          updateNav();
        },
      });
      updateNav();
    }

    prevBtn.addEventListener('click', () => flip.prev());
    nextBtn.addEventListener('click', () => flip.next());

    function onKey(event) {
      if (event.key === 'ArrowRight') flip.next();
      if (event.key === 'ArrowLeft') flip.prev();
    }
    document.addEventListener('keydown', onKey);
    phoneQuery.addEventListener('change', buildBook);
    cleanup = () => {
      document.removeEventListener('keydown', onKey);
      phoneQuery.removeEventListener('change', buildBook);
      flip?.destroy();
    };

    view.append(toolbar, stage, nav);
    buildBook();
    return view;
  }

  render();
}

// "Pages 2–3 of 4" on a computer, "Page 2 of 4" on a phone
function pageLabel(flip, total) {
  if (flip.single) return `Page ${flip.current + 1} of ${total}`;
  const left = 2 * flip.current;
  const right = left + 1;
  const shown = [left, right].filter((n) => n >= 1 && n <= total);
  return shown.length === 2
    ? `Pages ${shown[0]}–${shown[1]} of ${total}`
    : `Page ${shown[0]} of ${total}`;
}

function countCards(binder) {
  return binder.pages.reduce(
    (sum, page) => sum + page.slots.filter(Boolean).length,
    0,
  );
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
