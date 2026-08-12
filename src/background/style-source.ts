import { getCurrentTimestamp } from '@stylekit/utils';
import type {
  StyleSourceConfig,
  StyleSourceIntervalMinutes,
  StyleSourceStatus,
  StyleSourceStatusMap,
} from '@stylekit/types';
import {
  assertValidImportCss,
  isSafeCssContentType,
} from '../utils/style-import';
import { recordDiagnostic } from './diagnostics';
import { applyStylesToAllTabs, getAll, setAll } from './styles';

const STATUS_STORAGE_KEY = 'style-source-status-v1';
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const VALID_INTERVALS = new Set<StyleSourceIntervalMinutes>([1, 5, 15, 60]);

type SourceSnapshot = {
  css: string;
  createdAt: string;
};

type StoredStyleSourceStatus = {
  state: StyleSourceStatus['state'];
  lastCheckedAt?: string;
  lastUpdatedAt?: string;
  lastError?: string;
  etag?: string;
  lastModified?: string;
  snapshot?: SourceSnapshot;
};

type StoredStyleSourceStatusMap = {
  [url: string]: StoredStyleSourceStatus;
};

type SourceFetchResult = {
  css?: string;
  notModified: boolean;
  etag?: string;
  lastModified?: string;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Source request timed out after 15 seconds.';
  }
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
};

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }
  if (normalized === '[::1]' || normalized === '::1') return true;
  return /^127(?:\.\d{1,3}){3}$/.test(normalized);
};

export const normalizeStyleSourceUrl = (value: string): string => {
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(value.trim());
  } catch {
    throw new Error('Enter a complete HTTPS, localhost, or file URL.');
  }

  if (sourceUrl.username || sourceUrl.password) {
    throw new Error('Source URLs cannot contain embedded credentials.');
  }

  const allowed =
    sourceUrl.protocol === 'https:' ||
    sourceUrl.protocol === 'file:' ||
    (sourceUrl.protocol === 'http:' && isLoopbackHostname(sourceUrl.hostname));

  if (!allowed) {
    throw new Error(
      'Live sources must use HTTPS, file:, or HTTP on localhost/127.0.0.1.'
    );
  }

  sourceUrl.hash = '';
  return sourceUrl.href;
};

export const normalizeStyleSourceConfig = (
  source: StyleSourceConfig
): StyleSourceConfig => {
  if (!VALID_INTERVALS.has(source.intervalMinutes)) {
    throw new Error('Choose a reload interval of 1, 5, 15, or 60 minutes.');
  }
  return {
    url: normalizeStyleSourceUrl(source.url),
    enabled: Boolean(source.enabled),
    intervalMinutes: source.intervalMinutes,
  };
};

const assertFileAccess = async (sourceUrl: URL): Promise<void> => {
  if (
    sourceUrl.protocol === 'file:' &&
    chrome.extension?.isAllowedFileSchemeAccess
  ) {
    const allowed = await chrome.extension.isAllowedFileSchemeAccess();
    if (!allowed) {
      throw new Error(
        'File access is disabled. Enable “Allow access to file URLs” in the extension details, then retry.'
      );
    }
  }
};

const fetchSource = async (
  value: string,
  previous?: StoredStyleSourceStatus
): Promise<SourceFetchResult> => {
  const normalizedUrl = normalizeStyleSourceUrl(value);
  const sourceUrl = new URL(normalizedUrl);
  await assertFileAccess(sourceUrl);

  const headers = new Headers();
  if (previous?.etag) headers.set('If-None-Match', previous.etag);
  if (previous?.lastModified) {
    headers.set('If-Modified-Since', previous.lastModified);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(normalizedUrl, {
      cache: 'no-store',
      credentials: 'omit',
      headers,
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });

    if (response.status === 304) {
      return {
        notModified: true,
        etag: previous?.etag,
        lastModified: previous?.lastModified,
      };
    }
    if (!response.ok) {
      throw new Error(
        `Source returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`
      );
    }
    if (response.url) normalizeStyleSourceUrl(response.url);
    if (!isSafeCssContentType(response.headers.get('content-type'))) {
      throw new Error('Source content type must be CSS or plain text.');
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_SOURCE_BYTES) {
      throw new Error('Source CSS exceeds the 5 MB safety limit.');
    }

    const css = await response.text();
    if (new TextEncoder().encode(css).byteLength > MAX_SOURCE_BYTES) {
      throw new Error('Source CSS exceeds the 5 MB safety limit.');
    }
    assertValidImportCss(css);

    return {
      css,
      notModified: false,
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const readStoredStatuses = async (): Promise<StoredStyleSourceStatusMap> => {
  const stored = await chrome.storage.local.get(STATUS_STORAGE_KEY);
  const statuses = stored[STATUS_STORAGE_KEY];
  return statuses && typeof statuses === 'object' ? statuses : {};
};

const writeStoredStatuses = (
  statuses: StoredStyleSourceStatusMap
): Promise<void> =>
  chrome.storage.local.set({
    [STATUS_STORAGE_KEY]: statuses,
  });

const toPublicStatus = (
  status?: StoredStyleSourceStatus
): StyleSourceStatus => ({
  state: status?.state || 'never',
  lastCheckedAt: status?.lastCheckedAt,
  lastUpdatedAt: status?.lastUpdatedAt,
  lastError: status?.lastError,
  rollbackAvailable: Boolean(status?.snapshot),
  snapshotCreatedAt: status?.snapshot?.createdAt,
});

const setStoredStatus = async (
  url: string,
  status: StoredStyleSourceStatus
): Promise<StyleSourceStatus> => {
  const statuses = await readStoredStatuses();
  statuses[url] = status;
  await writeStoredStatuses(statuses);
  return toPublicStatus(status);
};

export const previewStyleSource = async (url: string): Promise<string> => {
  const result = await fetchSource(url);
  if (result.css === undefined) {
    throw new Error('Source did not return CSS.');
  }
  return result.css;
};

export const configureStyleSource = async (
  url: string,
  source: StyleSourceConfig | null
): Promise<void> => {
  const styles = await getAll();
  const style = styles[url];
  if (!style) throw new Error('The target style no longer exists.');

  const statuses = await readStoredStatuses();
  if (source) {
    style.source = normalizeStyleSourceConfig(source);
    const existing = statuses[url];
    statuses[url] = {
      state: 'never',
      snapshot: existing?.snapshot,
    };
  } else {
    delete style.source;
    delete statuses[url];
  }
  style.modifiedTime = getCurrentTimestamp();

  await Promise.all([setAll(styles), writeStoredStatuses(statuses)]);
};

const reloadStyleSourceNow = async (
  url: string
): Promise<StyleSourceStatus> => {
  const initialStyles = await getAll();
  const source = initialStyles[url]?.source;
  if (!source) {
    throw new Error('This style does not have a live source.');
  }

  const statuses = await readStoredStatuses();
  const previousStatus = statuses[url];
  const checkedAt = getCurrentTimestamp();

  try {
    const result = await fetchSource(source.url, previousStatus);
    const latestStyles = await getAll();
    const style = latestStyles[url];
    if (!style?.source) {
      throw new Error('The live source was removed while reloading.');
    }

    const changed = result.css !== undefined && result.css !== style.css;
    const nextStatus: StoredStyleSourceStatus = {
      ...previousStatus,
      state: changed ? 'updated' : 'synced',
      lastCheckedAt: checkedAt,
      lastUpdatedAt: changed ? checkedAt : previousStatus?.lastUpdatedAt,
      lastError: undefined,
      etag: result.etag,
      lastModified: result.lastModified,
    };

    if (changed && result.css !== undefined) {
      nextStatus.snapshot = {
        css: style.css,
        createdAt: checkedAt,
      };
      style.css = result.css;
      style.modifiedTime = checkedAt;
      await setAll(latestStyles);
      await applyStylesToAllTabs();
    }

    return setStoredStatus(url, nextStatus);
  } catch (error) {
    const nextStatus: StoredStyleSourceStatus = {
      ...previousStatus,
      state: 'error',
      lastCheckedAt: checkedAt,
      lastError: getErrorMessage(error),
    };
    await recordDiagnostic({
      category: 'import',
      operation: 'live-source-reload',
      error,
    }).catch(() => undefined);
    return setStoredStatus(url, nextStatus);
  }
};

let reloadQueue: Promise<unknown> = Promise.resolve();

export const reloadStyleSource = (url: string): Promise<StyleSourceStatus> => {
  const operation = reloadQueue.then(() => reloadStyleSourceNow(url));
  reloadQueue = operation.catch(() => undefined);
  return operation;
};

export const rollbackStyleSource = async (
  url: string
): Promise<StyleSourceStatus> => {
  await reloadQueue;
  const [styles, statuses] = await Promise.all([
    getAll(),
    readStoredStatuses(),
  ]);
  const style = styles[url];
  const status = statuses[url];
  if (!style?.source)
    throw new Error('This style does not have a live source.');
  if (!status?.snapshot) throw new Error('No source rollback is available.');

  style.css = status.snapshot.css;
  style.source.enabled = false;
  style.modifiedTime = getCurrentTimestamp();

  const nextStatus: StoredStyleSourceStatus = {
    ...status,
    state: 'rolled-back',
    lastError: undefined,
    snapshot: undefined,
  };
  await Promise.all([setAll(styles), setStoredStatus(url, nextStatus)]);
  await applyStylesToAllTabs();
  return toPublicStatus(nextStatus);
};

export const getStyleSourceStatuses =
  async (): Promise<StyleSourceStatusMap> => {
    const [styles, statuses] = await Promise.all([
      getAll(),
      readStoredStatuses(),
    ]);
    const result: StyleSourceStatusMap = {};
    for (const [url, style] of Object.entries(styles)) {
      if (style.source) result[url] = toPublicStatus(statuses[url]);
    }
    return result;
  };

const isDue = (
  source: StyleSourceConfig,
  status: StoredStyleSourceStatus | undefined,
  now: number
): boolean => {
  if (!source.enabled) return false;
  const checkedAt = status?.lastCheckedAt
    ? new Date(status.lastCheckedAt).getTime()
    : 0;
  return (
    !Number.isFinite(checkedAt) ||
    now - checkedAt >= source.intervalMinutes * 60_000
  );
};

export const reloadDueStyleSources = async (): Promise<void> => {
  const [styles, statuses] = await Promise.all([
    getAll(),
    readStoredStatuses(),
  ]);
  const now = Date.now();
  for (const [url, style] of Object.entries(styles)) {
    if (style.source && isDue(style.source, statuses[url], now)) {
      await reloadStyleSource(url);
    }
  }
};

export const STYLE_SOURCE_STATUS_STORAGE_KEY = STATUS_STORAGE_KEY;
