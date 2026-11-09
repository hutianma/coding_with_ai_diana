// Crop maths for the photocard frame, kept free of any screen code so it can be tested.
//
// A crop is { zoom, x, y }:
//   zoom ≥ 1   1 = the photo just covers the frame; 2 = twice as big, and so on
//   x, y       how far the photo's centre is moved from the frame's centre,
//              as a fraction of the photo's displayed width / height
// Because x and y are fractions, the same crop looks the same at any frame size
// (the small frame on screen and the 600 px card we save).

export const CARD_RATIO = 55 / 85; // width / height of a real photocard
export const MAX_ZOOM = 5;

// The scale that makes the photo exactly cover the frame
function coverScale(image, frame) {
  return Math.max(frame.width / image.width, frame.height / image.height);
}

// Where to draw the photo inside the frame: { left, top, width, height } in frame pixels
export function placement(image, frame, crop) {
  const scale = coverScale(image, frame) * crop.zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    left: (frame.width - width) / 2 + crop.x * width,
    top: (frame.height - height) / 2 + crop.y * height,
    width,
    height,
  };
}

// Keep the crop valid: zoom in range, and no empty gaps inside the frame
export function clampCrop(image, frame, crop) {
  const zoom = Math.min(Math.max(crop.zoom, 1), MAX_ZOOM);
  const scale = coverScale(image, frame) * zoom;
  const maxX = (1 - frame.width / (image.width * scale)) / 2;
  const maxY = (1 - frame.height / (image.height * scale)) / 2;
  return {
    zoom,
    x: Math.min(Math.max(crop.x, -maxX), maxX),
    y: Math.min(Math.max(crop.y, -maxY), maxY),
  };
}

// Move the photo by (dx, dy) screen pixels
export function panCrop(image, frame, crop, dx, dy) {
  const { width, height } = placement(image, frame, crop);
  return clampCrop(image, frame, { ...crop, x: crop.x + dx / width, y: crop.y + dy / height });
}

// Zoom by `factor` around a point (px, py) in frame pixels, so that point stays put
export function zoomCrop(image, frame, crop, factor, px = frame.width / 2, py = frame.height / 2) {
  const before = placement(image, frame, crop);
  const zoom = Math.min(Math.max(crop.zoom * factor, 1), MAX_ZOOM);
  const ratio = zoom / crop.zoom;
  // The photo point under (px, py) should still be under (px, py) after zooming
  const left = px - (px - before.left) * ratio;
  const top = py - (py - before.top) * ratio;
  const width = before.width * ratio;
  const height = before.height * ratio;
  return clampCrop(image, frame, {
    zoom,
    x: (left - (frame.width - width) / 2) / width,
    y: (top - (frame.height - height) / 2) / height,
  });
}

export const DEFAULT_CROP = { zoom: 1, x: 0, y: 0 };
