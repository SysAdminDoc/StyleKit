import {
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent,
} from 'fake-indexeddb';

import type { StyleMap } from '@stylekit/types';

type StorageData = Record<string, unknown>;

const makeStyleMap = (
  css: string,
  url = 'https://example.com'
): StyleMap => ({
  [url]: {
    css,
    enabled: true,
    readability: false,
    modifiedTime: '2026-06-30T10:00:00.000-04:00',
  },
});

const createChromeMock = (storageData: StorageData) => ({
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') {
          return { [keys]: storageData[keys] };
        }

        return keys.reduce<Record<string, unknown>>((result, key) => {
          result[key] = storageData[key];
          return result;
        }, {});
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
    },
  },
});

const stubIndexedDbGlobals = (): void => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('IDBCursor', IDBCursor);
  vi.stubGlobal('IDBCursorWithValue', IDBCursorWithValue);
  vi.stubGlobal('IDBDatabase', IDBDatabase);
  vi.stubGlobal('IDBIndex', IDBIndex);
  vi.stubGlobal('IDBKeyRange', IDBKeyRange);
  vi.stubGlobal('IDBObjectStore', IDBObjectStore);
  vi.stubGlobal('IDBOpenDBRequest', IDBOpenDBRequest);
  vi.stubGlobal('IDBRequest', IDBRequest);
  vi.stubGlobal('IDBTransaction', IDBTransaction);
  vi.stubGlobal('IDBVersionChangeEvent', IDBVersionChangeEvent);
};

describe('style storage adapter', () => {
  let storageData: StorageData;

  const importStorageModule = async (withIndexedDb = true) => {
    vi.resetModules();
    storageData = {};
    vi.stubGlobal('chrome', createChromeMock(storageData));

    if (withIndexedDb) {
      stubIndexedDbGlobals();
    } else {
      vi.stubGlobal('indexedDB', undefined);
    }

    return import('../style-storage');
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('migrates existing chrome storage styles into IndexedDB once', async () => {
    const { getAllStylesFromStorage } = await importStorageModule();
    const legacyStyles = makeStyleMap('body { color: red; }');
    storageData.styles = legacyStyles;

    expect(await getAllStylesFromStorage()).toEqual(legacyStyles);
    expect(storageData['style-storage-v1']).toMatchObject({
      backend: 'indexedDB',
      migratedAt: expect.any(String),
    });

    delete storageData.styles;

    expect(await getAllStylesFromStorage()).toEqual(legacyStyles);
  });

  it('writes through IndexedDB while preserving the legacy rollback copy', async () => {
    const { getAllStylesFromStorage, setAllStylesInStorage } =
      await importStorageModule();
    const legacyStyles = makeStyleMap('body { color: red; }');
    const indexedDbStyles = makeStyleMap('body { color: blue; }');
    storageData.styles = legacyStyles;

    await getAllStylesFromStorage();
    await setAllStylesInStorage(indexedDbStyles);

    expect(await getAllStylesFromStorage()).toEqual(indexedDbStyles);
    expect(storageData.styles).toEqual(legacyStyles);
  });

  it('falls back to chrome storage when IndexedDB is unavailable', async () => {
    const { getAllStylesFromStorage, setAllStylesInStorage } =
      await importStorageModule(false);
    const styles = makeStyleMap('body { color: purple; }');

    await setAllStylesInStorage(styles);

    expect(await getAllStylesFromStorage()).toEqual(styles);
    expect(storageData.styles).toEqual(styles);
    expect(storageData['style-storage-v1']).toMatchObject({
      backend: 'chrome-storage',
      fallbackAt: expect.any(String),
    });
  });
});
