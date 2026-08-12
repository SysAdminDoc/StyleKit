import {
  combineSelectiveSyncState,
  filterSelectiveSyncState,
  normalizeSelectiveSyncConfig,
} from '../selective-sync';

const style = (css: string, modifiedTime: string) => ({
  css,
  enabled: true,
  readability: false,
  modifiedTime,
});

describe('selective sync state', () => {
  it('normalizes and bounds an explicit style selection', () => {
    expect(
      normalizeSelectiveSyncConfig({
        mode: 'selected',
        urls: [' b.example ', 'a.example', 'a.example'],
      })
    ).toEqual({ mode: 'selected', urls: ['a.example', 'b.example'] });
    expect(() =>
      normalizeSelectiveSyncConfig({ mode: 'folders', urls: [] })
    ).toThrow('mode');
  });

  it('filters styles and tombstones to selected keys', () => {
    const state = {
      styles: {
        'keep.example': style('a{}', '2026-08-12T10:00:00.000Z'),
        'private.example': style('b{}', '2026-08-12T10:00:00.000Z'),
      },
      tombstones: {
        'deleted.example': { deletedTime: '2026-08-12T11:00:00.000Z' },
      },
      readingList: {},
      readingListTombstones: {},
    };
    expect(
      filterSelectiveSyncState(state, {
        mode: 'selected',
        urls: ['keep.example', 'deleted.example'],
      })
    ).toEqual({
      styles: { 'keep.example': state.styles['keep.example'] },
      tombstones: { 'deleted.example': state.tombstones['deleted.example'] },
      readingList: {},
      readingListTombstones: {},
    });
  });

  it('recombines synced keys without overwriting excluded local styles', () => {
    const local = {
      styles: {
        'shared.example': style('old{}', '2026-08-12T10:00:00.000Z'),
        'private.example': style('private{}', '2026-08-12T10:00:00.000Z'),
      },
      tombstones: {},
      readingList: {},
      readingListTombstones: {},
    };
    const synced = {
      styles: {
        'shared.example': style('new{}', '2026-08-12T11:00:00.000Z'),
        'unexpected.example': style('remote{}', '2026-08-12T11:00:00.000Z'),
      },
      tombstones: {},
      readingList: {},
      readingListTombstones: {},
    };
    const combined = combineSelectiveSyncState(local, synced, {
      mode: 'selected',
      urls: ['shared.example'],
    });

    expect(combined.styles['shared.example'].css).toBe('new{}');
    expect(combined.styles['private.example'].css).toBe('private{}');
    expect(combined.styles['unexpected.example']).toBeUndefined();
  });
});
