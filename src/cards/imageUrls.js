// Blob → URL for <img>, made once per image and reused.
// Call releaseImage when an image is replaced or deleted, to free its memory.
const urls = new WeakMap();

export function imageUrl(blob) {
  let url = urls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    urls.set(blob, url);
  }
  return url;
}

export function releaseImage(blob) {
  const url = blob && urls.get(blob);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(blob);
  }
}
