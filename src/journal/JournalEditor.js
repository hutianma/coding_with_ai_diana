// Decorate a journal page: choose the paper, then add your cards, badges, polaroids,
// stickers, washi tape and text, and move, resize and turn them on the page.
// A live preview at the top; Save keeps it, Cancel doesn't.
import { createJournalSurface, createPiece, canShow, paperOf, PAPERS, TAPES, TEXT_COLORS, TEXT_MAX } from './JournalPage.js';
import { createStickerLayer } from '../decor/StickerLayer.js';
import { createStickerPalette } from '../decor/stickerPalette.js';
import { FONTS } from '../binder/CoverDesign.js';
import { imageUrl, releaseImage } from '../cards/imageUrls.js';
import { createCardSleeve, sleeveName } from '../merch/CardSleeve.js';

// page: the journal page to edit (a new one, or one from the binder; it isn't changed).
// cards / merch: { id: thing }, to choose from.
// onSave(page) must save it (and may throw if saving fails).
// onDelete(): delete the page (only offered for a page that's already in the binder).
export function openJournalEditor({ page, cards = {}, merch = {}, isNew = false, onSave, onDelete = null }) {
  const things = { cards, merch };
  // Work on a copy; nothing changes until Save. Things whose card / badge / polaroid can't
  // be found (e.g. they didn't load this time) are kept aside and saved again unchanged:
  // deleting a card or badge already takes it off every page.
  const draft = {
    ...page,
    paper: paperOf(page),
    items: page.items.filter((item) => canShow(item, things)).map((item) => ({ ...item })),
  };
  const keptAside = page.items.filter((item) => !canShow(item, things) && (item.kind === 'card' || item.kind === 'merch'));
  const startImages = new Set(page.items.filter((s) => s.kind === 'image').map((s) => s.image));
  const cardList = Object.values(cards).filter((c) => c.front).sort((a, b) => a.createdAt - b.createdAt);
  const merchList = Object.values(merch).filter((m) => m.image || m.kind === 'sleeve').sort((a, b) => a.createdAt - b.createdAt);
  const textStyle = { font: FONTS[0].value, color: TEXT_COLORS[0].value };

  const dialog = document.createElement('dialog');
  dialog.className = 'workshop cover-editor journal-editor';
  dialog.setAttribute('aria-labelledby', 'journal-editor-title');
  dialog.innerHTML = `
    <header class="workshop__header">
      <h2 id="journal-editor-title" class="workshop__title">${isNew ? 'New journal page' : 'Edit journal page'}</h2>
      <button class="workshop__close" type="button" aria-label="Close">✕</button>
    </header>
    <div class="cover-editor__body">
      <div class="cover-editor__stage">
        <div class="journal-editor__preview"></div>
        <div class="cover-editor__sticker-tools"></div>
      </div>
      <div class="cover-editor__controls">
        <fieldset class="patterns">
          <legend>Paper</legend>
          ${PAPERS.map((p) => `
            <label class="pattern"><input type="radio" name="paper" value="${p.value}"><span>${p.name}</span></label>`).join('')}
        </fieldset>
        <fieldset>
          <legend>Your photocards <small>(tap to add)</small></legend>
          <div class="journal-editor__things" data-list="cards"></div>
        </fieldset>
        <fieldset>
          <legend>Your badges, polaroids &amp; sleeves</legend>
          <div class="journal-editor__things" data-list="merch"></div>
        </fieldset>
        <fieldset>
          <legend>Stickers</legend>
          <div class="journal-editor__palette"></div>
        </fieldset>
        <fieldset>
          <legend>Washi tape</legend>
          <div class="journal-editor__tapes">
            ${TAPES.map((t) => `
              <button type="button" class="journal-editor__tape" data-tape="${t.value}" aria-label="Add ${t.name} washi tape"><span class="tape tape--${t.value}"></span></button>`).join('')}
          </div>
        </fieldset>
        <fieldset class="journal-editor__text">
          <legend>Text</legend>
          <textarea name="text" rows="2" maxlength="${TEXT_MAX}" placeholder="Write something…" aria-label="Text"></textarea>
          <button type="button" class="workshop__secondary journal-editor__add-text">＋ Add text</button>
          <p class="workshop__hint journal-editor__text-hint">Tap a text on the page to change it</p>
          <div class="patterns fonts">
            ${FONTS.map((f) => `
              <label class="pattern"><input type="radio" name="font" value="${f.value}"><span style="font-family:${f.css.replace(/"/g, '&quot;')}">${f.name}</span></label>`).join('')}
          </div>
          <div class="swatches">
            ${TEXT_COLORS.map((c) => `
              <label class="swatch" style="--swatch:${c.value}">
                <input type="radio" name="text-color" value="${c.value}">
                <span class="visually-hidden">${c.name}</span>
              </label>`).join('')}
          </div>
        </fieldset>
      </div>
    </div>
    <p class="workshop__error" role="alert" hidden></p>
    <footer class="workshop__footer">
      ${onDelete ? '<button class="workshop__secondary journal-editor__delete" type="button">Delete page</button>' : ''}
      <button class="workshop__secondary journal-editor__cancel" type="button">Cancel</button>
      <button class="workshop__primary" type="button">Save page</button>
    </footer>
  `;
  const $ = (sel) => dialog.querySelector(sel);
  const preview = $('.journal-editor__preview');
  const errorEl = $('.workshop__error');
  const textInput = $('textarea[name="text"]');
  let busy = false;

  // ---------- Preview ----------
  // The paper is drawn here; everything on it is drawn by the sticker layer, so it can be moved
  const surface = createJournalSurface({ paper: draft.paper, items: [] }, things);
  preview.append(surface);
  const drawPaper = () => { surface.className = `journal-surface journal-paper--${paperOf(draft)}`; };

  // An emptied text (while you type a new one) shows as "…", so it doesn't vanish
  const layer = createStickerLayer(surface, draft.items, {
    render: (item) => createPiece(item.kind === 'text' && !item.text.trim() ? { ...item, text: '…' } : item, things),
    placeNew: 'scatter',
    onSelect: showTextFor,
  });
  $('.cover-editor__sticker-tools').append(layer.tools);

  // ---------- Paper ----------
  dialog.querySelector(`input[name="paper"][value="${draft.paper}"]`).checked = true;
  dialog.addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (name === 'paper') {
      draft.paper = value;
      drawPaper();
    }
    if (name === 'font' || name === 'text-color') {
      textStyle[name === 'font' ? 'font' : 'color'] = value;
      const selected = layer.selected;
      if (selected?.kind === 'text') {
        Object.assign(selected, textStyle);
        layer.redraw(selected);
      }
    }
  });

  // ---------- Your things ----------
  const cardsBox = dialog.querySelector('[data-list="cards"]');
  cardsBox.append(...cardList.map((card, i) => thingButton(
    'card', imageUrl(card.front), card.back?.text || `Card ${i + 1}`,
    () => layer.add('card', { cardId: card.id }),
  )));
  if (!cardList.length) cardsBox.append(hint('Make a photocard first to put it here.'));

  const merchBox = dialog.querySelector('[data-list="merch"]');
  const MERCH_NAMES = { badge: 'Badge', polaroid: 'Polaroid' };
  merchBox.append(...merchList.map((item, i) => thingButton(
    item.kind,
    item.kind === 'sleeve' ? createCardSleeve(item, cards[item.cardId], { stickers: false }) : imageUrl(item.image),
    item.kind === 'sleeve' ? sleeveName(item) : `${MERCH_NAMES[item.kind] ?? 'Polaroid'} ${i + 1}`,
    () => layer.add('merch', { merchId: item.id }),
  )));
  if (!merchList.length) merchBox.append(hint('Make a badge, polaroid or card sleeve first to put it here.'));

  // picture: an image URL, or a drawing (a sleeve)
  function thingButton(kind, picture, name, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `journal-editor__thing journal-editor__thing--${kind}`;
    btn.setAttribute('aria-label', `Add ${name}`);
    if (typeof picture === 'string') {
      const img = document.createElement('img');
      img.alt = '';
      img.src = picture;
      btn.append(img);
    } else {
      picture.removeAttribute('role');
      btn.append(picture);
    }
    btn.addEventListener('click', onClick);
    return btn;
  }

  function hint(text) {
    const p = document.createElement('p');
    p.className = 'workshop__hint';
    p.textContent = text;
    return p;
  }

  // ---------- Stickers and tape ----------
  $('.journal-editor__palette').replaceWith(createStickerPalette(layer, { setBusy, showError, isOpen: () => dialog.isConnected }));

  $('.journal-editor__tapes').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-tape]');
    if (btn) layer.add('tape', { pattern: btn.dataset.tape });
  });

  // ---------- Text ----------
  // With a text selected on the page, the box and choices change it; otherwise they're
  // for the next text you add
  let textWasSelected = false;
  function showTextFor(item) {
    const isText = item?.kind === 'text';
    if (isText) {
      textInput.value = item.text;
      textStyle.font = item.font ?? FONTS[0].value;
      textStyle.color = item.color ?? TEXT_COLORS[0].value;
    } else if (textWasSelected) {
      textInput.value = ''; // ready for a new text (not a copy of the one you just left)
    }
    textWasSelected = isText;
    checkTextStyle();
    textInput.setAttribute('aria-label', isText ? 'Change the selected text' : 'Text');
  }

  function checkTextStyle() {
    const font = dialog.querySelector(`input[name="font"][value="${textStyle.font}"]`);
    const color = dialog.querySelector(`input[name="text-color"][value="${textStyle.color}"]`);
    if (font) font.checked = true;
    if (color) color.checked = true;
  }
  checkTextStyle();

  textInput.addEventListener('input', () => {
    const selected = layer.selected;
    if (selected?.kind !== 'text') return;
    selected.text = textInput.value.slice(0, TEXT_MAX);
    layer.redraw(selected); // an emptied text is left out when the page is saved
  });

  $('.journal-editor__add-text').addEventListener('click', () => {
    const text = textInput.value.slice(0, TEXT_MAX);
    if (!text.trim()) {
      textInput.focus();
      return;
    }
    // Typing changed the selected text already; "Add" always makes a new one
    layer.add('text', { text, ...textStyle });
  });

  // ---------- Save / cancel / delete ----------
  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function setBusy(value) {
    busy = value;
    dialog.querySelectorAll('.workshop__footer button').forEach((b) => { b.disabled = value; });
  }

  const imagesIn = (items) => items.filter((s) => s.kind === 'image').map((s) => s.image);

  // Let go of sticker images that are no longer used (to free memory): after Save, the
  // ones taken off the page; after Cancel, the ones added in this session
  function close(kept) {
    const keep = new Set(kept);
    for (const image of new Set([...startImages, ...imagesIn(draft.items)])) {
      if (!keep.has(image)) releaseImage(image);
    }
    dialog.close();
    dialog.remove();
  }

  $('.workshop__primary').addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    showError('');
    try {
      // A copy, so later changes in this (closing) editor can't reach the saved page.
      // Emptied texts are left out.
      const items = [...keptAside, ...draft.items.filter((item) => canShow(item, things))].map((item) => ({ ...item }));
      await onSave({ id: draft.id, kind: 'journal', paper: draft.paper, items });
      close(imagesIn(items));
    } catch (err) {
      showError(`Couldn't save the page. ${err.message ?? ''}`.trim());
    } finally {
      setBusy(false);
    }
  });

  $('.journal-editor__delete')?.addEventListener('click', async () => {
    if (busy) return;
    // eslint-disable-next-line no-alert
    if (!confirm('Delete this journal page? Your cards, badges and polaroids stay in your collection.')) return;
    setBusy(true);
    showError('');
    try {
      await onDelete();
      close([]);
    } catch (err) {
      showError(`Couldn't delete the page. ${err.message ?? ''}`.trim());
    } finally {
      setBusy(false);
    }
  });

  const cancel = () => { if (!busy) close(startImages); };
  $('.journal-editor__cancel').addEventListener('click', cancel);
  $('.workshop__close').addEventListener('click', cancel);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancel();
  });

  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
