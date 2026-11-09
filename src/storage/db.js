// A tiny wrapper around IndexedDB, the browser's on-device database.
// Everything stays on this device; nothing is uploaded.
//
// Stores:
//   cards   – one record per card you made (photos are kept as Blobs)
//   binders – your binder(s): name, cover color, pages of card ids

const DB_NAME = 'pocket-fandom';
const DB_VERSION = 1;
export const STORES = ['cards', 'binders'];

let dbPromise = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!request.result.objectStoreNames.contains(name)) {
          request.result.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('The database is open in another tab. Close it and try again.'));
  });
  return dbPromise;
}

// Run one transaction and resolve when it has been saved
async function run(storeName, mode, work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    const request = work(store);
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Saving was cancelled (is the device out of space?)'));
  });
}

export const getAll = (storeName) => run(storeName, 'readonly', (s) => s.getAll());
export const get = (storeName, id) => run(storeName, 'readonly', (s) => s.get(id));

// Save or delete several records in different stores all at once (all or nothing).
// Each change is { store, value } to save, or { store, deleteId } to delete.
export async function writeMany(changes) {
  const db = await openDb();
  const names = [...new Set(changes.map((c) => c.store))];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    for (const { store, value, deleteId } of changes) {
      if (deleteId !== undefined) tx.objectStore(store).delete(deleteId);
      else tx.objectStore(store).put(value);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Saving was cancelled (is the device out of space?)'));
  });
}

// Ask the browser not to clear our data when space is low (works best when the
// app is added to the home screen; Safari may otherwise clear site data after
// 7 days without a visit)
export function askToKeepData() {
  navigator.storage?.persist?.().catch(() => {});
}
