// The photocard workshop: pick photos → frame each one → design the back → save.
import { DEFAULT_CROP, MAX_ZOOM, placement, clampCrop, panCrop, zoomCrop } from './crop.js';
import { loadImage, shrinkSource, renderCardFront } from './imageTools.js';
import { BACK_COLORS, BACK_PATTERNS, BACK_TEXT_MAX, DEFAULT_BACK, createCardBack } from '../cards/CardBack.js';
import { makeId } from '../storage/ids.js';

let lastBack = { ...DEFAULT_BACK }; // a batch of new cards starts with the previous card's back

// Ask for photos, then make a card from each.
// onSave(card) is called for every finished card and must save it.
export function pickPhotosForNewCards(onSave) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.hidden = true;
  input.addEventListener('change', () => {
    const files = [...input.files];
    input.remove();
    if (files.length) openWorkshop({ files, onSave });
  });
  document.body.append(input);
  input.click();
}

// Edit an existing card (its saved original photo, crop and back)
export function editCard(card, onSave) {
  openWorkshop({ files: [card.source], existing: card, onSave });
}

// files: one photo per card. existing: the card being edited, if any.
export function openWorkshop({ files, existing = null, onSave }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'workshop';
  dialog.setAttribute('aria-labelledby', 'workshop-title');
  dialog.innerHTML = `
    <header class="workshop__header">
      <h2 id="workshop-title" class="workshop__title"></h2>
      <button class="workshop__close" type="button" aria-label="Close">✕</button>
    </header>

    <section class="workshop__step" data-step="crop">
      <div class="crop">
        <div class="crop__frame">
          <img class="crop__img" alt="" draggable="false">
        </div>
      </div>
      <label class="workshop__zoom">
        <span>Zoom</span>
        <input type="range" min="1" max="${MAX_ZOOM}" step="0.01" value="1">
      </label>
      <p class="workshop__hint">Drag to move · pinch or scroll to zoom</p>
    </section>

    <section class="workshop__step" data-step="back" hidden>
      <div class="back-preview">
        <div class="back-preview__front"><img alt="Card front"></div>
        <div class="back-preview__back"></div>
      </div>
      <fieldset class="swatches">
        <legend>Color</legend>
        ${BACK_COLORS.map((c) => `
          <label class="swatch" style="--swatch:${c.value}">
            <input type="radio" name="back-color" value="${c.value}">
            <span class="visually-hidden">${c.name}</span>
          </label>`).join('')}
      </fieldset>
      <fieldset class="patterns">
        <legend>Pattern</legend>
        ${BACK_PATTERNS.map((p) => `
          <label class="pattern">
            <input type="radio" name="back-pattern" value="${p.value}">
            <span>${p.name}</span>
          </label>`).join('')}
      </fieldset>
      <label class="workshop__text">
        <span>Text on the back <small>(optional)</small></span>
        <input type="text" maxlength="${BACK_TEXT_MAX}" placeholder="e.g. a name, a date" autocomplete="off">
      </label>
    </section>

    <p class="workshop__error" role="alert" hidden></p>

    <footer class="workshop__footer">
      <button class="workshop__secondary" type="button"></button>
      <button class="workshop__primary" type="button"></button>
    </footer>
  `;

  const $ = (sel) => dialog.querySelector(sel);
  const title = $('.workshop__title');
  const cropArea = $('.crop');
  const frameEl = $('.crop__frame');
  const cropImg = $('.crop__img');
  const zoomInput = $('.workshop__zoom input');
  const textInput = $('.workshop__text input');
  const errorEl = $('.workshop__error');
  const primary = $('.workshop__primary');
  const secondary = $('.workshop__secondary');
  const backPreview = $('.back-preview__back');
  const frontPreview = $('.back-preview__front img');

  let index = 0; // which photo we're on
  let step = 'crop';
  let image = null; // the loaded <img>
  let crop = { ...DEFAULT_CROP };
  let back = existing ? { ...existing.back } : { ...lastBack };
  let previewUrl = null;
  let busy = false;

  // ---------- Steps ----------

  async function showPhoto(i) {
    index = i;
    showError('');
    setBusy(true);
    try {
      image = await loadImage(files[i]);
    } catch (err) {
      setBusy(false);
      showError(err.message);
      // Skip a photo that can't be opened
      if (i + 1 < files.length) return showPhoto(i + 1);
      return;
    }
    setBusy(false);
    crop = existing?.crop ? { ...existing.crop } : { ...DEFAULT_CROP };
    cropImg.src = image.src;
    showStep('crop');
  }

  function showStep(name) {
    step = name;
    dialog.querySelectorAll('.workshop__step').forEach((s) => { s.hidden = s.dataset.step !== name; });
    const counter = files.length > 1 ? ` (${index + 1} of ${files.length})` : '';
    if (name === 'crop') {
      title.textContent = (existing ? 'Edit card' : 'New card') + counter;
      secondary.textContent = 'Cancel';
      primary.textContent = 'Next: card back';
      requestAnimationFrame(drawCrop);
    } else {
      title.textContent = 'Card back' + counter;
      secondary.textContent = 'Back';
      primary.textContent = index + 1 < files.length ? 'Save & next' : 'Save card';
      drawBackStep();
    }
  }

  function frameSize() {
    const r = frameEl.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }

  function imageSize() {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  function drawCrop() {
    if (!image) return;
    const frame = frameSize();
    if (!frame.width) return;
    crop = clampCrop(imageSize(), frame, crop);
    const box = placement(imageSize(), frame, crop);
    Object.assign(cropImg.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
    zoomInput.value = crop.zoom;
  }

  async function drawBackStep() {
    // A preview of the front, drawn the same way it will be saved
    const blob = await renderCardFront(image, crop);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    frontPreview.src = previewUrl;
    const colorInput = dialog.querySelector(`input[name="back-color"][value="${back.color}"]`);
    if (colorInput) colorInput.checked = true;
    const patternInput = dialog.querySelector(`input[name="back-pattern"][value="${back.pattern}"]`);
    if (patternInput) patternInput.checked = true;
    textInput.value = back.text ?? '';
    drawBack();
  }

  function drawBack() {
    backPreview.replaceChildren(createCardBack(back));
  }

  async function save() {
    setBusy(true);
    showError('');
    try {
      const [front, source] = await Promise.all([
        renderCardFront(image, crop),
        existing ? existing.source : shrinkSource(image),
      ]);
      const card = {
        id: existing?.id ?? makeId('card'),
        createdAt: existing?.createdAt ?? Date.now(),
        front,
        source,
        crop,
        back: { ...back },
        finish: existing?.finish ?? 'glossy',
      };
      await onSave(card, existing);
      if (!existing) lastBack = { ...back };
    } catch (err) {
      setBusy(false);
      showError(`Couldn't save this card. ${err.message ?? ''}`.trim());
      return;
    }
    setBusy(false);
    if (index + 1 < files.length) showPhoto(index + 1);
    else close();
  }

  function close() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    removeEventListener('resize', drawCrop);
    dialog.close();
    dialog.remove();
  }

  function setBusy(value) {
    busy = value;
    primary.disabled = secondary.disabled = value;
    dialog.classList.toggle('is-busy', value);
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  // ---------- Buttons ----------

  primary.addEventListener('click', () => {
    if (busy || !image) return;
    if (step === 'crop') showStep('back');
    else save();
  });
  secondary.addEventListener('click', () => {
    if (busy) return;
    if (step === 'back') showStep('crop');
    else close();
  });
  $('.workshop__close').addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault(); // Esc: close the same way as the ✕ button
    if (!busy) close();
  });

  dialog.addEventListener('change', (event) => {
    if (event.target.name === 'back-color') back.color = event.target.value;
    if (event.target.name === 'back-pattern') back.pattern = event.target.value;
    drawBack();
  });
  textInput.addEventListener('input', () => {
    back.text = textInput.value.slice(0, BACK_TEXT_MAX);
    drawBack();
  });

  // ---------- Moving and zooming the photo ----------

  const pointers = new Map(); // pointerId → { x, y }

  cropArea.addEventListener('pointerdown', (event) => {
    if (!image) return;
    cropArea.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });

  cropArea.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    const frame = frameSize();
    if (pointers.size === 1) {
      crop = panCrop(imageSize(), frame, crop, event.clientX - last.x, event.clientY - last.y);
    } else if (pointers.size === 2) {
      // Pinch: zoom by how much the two fingers spread, around the point between them
      const [a, b] = [...pointers.values()];
      const other = a === last ? b : a;
      const before = Math.hypot(last.x - other.x, last.y - other.y);
      const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      const rect = frameEl.getBoundingClientRect();
      const midX = (event.clientX + other.x) / 2 - rect.left;
      const midY = (event.clientY + other.y) / 2 - rect.top;
      if (before > 0) crop = zoomCrop(imageSize(), frame, crop, after / before, midX, midY);
      crop = panCrop(imageSize(), frame, crop, (event.clientX - last.x) / 2, (event.clientY - last.y) / 2);
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    drawCrop();
  });

  const endPointer = (event) => pointers.delete(event.pointerId);
  cropArea.addEventListener('pointerup', endPointer);
  cropArea.addEventListener('pointercancel', endPointer);

  cropArea.addEventListener('wheel', (event) => {
    if (!image) return;
    event.preventDefault();
    const rect = frameEl.getBoundingClientRect();
    const factor = Math.exp(-event.deltaY * 0.002);
    crop = zoomCrop(imageSize(), frameSize(), crop, factor, event.clientX - rect.left, event.clientY - rect.top);
    drawCrop();
  }, { passive: false });

  zoomInput.addEventListener('input', () => {
    if (!image) return;
    crop = zoomCrop(imageSize(), frameSize(), crop, Number(zoomInput.value) / crop.zoom);
    drawCrop();
  });

  addEventListener('resize', drawCrop);

  document.body.append(dialog);
  dialog.showModal();
  showPhoto(0);
  return dialog;
}
