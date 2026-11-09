// Turning photos into card images, all on this device.
import { placement, CARD_RATIO } from './crop.js';

export const CARD_HEIGHT = 928; // saved card size: 600 × 928 (55:85)
export const CARD_WIDTH = Math.round(CARD_HEIGHT * CARD_RATIO);
const SOURCE_MAX = 1600; // keep a smaller copy of the original so the card can be re-cropped later

// Load a photo file or Blob into an <img> (browsers turn iPhone photos the right way up).
// The <img> can be shown on screen; call unloadImage(img) when it's no longer needed.
export function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo couldn't be opened. Try a JPEG or PNG."));
    };
    img.src = url;
  });
}

export function unloadImage(img) {
  if (img?.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.88) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not save the image.'))), type, quality);
  });
}

// A copy of the photo no bigger than SOURCE_MAX on its longest side
export async function shrinkSource(img) {
  const scale = Math.min(1, SOURCE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, 'image/jpeg', 0.9);
}

// Draw the cropped card front at full card size
export function renderCardFront(img, crop) {
  return renderCrop(img, crop, CARD_WIDTH, CARD_HEIGHT);
}

// Draw a cropped photo at any size and save it as a JPEG
export function renderCrop(img, crop, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCrop(canvas.getContext('2d'), img, crop, 0, 0, width, height);
  return canvasToBlob(canvas);
}

// Draw a cropped photo into a box (x, y, width, height) of a canvas
export function drawCrop(ctx, img, crop, x, y, width, height) {
  const box = placement(
    { width: img.naturalWidth, height: img.naturalHeight },
    { width, height },
    crop,
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x + box.left, y + box.top, box.width, box.height);
  ctx.restore();
}

export { canvasToBlob };
