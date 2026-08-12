import type {
  ReadingListItem,
  ReadingListItemDraft,
  ReadingListItemMap,
  ReadingListTombstoneMap,
} from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';

export type ReadingListSyncState = {
  readingList: ReadingListItemMap;
  readingListTombstones: ReadingListTombstoneMap;
};

type StoredReadingList = ReadingListSyncState & {
  version: 1;
  modifiedAt: string;
};

const STORAGE_KEY = 'stylekit-reading-list';
const MAX_ITEMS = 100;
const MAX_ITEM_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_TOMBSTONES = 500;
const SAFE_SNAPSHOT_TAGS = new Set([
  'a',
  'abbr',
  'article',
  'aside',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'ins',
  'kbd',
  'li',
  'main',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);
const encoder = new TextEncoder();
let mutationQueue: Promise<void> = Promise.resolve();

const byteLength = (value: unknown): number =>
  encoder.encode(JSON.stringify(value)).byteLength;

const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  Number.isFinite(Date.parse(value));

const normalizeUrl = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 4096) {
    throw new Error('Reading-list URL is invalid');
  }
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Reading-list URLs must use HTTP or HTTPS');
  }
  url.hash = '';
  return url.href;
};

const isSafeSnapshot = (content: string): boolean => {
  const forbidden =
    /<\s*(?:script|style|iframe|object|embed|form|input|button|textarea|select|svg|math|img|video|audio|source|link|meta)\b|\son[a-z]+\s*=|\sstyle\s*=|(?:href|src)\s*=\s*["']?\s*(?:javascript|data|vbscript):/i;
  if (forbidden.test(content)) return false;
  return Array.from(content.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)).every(
    match => SAFE_SNAPSHOT_TAGS.has(match[1].toLowerCase())
  );
};

const normalizeString = (
  value: unknown,
  field: string,
  maxLength: number,
  required = false
): string => {
  if (typeof value !== 'string') {
    throw new Error(`Reading-list ${field} is invalid`);
  }
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maxLength) {
    throw new Error(`Reading-list ${field} is invalid`);
  }
  return normalized;
};

export const normalizeReadingListItem = (value: unknown): ReadingListItem => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Reading-list item is invalid');
  }
  const record = value as Record<string, unknown>;
  const item: ReadingListItem = {
    url: normalizeUrl(record.url),
    title: normalizeString(record.title, 'title', 500, true),
    byline: normalizeString(record.byline, 'byline', 500),
    siteName: normalizeString(record.siteName, 'site name', 200),
    excerpt: normalizeString(record.excerpt, 'excerpt', 500),
    content: normalizeString(record.content, 'content', MAX_ITEM_BYTES, true),
    textContent: normalizeString(
      record.textContent,
      'text content',
      MAX_ITEM_BYTES,
      true
    ),
    addedAt: isTimestamp(record.addedAt)
      ? record.addedAt
      : (() => {
          throw new Error('Reading-list added time is invalid');
        })(),
    updatedAt: isTimestamp(record.updatedAt)
      ? record.updatedAt
      : (() => {
          throw new Error('Reading-list updated time is invalid');
        })(),
  };
  if (record.readAt !== undefined) {
    if (!isTimestamp(record.readAt)) {
      throw new Error('Reading-list read time is invalid');
    }
    item.readAt = record.readAt;
  }
  if (!isSafeSnapshot(item.content) || byteLength(item) > MAX_ITEM_BYTES) {
    throw new Error('Reading-list snapshot is unsafe or too large');
  }
  return item;
};

const normalizeItems = (value: unknown): ReadingListItemMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Reading-list items are invalid');
  }
  const items: ReadingListItemMap = {};
  for (const [key, rawItem] of Object.entries(value)) {
    const item = normalizeReadingListItem(rawItem);
    if (normalizeUrl(key) !== item.url) {
      throw new Error('Reading-list item key does not match its URL');
    }
    items[item.url] = item;
  }
  return items;
};

const normalizeTombstones = (value: unknown): ReadingListTombstoneMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Reading-list tombstones are invalid');
  }
  const tombstones: ReadingListTombstoneMap = {};
  for (const [key, rawTombstone] of Object.entries(value)) {
    if (
      !rawTombstone ||
      typeof rawTombstone !== 'object' ||
      Array.isArray(rawTombstone) ||
      !isTimestamp((rawTombstone as Record<string, unknown>).deletedTime)
    ) {
      throw new Error('Reading-list tombstone is invalid');
    }
    tombstones[normalizeUrl(key)] = {
      deletedTime: (rawTombstone as { deletedTime: string }).deletedTime,
    };
  }
  return tombstones;
};

export const normalizeReadingListSyncState = (
  value: unknown
): ReadingListSyncState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Reading-list sync state is invalid');
  }
  const record = value as Record<string, unknown>;
  return {
    readingList: normalizeItems(record.readingList || {}),
    readingListTombstones: normalizeTombstones(
      record.readingListTombstones || {}
    ),
  };
};

const emptyStoredState = (): StoredReadingList => ({
  version: 1,
  modifiedAt: new Date(0).toISOString(),
  readingList: {},
  readingListTombstones: {},
});

const readStored = async (): Promise<StoredReadingList> => {
  const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  if (!stored) return emptyStoredState();
  const state = normalizeReadingListSyncState(stored);
  const modifiedAt = isTimestamp(stored.modifiedAt)
    ? stored.modifiedAt
    : new Date(0).toISOString();
  return { version: 1, modifiedAt, ...state };
};

const trimState = (
  state: ReadingListSyncState,
  now: string
): ReadingListSyncState => {
  const sortedItems = Object.values(state.readingList).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
  const readingList: ReadingListItemMap = {};
  let totalBytes = 0;
  for (const item of sortedItems) {
    const itemBytes = byteLength(item);
    if (
      Object.keys(readingList).length >= MAX_ITEMS ||
      totalBytes + itemBytes > MAX_TOTAL_BYTES
    ) {
      state.readingListTombstones[item.url] = { deletedTime: now };
      continue;
    }
    readingList[item.url] = item;
    totalBytes += itemBytes;
  }
  const readingListTombstones = Object.fromEntries(
    Object.entries(state.readingListTombstones)
      .sort(([, left], [, right]) =>
        right.deletedTime.localeCompare(left.deletedTime)
      )
      .slice(0, MAX_TOMBSTONES)
  );
  return { readingList, readingListTombstones };
};

const writeStored = async (state: ReadingListSyncState): Promise<void> => {
  const modifiedAt = getCurrentTimestamp();
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      version: 1,
      modifiedAt,
      ...trimState(state, modifiedAt),
    } satisfies StoredReadingList,
  });
};

const mutate = async <T>(
  operation: (state: StoredReadingList) => Promise<T> | T
): Promise<T> => {
  const previous = mutationQueue;
  let release!: () => void;
  mutationQueue = new Promise(resolve => {
    release = resolve;
  });
  await previous;
  try {
    const state = await readStored();
    const result = await operation(state);
    await writeStored(state);
    return result;
  } finally {
    release();
  }
};

export const getReadingListSyncState =
  async (): Promise<ReadingListSyncState> => {
    const { readingList, readingListTombstones } = await readStored();
    return { readingList, readingListTombstones };
  };

export const setReadingListSyncState = async (
  state: ReadingListSyncState
): Promise<void> => {
  const normalized = normalizeReadingListSyncState(state);
  await mutate(current => {
    current.readingList = normalized.readingList;
    current.readingListTombstones = normalized.readingListTombstones;
  });
};

export const getReadingListModifiedTime = async (): Promise<string> =>
  (await readStored()).modifiedAt;

export const getReadingListItems = async (): Promise<ReadingListItem[]> =>
  Object.values((await readStored()).readingList).sort((left, right) => {
    if (!!left.readAt !== !!right.readAt) return left.readAt ? 1 : -1;
    return right.addedAt.localeCompare(left.addedAt);
  });

export const saveReadingListItem = async (
  draft: ReadingListItemDraft
): Promise<ReadingListItem> =>
  mutate(state => {
    const now = getCurrentTimestamp();
    const existing = state.readingList[normalizeUrl(draft.url)];
    const item = normalizeReadingListItem({
      ...draft,
      url: normalizeUrl(draft.url),
      addedAt: existing?.addedAt || now,
      updatedAt: now,
      readAt: existing?.readAt,
    });
    state.readingList[item.url] = item;
    delete state.readingListTombstones[item.url];
    return item;
  });

export const setReadingListItemRead = async (
  urlValue: string,
  read: boolean
): Promise<ReadingListItem> =>
  mutate(state => {
    const url = normalizeUrl(urlValue);
    const existing = state.readingList[url];
    if (!existing) throw new Error('Reading-list item was not found');
    const updatedAt = getCurrentTimestamp();
    const item = normalizeReadingListItem({
      ...existing,
      updatedAt,
      readAt: read ? updatedAt : undefined,
    });
    state.readingList[url] = item;
    return item;
  });

export const deleteReadingListItem = async (urlValue: string): Promise<void> =>
  mutate(state => {
    const url = normalizeUrl(urlValue);
    delete state.readingList[url];
    state.readingListTombstones[url] = { deletedTime: getCurrentTimestamp() };
  });

export const resetReadingListForTests = (): void => {
  mutationQueue = Promise.resolve();
};

export const READING_LIST_STORAGE_KEY = STORAGE_KEY;
