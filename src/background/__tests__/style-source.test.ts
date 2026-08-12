import type { StyleMap } from '@stylekit/types';

const mocks = vi.hoisted(() => ({
  styles: {} as StyleMap,
  applyStylesToAllTabs: vi.fn(async () => undefined),
  recordDiagnostic: vi.fn(async () => undefined),
}));

vi.mock('../styles', () => ({
  getAll: vi.fn(async () => mocks.styles),
  setAll: vi.fn(async (styles: StyleMap) => {
    mocks.styles = structuredClone(styles);
  }),
  applyStylesToAllTabs: mocks.applyStylesToAllTabs,
}));

vi.mock('../diagnostics', () => ({
  recordDiagnostic: mocks.recordDiagnostic,
}));

import {
  normalizeStyleSourceUrl,
  reloadStyleSource,
  rollbackStyleSource,
  STYLE_SOURCE_STATUS_STORAGE_KEY,
} from '../style-source';

const targetUrl = 'https://example.com/*';
const sourceUrl = 'http://127.0.0.1:4321/style.css';

const makeStyles = (): StyleMap => ({
  [targetUrl]: {
    css: 'body { color: red; }',
    enabled: true,
    readability: false,
    source: {
      url: sourceUrl,
      enabled: true,
      intervalMinutes: 5,
    },
    modifiedTime: '2026-08-12T10:00:00.000-04:00',
  },
});

describe('live style sources', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    mocks.styles = makeStyles();
    mocks.applyStylesToAllTabs.mockClear();
    mocks.recordDiagnostic.mockClear();
    vi.stubGlobal('chrome', {
      extension: {
        isAllowedFileSchemeAccess: vi.fn(async () => true),
      },
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(storageData, items);
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows trusted source schemes and rejects insecure remote URLs', () => {
    expect(normalizeStyleSourceUrl('HTTPS://example.com/a.css#part')).toBe(
      'https://example.com/a.css'
    );
    expect(normalizeStyleSourceUrl('http://localhost:3000/a.css')).toBe(
      'http://localhost:3000/a.css'
    );
    expect(normalizeStyleSourceUrl('file:///C:/styles/a.css')).toBe(
      'file:///C:/styles/a.css'
    );
    expect(() => normalizeStyleSourceUrl('http://example.com/a.css')).toThrow(
      'must use HTTPS'
    );
    expect(() =>
      normalizeStyleSourceUrl('https://user:secret@example.com/a.css')
    ).toThrow('embedded credentials');
    expect(() => normalizeStyleSourceUrl('data:text/css,body{}')).toThrow(
      'must use HTTPS'
    );
  });

  it('snapshots and applies validated source CSS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('body { color: blue; }', {
            status: 200,
            headers: { 'content-type': 'text/css', etag: 'v2' },
          })
      )
    );

    const status = await reloadStyleSource(targetUrl);

    expect(status).toMatchObject({
      state: 'updated',
      rollbackAvailable: true,
    });
    expect(mocks.styles[targetUrl].css).toBe('body { color: blue; }');
    expect(mocks.applyStylesToAllTabs).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      sourceUrl,
      expect.objectContaining({
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      })
    );
    expect(storageData[STYLE_SOURCE_STATUS_STORAGE_KEY]).toMatchObject({
      [targetUrl]: {
        etag: 'v2',
        snapshot: { css: 'body { color: red; }' },
      },
    });
  });

  it('preserves saved CSS and reports fetch validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<html>not css</html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          })
      )
    );

    const status = await reloadStyleSource(targetUrl);

    expect(status.state).toBe('error');
    expect(status.lastError).toContain('content type');
    expect(mocks.styles[targetUrl].css).toBe('body { color: red; }');
    expect(mocks.applyStylesToAllTabs).not.toHaveBeenCalled();
    expect(mocks.recordDiagnostic).toHaveBeenCalledOnce();
  });

  it('rolls back the last overwrite and disables automatic reload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('body { color: blue; }', {
            status: 200,
            headers: { 'content-type': 'text/css' },
          })
      )
    );
    await reloadStyleSource(targetUrl);

    const status = await rollbackStyleSource(targetUrl);

    expect(status).toMatchObject({
      state: 'rolled-back',
      rollbackAvailable: false,
    });
    expect(mocks.styles[targetUrl].css).toBe('body { color: red; }');
    expect(mocks.styles[targetUrl].source?.enabled).toBe(false);
    expect(mocks.applyStylesToAllTabs).toHaveBeenCalledTimes(2);
  });
});
