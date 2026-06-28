import { isValidStyleMap } from '../utils';

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
