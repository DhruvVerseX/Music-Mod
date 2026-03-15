"use client";

export interface StoredRecordingMeta {
  id: string;
  createdAt: string;
  durationMs: number;
  size: number;
  mimeType: string;
}

const DB_NAME = "gesture-vocal-recordings";
const STORE_NAME = "takes";
const META_KEY = "gesture-vocal-recordings-meta";
export const RECORDINGS_UPDATED_EVENT = "gesture-recordings-updated";

export async function saveRecording(blob: Blob, durationMs: number) {
  if (typeof window === "undefined" || blob.size === 0) {
    return null;
  }

  const id = `take-${Date.now()}`;
  const meta: StoredRecordingMeta = {
    id,
    createdAt: new Date().toISOString(),
    durationMs,
    size: blob.size,
    mimeType: blob.type || "audio/webm"
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({
      id,
      blob,
      meta
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to store recording."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Failed to store recording."));
  });

  const metadata = [meta, ...(readRecordingMeta().filter((item) => item.id !== id))].slice(0, 12);
  writeRecordingMeta(metadata);
  window.dispatchEvent(new CustomEvent(RECORDINGS_UPDATED_EVENT, { detail: metadata }));
  return meta;
}

export function readRecordingMeta() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(META_KEY);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value) as StoredRecordingMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecordingMeta(metadata: StoredRecordingMeta[]) {
  window.localStorage.setItem(META_KEY, JSON.stringify(metadata));
}

export async function getRecordingBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result?.blob || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllRecordings() {
  if (typeof window === "undefined") {
    return;
  }

  // Clear metadata from localStorage
  window.localStorage.removeItem(META_KEY);

  // Clear Blobs from IndexedDB
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to clear recordings."));
  });

  // Notify listeners to update UI
  window.dispatchEvent(new CustomEvent(RECORDINGS_UPDATED_EVENT, { detail: [] }));
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open recordings database."));
  });
}
