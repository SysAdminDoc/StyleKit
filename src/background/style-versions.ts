import type { StyleVersionSnapshot, Timestamp } from '@stylekit/types';

const STORAGE_KEY = 'stylekit-style-versions';
const MAX_STYLE_VERSIONS = 100;
export const STYLE_VERSION_SETTLE_MS = 1500;

type StoredStyleVersion = {
  previous: StyleVersionSnapshot;
  currentCss: string;
  lastChangedAt: number;
};

type StoredStyleVersions = Record<string, StoredStyleVersion>;

let mutationQueue: Promise<void> = Promise.resolve();

const isSnapshot = (value: unknown): value is StyleVersionSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<StyleVersionSnapshot>;
  return typeof snapshot.css === 'string' && typeof snapshot.savedAt === 'string';
};

const parseVersions = (value: unknown): StoredStyleVersions => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const versions: StoredStyleVersions = {};
  Object.entries(value).forEach(([url, candidate]) => {
    if (!candidate || typeof candidate !== 'object' || url.length > 2048) return;
    const record = candidate as Partial<StoredStyleVersion>;
    if (
      isSnapshot(record.previous) &&
      typeof record.currentCss === 'string' &&
      typeof record.lastChangedAt === 'number' &&
      Number.isFinite(record.lastChangedAt)
    ) {
      versions[url] = {
        previous: record.previous,
        currentCss: record.currentCss,
        lastChangedAt: record.lastChangedAt,
      };
    }
  });
  return versions;
};

const readVersions = async (): Promise<StoredStyleVersions> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return parseVersions(stored[STORAGE_KEY]);
};

const trimVersions = (versions: StoredStyleVersions): StoredStyleVersions =>
  Object.fromEntries(
    Object.entries(versions)
      .sort(([, left], [, right]) => left.lastChangedAt - right.lastChangedAt)
      .slice(-MAX_STYLE_VERSIONS)
  );

const recordStyleVersionNow = async (
  url: string,
  previousCss: string,
  currentCss: string,
  previousSavedAt: Timestamp,
  changedAt: number
): Promise<StyleVersionSnapshot | null> => {
  const versions = await readVersions();
  const existing = versions[url];

  if (previousCss === currentCss) {
    return existing?.previous ?? null;
  }

  const shouldRotate =
    !existing ||
    existing.currentCss !== previousCss ||
    changedAt - existing.lastChangedAt >= STYLE_VERSION_SETTLE_MS;
  const previous = shouldRotate
    ? { css: previousCss, savedAt: previousSavedAt }
    : existing.previous;

  versions[url] = {
    previous,
    currentCss,
    lastChangedAt: changedAt,
  };
  await chrome.storage.local.set({
    [STORAGE_KEY]: trimVersions(versions),
  });
  return previous;
};

export const recordStyleVersion = (
  url: string,
  previousCss: string,
  currentCss: string,
  previousSavedAt: Timestamp,
  changedAt = Date.now()
): Promise<StyleVersionSnapshot | null> => {
  const result = mutationQueue.then(() =>
    recordStyleVersionNow(
      url,
      previousCss,
      currentCss,
      previousSavedAt,
      changedAt
    )
  );
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

export const getStyleVersion = async (
  url: string
): Promise<StyleVersionSnapshot | null> => {
  await mutationQueue;
  const versions = await readVersions();
  return versions[url]?.previous ?? null;
};

export const STYLE_VERSIONS_STORAGE_KEY = STORAGE_KEY;

export const resetStyleVersionsForTests = (): void => {
  mutationQueue = Promise.resolve();
};
