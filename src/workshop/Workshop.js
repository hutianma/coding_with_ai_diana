// The photocard workshop: pick photos → frame each one → design the back → save.
import { MAX_ZOOM } from './crop.js';
import { createCropper } from './Cropper.js';
import { loadImage, unloadImage, shrinkSource, renderCardFront, CARD_WIDTH, CARD_HEIGHT } from './imageTools.js';
import { FINISHES } from '../cards/Card.js';
import { createSignaturePad, PEN_COLORS } from './SignaturePad.js';
import { BACK_COLORS, BACK_PATTERNS, BACK_TEXT_MAX, DEFAULT_BACK, createCardBack } from '../cards/CardBack.js';
import { makeId } from '../storage/ids.js';
import { pickPhotos } from './pickPhotos.js';

let lastBack = { ...DEFAULT_BACK }; // a batch of new cards starts with the previous card's back
let lastFinish = 'glossy'; // …and finish
let lastPen = PEN_COLORS[0].value; // …and signature pen

// Ask for photos, then make a card from each.
// onSave(card) is called for every finished card and must save it.
export async function pickPhotosForNewCards(onSave) {
  const files = await pickPhotos({ multiple: true });
  if (files.length) openWorkshop({ files, onSave });
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

    <section class="workshop__step" data-step="sign" hidden>
      <div class="sign">
        <img class="sign__front" alt="Card front">
        <canvas class="sign__pad" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" aria-label="Signature area: draw with your finger or mouse"></canvas>
      </div>
      <fieldset class="patterns pens">
        <legend>Pen</legend>
        ${PEN_COLORS.map((c) => `
          <label class="pattern pen" style="--pen:${c.value}">
            <input type="radio" name="pen" value="${c.value}">
            <span>${c.name}</span>
          </label>`).join('')}
        <button class="pattern sign__clear" type="button">Clear</button>
      </fieldset>
      <p class="workshop__hint">Sign on the front, like a real signed photocard. You can skip this.</p>
    </section>

    <section class="workshop__step" data-step="back" hidden>
      <div class="back-preview">
        <div class="back-preview__front"><img alt="Card front"><canvas class="back-preview__sig" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" aria-hidden="true"></canvas></div>
        <div class="back-preview__back"></div>
      </div>
      <fieldset class="patterns finishes">
        <legend>Finish</legend>
        ${FINISHES.map((f) => `
          <label class="pattern">
            <input type="radio" name="finish" value="${f.value}">
            <span>${f.name}</span>
          </label>`).join('')}
      </fieldset>
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
  const cropper = createCropper({
    area: $('.crop'),
    frame: $('.crop__frame'),
    img: $('.crop__img'),
    zoomInput: $('.workshop__zoom input'),
  });
  const textInput = $('.workshop__text input');
  const errorEl = $('.workshop__error');
  const primary = $('.workshop__primary');
  const secondary = $('.workshop__secondary');
  const backPreview = $('.back-preview__back');
  const frontPreview = $('.back-preview__front img');
  const sigPreview = $('.back-preview__sig');
  const signFront = $('.sign__front');
  const pad = createSignaturePad($('.sign__pad'));

  let index = 0; // which photo we're on
  let step = 'crop';
  let image = null; // the loaded <img>
  let crop = null; // how the photo is framed, taken from the cropper when leaving the crop step
  let back = existing ? { ...existing.back } : { ...lastBack };
  let finish = existing?.finish ?? lastFinish;
  let previewUrl = null;
  let preview = null; // { blob, image, cropKey }: the front drawn for the sign/back steps, reused when saving
  let skipped = 0; // photos that couldn't be opened
  let busy = false;

  // ---------- Steps ----------

  async function showPhoto(i) {
    index = i;
    setBusy(true);
    unloadImage(image);
    image = null;
    preview = null; // never reuse the previous photo's front
    previewToken++; // and ignore a preview of it that's still being drawn
    try {
      image = await loadImage(files[i]);
    } catch {
      setBusy(false);
      skipped++;
      // Skip a photo that can't be opened, and say so
      if (i + 1 < files.length) return showPhoto(i + 1);
      showNothingLeft();
      return;
    }
    setBusy(false);
    showError(skipped ? `${skipped} photo${skipped > 1 ? 's' : ''} couldn't be opened and ${skipped > 1 ? 'were' : 'was'} skipped. Try JPEG or PNG.` : '');
    cropper.setImage(image, existing?.crop ?? null);
    try {
      await pad.reset(existing?.signature ?? null);
    } catch {
      await pad.reset(null);
      showError("The saved signature couldn't be opened, so it was cleared. You can sign again.");
    }
    pad.setColor(existing?.pen ?? lastPen);
    showStep('crop');
  }

  function showStep(name) {
    step = name;
    dialog.querySelectorAll('.workshop__step').forEach((s) => { s.hidden = s.dataset.step !== name; });
    const counter = files.length > 1 ? ` (${index + 1} of ${files.length})` : '';
    if (name === 'crop') {
      title.textContent = (existing ? 'Edit card' : 'New card') + counter;
      secondary.textContent = 'Cancel';
      primary.textContent = 'Next: signature';
      cropper.draw();
    } else if (name === 'sign') {
      crop = { ...cropper.crop };
      title.textContent = 'Sign it (optional)' + counter;
      secondary.textContent = 'Back';
      primary.textContent = 'Next: card back';
      const checked = dialog.querySelector(`input[name="pen"][value="${pad.color}"]`);
      if (checked) checked.checked = true;
      drawFrontPreview();
    } else {
      title.textContent = 'Card back & finish' + counter;
      secondary.textContent = 'Back';
      primary.textContent = index + 1 < files.length ? 'Save & next' : 'Save card';
      drawBackStep();
    }
  }

  // Every remaining photo failed to open: explain, and only offer Close
  function showNothingLeft() {
    dialog.querySelectorAll('.workshop__step').forEach((s) => { s.hidden = true; });
    title.textContent = existing ? 'Edit card' : 'New card';
    showError(`${skipped > 1 ? 'These photos' : 'This photo'} couldn't be opened. Try a JPEG or PNG.`);
    primary.hidden = true;
    secondary.textContent = 'Close';
    step = 'none';
  }

  let previewToken = 0;

  async function drawBackStep() {
    const finishInput = dialog.querySelector(`input[name="finish"][value="${finish}"]`);
    if (finishInput) finishInput.checked = true;
    $('.back-preview__front').dataset.finish = finish;
    pad.copyTo(sigPreview); // a cheap copy of the signature for the preview
    sigPreview.hidden = !pad.hasInk;
    const colorInput = dialog.querySelector(`input[name="back-color"][value="${back.color}"]`);
    if (colorInput) colorInput.checked = true;
    const patternInput = dialog.querySelector(`input[name="back-pattern"][value="${back.pattern}"]`);
    if (patternInput) patternInput.checked = true;
    textInput.value = back.text ?? '';
    drawBack();
    drawFrontPreview();
  }

  // A preview of the front, drawn the same way it will be saved (shared by the
  // signature and back steps, and reused when saving)
  async function drawFrontPreview() {
    const cropKey = JSON.stringify(crop);
    if (!previewMatches()) {
      const token = ++previewToken;
      const forImage = image;
      frontPreview.removeAttribute('src');
      signFront.removeAttribute('src');
      const blob = await renderCardFront(forImage, crop);
      if (token !== previewToken) return; // a newer preview (or photo) has started
      preview = { blob, image: forImage, cropKey };
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
    }
    frontPreview.src = signFront.src = previewUrl;
  }

  // Is the stored preview exactly this photo with this crop?
  function previewMatches() {
    return preview?.image === image && preview.cropKey === JSON.stringify(crop);
  }

  function drawBack() {
    backPreview.replaceChildren(createCardBack(back));
  }

  async function save() {
    setBusy(true);
    showError('');
    try {
      const reuse = previewMatches();
      const [front, source, signature] = await Promise.all([
        reuse ? preview.blob : renderCardFront(image, crop),
        existing ? existing.source : shrinkSource(image),
        pad.changed ? pad.toBlob() : (existing?.signature ?? null),
      ]);
      const card = {
        id: existing?.id ?? makeId('card'),
        createdAt: existing?.createdAt ?? Date.now(),
        front,
        source,
        crop,
        back: { ...back },
        finish,
        signature,
        pen: pad.color,
      };
      await onSave(card, existing);
      if (!existing) {
        lastBack = { ...back };
        lastFinish = finish;
        lastPen = pad.color;
      }
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
    unloadImage(image);
    cropper.destroy();
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
    if (step === 'crop') showStep('sign');
    else if (step === 'sign') showStep('back');
    else save();
  });
  secondary.addEventListener('click', () => {
    if (busy) return;
    if (step === 'back') showStep('sign');
    else if (step === 'sign') showStep('crop');
    else close();
  });
  $('.workshop__close').addEventListener('click', () => {
    if (!busy) close();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault(); // Esc: close the same way as the ✕ button
    if (!busy) close();
  });

  dialog.addEventListener('change', (event) => {
    if (event.target.name === 'back-color') back.color = event.target.value;
    if (event.target.name === 'back-pattern') back.pattern = event.target.value;
    if (event.target.name === 'pen') pad.setColor(event.target.value);
    if (event.target.name === 'finish') {
      finish = event.target.value;
      $('.back-preview__front').dataset.finish = finish;
    }
    drawBack();
  });
  $('.sign__clear').addEventListener('click', () => pad.clear());
  textInput.addEventListener('input', () => {
    back.text = textInput.value.slice(0, BACK_TEXT_MAX);
    drawBack();
  });

  document.body.append(dialog);
  dialog.showModal();
  showPhoto(0);
  return dialog;
}
