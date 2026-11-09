// Ask for photos with the system photo picker. Resolves to an array of Files
// (empty if cancelled). Starting a new pick ends any earlier one that never answered.
let pending = null; // { input, resolve } of a pick still waiting

export function pickPhotos({ multiple = false } = {}) {
  if (pending) {
    pending.input.remove();
    pending.resolve([]);
    pending = null;
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.className = 'photo-picker';
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.hidden = true;
    const finish = (files) => {
      if (pending?.input !== input) return;
      pending = null;
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish([...input.files]));
    input.addEventListener('cancel', () => finish([]));
    pending = { input, resolve };
    document.body.append(input);
    input.click();
  });
}
