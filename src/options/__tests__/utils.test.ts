import { createCssExport, isValidStyleMap } from '../utils';

describe('isValidStyleMap', () => {
  it('accepts valid style maps', () => {
    expect(
      isValidStyleMap({
        'https://example.com': {
          css: 'body { color: red; }',
          enabled: true,
          readability: false,
          modifiedTime: '2026-06-28T10:00:00.000-04:00',
        },
      })
    ).toBe(true);
  });

  it('rejects malformed style maps before import can replace current styles', () => {
    expect(isValidStyleMap(null)).toBe(false);
    expect(isValidStyleMap([])).toBe(false);
    expect(isValidStyleMap({ 'https://example.com': {} })).toBe(false);
    expect(
      isValidStyleMap({
        'https://example.com': {
          css: 1,
          enabled: true,
        },
      })
    ).toBe(false);
    expect(
      isValidStyleMap({
        'https://example.com': {
          css: 'body { color: red; }',
          enabled: 'yes',
        },
      })
    ).toBe(false);
  });
});

describe('CSS export', () => {
  const styles = {
    'https://example.com': {
      css: 'body { color: rgb(255, 0, 0); }',
      enabled: true,
      readability: false,
      modifiedTime: '2026-08-12T10:00:00.000-04:00',
    },
    'https://empty.example': {
      css: '  ',
      enabled: true,
      readability: false,
      modifiedTime: '2026-08-12T10:00:00.000-04:00',
    },
  };

  it('preserves readable CSS by default and skips empty styles', async () => {
    await expect(createCssExport(styles)).resolves.toBe(
      '/* https://example.com */\nbody { color: rgb(255, 0, 0); }'
    );
  });

  it('minifies a generated copy while preserving the site boundary', async () => {
    await expect(createCssExport(styles, true)).resolves.toBe(
      '/* https://example.com */\nbody{color:rgb(255,0,0)}'
    );
    expect(styles['https://example.com'].css).toBe(
      'body { color: rgb(255, 0, 0); }'
    );
  });
});
