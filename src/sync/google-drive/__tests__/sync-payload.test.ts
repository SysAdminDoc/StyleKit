import {
  createGoogleDriveSyncPayload,
  parseGoogleDriveSyncPayload,
} from '../sync-payload';

const timestamp = '2026-06-30T10:00:00.000-04:00';

describe('Google Drive sync payload', () => {
  it('parses legacy raw style maps', () => {
    const parsed = parseGoogleDriveSyncPayload({
      'example.com': {
        css: 'body { color: red; }',
        enabled: true,
        readability: false,
        modifiedTime: timestamp,
      },
    });

    expect(parsed.styles['example.com'].css).toBe('body { color: red; }');
    expect(parsed.tombstones).toEqual({});
  });

  it('round-trips versioned styles and tombstones', () => {
    const payload = createGoogleDriveSyncPayload(
      {
        'example.com': {
          css: 'body { color: red; }',
          enabled: true,
          readability: false,
          modifiedTime: timestamp,
        },
      },
      {
        'deleted.com': {
          deletedTime: timestamp,
        },
      }
    );
    const parsed = parseGoogleDriveSyncPayload(payload);

    expect(parsed.styles['example.com'].enabled).toBe(true);
    expect(parsed.tombstones['deleted.com']).toEqual({
      deletedTime: timestamp,
    });
  });

  it('rejects malformed tombstones', () => {
    expect(() =>
      parseGoogleDriveSyncPayload({
        version: 1,
        styles: {},
        tombstones: {
          'deleted.com': {
            deletedTime: 123,
          },
        },
      })
    ).toThrow('Invalid sync file');
  });
});
