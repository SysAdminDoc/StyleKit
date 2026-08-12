import {
  addRecipeMarketplaceSource,
  fetchMarketplaceSource,
  getMarketplaceFeedUrl,
  getRecipeMarketplaceSources,
  normalizeMarketplaceSource,
  resetRecipeMarketplaceForTests,
} from '../recipe-marketplace';

const feed = JSON.stringify({
  version: 1,
  app: 'StyleKit',
  kind: 'recipes',
  exportedAt: '2026-08-12T10:00:00.000Z',
  recipes: [
    {
      id: 'clean-feed',
      name: 'Clean feed',
      description: 'Hide noise',
      sites: ['example.com'],
      css: '.noise { display: none; }',
      createdAt: '2026-08-12T10:00:00.000Z',
      updatedAt: '2026-08-12T10:00:00.000Z',
    },
  ],
});

describe('GitHub recipe marketplace sources', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    resetRecipeMarketplaceForTests();
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

  it('requires public owner/repo names and immutable version pins', () => {
    expect(
      normalizeMarketplaceSource({ repository: 'owner/recipes', ref: 'v1.2.3' })
    ).toEqual({ repository: 'owner/recipes', ref: 'v1.2.3' });
    expect(() =>
      normalizeMarketplaceSource({ repository: 'owner/recipes', ref: 'main' })
    ).toThrow('Version pin');
    expect(getMarketplaceFeedUrl({ repository: 'owner/recipes', ref: 'v1.2.3' }))
      .toBe(
        'https://raw.githubusercontent.com/owner/recipes/v1.2.3/stylekit-recipes.json'
      );
  });

  it('fetches a bounded feed without credentials or referrer', async () => {
    const fetcher = vi.fn(async () =>
      new Response(feed, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const source = await fetchMarketplaceSource(
      { repository: 'owner/recipes', ref: 'v1.2.3' },
      fetcher as typeof fetch,
      'fetched-now'
    );

    expect(source).toMatchObject({
      id: 'owner/recipes@v1.2.3',
      fetchedAt: 'fetched-now',
    });
    expect(source.recipes[0].name).toBe('Clean feed');
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/raw\.githubusercontent\.com\//),
      expect.objectContaining({
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      })
    );
  });

  it('persists fetched sources for later marketplace browsing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(feed, { status: 200 }))
    );
    await addRecipeMarketplaceSource({
      repository: 'owner/recipes',
      ref: 'v1.2.3',
    });
    await expect(getRecipeMarketplaceSources()).resolves.toHaveLength(1);
  });
});
