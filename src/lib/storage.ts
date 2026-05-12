
export async function getDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open('AuraDigitalDB', 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config');
        }
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects');
        }
        if (!db.objectStoreNames.contains('media_blobs')) {
          db.createObjectStore('media_blobs');
        }
      };
    } catch (err) {
      reject(err);
    }
  });
}

const memoryFallback = new Map<string, Map<string, any>>();

function getMemoryStore(storeName: string) {
  if (!memoryFallback.has(storeName)) {
    memoryFallback.set(storeName, new Map());
  }
  return memoryFallback.get(storeName)!;
}

export async function saveToDB(storeName: string, key: string, data: any) {
  try {
    const db = await getDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(data, key);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.warn(`IndexedDB save failed for ${storeName}, falling back to in-memory:`, e);
    const store = getMemoryStore(storeName);
    store.set(key, data);
    return true;
  }
}

export async function loadFromDB(storeName: string, key: string) {
  try {
    const db = await getDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn(`IndexedDB load failed for ${storeName}, falling back to in-memory:`, e);
    const store = getMemoryStore(storeName);
    return store.get(key) || null;
  }
}
