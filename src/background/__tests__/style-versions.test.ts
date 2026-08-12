import {
  getStyleVersion,
  recordStyleVersion,
  resetStyleVersionsForTests,
  STYLE_VERSION_SETTLE_MS,
  STYLE_VERSIONS_STORAGE_KEY,
} from '../style-versions';

describe('saved style versions', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    resetStyleVersionsForTests();
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(storageData, structuredClone(items));
          }),
        },
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps rapid autosaves in one persisted revision', async () => {
    const url = 'https://example.com';
    const savedAt = '2026-08-12T10:00:00.000-04:00';

    await recordStyleVersion(
      url,
      'a { color: red; }',
      'a { color: b; }',
      savedAt,
      1000
    );
    await recordStyleVersion(
      url,
      'a { color: b; }',
      'a { color: blue; }',
      savedAt,
      1100
    );

    await expect(getStyleVersion(url)).resolves.toEqual({
      css: 'a { color: red; }',
      savedAt,
    });
  });

  it('rotates the previous revision after an idle boundary', async () => {
    const url = 'https://example.com';
    await recordStyleVersion(url, 'a { color: red; }', 'a { color: blue; }', 'first', 1000);
    await recordStyleVersion(
      url,
      'a { color: blue; }',
      'a { color: green; }',
      'second',
      1000 + STYLE_VERSION_SETTLE_MS
    );

    await expect(getStyleVersion(url)).resolves.toEqual({
      css: 'a { color: blue; }',
      savedAt: 'second',
    });
  });

  it('rejects malformed persisted records', async () => {
    storageData[STYLE_VERSIONS_STORAGE_KEY] = {
      'https://example.com': { previous: { css: 3 }, currentCss: false },
    };

    await expect(getStyleVersion('https://example.com')).resolves.toBeNull();
  });
});
