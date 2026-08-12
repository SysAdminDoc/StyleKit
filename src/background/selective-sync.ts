import type { SelectiveSyncConfig } from '@stylekit/types';
import {
  DEFAULT_SELECTIVE_SYNC_CONFIG,
  normalizeSelectiveSyncConfig,
} from '../sync/selective-sync';

const STORAGE_KEY = 'stylekit-selective-sync';
const SYNC_METADATA_KEYS = [
  'google-drive-sync',
  'stylekit-remote-sync-metadata',
];

let mutationQueue: Promise<void> = Promise.resolve();

export const getSelectiveSyncConfig = async (): Promise<
  SelectiveSyncConfig
> => {
  await mutationQueue;
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY]) return { ...DEFAULT_SELECTIVE_SYNC_CONFIG };
  try {
    return normalizeSelectiveSyncConfig(stored[STORAGE_KEY]);
  } catch {
    return { ...DEFAULT_SELECTIVE_SYNC_CONFIG };
  }
};

export const setSelectiveSyncConfig = (
  value: unknown
): Promise<SelectiveSyncConfig> => {
  const result = mutationQueue.then(async () => {
    const config = normalizeSelectiveSyncConfig(value);
    await chrome.storage.local.set({ [STORAGE_KEY]: config });
    await chrome.storage.local.remove(SYNC_METADATA_KEYS);
    return config;
  });
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

export const resetSelectiveSyncForTests = (): void => {
  mutationQueue = Promise.resolve();
};

export const SELECTIVE_SYNC_STORAGE_KEY = STORAGE_KEY;
