// Making badges and polaroids: pick photos, frame them, then style and save.
import { MAX_ZOOM } from '../workshop/crop.js';
import { createCropper } from '../workshop/Cropper.js';
import { loadImage, unloadImage, shrinkSource, renderCrop, drawCrop, canvasToBlob } from '../workshop/imageTools.js';
import { createSignaturePad } from '../workshop/SignaturePad.js';
import { makeId } from '../storage/ids.js';
import { pickPhotos } from '../workshop/pickPhotos.js';
import { createBadge, BADGE_SIZE, RIM_COLORS } from './Badge.js';
import { FILLS } from './shaker.js';
import { LAYOUTS, FRAME_COLORS, polaroidSizes, polaroidBoxes, polaroidRatio } from './Polaroid.js';

const CAPTION_PENS = [
  { value: '#26222b', name: 'Black' },
  { value: '#2f5fd0', name: 'Blue' },
  { value: '#e0508c', name: 'Pink' },
];

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

let lastBadge = { fill: 'glitter', rim: RIM_COLORS[0].value };
let lastPolaroid = { layout: 'single', frame: FRAME_COLORS[0].value, pen: CAPTION_PENS[0].value };

// Ask for one photo: a File, or null if the picker was cancelled
async function pickPhoto() {
  const [file] = await pickPhotos();
  return file ?? null;
}

// The shared window: title, ✕, an error line, and Back / Next buttons
function createSheet(titleText) {
  const dialog = document.createElement('dialog');
  dialog.className = 'workshop merch-workshop';
  dialog.setAttribute('aria-labelledby', 'merch-title');
  dialog.innerHTML = `
    <header class="workshop__header">
      <h2 id="merch-title" class="workshop__title"></h2>
      <button class="workshop__close" type="button" aria-label="Close">✕</button>
    </header>
    <div class="merch-workshop__body"></div>
    <p class="workshop__error" role="alert" hidden></p>
    <footer class="workshop__footer">
      <button class="workshop__secondary" type="button"></button>
      <button class="workshop__primary" type="button"></button>
    </footer>
  `;
  const $ = (sel) => dialog.querySelector(sel);
  const sheet = {
    dialog,
    body: $('.merch-workshop__body'),
    primary: $('.workshop__primary'),
    secondary: $('.workshop__secondary'),
    busy: false,
    onClose: null,
    setTitle(text) { $('.workshop__title').textContent = text; },
    showError(message) {
      $('.workshop__error').textContent = message;
      $('.workshop__error').hidden = !message;
    },
    setBusy(value) {
      sheet.busy = value;
      sheet.primary.disabled = sheet.secondary.disabled = value;
      dialog.classList.toggle('is-busy', value);
    },
    close() {
      sheet.onClose?.();
      dialog.close();
      dialog.remove();
    },
  };
  sheet.setTitle(titleText);
  $('.workshop__close').addEventListener('click', () => { if (!sheet.busy) sheet.close(); });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (!sheet.busy) sheet.close();
  });
  document.body.append(dialog);
  dialog.showModal();
  return sheet;
}

function swatches(name, legend, colors, varName) {
  return `
    <fieldset class="swatches">
      <legend>${legend}</legend>
      ${colors.map((c) => `
        <label class="swatch" style="--swatch:${c.value}">
          <input type="radio" name="${name}" value="${c.value}">
          <span class="visually-hidden">${c.name}</span>
        </label>`).join('')}
    </fieldset>`;
}

function chips(name, legend, options) {
  return `
    <fieldset class="patterns">
      <legend>${legend}</legend>
      ${options.map((o) => `
        <label class="pattern">
          <input type="radio" name="${name}" value="${o.value}">
          <span>${o.name}</span>
        </label>`).join('')}
    </fieldset>`;
}

function check(root, name, value) {
  const input = root.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

// ---------- Badge (吧唧) ----------

export async function openBadgeWorkshop({ existing = null, onSave }) {
  const file = existing ? existing.source : await pickPhoto();
  if (!file) return;

  const sheet = createSheet(existing ? 'Edit badge' : 'New badge');
  sheet.body.innerHTML = `
    <section class="workshop__step" data-step="crop">
      <div class="crop">
        <div class="crop__frame crop__frame--round">
          <img class="crop__img" alt="" draggable="false">
        </div>
      </div>
      <label class="workshop__zoom">
        <span>Zoom</span>
        <input type="range" min="1" max="${MAX_ZOOM}" step="0.01" value="1">
      </label>
      <p class="workshop__hint">Drag to move · pinch or scroll to zoom</p>
    </section>
    <section class="workshop__step" data-step="style" hidden>
      <div class="badge-preview"></div>
      <button class="pattern badge-preview__shake" type="button">Shake ✨</button>
      ${chips('fill', '流麻 fill', FILLS)}
      ${swatches('rim', 'Rim', RIM_COLORS)}
    </section>
  `;
  const $ = (sel) => sheet.body.querySelector(sel);
  const cropper = createCropper({ area: $('.crop'), frame: $('.crop__frame'), img: $('.crop__img'), zoomInput: $('.workshop__zoom input') });
  let style = existing ? { fill: existing.fill, rim: existing.rim } : { ...lastBadge };
  const seed = existing?.seed ?? Math.floor(Math.random() * 1e9);
  let image = null;
  let previewBlob = null; // the badge photo drawn for the style step…
  let previewKey = null; // …and the crop it was drawn with
  let previewToken = 0;
  let previewBadge = null;
  let step = 'crop';

  sheet.onClose = () => {
    previewBadge?.shaker?.stop();
    cropper.destroy();
    unloadImage(image);
  };

  try {
    image = await loadImage(file);
  } catch (err) {
    sheet.showError(err.message);
    sheet.primary.hidden = true;
    sheet.secondary.textContent = 'Close';
    sheet.secondary.addEventListener('click', () => sheet.close());
    return;
  }
  cropper.setImage(image, existing?.crop ?? null);

  async function showStep(name) {
    step = name;
    sheet.body.querySelectorAll('.workshop__step').forEach((s) => { s.hidden = s.dataset.step !== name; });
    if (name === 'crop') {
      sheet.setTitle(existing ? 'Edit badge' : 'New badge');
      sheet.secondary.textContent = 'Cancel';
      sheet.primary.textContent = 'Next: style';
      cropper.draw();
    } else {
      sheet.setTitle('Badge style');
      sheet.secondary.textContent = 'Back';
      sheet.primary.textContent = 'Save badge';
      check(sheet.body, 'fill', style.fill);
      check(sheet.body, 'rim', style.rim);
      const key = JSON.stringify(cropper.crop);
      if (key !== previewKey) {
        const token = ++previewToken;
        const blob = await renderCrop(image, cropper.crop, BADGE_SIZE, BADGE_SIZE);
        if (token !== previewToken || step !== 'style') return; // the user moved on
        previewBlob = blob;
        previewKey = key;
      }
      drawPreview();
    }
  }

  function drawPreview() {
    previewBadge?.shaker?.stop();
    // Reduce Motion: a still preview, settled, with no Shake
    previewBadge = createBadge({ image: previewBlob, fill: style.fill, rim: style.rim, seed }, { live: !reducedMotion.matches });
    $('.badge-preview').replaceChildren(previewBadge);
    previewBadge.shaker?.start();
    $('.badge-preview__shake').hidden = !previewBadge.shaker;
  }

  sheet.body.addEventListener('change', (event) => {
    if (event.target.name === 'fill') {
      style.fill = event.target.value;
      drawPreview();
    }
    if (event.target.name === 'rim') {
      style.rim = event.target.value;
      previewBadge?.style.setProperty('--rim', style.rim);
    }
  });
  $('.badge-preview__shake').addEventListener('click', () => previewBadge?.shaker?.shake());

  async function save() {
    sheet.setBusy(true);
    sheet.showError('');
    try {
      const crop = { ...cropper.crop };
      const [badgeImage, source] = await Promise.all([
        previewKey === JSON.stringify(crop) ? previewBlob : renderCrop(image, crop, BADGE_SIZE, BADGE_SIZE),
        existing ? existing.source : shrinkSource(image),
      ]);
      const item = {
        id: existing?.id ?? makeId('badge'),
        kind: 'badge',
        createdAt: existing?.createdAt ?? Date.now(),
        image: badgeImage,
        source,
        crop,
        fill: style.fill,
        rim: style.rim,
        seed,
      };
      await onSave(item, existing);
      if (!existing) lastBadge = { ...style };
    } catch (err) {
      sheet.setBusy(false);
      sheet.showError(`Couldn't save this badge. ${err.message ?? ''}`.trim());
      return;
    }
    sheet.setBusy(false);
    sheet.close();
  }

  sheet.primary.addEventListener('click', () => {
    if (sheet.busy) return;
    if (step === 'crop') showStep('style');
    else save();
  });
  sheet.secondary.addEventListener('click', () => {
    if (sheet.busy) return;
    if (step === 'style') showStep('crop');
    else sheet.close();
  });
  showStep('crop');
}

// ---------- Polaroid (拍立得) ----------

export async function openPolaroidWorkshop({ existing = null, onSave }) {
  const sheet = createSheet(existing ? 'Edit polaroid' : 'New polaroid');
  let layoutName = existing?.layout ?? lastPolaroid.layout;
  let frame = existing?.frame ?? lastPolaroid.frame;
  let step = 'layout';
  // One entry per photo slot: { image, source, cropper, cell, zoom }
  let slots = [];
  let slotsLayout = null; // the layout the slots were built for
  let pad = null; // the caption pad (built for one layout; a new layout starts a fresh caption)
  let padLayout = null;

  sheet.body.innerHTML = `
    <section class="workshop__step" data-step="layout">
      <fieldset class="layouts">
        <legend>Layout</legend>
        ${Object.entries(LAYOUTS).map(([value, l]) => `
          <label class="layout-choice">
            <input type="radio" name="layout" value="${value}">
            <span class="layout-choice__pic layout-choice__pic--${value}" aria-hidden="true"></span>
            <span>${l.name}${l.cells.length > 1 ? ' <small>合拍</small>' : ''}</span>
          </label>`).join('')}
      </fieldset>
      ${swatches('frame', 'Frame', FRAME_COLORS)}
    </section>
    <section class="workshop__step" data-step="photos" hidden>
      <div class="polaroid-edit"></div>
      <div class="polaroid-edit__zooms"></div>
      <p class="workshop__hint">Drag to move · pinch or scroll to zoom</p>
    </section>
    <section class="workshop__step" data-step="caption" hidden>
      <div class="polaroid-caption"></div>
      ${swatches('pen', 'Pen', CAPTION_PENS)}
      <button class="pattern caption__clear" type="button">Clear</button>
      <p class="workshop__hint">Write on the white strip with your finger (optional)</p>
    </section>
  `;
  const $ = (sel) => sheet.body.querySelector(sel);

  let closed = false;
  sheet.onClose = () => {
    closed = true;
    for (const slot of slots) {
      slot.cropper?.destroy();
      unloadImage(slot.image);
    }
  };

  // Build the photo editor for the chosen layout: the print with one cell per photo
  function buildPhotoEditor() {
    const keep = slots;
    const layout = LAYOUTS[layoutName];
    const boxes = polaroidBoxes(layoutName);
    const edit = $('.polaroid-edit');
    edit.style.setProperty('--ratio', polaroidRatio({ layout: layoutName }));
    edit.style.setProperty('--frame', frame);
    edit.innerHTML = '<div class="polaroid-edit__photo"></div>';
    const photoArea = edit.querySelector('.polaroid-edit__photo');
    Object.assign(photoArea.style, boxes.photo);
    const zooms = $('.polaroid-edit__zooms');
    zooms.innerHTML = '';

    slots = layout.cells.map(([x, y, w, h], i) => {
      const cell = document.createElement('div');
      cell.className = 'polaroid-edit__cell';
      Object.assign(cell.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
      cell.innerHTML = `
        <img class="crop__img" alt="" draggable="false" hidden>
        <button class="polaroid-edit__add" type="button">＋ Photo ${layout.cells.length > 1 ? i + 1 : ''}</button>
      `;
      photoArea.append(cell);

      const zoom = document.createElement('label');
      zoom.className = 'workshop__zoom';
      zoom.innerHTML = `<span>${layout.cells.length > 1 ? `Photo ${i + 1}` : 'Zoom'}</span><input type="range" min="1" max="${MAX_ZOOM}" step="0.01" value="1">`;
      zoom.hidden = true;
      zooms.append(zoom);

      const cropper = createCropper({ area: cell, frame: cell, img: cell.querySelector('img'), zoomInput: zoom.querySelector('input') });
      const slot = { image: null, source: null, cropper, cell, zoom };
      // Keep photos already chosen when switching layouts
      const old = keep[i];
      if (old?.image) setSlotPhoto(slot, old.image, old.source, null);
      old?.cropper?.destroy();
      cell.querySelector('.polaroid-edit__add').addEventListener('click', () => choosePhoto(slot));
      return slot;
    });
    // Photos from slots that no longer exist (two → one) are let go
    keep.slice(slots.length).forEach((old) => { old.cropper?.destroy(); unloadImage(old.image); });
    updateNext();
  }

  function setSlotPhoto(slot, image, source, crop) {
    slot.image = image;
    slot.source = source;
    slot.cropper.setImage(image, crop);
    slot.cell.classList.add('has-photo');
    const add = slot.cell.querySelector('.polaroid-edit__add');
    add.textContent = 'Change';
    slot.zoom.hidden = false;
    updateNext();
  }

  async function choosePhoto(slot) {
    const file = await pickPhoto();
    if (!file) return;
    sheet.showError('');
    try {
      const image = await loadImage(file);
      if (slot.image) unloadImage(slot.image);
      setSlotPhoto(slot, image, null, null);
    } catch (err) {
      sheet.showError(err.message);
    }
  }

  function updateNext() {
    if (step === 'photos') sheet.primary.disabled = slots.some((s) => !s.image);
  }

  function buildCaption() {
    const sizes = polaroidSizes(layoutName);
    const box = $('.polaroid-caption');
    box.style.setProperty('--ratio', polaroidRatio({ layout: layoutName }));
    box.style.setProperty('--frame', frame);
    box.innerHTML = '<canvas class="polaroid-caption__photo"></canvas><canvas class="polaroid-caption__pad"></canvas>';
    const boxes = polaroidBoxes(layoutName);
    const photoCanvas = box.querySelector('.polaroid-caption__photo');
    Object.assign(photoCanvas.style, boxes.photo);
    photoCanvas.width = sizes.photo.width;
    photoCanvas.height = sizes.photo.height;
    drawPhotos(photoCanvas);
    const padCanvas = box.querySelector('.polaroid-caption__pad');
    Object.assign(padCanvas.style, boxes.caption);
    padCanvas.width = sizes.caption.width;
    padCanvas.height = sizes.caption.height;
    pad = createSignaturePad(padCanvas, { colors: CAPTION_PENS, lineWidth: 8 });
    pad.setColor(existing?.pen ?? lastPolaroid.pen);
    padLayout = layoutName;
  }

  // The photo area of the print, with every photo in its cell
  function drawPhotos(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1d1a22';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const { cells } = polaroidSizes(layoutName);
    slots.forEach((slot, i) => {
      if (slot.image) drawCrop(ctx, slot.image, slot.cropper.crop, cells[i].x, cells[i].y, cells[i].width, cells[i].height);
    });
  }

  async function showStep(name) {
    step = name;
    sheet.body.querySelectorAll('.workshop__step').forEach((s) => { s.hidden = s.dataset.step !== name; });
    sheet.primary.disabled = false;
    if (name === 'layout') {
      sheet.setTitle(existing ? 'Edit polaroid' : 'New polaroid');
      sheet.secondary.textContent = 'Cancel';
      sheet.primary.textContent = 'Next: photos';
      check(sheet.body, 'layout', layoutName);
      check(sheet.body, 'frame', frame);
    } else if (name === 'photos') {
      sheet.setTitle(LAYOUTS[layoutName].cells.length > 1 ? 'Photos (合拍)' : 'Photo');
      sheet.secondary.textContent = 'Back';
      sheet.primary.textContent = 'Next: caption';
      if (slotsLayout !== layoutName) {
        buildPhotoEditor();
        slotsLayout = layoutName;
      }
      $('.polaroid-edit').style.setProperty('--frame', frame);
      slots.forEach((s) => s.cropper.draw());
      updateNext();
    } else {
      sheet.setTitle('Caption');
      sheet.secondary.textContent = 'Back';
      sheet.primary.textContent = 'Save polaroid';
      const fresh = padLayout !== layoutName;
      if (fresh) buildCaption();
      else drawPhotos($('.polaroid-caption__photo'));
      $('.polaroid-caption').style.setProperty('--frame', frame);
      check(sheet.body, 'pen', pad.color);
      // Show the saved caption to add to (same layout only: the strip size depends on it)
      if (fresh && existing?.caption && existing.layout === layoutName) await pad.reset(existing.caption);
    }
  }

  sheet.body.addEventListener('change', (event) => {
    if (event.target.name === 'layout') layoutName = event.target.value;
    if (event.target.name === 'frame') frame = event.target.value;
    if (event.target.name === 'pen') pad?.setColor(event.target.value);
  });
  $('.caption__clear').addEventListener('click', () => pad?.clear());

  async function save() {
    sheet.setBusy(true);
    sheet.showError('');
    try {
      const sizes = polaroidSizes(layoutName);
      const canvas = document.createElement('canvas');
      canvas.width = sizes.photo.width;
      canvas.height = sizes.photo.height;
      drawPhotos(canvas);
      const [image, sources, caption] = await Promise.all([
        canvasToBlob(canvas),
        Promise.all(slots.map((s) => s.source ?? shrinkSource(s.image))),
        pad.changed ? pad.toBlob() : (existing?.layout === layoutName ? existing.caption ?? null : null),
      ]);
      const item = {
        id: existing?.id ?? makeId('polaroid'),
        kind: 'polaroid',
        createdAt: existing?.createdAt ?? Date.now(),
        layout: layoutName,
        frame,
        image,
        photos: slots.map((s, i) => ({ source: sources[i], crop: { ...s.cropper.crop } })),
        caption,
        pen: pad.color,
      };
      await onSave(item, existing);
      if (!existing) lastPolaroid = { layout: layoutName, frame, pen: pad.color };
    } catch (err) {
      sheet.setBusy(false);
      sheet.showError(`Couldn't save this polaroid. ${err.message ?? ''}`.trim());
      return;
    }
    sheet.setBusy(false);
    sheet.close();
  }

  sheet.primary.addEventListener('click', () => {
    if (sheet.busy) return;
    if (step === 'layout') showStep('photos');
    else if (step === 'photos') showStep('caption');
    else save();
  });
  sheet.secondary.addEventListener('click', () => {
    if (sheet.busy) return;
    if (step === 'caption') showStep('photos');
    else if (step === 'photos') showStep('layout');
    else sheet.close();
  });

  showStep('layout');

  // Editing: load the saved photos into their cells (in the background)
  if (existing) {
    buildPhotoEditor();
    slotsLayout = layoutName;
    const editorSlots = slots;
    existing.photos.forEach(async (p, i) => {
      try {
        const image = await loadImage(p.source);
        // Closed, or the layout was rebuilt meanwhile: let go of the photo
        if (closed || slots !== editorSlots || !slots[i]) return unloadImage(image);
        setSlotPhoto(slots[i], image, p.source, p.crop);
      } catch {
        sheet.showError("A saved photo couldn't be opened. Choose it again.");
      }
    });
  }
}
