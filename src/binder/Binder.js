import { createPage } from './Sleeve.js';

// Shows the binder: first the cover, then the open pages.
// Page turning arrives in M2, so for now the first spread is always shown.
export function mountBinder(root, binder, { startOpen = false } = {}) {
  let isOpen = startOpen;
  const spreadStart = 0; // index of the left page in the open spread

  function render() {
    root.replaceChildren(isOpen ? renderOpen() : renderCover());
  }

  function renderCover() {
    const cover = document.createElement('button');
    cover.className = 'cover';
    cover.style.setProperty('--cover-color', binder.coverColor);
    cover.setAttribute('aria-label', `Open binder: ${binder.name}`);
    cover.innerHTML = `
      <span class="cover__spine" aria-hidden="true"></span>
      <span class="cover__label">
        <span class="cover__title">${binder.name}</span>
        <span class="cover__count">${countCards(binder)} cards</span>
      </span>
      <span class="cover__hint">Tap to open</span>
    `;
    cover.addEventListener('click', () => {
      isOpen = true;
      render();
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
      <span class="toolbar__title">${binder.name}</span>
      <span class="toolbar__pages">
        <span class="only-wide">Pages ${first}–${last} of ${total}</span>
        <span class="only-narrow">Page ${first} of ${total}</span>
      </span>
    `;
    toolbar.querySelector('.toolbar__back').addEventListener('click', () => {
      isOpen = false;
      render();
    });

    const spread = document.createElement('div');
    spread.className = 'spread';

    const left = binder.pages[spreadStart];
    const right = binder.pages[spreadStart + 1];

    spread.append(createPage(left, first, binder.layout));
    spread.append(createRings());
    if (right) {
      const rightPage = createPage(right, first + 1, binder.layout);
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
