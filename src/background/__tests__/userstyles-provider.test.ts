import type {
  UserstylesIndexEntry,
  UserstylesProviderHealth,
} from '@stylekit/types';

type StorageData = Record<string, unknown>;

const INDEX_LOCAL_KEY = 'stylekit-usw-index-cache';
const HEALTH_LOCAL_KEY = 'stylekit-usw-provider-health';

const makeEntry = (
  overrides: Partial<UserstylesIndexEntry> = {}
): UserstylesIndexEntry => ({
  i: 1,
  n: 'GitHub Dark',
  c: 'github.com',
  u: 0,
  t: 100,
  w: 42,
  r: 0,
  an: 'Author',
  sn: '',
  source: 'usw',
  ...overrides,
});

const makeHealth = (
  overrides: Partial<UserstylesProviderHealth> = {}
): UserstylesProviderHealth => ({
  provider: 'userstyles.world',
  status: 'ok',
  checkedAt: 1000,
  lastSuccessAt: 1000,
  failureCount: 0,
  usingCache: false,
  ...overrides,
});

const createChromeMock = (storageData: StorageData) => ({
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
    },
  },
});

describe('UserStyles.world provider health', () => {
  let storageData: StorageData;

  const importProvider = async () => {
    vi.resetModules();
    storageData = {};
    vi.stubGlobal('chrome', createChromeMock(storageData));
    return import('../userstyles-provider');
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and caches the provider index with healthy status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [makeEntry({ source: undefined as never })],
          }),
          { status: 200 }
        )
      )
    );
    const { getUserstylesIndex } = await importProvider();

    const result = await getUserstylesIndex({ now: 2000 });

    expect(result.fromCache).toBe(false);
    expect(result.health.status).toBe('ok');
    expect(result.data).toEqual([makeEntry()]);
    expect(storageData[INDEX_LOCAL_KEY]).toMatchObject({
      data: [makeEntry()],
      ts: 2000,
    });
    expect(storageData[HEALTH_LOCAL_KEY]).toMatchObject({
      status: 'ok',
      failureCount: 0,
      lastSuccessAt: 2000,
    });
  });

  it('returns last-good cached results during failures and backs off retries', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error(
        'Failed https://userstyles.world/api/index/uso-format Bearer secret'
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    storageData = {};
    vi.stubGlobal('chrome', createChromeMock(storageData));
    storageData[INDEX_LOCAL_KEY] = {
      data: [makeEntry()],
      ts: 1000,
    };
    storageData[HEALTH_LOCAL_KEY] = makeHealth();

    const { getUserstylesIndex } = await import('../userstyles-provider');

    const failed = await getUserstylesIndex({ now: 4000000 });
    const backedOff = await getUserstylesIndex({ now: 4000001 });

    expect(failed.fromCache).toBe(true);
    expect(failed.data).toEqual([makeEntry()]);
    expect(failed.health.status).toBe('degraded');
    expect(failed.health.nextRetryAt).toBe(4030000);
    expect(failed.error).toContain('[url]');
    expect(failed.error).toContain('Bearer [redacted]');
    expect(backedOff.fromCache).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports offline status when the provider fails without a cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 }))
    );
    const { getUserstylesIndex } = await importProvider();

    const result = await getUserstylesIndex({ now: 5000 });

    expect(result.data).toEqual([]);
    expect(result.fromCache).toBe(false);
    expect(result.health.status).toBe('offline');
    expect(result.health.usingCache).toBe(false);
    expect(result.health.lastError).toBe('Error: HTTP 503');
  });

  it('records sanitized CSS/update provider failures for diagnostics', async () => {
    const { recordUserstylesProviderFailure } = await importProvider();

    const health = await recordUserstylesProviderFailure(
      'style-css',
      'HTTP 500 at https://userstyles.world/style/1.user.css',
      6000
    );

    expect(health.status).toBe('offline');
    expect(health.lastOperation).toBe('style-css');
    expect(health.lastError).toBe('HTTP 500 at [url]');
    expect(storageData[HEALTH_LOCAL_KEY]).toEqual(health);
  });

  it('matches related userstyle categories to the active domain', async () => {
    const { matchesUserstylesDomain } = await importProvider();

    expect(matchesUserstylesDomain({ c: 'github.com' }, 'www.github.com')).toBe(
      true
    );
    expect(matchesUserstylesDomain({ c: 'github' }, 'github.com')).toBe(true);
    expect(matchesUserstylesDomain({ c: 'reddit.com' }, 'github.com')).toBe(
      false
    );
  });
});
