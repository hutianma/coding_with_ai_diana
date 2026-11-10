// Design your binder's cover: name and font, material and color, a window with one
// of your cards, and stickers. A live preview at the top; Save keeps it, Cancel doesn't.
import { decorateCover, coverOf, placeTitle, MATERIALS, COVER_COLORS, FONTS, WINDOW_SHAPES, TITLE_SIZE } from './CoverDesign.js';
import { createStickerLayer } from '../decor/StickerLayer.js';
import { BUILTIN_STICKERS, builtinUrl } from '../decor/stickers.js';
import { imageUrl, releaseImage } from '../cards/imageUrls.js';
import { pickPhotos } from '../workshop/pickPhotos.js';
import { shrinkSticker } from '../decor/stickers.js';

const NAME_MAX = 40;

// onSave({ name, cover }) must save it (and may throw if saving fails)
export function openCoverEditor({ binder, cards = {}, onSave }) {
  // Work on a copy; nothing changes until Save
  const start = coverOf(binder);
  const cardList = Object.values(cards).filter((c) => c.front).sort((a, b) => a.createdAt - b.createdAt);
  // A window card that has since been deleted counts as no window
  const startWindow = start.window && cards[start.window.cardId] ? { ...start.window } : null;
  const draft = {
    name: binder.name,
    cover: { ...start, title: { ...start.title }, window: startWindow, stickers: start.stickers.map((s) => ({ ...s })) },
  };
  const startImages = new Set(start.stickers.filter((s) => s.kind === 'image').map((s) => s.image));

  const dialog = document.createElement('dialog');
  dialog.className = 'workshop cover-editor';
  dialog.setAttribute('aria-labelledby', 'cover-editor-title');
  dialog.innerHTML = `
    <header class="workshop__header">
      <h2 id="cover-editor-title" class="workshop__title">Edit cover</h2>
      <button class="workshop__close" type="button" aria-label="Close">✕</button>
    </header>
    <div class="cover-editor__body">
      <div class="cover-editor__stage">
        <div class="cover-editor__preview"><div class="cover-editor__design"></div></div>
        <div class="cover-editor__sticker-tools"></div>
      </div>
      <div class="cover-editor__controls">
        <label class="workshop__text">
          <span>Name</span>
          <input type="text" name="name" maxlength="${NAME_MAX}" autocomplete="off">
        </label>
        <label class="workshop__zoom">
          <span>Title size</span>
          <input type="range" name="title-size" min="${TITLE_SIZE.min}" max="${TITLE_SIZE.max}" step="0.05">
        </label>
        <p class="workshop__hint">Drag the title on the cover to move it</p>
        <fieldset class="patterns fonts">
          <legend>Font</legend>
          ${FONTS.map((f) => `
            <label class="pattern"><input type="radio" name="font" value="${f.value}"><span style="font-family:${f.css.replace(/"/g, '&quot;')}">${f.name}</span></label>`).join('')}
        </fieldset>
        <fieldset class="patterns">
          <legend>Material</legend>
          ${MATERIALS.map((m) => `
            <label class="pattern"><input type="radio" name="material" value="${m.value}"><span>${m.name}</span></label>`).join('')}
        </fieldset>
        <fieldset class="swatches">
          <legend>Color</legend>
          ${COVER_COLORS.map((c) => `
            <label class="swatch" style="--swatch:${c.value}">
              <input type="radio" name="color" value="${c.value}">
              <span class="visually-hidden">${c.name}</span>
            </label>`).join('')}
          <label class="swatch swatch--custom" title="Any color">
            <input type="color" name="custom-color" aria-label="Any color">
          </label>
        </fieldset>
        <fieldset class="cover-editor__window">
          <legend>Window</legend>
          <div class="cover-editor__cards" role="radiogroup" aria-label="Card in the window"></div>
          <div class="patterns window-shapes">
            ${WINDOW_SHAPES.map((w) => `
              <label class="pattern"><input type="radio" name="shape" value="${w.value}"><span>${w.name}</span></label>`).join('')}
          </div>
        </fieldset>
        <fieldset class="cover-editor__stickers">
          <legend>Stickers <small>(tap to add, then drag on the cover)</small></legend>
          <div class="sticker-palette">
            ${Object.entries(BUILTIN_STICKERS).map(([key, s]) => `
              <button type="button" class="sticker-palette__item" data-sticker="${key}" aria-label="Add ${s.name} sticker"><img alt="" src="${builtinUrl(key)}"></button>`).join('')}
            <button type="button" class="sticker-palette__item sticker-palette__upload" aria-label="Add your own image as a sticker">＋<small>Your image</small></button>
          </div>
        </fieldset>
      </div>
    </div>
    <p class="workshop__error" role="alert" hidden></p>
    <footer class="workshop__footer">
      <button class="workshop__secondary" type="button">Cancel</button>
      <button class="workshop__primary" type="button">Save cover</button>
    </footer>
  `;
  const $ = (sel) => dialog.querySelector(sel);
  const preview = $('.cover-editor__preview');
  const design = $('.cover-editor__design');
  const errorEl = $('.workshop__error');
  let busy = false;

  // ---------- Preview ----------
  function drawDesign() {
    design.className = 'cover-editor__design';
    design.replaceChildren();
    // Stickers are drawn by the sticker layer on top, so they can be moved
    decorateCover(design, { name: draft.name || ' ', cover: { ...draft.cover, stickers: [] } }, cards);
    const label = design.querySelector('.cover-design__label');
    label.tabIndex = 0;
    label.setAttribute('role', 'button');
    label.setAttribute('aria-label', `${draft.name}. Title: drag, or use the arrow keys, to move it`);
  }

  // ---------- Moving the title ----------
  // The sticker layer sits on top, so catch presses on the title before it does
  let titleDrag = null;
  preview.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.sticker')) return;
    const label = design.querySelector('.cover-design__label');
    const r = label.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) return;
    event.stopPropagation();
    event.preventDefault();
    titleDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try { preview.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
  }, { capture: true });
  preview.addEventListener('pointermove', (event) => {
    if (!titleDrag || event.pointerId !== titleDrag.id) return;
    const r = preview.getBoundingClientRect();
    moveTitle((event.clientX - titleDrag.x) / r.width, (event.clientY - titleDrag.y) / r.height);
    titleDrag.x = event.clientX;
    titleDrag.y = event.clientY;
  }, { capture: true });
  const endTitleDrag = (event) => {
    if (titleDrag && event.pointerId === titleDrag.id) titleDrag = null;
  };
  preview.addEventListener('pointerup', endTitleDrag, { capture: true });
  preview.addEventListener('pointercancel', endTitleDrag, { capture: true });

  design.addEventListener('keydown', (event) => {
    if (!event.target.classList.contains('cover-design__label')) return;
    const step = event.shiftKey ? 0.05 : 0.01;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!moves[event.key]) return;
    event.preventDefault();
    moveTitle(...moves[event.key]);
  });

  // Keep the whole title on the cover (it's placed by its centre)
  function moveTitle(dx, dy) {
    const t = draft.cover.title;
    const label = design.querySelector('.cover-design__label');
    const box = preview.getBoundingClientRect();
    const halfW = Math.min(0.5, label.offsetWidth / 2 / box.width);
    const halfH = Math.min(0.5, label.offsetHeight / 2 / box.height);
    t.x = Math.min(1 - halfW, Math.max(halfW, t.x + dx));
    t.y = Math.min(1 - halfH, Math.max(halfH, t.y + dy));
    placeTitle(label, t);
  }

  const stickerLayer = createStickerLayer(preview, draft.cover.stickers);
  $('.cover-editor__sticker-tools').append(stickerLayer.tools);

  // ---------- Settings ----------
  const nameInput = $('input[name="name"]');
  nameInput.value = draft.name;
  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value.slice(0, NAME_MAX);
    drawDesign();
  });

  function check(name, value) {
    const input = dialog.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }
  check('font', draft.cover.font);
  check('material', draft.cover.material);
  check('color', draft.cover.color);
  check('shape', draft.cover.window?.shape ?? 'rounded');
  $('input[name="title-size"]').value = draft.cover.title.size;
  $('input[name="title-size"]').addEventListener('input', (event) => {
    draft.cover.title.size = Number(event.target.value);
    placeTitle(design.querySelector('.cover-design__label'), draft.cover.title);
  });
  $('input[name="custom-color"]').value = toHex(draft.cover.color);

  dialog.addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (name === 'font') draft.cover.font = value;
    if (name === 'material') draft.cover.material = value;
    if (name === 'color' || name === 'custom-color') {
      draft.cover.color = value;
      if (name === 'custom-color') dialog.querySelectorAll('input[name="color"]').forEach((i) => { i.checked = false; });
    }
    if (name === 'shape' && draft.cover.window) draft.cover.window.shape = value;
    drawDesign();
  });
  $('input[name="custom-color"]').addEventListener('input', (event) => {
    draft.cover.color = event.target.value;
    drawDesign();
  });

  // Window: none, or one of your cards. Choosing one updates the buttons in place, so
  // keyboard / VoiceOver focus stays where it is.
  const cardsBox = $('.cover-editor__cards');
  function markCardChoice() {
    const current = draft.cover.window?.cardId ?? '';
    cardsBox.querySelectorAll('[role="radio"]').forEach((b) => {
      b.setAttribute('aria-checked', String((b.dataset.cardId ?? '') === current));
    });
    $('.window-shapes').hidden = !draft.cover.window;
  }
  function drawCardChoices() {
    const current = draft.cover.window?.cardId ?? null;
    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'cover-editor__card cover-editor__card--none';
    none.setAttribute('role', 'radio');
    none.setAttribute('aria-checked', String(!current));
    none.textContent = 'None';
    none.addEventListener('click', () => {
      draft.cover.window = null;
      markCardChoice();
      drawDesign();
    });
    const items = cardList.map((card, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cover-editor__card';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(card.id === current));
      btn.setAttribute('aria-label', card.back?.text || `Card ${i + 1}`);
      btn.dataset.cardId = card.id;
      const img = document.createElement('img');
      img.alt = '';
      img.src = imageUrl(card.front);
      btn.append(img);
      btn.addEventListener('click', () => {
        const shape = dialog.querySelector('input[name="shape"]:checked')?.value ?? 'rounded';
        draft.cover.window = { cardId: card.id, shape };
        markCardChoice();
        drawDesign();
      });
      return btn;
    });
    cardsBox.replaceChildren(none, ...items);
    if (!cardList.length) {
      const hint = document.createElement('p');
      hint.className = 'workshop__hint';
      hint.textContent = 'Make a photocard first to show it in the window.';
      cardsBox.append(hint);
    }
    $('.window-shapes').hidden = !draft.cover.window;
  }

  // Stickers
  dialog.querySelector('.sticker-palette').addEventListener('click', async (event) => {
    const item = event.target.closest('.sticker-palette__item');
    if (!item) return;
    if (item.dataset.sticker) {
      stickerLayer.add('builtin', item.dataset.sticker);
      return;
    }
    const [file] = await pickPhotos();
    if (!file) return;
    setBusy(true); // Save / Cancel wait until the sticker is ready
    try {
      const image = await shrinkSticker(file);
      if (dialog.isConnected) stickerLayer.add('image', image);
      showError('');
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  });

  // ---------- Save / cancel ----------
  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function setBusy(value) {
    busy = value;
    $('.workshop__primary').disabled = $('.workshop__secondary').disabled = value;
  }

  // Let go of sticker images that are no longer used (to free memory): after Save, the
  // ones taken off the cover; after Cancel, the ones added in this session
  function close(saved = false) {
    const kept = new Set((saved ? draft.cover.stickers : start.stickers)
      .filter((s) => s.kind === 'image').map((s) => s.image));
    const all = new Set([...startImages, ...draft.cover.stickers.filter((s) => s.kind === 'image').map((s) => s.image)]);
    for (const image of all) if (!kept.has(image)) releaseImage(image);
    dialog.close();
    dialog.remove();
  }

  $('.workshop__primary').addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    showError('');
    try {
      // A copy, so later changes in this (closing) editor can't reach the saved cover
      const cover = { ...draft.cover, title: { ...draft.cover.title }, window: draft.cover.window ? { ...draft.cover.window } : null, stickers: draft.cover.stickers.map((s) => ({ ...s })) };
      await onSave({ name: draft.name.trim() || binder.name, cover });
      close(true);
    } catch (err) {
      showError(`Couldn't save the cover. ${err.message ?? ''}`.trim());
    } finally {
      setBusy(false);
    }
  });
  $('.workshop__secondary').addEventListener('click', () => { if (!busy) close(); });
  $('.workshop__close').addEventListener('click', () => { if (!busy) close(); });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (!busy) close();
  });

  document.body.append(dialog);
  drawDesign();
  drawCardChoices();
  dialog.showModal();
  return dialog;
}

// <input type="color"> only takes #rrggbb
function toHex(color) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#f2b8cc';
}

