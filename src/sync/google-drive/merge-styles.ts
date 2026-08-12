import { compareAsc } from 'date-fns';
import {
  GoogleDriveSyncReport,
  StyleMap,
  StyleSyncConflict,
  StyleSyncTombstoneMap,
  StyleWithoutUrl,
  Timestamp,
} from '@stylekit/types';

export type MergeStylesInput = {
  localStyles: StyleMap;
  remoteStyles: StyleMap;
  localTombstones?: StyleSyncTombstoneMap;
  remoteTombstones?: StyleSyncTombstoneMap;
  lastSyncTime?: Timestamp;
};

export type MergeStylesResult = {
  styles: StyleMap;
  tombstones: StyleSyncTombstoneMap;
  report: GoogleDriveSyncReport;
};

type MergeEvent = {
  source: 'local' | 'remote';
  kind: 'style' | 'tombstone';
  time: Timestamp;
};

const compareModifiedTime = (t1: string, t2: string) =>
  compareAsc(new Date(t1), new Date(t2));

const normalizeStyle = (style: StyleWithoutUrl): StyleWithoutUrl => ({
  css: style.css,
  enabled: style.enabled,
  readability: style.readability ?? false,
  shadowRoots: style.shadowRoots ?? false,
  source: style.source,
  modifiedTime: style.modifiedTime,
});

const styleChanged = (
  local: StyleWithoutUrl,
  remote: StyleWithoutUrl
): boolean =>
  JSON.stringify(normalizeStyle(local)) !==
  JSON.stringify(normalizeStyle(remote));

const eventRank = (event: MergeEvent): number =>
  event.kind === 'tombstone' ? 2 : 1;

const newestEvent = (events: MergeEvent[]): MergeEvent =>
  events.reduce((newest, event) => {
    const compared = compareModifiedTime(event.time, newest.time);
    if (compared > 0) return event;
    if (compared === 0 && eventRank(event) > eventRank(newest)) return event;
    return newest;
  });

const changedAfterLastSync = (
  time: Timestamp,
  lastSyncTime?: Timestamp
): boolean =>
  Boolean(lastSyncTime && compareModifiedTime(time, lastSyncTime) > 0);

const getConflict = (
  url: string,
  local: StyleWithoutUrl | undefined,
  remote: StyleWithoutUrl | undefined,
  selected: MergeEvent,
  lastSyncTime?: Timestamp
): StyleSyncConflict | null => {
  if (!local || !remote || !styleChanged(local, remote)) return null;
  if (
    !changedAfterLastSync(local.modifiedTime, lastSyncTime) ||
    !changedAfterLastSync(remote.modifiedTime, lastSyncTime)
  ) {
    return null;
  }

  return {
    url,
    localModifiedTime: local.modifiedTime,
    remoteModifiedTime: remote.modifiedTime,
    resolvedWith: selected.source,
  };
};

export default ({
  localStyles,
  remoteStyles,
  localTombstones = {},
  remoteTombstones = {},
  lastSyncTime,
}: MergeStylesInput): MergeStylesResult => {
  const styles: StyleMap = {};
  const tombstones: StyleSyncTombstoneMap = {};
  const conflicts: StyleSyncConflict[] = [];
  let tombstonesApplied = 0;

  const urls = new Set([
    ...Object.keys(localStyles),
    ...Object.keys(remoteStyles),
    ...Object.keys(localTombstones),
    ...Object.keys(remoteTombstones),
  ]);

  urls.forEach(url => {
    const events: MergeEvent[] = [];
    const local = localStyles[url];
    const remote = remoteStyles[url];
    const localTombstone = localTombstones[url];
    const remoteTombstone = remoteTombstones[url];

    if (local) {
      events.push({
        source: 'local',
        kind: 'style',
        time: local.modifiedTime,
      });
    }

    if (remote) {
      events.push({
        source: 'remote',
        kind: 'style',
        time: remote.modifiedTime,
      });
    }

    if (localTombstone) {
      events.push({
        source: 'local',
        kind: 'tombstone',
        time: localTombstone.deletedTime,
      });
    }

    if (remoteTombstone) {
      events.push({
        source: 'remote',
        kind: 'tombstone',
        time: remoteTombstone.deletedTime,
      });
    }

    if (events.length === 0) return;

    const selected = newestEvent(events);
    const conflict = getConflict(url, local, remote, selected, lastSyncTime);

    if (conflict) {
      conflicts.push(conflict);
    }

    if (selected.kind === 'tombstone') {
      tombstones[url] = { deletedTime: selected.time };
      if (local || remote) {
        tombstonesApplied += 1;
      }
      return;
    }

    const selectedStyle =
      selected.source === 'local' ? localStyles[url] : remoteStyles[url];

    if (selectedStyle) {
      styles[url] = selectedStyle;
    }
  });

  return {
    styles,
    tombstones,
    report: {
      conflicts,
      tombstonesApplied,
    },
  };
};
