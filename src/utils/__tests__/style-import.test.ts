import {
  assertValidImportCss,
  createImportPreview,
  createSingleStyleImport,
  getImportDiffText,
  isSafeCssContentType,
  parseStyleImportPayload,
} from '../style-import';

const timestamp = '2026-06-30T12:00:00.000-04:00';

describe('style import schema', () => {
  it('parses versioned StyleKit backups', () => {
    const parsed = parseStyleImportPayload({
      version: 1,
      app: 'StyleKit',
      exportedAt: timestamp,
      styles: {
        'example.com': {
          css: 'body { color: red; }',
          enabled: true,
          readability: false,
          modifiedTime: timestamp,
        },
      },
    });

    expect(parsed.styles['example.com'].css).toBe('body { color: red; }');
    expect(parsed.version).toBe(1);
  });

  it('parses legacy raw style maps', () => {
    const parsed = parseStyleImportPayload({
      styles: {
        css: 'body { color: red; }',
        enabled: true,
        readability: false,
        modifiedTime: timestamp,
      },
    });

    expect(parsed.styles.styles.css).toBe('body { color: red; }');
  });

  it('rejects unknown versions and malformed style maps', () => {
    expect(() =>
      parseStyleImportPayload({
        version: 2,
        styles: {},
      })
    ).toThrow('Unsupported StyleKit import version');

    expect(() =>
      parseStyleImportPayload({
        version: 1,
        styles: {
          'example.com': {
            css: 1,
            enabled: true,
          },
        },
      })
    ).toThrow('Invalid format');
  });

  it('rejects unsafe CSS import content types', () => {
    expect(isSafeCssContentType('text/css; charset=utf-8')).toBe(true);
    expect(isSafeCssContentType('text/plain')).toBe(true);
    expect(isSafeCssContentType(null)).toBe(true);
    expect(isSafeCssContentType('text/html; charset=utf-8')).toBe(false);
    expect(isSafeCssContentType('application/json')).toBe(false);
  });

  it('validates CSS before building a single-style import', () => {
    const parsed = createSingleStyleImport(
      'example.com',
      'body { color: red; }',
      timestamp
    );

    expect(parsed.styles['example.com'].enabled).toBe(true);
    expect(() => assertValidImportCss('')).toThrow('CSS is empty');
  });

  it('computes add change remove previews', () => {
    const current = {
      'existing.com': {
        css: 'body { color: red; }',
        enabled: true,
        readability: false,
        modifiedTime: timestamp,
      },
      'removed.com': {
        css: 'body { color: blue; }',
        enabled: true,
        readability: false,
        modifiedTime: timestamp,
      },
    };
    const incoming = {
      'existing.com': {
        css: 'body { color: green; }',
        enabled: true,
        readability: false,
        modifiedTime: timestamp,
      },
      'added.com': {
        css: 'body { color: purple; }',
        enabled: true,
        readability: false,
        modifiedTime: timestamp,
      },
    };

    const preview = createImportPreview(current, incoming, 'replace');

    expect(preview.diff).toMatchObject({
      added: 1,
      changed: 1,
      removed: 1,
      unchanged: 0,
      total: 2,
    });
    expect(getImportDiffText(preview.diff)).toBe(
      '1 added, 1 changed, 1 removed'
    );
  });
});
