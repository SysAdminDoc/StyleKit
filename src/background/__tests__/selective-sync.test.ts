import {
  getSelectiveSyncConfig,
  resetSelectiveSyncForTests,
  SELECTIVE_SYNC_STORAGE_KEY,
  setSelectiveSyncConfig,
} from '../selective-sync';

describe('selective sync settings', () => {
  let storageData: Record<string, unknown>;
  let remove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storageData = {
      'google-drive-sync': { modifiedTime: 'old' },
      'stylekit-remote-sync-metadata': { webdav: { lastSyncedAt: 'old' } },
    };
    resetSelectiveSyncForTests();
    remove = vi.fn(async (keys: string[]) => {
      keys.forEach(key => delete storageData[key]);
    });
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(storageData, structuredClone(items));
          }),
          remove,
        },
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('persists the selection and resets provider sync ancestry', async () => {
    await expect(
      setSelectiveSyncConfig({
        mode: 'selected',
        urls: ['example.com'],
      })
    ).resolves.toEqual({ mode: 'selected', urls: ['example.com'] });

    expect(storageData[SELECTIVE_SYNC_STORAGE_KEY]).toEqual({
      mode: 'selected',
      urls: ['example.com'],
    });
    expect(remove).toHaveBeenCalledWith([
      'google-drive-sync',
      'stylekit-remote-sync-metadata',
    ]);
  });

  it('falls back to syncing all styles when local settings are malformed', async () => {
    storageData[SELECTIVE_SYNC_STORAGE_KEY] = {
      mode: 'selected',
      urls: [null],
    };
    await expect(getSelectiveSyncConfig()).resolves.toEqual({
      mode: 'all',
      urls: [],
    });
  });
});
