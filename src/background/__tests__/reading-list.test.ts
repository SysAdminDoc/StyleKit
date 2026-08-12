import {
  deleteReadingListItem,
  getReadingListItems,
  getReadingListSyncState,
  resetReadingListForTests,
  saveReadingListItem,
  setReadingListItemRead,
} from '../reading-list';

const draft = {
  url: 'https://example.com/article#part',
  title: 'Example article',
  byline: 'Ada',
  siteName: 'Example',
  excerpt: 'An example.',
  content: '<p>Offline text.</p>',
  textContent: 'Offline text.',
};

describe('reading-list storage', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    resetReadingListForTests();
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

  it('saves, marks, and deletes queue items with sync tombstones', async () => {
    const saved = await saveReadingListItem(draft);
    expect(saved.url).toBe('https://example.com/article');
    expect(await getReadingListItems()).toHaveLength(1);

    const read = await setReadingListItemRead(saved.url, true);
    expect(read.readAt).toBeTruthy();

    await deleteReadingListItem(saved.url);
    expect(await getReadingListItems()).toEqual([]);
    expect(
      (await getReadingListSyncState()).readingListTombstones[saved.url]
    ).toBeTruthy();
  });

  it('rejects active HTML received from an untrusted sync file', async () => {
    await expect(
      saveReadingListItem({ ...draft, content: '<script>alert(1)</script>' })
    ).rejects.toThrow('unsafe');
    await expect(
      saveReadingListItem({
        ...draft,
        content: '<base href="https://evil.test">',
      })
    ).rejects.toThrow('unsafe');
  });
});
