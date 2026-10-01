// Large image packs belong in IndexedDB, away from small localStorage profiles.
let database;
async function openDatabase() {
  if (!globalThis.indexedDB) throw new Error('This browser does not provide an asset database.');
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('revealline-mmm-assets-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets');
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      database = null;
      reject(request.error);
    };
    request.onblocked = () => {
      database = null;
      reject(new Error('Close older game tabs to update the asset database.'));
    };
  });
  return database;
}
export async function readAssetStore(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('assets').objectStore('assets').get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
export async function writeAssetStore(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('assets', 'readwrite');
    transaction.objectStore('assets').put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error('Asset storage was cancelled.'));
  });
}
