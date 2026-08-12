import { StyleMap, StyleSyncTombstoneMap, Timestamp } from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';
import { isValidStyleMap } from '../../utils/style-import';

export type GoogleDriveStyleSyncPayload = {
  version: 2;
  app: 'StyleKit';
  exportedAt: Timestamp;
  styles: StyleMap;
  tombstones: StyleSyncTombstoneMap;
};

export type StyleSyncState = {
  styles: StyleMap;
  tombstones: StyleSyncTombstoneMap;
};

const PAYLOAD_VERSION = 2;

export const isValidTombstoneMap = (
  data: unknown
): data is StyleSyncTombstoneMap => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  for (const [url, tombstone] of Object.entries(
    data as Record<string, unknown>
  )) {
    if (!url.trim()) return false;
    if (
      !tombstone ||
      typeof tombstone !== 'object' ||
      Array.isArray(tombstone)
    ) {
      return false;
    }

    const deletedTime = (tombstone as Record<string, unknown>).deletedTime;
    if (typeof deletedTime !== 'string' || !deletedTime.trim()) return false;
  }

  return true;
};

export const createGoogleDriveSyncPayload = (
  styles: StyleMap,
  tombstones: StyleSyncTombstoneMap
): GoogleDriveStyleSyncPayload => {
  if (!isValidStyleMap(styles)) {
    throw new Error('Invalid StyleKit styles object');
  }

  if (!isValidTombstoneMap(tombstones)) {
    throw new Error('Invalid StyleKit tombstones object');
  }

  return {
    version: PAYLOAD_VERSION,
    app: 'StyleKit',
    exportedAt: getCurrentTimestamp(),
    styles,
    tombstones,
  };
};

export const parseGoogleDriveSyncPayload = (data: unknown): StyleSyncState => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid sync file: expected a StyleKit backup object');
  }

  const record = data as Record<string, unknown>;

  if (!('version' in record)) {
    if (!isValidStyleMap(record)) {
      throw new Error('Invalid legacy sync file: expected StyleKit styles');
    }

    return {
      styles: record,
      tombstones: {},
    };
  }

  if (record.version !== 1 && record.version !== PAYLOAD_VERSION) {
    throw new Error(`Unsupported StyleKit sync version: ${record.version}`);
  }

  if (!isValidStyleMap(record.styles)) {
    throw new Error('Invalid sync file: expected StyleKit styles');
  }

  const tombstones = record.tombstones || {};
  if (!isValidTombstoneMap(tombstones)) {
    throw new Error('Invalid sync file: expected StyleKit tombstones');
  }

  return {
    styles: record.styles,
    tombstones,
  };
};
