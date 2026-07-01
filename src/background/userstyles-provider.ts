import {
  GetUserstylesIndexResponse,
  UserstylesIndexEntry,
  UserstylesProviderHealth,
} from '@stylekit/types';

const INDEX_LOCAL_KEY = 'stylekit-usw-index-cache';
const HEALTH_LOCAL_KEY = 'stylekit-usw-provider-health';
const INDEX_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;
const BASE_BACKOFF_MS = 30000;
const MAX_BACKOFF_MS = 15 * 60 * 1000;
const INDEX_URL = 'https://userstyles.world/api/index/uso-format';

type UserstylesIndexCache = {
  data: UserstylesIndexEntry[];
  ts: number;
};

type GetUserstylesIndexOptions = {
  now?: number;
};

const createDefaultHealth = (now = Date.now()): UserstylesProviderHealth => ({
  provider: 'userstyles.world',
  status: 'ok',
  checkedAt: now,
  failureCount: 0,
  usingCache: false,
});

const sanitizeProviderError = (error: unknown): string => {
  const raw =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error || 'Unknown provider error');

  return raw
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/bearer\s+[a-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(0, 180);
};

const normalizeEntry = (
  entry: Partial<UserstylesIndexEntry>
): UserstylesIndexEntry => ({
  i: Number(entry.i || 0),
  n: String(entry.n || ''),
  c: String(entry.c || ''),
  u: Number(entry.u || 0),
  t: Number(entry.t || 0),
  w: Number(entry.w || 0),
  r: Number(entry.r || 0),
  an: String(entry.an || ''),
  sn: String(entry.sn || ''),
  source: 'usw',
});

const readIndexCache = async (): Promise<UserstylesIndexCache | null> => {
  const result = await chrome.storage.local.get(INDEX_LOCAL_KEY);
  return result[INDEX_LOCAL_KEY] || null;
};

const writeIndexCache = (cache: UserstylesIndexCache): Promise<void> =>
  chrome.storage.local.set({ [INDEX_LOCAL_KEY]: cache });

export const getUserstylesProviderHealth =
  async (): Promise<UserstylesProviderHealth> => {
    const result = await chrome.storage.local.get(HEALTH_LOCAL_KEY);
    return result[HEALTH_LOCAL_KEY] || createDefaultHealth();
  };

const writeProviderHealth = (
  health: UserstylesProviderHealth
): Promise<void> => chrome.storage.local.set({ [HEALTH_LOCAL_KEY]: health });

const getBackoffMs = (failureCount: number): number =>
  Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, failureCount - 1));

const fetchProviderIndex = async (): Promise<UserstylesIndexEntry[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(INDEX_URL, {
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const data = Array.isArray(json.data) ? json.data : [];
    return data.map(normalizeEntry).filter(entry => entry.i && entry.n);
  } finally {
    clearTimeout(timeout);
  }
};

const makeFailureHealth = (
  previous: UserstylesProviderHealth,
  error: unknown,
  operation: string,
  hasCache: boolean,
  now: number
): UserstylesProviderHealth => {
  const failureCount = previous.failureCount + 1;

  return {
    provider: 'userstyles.world',
    status: hasCache ? 'degraded' : 'offline',
    checkedAt: now,
    lastSuccessAt: previous.lastSuccessAt,
    failureCount,
    nextRetryAt: now + getBackoffMs(failureCount),
    lastOperation: operation,
    lastError: sanitizeProviderError(error),
    usingCache: hasCache,
  };
};

export const recordUserstylesProviderFailure = async (
  operation: string,
  error: unknown,
  now = Date.now()
): Promise<UserstylesProviderHealth> => {
  const [previous, cache] = await Promise.all([
    getUserstylesProviderHealth(),
    readIndexCache(),
  ]);
  const health = makeFailureHealth(previous, error, operation, Boolean(cache), now);
  await writeProviderHealth(health);
  return health;
};

export const matchesUserstylesDomain = (
  entry: Pick<UserstylesIndexEntry, 'c'>,
  domain: string
): boolean => {
  const dom = domain.toLowerCase().replace(/^www\./, '');
  const cat = (entry.c || '').toLowerCase().replace(/^www\./, '');
  if (!cat) return false;
  if (cat === dom) return true;
  if (dom.endsWith('.' + cat) || cat.endsWith('.' + dom)) return true;
  const domCore = dom.replace(
    /\.(com|org|net|io|co|edu|gov|me|app|dev)(\.\w+)?$/,
    ''
  );
  const catCore = cat.replace(
    /\.(com|org|net|io|co|edu|gov|me|app|dev)(\.\w+)?$/,
    ''
  );
  if (domCore === catCore) return true;
  return domCore.split('.').some(part => part === catCore || part === cat);
};

export const getUserstylesIndex = async (
  options: GetUserstylesIndexOptions = {}
): Promise<GetUserstylesIndexResponse> => {
  const now = options.now ?? Date.now();
  const [cache, previousHealth] = await Promise.all([
    readIndexCache(),
    getUserstylesProviderHealth(),
  ]);

  if (
    cache &&
    now - cache.ts < INDEX_TTL_MS &&
    previousHealth.status === 'ok'
  ) {
    return {
      data: cache.data,
      health: { ...previousHealth, usingCache: true },
      fromCache: true,
    };
  }

  if (
    cache &&
    previousHealth.nextRetryAt !== undefined &&
    previousHealth.nextRetryAt > now
  ) {
    return {
      data: cache.data,
      health: { ...previousHealth, usingCache: true },
      fromCache: true,
      error: previousHealth.lastError,
    };
  }

  try {
    const data = await fetchProviderIndex();
    const health: UserstylesProviderHealth = {
      provider: 'userstyles.world',
      status: 'ok',
      checkedAt: now,
      lastSuccessAt: now,
      failureCount: 0,
      usingCache: false,
    };

    await Promise.all([
      writeIndexCache({ data, ts: now }),
      writeProviderHealth(health),
    ]);

    return {
      data,
      health,
      fromCache: false,
    };
  } catch (error) {
    const health = makeFailureHealth(
      previousHealth,
      error,
      'index',
      Boolean(cache),
      now
    );
    await writeProviderHealth(health);

    return {
      data: cache?.data || [],
      health,
      fromCache: Boolean(cache),
      error: health.lastError,
    };
  }
};
