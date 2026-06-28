import type { StyleMap, StylesRollbackSnapshot } from '@stylekit/types';

type StorageData = Record<string, unknown>;

const makeStyleMap = (css: string): StyleMap => ({
  'https://example.com': {
    css,
    enabled: true,
    readability: false,
    modifiedTime: '2026-06-28T10:00:00.000-04:00',
  },
});

const createChromeMock = (storageData: StorageData) => ({
  action: {
    setBadgeText: vi.fn(),
  },
  runtime: {
    id: 'stylekit-test',
  },
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
    onChanged: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(async () => []),
    sendMessage: vi.fn(),
  },
});

describe('style rollback snapshots', () => {
  let storageData: StorageData;

  const importStylesModule = async () => {
    vi.resetModules();
    storageData = {};
    vi.stubGlobal('chrome', createChromeMock(storageData));

    return import('../styles');
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores a timestamped deep copy of the current styles', async () => {
    const { createStylesRollbackSnapshot } = await importStylesModule();
    const currentStyles = makeStyleMap('body { color: red; }');
    storageData.styles = currentStyles;

    const snapshot = await createStylesRollbackSnapshot('json-import');
    currentStyles['https://example.com'].css = 'body { color: blue; }';

    const storedSnapshot = storageData[
      'styles-rollback-last'
    ] as StylesRollbackSnapshot;

    expect(snapshot.reason).toBe('json-import');
    expect(snapshot.createdAt).toEqual(snapshot.id);
    expect(storedSnapshot.styles['https://example.com'].css).toBe(
      'body { color: red; }'
    );
  });

  it('restores the last rollback snapshot into style storage', async () => {
    const {
      createStylesRollbackSnapshot,
      restoreLastStylesRollbackSnapshot,
      setAll,
    } = await importStylesModule();
    const originalStyles = makeStyleMap('body { color: red; }');
    const importedStyles = makeStyleMap('body { color: blue; }');
    storageData.styles = originalStyles;

    await createStylesRollbackSnapshot('gist-import');
    await setAll(importedStyles);

    const restoredSnapshot = await restoreLastStylesRollbackSnapshot();

    expect(restoredSnapshot?.reason).toBe('gist-import');
    expect(storageData.styles).toEqual(originalStyles);
  });
});
