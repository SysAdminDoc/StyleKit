import type {
  RecipeMarketplaceSource,
  RecipeMarketplaceSourceDraft,
} from '@stylekit/types';
import { parseUserRecipeExport } from '../utils/user-recipes';

const STORAGE_KEY = 'stylekit-recipe-marketplace-sources';
const MAX_SOURCES = 20;
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const REPOSITORY_PATTERN = /^[a-zA-Z0-9_.-]{1,100}\/[a-zA-Z0-9_.-]{1,100}$/;
const PIN_PATTERN = /^(?:[a-f0-9]{40}|v?\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?)$/;
let mutationQueue: Promise<void> = Promise.resolve();

export const normalizeMarketplaceSource = (
  draft: RecipeMarketplaceSourceDraft
): RecipeMarketplaceSourceDraft => {
  const repository = draft.repository.trim();
  const ref = draft.ref.trim();
  if (!REPOSITORY_PATTERN.test(repository)) {
    throw new Error('Repository must use the public owner/repo format');
  }
  if (!PIN_PATTERN.test(ref)) {
    throw new Error('Version pin must be a semantic version tag or 40-character commit SHA');
  }
  return { repository, ref };
};

export const getMarketplaceFeedUrl = (
  draft: RecipeMarketplaceSourceDraft
): string => {
  const source = normalizeMarketplaceSource(draft);
  const [owner, repository] = source.repository.split('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${encodeURIComponent(source.ref)}/stylekit-recipes.json`;
};

const normalizeStoredSource = (value: unknown): RecipeMarketplaceSource => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Marketplace source must be an object');
  }
  const record = value as Record<string, unknown>;
  const draft = normalizeMarketplaceSource({
    repository: typeof record.repository === 'string' ? record.repository : '',
    ref: typeof record.ref === 'string' ? record.ref : '',
  });
  const envelope = parseUserRecipeExport({
    version: 1,
    app: 'StyleKit',
    kind: 'recipes',
    exportedAt: record.fetchedAt,
    recipes: record.recipes,
  });
  return {
    id: `${draft.repository}@${draft.ref}`,
    ...draft,
    fetchedAt:
      typeof record.fetchedAt === 'string'
        ? record.fetchedAt
        : new Date().toISOString(),
    recipes: envelope.recipes,
  };
};

const readSources = async (): Promise<RecipeMarketplaceSource[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!Array.isArray(stored[STORAGE_KEY])) return [];
  return stored[STORAGE_KEY].slice(0, MAX_SOURCES).flatMap((value: unknown) => {
    try {
      return [normalizeStoredSource(value)];
    } catch {
      return [];
    }
  });
};

const writeSources = async (
  sources: RecipeMarketplaceSource[]
): Promise<RecipeMarketplaceSource[]> => {
  const bounded = sources.slice(0, MAX_SOURCES);
  await chrome.storage.local.set({ [STORAGE_KEY]: bounded });
  return bounded;
};

const mutateSources = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

export const fetchMarketplaceSource = async (
  draft: RecipeMarketplaceSourceDraft,
  fetcher: typeof fetch = fetch,
  now = new Date().toISOString()
): Promise<RecipeMarketplaceSource> => {
  const source = normalizeMarketplaceSource(draft);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(getMarketplaceFeedUrl(source), {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`GitHub recipe feed returned HTTP ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_FEED_BYTES) throw new Error('Recipe feed exceeds 2 MB');
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_FEED_BYTES) {
      throw new Error('Recipe feed exceeds 2 MB');
    }
    const envelope = parseUserRecipeExport(JSON.parse(text));
    return {
      id: `${source.repository}@${source.ref}`,
      ...source,
      fetchedAt: now,
      recipes: envelope.recipes,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const getRecipeMarketplaceSources = async (): Promise<
  RecipeMarketplaceSource[]
> => {
  await mutationQueue;
  return readSources();
};

export const addRecipeMarketplaceSource = (
  draft: RecipeMarketplaceSourceDraft
): Promise<RecipeMarketplaceSource[]> =>
  mutateSources(async () => {
    const source = await fetchMarketplaceSource(draft);
    const sources = await readSources();
    return writeSources([
      source,
      ...sources.filter(candidate => candidate.id !== source.id),
    ]);
  });

export const refreshRecipeMarketplaceSource = (
  id: string
): Promise<RecipeMarketplaceSource[]> =>
  mutateSources(async () => {
    const sources = await readSources();
    const current = sources.find(source => source.id === id);
    if (!current) throw new Error('Marketplace source was not found');
    const refreshed = await fetchMarketplaceSource(current);
    return writeSources(
      sources.map(source => (source.id === id ? refreshed : source))
    );
  });

export const deleteRecipeMarketplaceSource = (
  id: string
): Promise<RecipeMarketplaceSource[]> =>
  mutateSources(async () => {
    const sources = await readSources();
    return writeSources(sources.filter(source => source.id !== id));
  });

export const RECIPE_MARKETPLACE_STORAGE_KEY = STORAGE_KEY;

export const resetRecipeMarketplaceForTests = (): void => {
  mutationQueue = Promise.resolve();
};
