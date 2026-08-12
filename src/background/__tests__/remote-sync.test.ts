import {
  createStylesRollbackSnapshot,
  getAll,
  getStyleTombstones,
  setAll,
  setStyleTombstones,
} from '../styles';
import {
  getRemoteSyncSettings,
  resetRemoteSyncForTests,
  runRemoteSync,
  saveRemoteSyncConfig,
} from '../remote-sync';
import { createGoogleDriveSyncPayload } from '../../sync/google-drive/sync-payload';

vi.mock('../styles', () => ({
  createStylesRollbackSnapshot: vi.fn(),
  getAll: vi.fn(),
  getStyleTombstones: vi.fn(),
  setAll: vi.fn(),
  setStyleTombstones: vi.fn(),
}));

const localStyle = {
  css: 'body { color: blue; }',
  enabled: true,
  readability: false,
  modifiedTime: '2026-08-12T10:00:00.000Z',
};

describe('WebDAV and S3 remote sync', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    resetRemoteSyncForTests();
    vi.resetAllMocks();
    vi.mocked(getAll).mockResolvedValue({ 'example.com': localStyle });
    vi.mocked(getStyleTombstones).mockResolvedValue({});
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a missing WebDAV object with Basic auth and persists metadata', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(null, { status: 201, headers: { etag: '"created"' } })
      );
    vi.stubGlobal('fetch', fetchMock);
    await saveRemoteSyncConfig({
      provider: 'webdav',
      url: 'https://dav.example.com/stylekit.json',
      username: 'alice',
      password: 'app-pass',
    });

    const result = await runRemoteSync('webdav');
    expect(result.remoteCreated).toBe(true);
    const put = fetchMock.mock.calls[1];
    expect(put[0]).toBe('https://dav.example.com/stylekit.json');
    expect(put[1]).toEqual(
      expect.objectContaining({
        method: 'PUT',
        credentials: 'omit',
        redirect: 'error',
      })
    );
    expect(put[1].headers.Authorization).toBe('Basic YWxpY2U6YXBwLXBhc3M=');
    expect(put[1].headers['If-None-Match']).toBe('*');
    expect((await getRemoteSyncSettings()).metadata.webdav?.etag).toBe(
      '"created"'
    );
  });

  it('merges newer remote styles into local storage with rollback protection', async () => {
    const remoteStyle = {
      ...localStyle,
      css: 'body { color: green; }',
      modifiedTime: '2026-08-12T11:00:00.000Z',
    };
    const payload = createGoogleDriveSyncPayload(
      { 'example.com': remoteStyle },
      {}
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { etag: '"remote"' },
          })
        )
      )
    );
    await saveRemoteSyncConfig({
      provider: 'webdav',
      url: 'https://dav.example.com/stylekit.json',
      username: '',
      password: '',
    });

    const result = await runRemoteSync('webdav');
    expect(result.localChanged).toBe(true);
    expect(createStylesRollbackSnapshot).toHaveBeenCalledWith('remote-sync');
    expect(setStyleTombstones).toHaveBeenCalledWith({});
    expect(setAll).toHaveBeenCalledWith(
      { 'example.com': remoteStyle },
      { recordTombstones: false }
    );
  });

  it('merges a remote reading item without creating an unrelated style rollback', async () => {
    const updatedAt = '2026-08-12T11:00:00.000Z';
    const url = 'https://example.com/article';
    const payload = createGoogleDriveSyncPayload(
      { 'example.com': localStyle },
      {},
      {
        [url]: {
          url,
          title: 'Offline article',
          byline: '',
          siteName: 'Example',
          excerpt: 'Offline text.',
          content: '<p>Offline text.</p>',
          textContent: 'Offline text.',
          addedAt: updatedAt,
          updatedAt,
        },
      }
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { etag: '"remote"' },
          })
        )
      )
    );
    await saveRemoteSyncConfig({
      provider: 'webdav',
      url: 'https://dav.example.com/stylekit.json',
      username: '',
      password: '',
    });

    const result = await runRemoteSync('webdav');
    expect(result.localChanged).toBe(true);
    expect(createStylesRollbackSnapshot).not.toHaveBeenCalled();
    expect(setAll).not.toHaveBeenCalled();
    const storedReadingList = storageData['stylekit-reading-list'] as {
      readingList: Record<string, { title: string }>;
    };
    expect(storedReadingList.readingList[url].title).toBe('Offline article');
  });

  it('preserves excluded local styles while applying a selected remote style', async () => {
    const privateStyle = {
      ...localStyle,
      css: 'body { color: private; }',
    };
    const remoteStyle = {
      ...localStyle,
      css: 'body { color: green; }',
      modifiedTime: '2026-08-12T11:00:00.000Z',
    };
    vi.mocked(getAll).mockResolvedValue({
      'example.com': localStyle,
      'private.example': privateStyle,
    });
    storageData['stylekit-selective-sync'] = {
      mode: 'selected',
      urls: ['example.com'],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              createGoogleDriveSyncPayload(
                {
                  'example.com': remoteStyle,
                  'remote-private.example': privateStyle,
                },
                {}
              )
            ),
            { status: 200, headers: { etag: '"remote"' } }
          )
        )
      )
    );
    await saveRemoteSyncConfig({
      provider: 'webdav',
      url: 'https://dav.example.com/stylekit.json',
      username: '',
      password: '',
    });

    await runRemoteSync('webdav');
    expect(setAll).toHaveBeenCalledWith(
      {
        'example.com': remoteStyle,
        'private.example': privateStyle,
      },
      { recordTombstones: false }
    );
  });

  it('retries once when an optimistic upload loses an ETag race', async () => {
    const remoteStyle = {
      ...localStyle,
      css: 'body { color: red; }',
      modifiedTime: '2026-08-12T09:00:00.000Z',
    };
    const remotePayload = JSON.stringify(
      createGoogleDriveSyncPayload({ 'example.com': remoteStyle }, {})
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(remotePayload, { status: 200, headers: { etag: '"one"' } })
      )
      .mockResolvedValueOnce(new Response(null, { status: 412 }))
      .mockResolvedValueOnce(
        new Response(remotePayload, { status: 200, headers: { etag: '"two"' } })
      )
      .mockResolvedValueOnce(
        new Response(null, { status: 200, headers: { etag: '"three"' } })
      );
    vi.stubGlobal('fetch', fetchMock);
    await saveRemoteSyncConfig({
      provider: 'webdav',
      url: 'https://dav.example.com/stylekit.json',
      username: '',
      password: '',
    });

    await expect(runRemoteSync('webdav')).resolves.toEqual(
      expect.objectContaining({ provider: 'webdav' })
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][1].headers['If-Match']).toBe('"one"');
    expect(fetchMock.mock.calls[3][1].headers['If-Match']).toBe('"two"');
  });
});
