// The row of stickers to tap (plus "Your image") in the cover and journal editors.
// Tapping one adds it to the sticker layer.
import { BUILTIN_STICKERS, builtinUrl, shrinkSticker } from './stickers.js';
import { pickPhotos } from '../workshop/pickPhotos.js';

// layer: from createStickerLayer. setBusy(true / false): Save / Cancel wait while your
// image is being made into a sticker. showError(message): '' clears it.
// isOpen(): is the editor still open (it may close while the image is being made)?
export function createStickerPalette(layer, { setBusy, showError, isOpen }) {
  const palette = document.createElement('div');
  palette.className = 'sticker-palette';
  palette.innerHTML = `
    ${Object.entries(BUILTIN_STICKERS).map(([key, s]) => `
      <button type="button" class="sticker-palette__item" data-sticker="${key}" aria-label="Add ${s.name} sticker"><img alt="" src="${builtinUrl(key)}"></button>`).join('')}
    <button type="button" class="sticker-palette__item sticker-palette__upload" aria-label="Add your own image as a sticker">＋<small>Your image</small></button>
  `;
  palette.addEventListener('click', async (event) => {
    const item = event.target.closest('.sticker-palette__item');
    if (!item) return;
    if (item.dataset.sticker) {
      layer.add('builtin', item.dataset.sticker);
      return;
    }
    const [file] = await pickPhotos();
    if (!file) return;
    setBusy(true);
    try {
      const image = await shrinkSticker(file);
      if (isOpen()) layer.add('image', image);
      showError('');
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  });
  return palette;
}
