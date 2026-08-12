import type {
  RemoteSyncConfig,
  RemoteSyncMetadata,
  RemoteSyncProvider,
  RemoteSyncResult,
  RemoteSyncSettings,
} from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';
import mergeStyles from '../sync/google-drive/merge-styles';
import {
  createGoogleDriveSyncPayload,
  parseGoogleDriveSyncPayload,
  type StyleSyncState,
} from '../sync/google-drive/sync-payload';
import { signS3Request } from '../sync/remote/aws-signature-v4';
import { normalizeRemoteSyncConfig } from '../sync/remote/config';
import {
  createStylesRollbackSnapshot,
  getAll,
  getStyleTombstones,
  setAll,
  setStyleTombstones,
} from './styles';

const CONFIG_STORAGE_KEY = 'stylekit-remote-sync-configs';
const METADATA_STORAGE_KEY = 'stylekit-remote-sync-metadata';
const MAX_REMOTE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_SYNC_ATTEMPTS = 2;

type RemoteObject = {
  state: StyleSyncState;
  etag?: string;
};

class RemoteChangedError extends Error {}

let syncQueue: Promise<void> = Promise.resolve();

const mutateRemoteSync = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = syncQueue.then(operation);
  syncQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

const readRecord = async (key: string): Promise<Record<string, unknown>> => {
  const stored = await chrome.storage.local.get(key);
  const value = stored[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const readConfigs = async (): Promise<
  Partial<Record<RemoteSyncProvider, RemoteSyncConfig>>
> => {
  const stored = await readRecord(CONFIG_STORAGE_KEY);
  const configs: Partial<Record<RemoteSyncProvider, RemoteSyncConfig>> = {};
  for (const provider of ['webdav', 's3'] as const) {
    if (!stored[provider]) continue;
    try {
      const config = normalizeRemoteSyncConfig(stored[provider]);
      if (config.provider === provider) configs[provider] = config;
    } catch {
      // Ignore stale or malformed local settings instead of exposing secrets.
    }
  }
  return configs;
};

const isMetadata = (
  value: unknown,
  provider: RemoteSyncProvider
): value is RemoteSyncMetadata =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (value as RemoteSyncMetadata).provider === provider &&
      typeof (value as RemoteSyncMetadata).lastSyncedAt === 'string' &&
      ((value as RemoteSyncMetadata).etag === undefined ||
        typeof (value as RemoteSyncMetadata).etag === 'string')
  );

const readMetadata = async (): Promise<
  Partial<Record<RemoteSyncProvider, RemoteSyncMetadata>>
> => {
  const stored = await readRecord(METADATA_STORAGE_KEY);
  const metadata: Partial<Record<RemoteSyncProvider, RemoteSyncMetadata>> = {};
  for (const provider of ['webdav', 's3'] as const) {
    if (isMetadata(stored[provider], provider)) {
      metadata[provider] = stored[provider];
    }
  }
  return metadata;
};

const writeProviderRecord = async <T>(
  key: string,
  provider: RemoteSyncProvider,
  value?: T
): Promise<void> => {
  const record = await readRecord(key);
  if (value === undefined) delete record[provider];
  else record[provider] = value;
  await chrome.storage.local.set({ [key]: record });
};

export const getRemoteSyncSettings = async (): Promise<RemoteSyncSettings> => {
  await syncQueue;
  return {
    configs: await readConfigs(),
    metadata: await readMetadata(),
  };
};

export const saveRemoteSyncConfig = (
  value: unknown
): Promise<RemoteSyncSettings> =>
  mutateRemoteSync(async () => {
    const config = normalizeRemoteSyncConfig(value);
    const previous = (await readConfigs())[config.provider];
    await writeProviderRecord(CONFIG_STORAGE_KEY, config.provider, config);
    if (previous?.url !== config.url) {
      await writeProviderRecord(METADATA_STORAGE_KEY, config.provider);
    }
    return {
      configs: await readConfigs(),
      metadata: await readMetadata(),
    };
  });

export const deleteRemoteSyncConfig = (
  provider: RemoteSyncProvider
): Promise<RemoteSyncSettings> =>
  mutateRemoteSync(async () => {
    if (provider !== 'webdav' && provider !== 's3') {
      throw new Error('Remote sync provider is invalid');
    }
    await writeProviderRecord(CONFIG_STORAGE_KEY, provider);
    await writeProviderRecord(METADATA_STORAGE_KEY, provider);
    return {
      configs: await readConfigs(),
      metadata: await readMetadata(),
    };
  });

const encodeBasicCredentials = (username: string, password: string): string => {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const getRequestHeaders = async (
  config: RemoteSyncConfig,
  method: 'GET' | 'PUT',
  body = ''
): Promise<Record<string, string>> => {
  if (config.provider === 's3') {
    return signS3Request({ method, config, body });
  }
  if (!config.username && !config.password) return {};
  return {
    Authorization: `Basic ${encodeBasicCredentials(
      config.username,
      config.password
    )}`,
  };
};

const fetchRemote = async (
  config: RemoteSyncConfig,
  method: 'GET' | 'PUT',
  body?: string,
  etag?: string | null
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = await getRequestHeaders(config, method, body);
    if (method === 'PUT') {
      headers['Content-Type'] = 'application/json';
      if (etag === null) headers['If-None-Match'] = '*';
      else if (etag) headers['If-Match'] = etag;
    } else {
      headers.Accept = 'application/json';
    }
    return await fetch(config.url, {
      method,
      headers,
      body,
      redirect: 'error',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Remote sync timed out');
    throw new Error(
      `Remote sync request failed: ${
        error instanceof Error ? error.message : 'network error'
      }`
    );
  } finally {
    clearTimeout(timeout);
  }
};

const readRemoteObject = async (
  config: RemoteSyncConfig
): Promise<RemoteObject | null> => {
  const response = await fetchRemote(config, 'GET');
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Remote sync download failed (HTTP ${response.status})`);
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_REMOTE_BYTES) {
    throw new Error('Remote sync file exceeds 10 MB');
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REMOTE_BYTES) {
    throw new Error('Remote sync file exceeds 10 MB');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Remote sync file is not valid JSON');
  }
  return {
    state: parseGoogleDriveSyncPayload(parsed),
    etag: response.headers.get('etag') || undefined,
  };
};

const writeRemoteObject = async (
  config: RemoteSyncConfig,
  state: StyleSyncState,
  etag?: string | null
): Promise<string | undefined> => {
  const body = JSON.stringify(
    createGoogleDriveSyncPayload(state.styles, state.tombstones)
  );
  const response = await fetchRemote(config, 'PUT', body, etag);
  if (response.status === 412) {
    throw new RemoteChangedError('Remote object changed during sync');
  }
  if (!response.ok) {
    throw new Error(`Remote sync upload failed (HTTP ${response.status})`);
  }
  return response.headers.get('etag') || undefined;
};

const getLocalState = async (): Promise<StyleSyncState> => ({
  styles: await getAll(),
  tombstones: await getStyleTombstones(),
});

const statesEqual = (left: StyleSyncState, right: StyleSyncState): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const runSyncAttempt = async (
  config: RemoteSyncConfig,
  metadata?: RemoteSyncMetadata
): Promise<RemoteSyncResult> => {
  const local = await getLocalState();
  const remote = await readRemoteObject(config);
  const syncedAt = getCurrentTimestamp();

  if (!remote) {
    const etag = await writeRemoteObject(config, local, null);
    await writeProviderRecord(METADATA_STORAGE_KEY, config.provider, {
      provider: config.provider,
      lastSyncedAt: syncedAt,
      etag,
    } satisfies RemoteSyncMetadata);
    return {
      provider: config.provider,
      syncedAt,
      remoteCreated: true,
      localChanged: false,
      conflicts: [],
      tombstonesApplied: 0,
    };
  }

  const merged = mergeStyles({
    localStyles: local.styles,
    remoteStyles: remote.state.styles,
    localTombstones: local.tombstones,
    remoteTombstones: remote.state.tombstones,
    lastSyncTime: metadata?.lastSyncedAt,
  });
  const mergedState: StyleSyncState = {
    styles: merged.styles,
    tombstones: merged.tombstones,
  };
  const localChanged = !statesEqual(local, mergedState);
  const remoteChanged = !statesEqual(remote.state, mergedState);
  const etag = remoteChanged
    ? await writeRemoteObject(config, mergedState, remote.etag)
    : remote.etag;

  if (localChanged) {
    await createStylesRollbackSnapshot('remote-sync');
    await setStyleTombstones(mergedState.tombstones);
    await setAll(mergedState.styles, { recordTombstones: false });
  }
  await writeProviderRecord(METADATA_STORAGE_KEY, config.provider, {
    provider: config.provider,
    lastSyncedAt: syncedAt,
    etag,
  } satisfies RemoteSyncMetadata);
  return {
    provider: config.provider,
    syncedAt,
    remoteCreated: false,
    localChanged,
    ...merged.report,
  };
};

export const runRemoteSync = (
  provider: RemoteSyncProvider
): Promise<RemoteSyncResult> =>
  mutateRemoteSync(async () => {
    const config = (await readConfigs())[provider];
    if (!config) throw new Error(`${provider.toUpperCase()} sync is not configured`);
    const metadata = (await readMetadata())[provider];
    for (let attempt = 0; attempt < MAX_SYNC_ATTEMPTS; attempt += 1) {
      try {
        return await runSyncAttempt(config, metadata);
      } catch (error) {
        if (!(error instanceof RemoteChangedError) || attempt > 0) throw error;
      }
    }
    throw new Error('Remote object kept changing during sync');
  });

export const resetRemoteSyncForTests = (): void => {
  syncQueue = Promise.resolve();
};

export const REMOTE_SYNC_STORAGE_KEYS = {
  configs: CONFIG_STORAGE_KEY,
  metadata: METADATA_STORAGE_KEY,
};
