import { openDB, IDBPDatabase } from 'idb';

import { StyleMap, StyleWithoutUrl } from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';

const DB_NAME = 'stylekit-style-storage';
const DB_VERSION = 1;
const STYLE_STORE = 'styles';
const STORAGE_STATE_KEY = 'style-storage-v1';

type StyleStorageBackend = 'indexedDB' | 'chrome-storage';

type StyleStorageState = {
  backend: StyleStorageBackend;
  migratedAt?: string;
  fallbackAt?: string;
  lastError?: string;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

const cloneStyles = (styles: StyleMap): StyleMap =>
  JSON.parse(JSON.stringify(styles));

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const hasIndexedDB = (): boolean => typeof indexedDB !== 'undefined';

const openStyleDb = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STYLE_STORE)) {
          db.createObjectStore(STYLE_STORE);
        }
      },
    });
  }

  return dbPromise;
};

const getChromeStorageStyles = async (): Promise<StyleMap> => {
  const items = await chrome.storage.local.get('styles');
  return cloneStyles(items.styles || {});
};

const setChromeStorageStyles = async (styles: StyleMap): Promise<void> => {
  await chrome.storage.local.set({ styles: cloneStyles(styles) });
};

const getStyleStorageState = async (): Promise<StyleStorageState | null> => {
  const items = await chrome.storage.local.get(STORAGE_STATE_KEY);
  return items[STORAGE_STATE_KEY] || null;
};

const setStyleStorageState = async (
  state: StyleStorageState
): Promise<void> => {
  await chrome.storage.local.set({
    [STORAGE_STATE_KEY]: state,
  });
};

const getIndexedDbStyles = async (): Promise<StyleMap> => {
  const db = await openStyleDb();
  const styles: StyleMap = {};
  let cursor = await db.transaction(STYLE_STORE).store.openCursor();

  while (cursor) {
    if (typeof cursor.key === 'string') {
      styles[cursor.key] = cursor.value as StyleWithoutUrl;
    }

    cursor = await cursor.continue();
  }

  return styles;
};

const setIndexedDbStyles = async (styles: StyleMap): Promise<void> => {
  const db = await openStyleDb();
  const tx = db.transaction(STYLE_STORE, 'readwrite');

  await tx.store.clear();

  for (const [url, style] of Object.entries(styles)) {
    await tx.store.put(style, url);
  }

  await tx.done;
};

const fallbackToChromeStorage = async (
  error: unknown,
  styles?: StyleMap
): Promise<void> => {
  if (styles) {
    await setChromeStorageStyles(styles);
  }

  await setStyleStorageState({
    backend: 'chrome-storage',
    fallbackAt: getCurrentTimestamp(),
    lastError: getErrorMessage(error),
  });
};

const ensureIndexedDbStorage = async (): Promise<boolean> => {
  if (!hasIndexedDB()) {
    await fallbackToChromeStorage('IndexedDB is not available');
    return false;
  }

  const state = await getStyleStorageState();
  if (state?.backend === 'indexedDB') {
    return true;
  }

  const legacyStyles = await getChromeStorageStyles();

  try {
    await setIndexedDbStyles(legacyStyles);
    await setStyleStorageState({
      backend: 'indexedDB',
      migratedAt: getCurrentTimestamp(),
    });
    return true;
  } catch (error) {
    dbPromise = null;
    await fallbackToChromeStorage(error, legacyStyles);
    return false;
  }
};

export const getAllStylesFromStorage = async (): Promise<StyleMap> => {
  if (await ensureIndexedDbStorage()) {
    try {
      return await getIndexedDbStyles();
    } catch (error) {
      dbPromise = null;
      await fallbackToChromeStorage(error);
    }
  }

  return getChromeStorageStyles();
};

export const setAllStylesInStorage = async (
  styles: StyleMap
): Promise<void> => {
  if (await ensureIndexedDbStorage()) {
    try {
      await setIndexedDbStyles(styles);
      return;
    } catch (error) {
      dbPromise = null;
      await fallbackToChromeStorage(error, styles);
    }
  }

  await setChromeStorageStyles(styles);
};

export const resetStyleStorageForTests = (): void => {
  dbPromise = null;
};
