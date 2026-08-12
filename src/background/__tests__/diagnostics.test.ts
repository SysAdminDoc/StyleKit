import type { DiagnosticEvent } from '@stylekit/types';

type StorageData = Record<string, unknown>;

const createChromeMock = (storageData: StorageData) => ({
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
      getBytesInUse: vi.fn(async () => 4096),
    },
  },
  permissions: {
    getAll: vi.fn(async () => ({
      permissions: ['storage', 'tabs'],
      origins: ['https://userstyles.world/*'],
    })),
  },
  runtime: {
    getManifest: vi.fn(() => ({ version: '1.2.3' })),
    getPlatformInfo: vi.fn(async () => ({
      os: 'win',
      arch: 'x86-64',
      nacl_arch: 'x86-64',
    })),
  },
});

describe('diagnostics', () => {
  let storageData: StorageData;

  const importDiagnostics = async () => {
    vi.resetModules();
    storageData = {};
    vi.stubGlobal('chrome', createChromeMock(storageData));
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36',
    });
    return import('../diagnostics');
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redacts URLs, credentials, CSS blocks, emails, and long secrets', async () => {
    const { sanitizeDiagnosticMessage } = await importDiagnostics();
    const message = sanitizeDiagnosticMessage(
      'Failed https://private.example/path Bearer abc123 token=secret ' +
        'body { color: red; } person@example.com abcdefghijklmnopqrstuvwxyz123456'
    );

    expect(message).toContain('[url]');
    expect(message).toContain('Bearer [redacted]');
    expect(message).toContain('token=[redacted]');
    expect(message).toContain('[content redacted]');
    expect(message).toContain('[email]');
    expect(message).not.toContain('private.example');
    expect(message).not.toContain('color: red');
    expect(message).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
  });

  it('stores a bounded ring of sanitized diagnostic events', async () => {
    const { DIAGNOSTICS_STORAGE_KEY, recordDiagnostic } =
      await importDiagnostics();

    for (let index = 0; index < 105; index += 1) {
      await recordDiagnostic({
        category: 'import',
        operation: `JSON import ${index}`,
        error: `Failure ${index} token=secret`,
      });
    }

    const events = storageData[DIAGNOSTICS_STORAGE_KEY] as DiagnosticEvent[];
    expect(events).toHaveLength(100);
    expect(events[0].operation).toBe('json-import-5');
    expect(events.at(-1)?.operation).toBe('json-import-104');
    expect(events.every(event => !event.message.includes('secret'))).toBe(true);
  });

  it('exports metadata and events without storage contents', async () => {
    const { getDiagnosticsBundle, recordDiagnostic } =
      await importDiagnostics();
    await recordDiagnostic({
      category: 'sync',
      operation: 'gist-export',
      error: 'HTTP 500',
    });

    const bundle = await getDiagnosticsBundle();

    expect(bundle).toMatchObject({
      schemaVersion: 1,
      extension: { name: 'StyleKit', version: '1.2.3' },
      browser: { name: 'Chrome/Chromium' },
      permissions: {
        api: ['storage', 'tabs'],
        origins: ['https://userstyles.world/*'],
      },
      storage: { localBytes: 4096 },
    });
    expect(bundle.events).toHaveLength(1);
    expect(JSON.stringify(bundle)).not.toContain('"css"');
    expect(JSON.stringify(bundle)).not.toContain('"token"');
  });
});
