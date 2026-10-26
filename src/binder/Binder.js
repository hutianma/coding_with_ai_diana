import { createPage } from './Sleeve.js';

// Shows the binder: first the cover, then the open pages.
// Page turning arrives in M2, so for now the first spread is always shown.
export function mountBinder(root, binder, { startOpen = false } = {}) {
  let isOpen = startOpen;
  const spreadStart = 0; // index of the left page in the open spread

  function render({ moveFocus = false } = {}) {
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
      render({ moveFocus: true });
    });
    return cover;
  }

  function renderOpen() {
    const view = document.createElement('div');
    view.className = 'binder-view';

    const total = binder.pages.length;
    const first = spreadStart + 1;
    const last = Math.min(spreadStart + 2, total);

    const toolbar = document.createElement('header');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = `
      <button class="toolbar__back" type="button">‹ Cover</button>
      <span class="toolbar__title"></span>
      <span class="toolbar__pages">
        <span class="only-wide"></span>
        <span class="only-narrow"></span>
      </span>
    `;
    toolbar.querySelector('.toolbar__title').textContent = binder.name;
    toolbar.querySelector('.only-wide').textContent =
      first === last ? `Page ${first} of ${total}` : `Pages ${first}–${last} of ${total}`;
    toolbar.querySelector('.only-narrow').textContent = `Page ${first} of ${total}`;

    toolbar.querySelector('.toolbar__back').addEventListener('click', () => {
      isOpen = false;
      render({ moveFocus: true });
    });

    const spread = document.createElement('div');
    spread.className = 'spread';

    const left = binder.pages[spreadStart];
    const right = binder.pages[spreadStart + 1];

    spread.append(createPage(left, first, binder));
    spread.append(createRings());
    // TODO(M2): on phones, build only the page that is shown instead of hiding this one
    if (right) {
      const rightPage = createPage(right, first + 1, binder);
      rightPage.classList.add('page--second');
      spread.append(rightPage);
    }

    view.append(toolbar, spread);
    return view;
  }

  render();
}

function createRings() {
  const spine = document.createElement('div');
  spine.className = 'spine';
  spine.setAttribute('aria-hidden', 'true');
  spine.innerHTML = '<span class="ring"></span>'.repeat(3);
  return spine;
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
