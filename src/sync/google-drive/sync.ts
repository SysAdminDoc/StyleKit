import { compareAsc } from 'date-fns';

import {
  GoogleDriveSyncMetadata,
  GoogleDriveSyncReport,
} from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';

import mergeStyles from './merge-styles';
import getAccessToken from './get-access-token';
import { SyncError } from './retry';
import {
  getGoogleDriveSyncMetadata,
  getLocalStylesMetadata,
  setGoogleDriveSyncMetadata,
} from './sync-metadata';
import {
  getSyncFileMetadata,
  downloadSyncFile,
  writeSyncFile,
} from './sync-file';
import {
  createGoogleDriveSyncPayload,
  StyleSyncState,
} from './sync-payload';
import {
  setAll as setAllStyles,
  getAll as getAllStyles,
  getStyleTombstones,
  setStyleTombstones,
  createStylesRollbackSnapshot,
} from '../../background/styles';

const EMPTY_REPORT: GoogleDriveSyncReport = {
  conflicts: [],
  tombstonesApplied: 0,
};

const getLocalSyncState = async (): Promise<StyleSyncState> => ({
  styles: await getAllStyles(),
  tombstones: await getStyleTombstones(),
});

const getStylesBlob = ({ styles, tombstones }: StyleSyncState) =>
  new Blob([JSON.stringify(createGoogleDriveSyncPayload(styles, tombstones))], {
    type: 'application/json',
  });

/**
 * Copy local styles to remote and update sync metadata
 */
const writeToRemote = async (
  accessToken: string,
  syncMetadata: GoogleDriveSyncMetadata,
  state: StyleSyncState
) => {
  const blob = getStylesBlob(state);
  const updatedSyncMetadata = await writeSyncFile(
    accessToken,
    blob,
    syncMetadata.id
  );

  return setGoogleDriveSyncMetadata(updatedSyncMetadata);
};

/**
 * Copy remote styles to local and update sync metadata
 */
const writeToLocal = async (
  syncMetadata: GoogleDriveSyncMetadata,
  state: StyleSyncState
) => {
  await createStylesRollbackSnapshot('google-drive-sync');
  await setStyleTombstones(state.tombstones);
  await setAllStyles(state.styles, { recordTombstones: false });

  return setGoogleDriveSyncMetadata({
    ...syncMetadata,
    modifiedTime: getCurrentTimestamp(),
  });
};

/**
 * Merge and update both local and remote styles
 */
const merge = async (
  accessToken: string,
  syncMetadata: GoogleDriveSyncMetadata,
  lastSyncTime?: string
): Promise<GoogleDriveSyncReport> => {
  const localState = await getLocalSyncState();
  const remoteState = await downloadSyncFile(accessToken, syncMetadata.id);
  const merged = mergeStyles({
    localStyles: localState.styles,
    remoteStyles: remoteState.styles,
    localTombstones: localState.tombstones,
    remoteTombstones: remoteState.tombstones,
    lastSyncTime,
  });
  const mergedState = {
    styles: merged.styles,
    tombstones: merged.tombstones,
  };

  await writeToLocal(syncMetadata, mergedState);
  await writeToRemote(accessToken, syncMetadata, mergedState);

  return merged.report;
};

/**
 * Run sync on Google Drive. Performs the following checks in order:
 * 1) If no backup is found on drive, write local styles to remote
 * 2) If no local sync metadata is found, merge and update both local and remote styles
 * 3) If the remote sync timestamp > local sync timestamp,
 *    - If local styles' modified timestamp > remote sync timestamp, merge and update both local and remote styles
 *    - Else, write remote styles to local
 * 4) If local styles' modified timestamp > remote sync timestamp, write local styles to remote.
 */
const runSync = async (accessToken: string): Promise<GoogleDriveSyncReport> => {
  const localState = await getLocalSyncState();
  const remoteSyncMetadata = await getSyncFileMetadata(accessToken);

  console.debug('syncing with google drive...');

  if (!remoteSyncMetadata) {
    console.debug('did not find remote sync file, updating remote...');

    const blob = getStylesBlob(localState);
    const newSyncMetadata = await writeSyncFile(accessToken, blob);
    await setGoogleDriveSyncMetadata(newSyncMetadata);
    return EMPTY_REPORT;
  }

  const localSyncMetadata = await getGoogleDriveSyncMetadata();

  if (!localSyncMetadata) {
    console.debug('no local sync metadata found. merging local and remote...');
    return merge(accessToken, remoteSyncMetadata);
  }

  const localStylesMetadata = await getLocalStylesMetadata();

  const localSyncTime = new Date(localSyncMetadata.modifiedTime);
  const remoteSyncTime = new Date(remoteSyncMetadata.modifiedTime);
  const localStylesModifiedTime = new Date(localStylesMetadata.modifiedTime);

  console.debug('sync info', {
    localSyncTime,
    remoteSyncTime,
    localStylesModifiedTime,
  });

  // check if the remote is newer v/s local
  if (compareAsc(remoteSyncTime, localSyncTime) > 0) {
    // check if local styles were modified v/s remote
    if (compareAsc(localStylesModifiedTime, remoteSyncTime) > 0) {
      console.debug(
        'both local and remote were updated since last sync, merging local and remote...'
      );

      return merge(
        accessToken,
        remoteSyncMetadata,
        localSyncMetadata.modifiedTime
      );
    }

    console.debug('remote was updated since last sync, updating local...');
    const remoteState = await downloadSyncFile(
      accessToken,
      remoteSyncMetadata.id
    );

    await writeToLocal(remoteSyncMetadata, remoteState);
    return EMPTY_REPORT;
  }

  // check if local styles were modified v/s remote
  if (compareAsc(localStylesModifiedTime, remoteSyncTime) > 0) {
    console.debug('local was updated since last sync, updating remote...');
    await writeToRemote(accessToken, remoteSyncMetadata, localState);
    return EMPTY_REPORT;
  }

  await setGoogleDriveSyncMetadata({
    ...remoteSyncMetadata,
    modifiedTime: getCurrentTimestamp(),
  });
  return EMPTY_REPORT;
};

/**
 * Run sync with automatic token refresh on 401 errors.
 * Gets a fresh access token and retries once if auth fails.
 */
export const runGoogleDriveSync = async (): Promise<GoogleDriveSyncReport> => {
  let accessToken = await getAccessToken();

  try {
    return await runSync(accessToken);
  } catch (error) {
    if (error instanceof SyncError && error.statusCode === 401) {
      console.debug('Access token expired, re-authenticating...');
      accessToken = await getAccessToken();
      return await runSync(accessToken);
    } else {
      throw error;
    }
  }
};
