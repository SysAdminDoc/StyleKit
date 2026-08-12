import type {
  ReadingListItemMap,
  ReadingListTombstoneMap,
} from '@stylekit/types';
import type { ReadingListSyncState } from '../background/reading-list';

const latest = (left?: string, right?: string): string | undefined => {
  if (!left) return right;
  if (!right) return left;
  return left >= right ? left : right;
};

export const mergeReadingLists = (
  local: ReadingListSyncState,
  remote: ReadingListSyncState
): ReadingListSyncState => {
  const readingList: ReadingListItemMap = {};
  const readingListTombstones: ReadingListTombstoneMap = {};
  const urls = new Set([
    ...Object.keys(local.readingList),
    ...Object.keys(remote.readingList),
    ...Object.keys(local.readingListTombstones),
    ...Object.keys(remote.readingListTombstones),
  ]);

  for (const url of urls) {
    const localItem = local.readingList[url];
    const remoteItem = remote.readingList[url];
    const item =
      !localItem || (remoteItem && remoteItem.updatedAt > localItem.updatedAt)
        ? remoteItem
        : localItem;
    const deletedTime = latest(
      local.readingListTombstones[url]?.deletedTime,
      remote.readingListTombstones[url]?.deletedTime
    );
    if (deletedTime && (!item || deletedTime >= item.updatedAt)) {
      readingListTombstones[url] = { deletedTime };
    } else if (item) {
      readingList[url] = item;
    }
  }

  return { readingList, readingListTombstones };
};
