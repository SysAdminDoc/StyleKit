import mergeStyles from '../merge-styles';

const syncedAt = '2026-06-30T10:00:00.000-04:00';
const localEditedAt = '2026-06-30T10:10:00.000-04:00';
const remoteEditedAt = '2026-06-30T10:20:00.000-04:00';
const deletedAt = '2026-06-30T10:30:00.000-04:00';

describe('mergeStyles', () => {
  it('keeps local deletions as tombstones instead of resurrecting remote styles', () => {
    const merged = mergeStyles({
      localStyles: {},
      remoteStyles: {
        'example.com': {
          css: 'body { color: red; }',
          enabled: true,
          readability: false,
          modifiedTime: remoteEditedAt,
        },
      },
      localTombstones: {
        'example.com': {
          deletedTime: deletedAt,
        },
      },
      remoteTombstones: {},
      lastSyncTime: syncedAt,
    });

    expect(merged.styles['example.com']).toBeUndefined();
    expect(merged.tombstones['example.com']).toEqual({
      deletedTime: deletedAt,
    });
    expect(merged.report.tombstonesApplied).toBe(1);
  });

  it('lets newer style edits override older tombstones', () => {
    const merged = mergeStyles({
      localStyles: {
        'example.com': {
          css: 'body { color: green; }',
          enabled: true,
          readability: false,
          modifiedTime: deletedAt,
        },
      },
      remoteStyles: {},
      localTombstones: {},
      remoteTombstones: {
        'example.com': {
          deletedTime: remoteEditedAt,
        },
      },
      lastSyncTime: syncedAt,
    });

    expect(merged.styles['example.com'].css).toBe('body { color: green; }');
    expect(merged.tombstones['example.com']).toBeUndefined();
  });

  it('reports simultaneous edits with local and remote modified times', () => {
    const merged = mergeStyles({
      localStyles: {
        'example.com': {
          css: 'body { color: red; }',
          enabled: true,
          readability: false,
          modifiedTime: localEditedAt,
        },
      },
      remoteStyles: {
        'example.com': {
          css: 'body { color: blue; }',
          enabled: true,
          readability: false,
          modifiedTime: remoteEditedAt,
        },
      },
      lastSyncTime: syncedAt,
    });

    expect(merged.styles['example.com'].css).toBe('body { color: blue; }');
    expect(merged.report.conflicts).toEqual([
      {
        url: 'example.com',
        localModifiedTime: localEditedAt,
        remoteModifiedTime: remoteEditedAt,
        resolvedWith: 'remote',
      },
    ]);
  });
});
