// Make or edit a card sleeve: choose one of your photocards, the kind of sleeve, its color,
// a charm and stickers. A live preview at the top; Save keeps it, Cancel doesn't.
import { createCardSleeve, newSleeve, sleeveOf, sleeveRatio, startColor, STYLES, ANIMALS, PATTERNS, SLEEVE_COLORS, CHARMS } from './CardSleeve.js';
import { createStickerLayer } from '../decor/StickerLayer.js';
import { createStickerPalette } from '../decor/stickerPalette.js';
import { imageUrl, releaseImage } from '../cards/imageUrls.js';
import { cardName } from '../cards/Card.js';
import { makeId } from '../storage/ids.js';

const radios = (name, list) => list.map((x) => `
  <label class="pattern"><input type="radio" name="${name}" value="${x.value}"><span>${x.name}</span></label>`).join('');

// existing: the sleeve to edit (it isn't changed), or null for a new one.
// cards: { id: card }, to choose from. cardId: a card to start with (a new sleeve).
// onSave(sleeve, previous) must save it (and may throw if saving fails).
// (Deleting a sleeve is done from My stuff.)
export function openSleeveWorkshop({ existing = null, cards = {}, cardId = null, onSave }) {
  const cardList = Object.values(cards).filter((c) => c.front).sort((a, b) => a.createdAt - b.createdAt);
  // Work on a copy; nothing changes until Save
  const start = sleeveOf(existing ?? newSleeve(cardId ?? cardList[0]?.id ?? null));
  const draft = { ...start, stickers: start.stickers.map((s) => ({ ...s })) };
  const startImages = new Set(start.stickers.filter((s) => s.kind === 'image').map((s) => s.image));

  const dialog = document.createElement('dialog');
  dialog.className = 'workshop cover-editor sleeve-editor';
  dialog.setAttribute('aria-labelledby', 'sleeve-editor-title');
  dialog.innerHTML = `
    <header class="workshop__header">
      <h2 id="sleeve-editor-title" class="workshop__title">${existing ? 'Edit card sleeve' : 'New card sleeve'}</h2>
      <button class="workshop__close" type="button" aria-label="Close">✕</button>
    </header>
    <div class="cover-editor__body">
      <div class="cover-editor__stage">
        <div class="sleeve-editor__preview"></div>
        <div class="cover-editor__sticker-tools"></div>
      </div>
      <div class="cover-editor__controls">
        <fieldset>
          <legend>Photocard</legend>
          <div class="journal-editor__things sleeve-editor__cards" role="radiogroup" aria-label="Photocard in the sleeve"></div>
        </fieldset>
        <fieldset class="patterns">
          <legend>Sleeve</legend>
          ${radios('style', STYLES)}
        </fieldset>
        <fieldset class="patterns" data-for="plush">
          <legend>Animal</legend>
          ${radios('animal', ANIMALS)}
        </fieldset>
        <fieldset class="patterns" data-for="puffy">
          <legend>Pattern</legend>
          ${radios('pattern', PATTERNS)}
        </fieldset>
        <fieldset class="swatches">
          <legend>Color</legend>
          ${SLEEVE_COLORS.map((c) => `
            <label class="swatch" style="--swatch:${c.value}">
              <input type="radio" name="color" value="${c.value}">
              <span class="visually-hidden">${c.name}</span>
            </label>`).join('')}
          <label class="swatch swatch--custom" title="Any color">
            <input type="color" name="custom-color" aria-label="Any color">
          </label>
        </fieldset>
        <fieldset class="patterns">
          <legend>Charm</legend>
          ${radios('charm', CHARMS)}
        </fieldset>
        <fieldset class="cover-editor__stickers">
          <legend>Stickers <small>(tap to add, then drag on the sleeve)</small></legend>
          <div class="sleeve-editor__palette"></div>
        </fieldset>
      </div>
    </div>
    <p class="workshop__error" role="alert" hidden></p>
    <footer class="workshop__footer">
      <button class="workshop__secondary sleeve-editor__cancel" type="button">Cancel</button>
      <button class="workshop__primary" type="button">Save sleeve</button>
    </footer>
  `;
  const $ = (sel) => dialog.querySelector(sel);
  const preview = $('.sleeve-editor__preview');
  const errorEl = $('.workshop__error');
  const saveBtn = $('.workshop__primary');
  let busy = false;

  // ---------- Preview ----------
  // The sleeve is drawn again on every change; the stickers sit on top in their own layer
  // (as fractions of the sleeve, like when it's drawn with them), so they can be moved
  function draw() {
    const sleeve = createCardSleeve(draft, cards[draft.cardId], { stickers: false });
    sleeve.removeAttribute('role');
    preview.style.setProperty('--ratio', sleeveRatio(draft));
    const old = preview.querySelector('.card-sleeve');
    if (old) old.replaceWith(sleeve);
    else preview.prepend(sleeve);
    for (const box of dialog.querySelectorAll('[data-for]')) box.hidden = box.dataset.for !== draft.style;
    saveBtn.disabled = busy || !cards[draft.cardId];
  }
  draw();
  const layer = createStickerLayer(preview, draft.stickers);
  $('.cover-editor__sticker-tools').append(layer.tools);

  // ---------- Choices ----------
  const check = (name, value) => {
    const input = dialog.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  };
  const checkColor = () => {
    dialog.querySelectorAll('input[name="color"]').forEach((i) => { i.checked = i.value === draft.color; });
    $('input[name="custom-color"]').value = draft.color;
  };
  for (const name of ['style', 'animal', 'pattern', 'charm']) check(name, draft[name]);
  checkColor();

  // Until you choose a color, each kind of sleeve (or animal) comes in its own: a white
  // puppy, an orange fox. A color you chose stays.
  let colorChosen = draft.color !== startColor(draft.style, draft.animal);
  dialog.addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (!['style', 'animal', 'pattern', 'charm', 'color'].includes(name)) return;
    draft[name] = value;
    if (name === 'color') colorChosen = true;
    else if (!colorChosen) draft.color = startColor(draft.style, draft.animal);
    checkColor();
    draw();
  });
  $('input[name="custom-color"]').addEventListener('input', (event) => {
    draft.color = event.target.value;
    colorChosen = true;
    checkColor();
    draw();
  });

  // ---------- Your photocards ----------
  const cardsBox = $('.sleeve-editor__cards');
  if (!cardList.length) {
    const p = document.createElement('p');
    p.className = 'workshop__hint';
    p.textContent = 'Make a photocard first, then put it in a sleeve.';
    cardsBox.append(p);
  }
  for (const [i, card] of cardList.entries()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'journal-editor__thing journal-editor__thing--card';
    btn.setAttribute('role', 'radio');
    btn.dataset.cardId = card.id;
    btn.setAttribute('aria-label', card.back?.text ? cardName(card) : `Card ${i + 1}`);
    const img = document.createElement('img');
    img.alt = '';
    img.src = imageUrl(card.front);
    btn.append(img);
    cardsBox.append(btn);
  }
  const markCard = () => cardsBox.querySelectorAll('[data-card-id]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.cardId === draft.cardId));
  });
  markCard();
  cardsBox.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-card-id]');
    if (!btn) return;
    draft.cardId = btn.dataset.cardId;
    markCard();
    draw();
  });

  // ---------- Stickers ----------
  $('.sleeve-editor__palette').replaceWith(createStickerPalette(layer, { setBusy, showError, isOpen: () => dialog.isConnected }));

  // ---------- Save / cancel / delete ----------
  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function setBusy(value) {
    busy = value;
    dialog.querySelectorAll('.workshop__footer button').forEach((b) => { b.disabled = value; });
    saveBtn.disabled = value || !cards[draft.cardId];
  }

  const imagesIn = (stickers) => stickers.filter((s) => s.kind === 'image').map((s) => s.image);

  // Let go of sticker images that are no longer used (to free memory): after Save, the
  // ones taken off; after Cancel, the ones added in this session
  function close(kept) {
    const keep = new Set(kept);
    for (const image of new Set([...startImages, ...imagesIn(draft.stickers)])) {
      if (!keep.has(image)) releaseImage(image);
    }
    dialog.close();
    dialog.remove();
  }

  saveBtn.addEventListener('click', async () => {
    if (busy || !cards[draft.cardId]) return;
    setBusy(true);
    showError('');
    try {
      const sleeve = {
        ...draft,
        id: existing?.id ?? makeId('sleeve'),
        kind: 'sleeve',
        createdAt: existing?.createdAt ?? Date.now(),
        stickers: draft.stickers.map((s) => ({ ...s })),
      };
      await onSave(sleeve, existing);
      close(imagesIn(sleeve.stickers));
    } catch (err) {
      showError(`Couldn't save the sleeve. ${err.message ?? ''}`.trim());
    } finally {
      setBusy(false);
    }
  });

  const cancel = () => { if (!busy) close(startImages); };
  $('.sleeve-editor__cancel').addEventListener('click', cancel);
  $('.workshop__close').addEventListener('click', cancel);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancel();
  });

  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
