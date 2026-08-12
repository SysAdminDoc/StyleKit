import type { SelectiveSyncConfig } from '@stylekit/types';
import type { StyleSyncState } from './google-drive/sync-payload';

const MAX_SELECTED_STYLES = 5000;
const MAX_STYLE_KEY_LENGTH = 2048;

export const DEFAULT_SELECTIVE_SYNC_CONFIG: SelectiveSyncConfig = {
  mode: 'all',
  urls: [],
};

export const normalizeSelectiveSyncConfig = (
  value: unknown
): SelectiveSyncConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Selective sync configuration is invalid');
  }
  const record = value as Record<string, unknown>;
  if (record.mode !== 'all' && record.mode !== 'selected') {
    throw new Error('Selective sync mode is invalid');
  }
  if (!Array.isArray(record.urls) || record.urls.length > MAX_SELECTED_STYLES) {
    throw new Error('Selective sync style list is invalid');
  }
  const urls = Array.from(
    new Set(
      record.urls.map(value => {
        if (typeof value !== 'string') {
          throw new Error('Selective sync style key is invalid');
        }
        const normalized = value.trim();
        if (!normalized || normalized.length > MAX_STYLE_KEY_LENGTH) {
          throw new Error('Selective sync style key is invalid');
        }
        return normalized;
      })
    )
  ).sort();
  return { mode: record.mode, urls };
};

export const filterSelectiveSyncState = (
  state: StyleSyncState,
  config: SelectiveSyncConfig
): StyleSyncState => {
  if (config.mode === 'all') {
    return {
      styles: { ...state.styles },
      tombstones: { ...state.tombstones },
    };
  }
  const selected = new Set(config.urls);
  return {
    styles: Object.fromEntries(
      Object.entries(state.styles).filter(([url]) => selected.has(url))
    ),
    tombstones: Object.fromEntries(
      Object.entries(state.tombstones).filter(([url]) => selected.has(url))
    ),
  };
};

export const combineSelectiveSyncState = (
  local: StyleSyncState,
  synced: StyleSyncState,
  config: SelectiveSyncConfig
): StyleSyncState => {
  if (config.mode === 'all') return filterSelectiveSyncState(synced, config);
  const selected = new Set(config.urls);
  const filteredSynced = filterSelectiveSyncState(synced, config);
  const styles = { ...local.styles };
  const tombstones = { ...local.tombstones };

  selected.forEach(url => {
    delete styles[url];
    delete tombstones[url];
    if (filteredSynced.styles[url]) styles[url] = filteredSynced.styles[url];
    if (filteredSynced.tombstones[url]) {
      tombstones[url] = filteredSynced.tombstones[url];
    }
  });
  return { styles, tombstones };
};
