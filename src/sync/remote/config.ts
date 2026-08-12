import type {
  RemoteSyncConfig,
  S3SyncConfig,
  WebDavSyncConfig,
} from '@stylekit/types';

const MAX_URL_LENGTH = 2048;
const MAX_ID_LENGTH = 256;
const MAX_SECRET_LENGTH = 2048;
const REGION_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

const normalizeText = (
  value: unknown,
  label: string,
  maxLength: number,
  required = true
): string => {
  if (typeof value !== 'string') throw new Error(`${label} is invalid`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength) {
    throw new Error(`${label} exceeds ${maxLength} characters`);
  }
  return normalized;
};

const isLoopback = (hostname: string): boolean =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]';

export const normalizeRemoteSyncUrl = (value: unknown): string => {
  const raw = normalizeText(value, 'Object URL', MAX_URL_LENGTH);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Object URL must be a valid absolute URL');
  }
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && isLoopback(url.hostname))
  ) {
    throw new Error('Object URL must use HTTPS or loopback HTTP');
  }
  if (url.username || url.password || url.hash) {
    throw new Error('Object URL cannot contain credentials or a fragment');
  }
  if (!url.pathname || url.pathname.endsWith('/')) {
    throw new Error('Object URL must identify a file, not a directory');
  }
  return url.toString();
};

const normalizeWebDavConfig = (
  config: Record<string, unknown>
): WebDavSyncConfig => ({
  provider: 'webdav',
  url: normalizeRemoteSyncUrl(config.url),
  username: normalizeText(config.username, 'WebDAV username', MAX_ID_LENGTH, false),
  password: normalizeText(config.password, 'WebDAV password', MAX_SECRET_LENGTH, false),
});

const normalizeS3Config = (config: Record<string, unknown>): S3SyncConfig => {
  const region = normalizeText(config.region, 'S3 region', 63).toLowerCase();
  if (!REGION_PATTERN.test(region)) throw new Error('S3 region is invalid');
  const sessionToken = normalizeText(
    config.sessionToken ?? '',
    'S3 session token',
    MAX_SECRET_LENGTH,
    false
  );
  return {
    provider: 's3',
    url: normalizeRemoteSyncUrl(config.url),
    region,
    accessKeyId: normalizeText(
      config.accessKeyId,
      'S3 access key ID',
      MAX_ID_LENGTH
    ),
    secretAccessKey: normalizeText(
      config.secretAccessKey,
      'S3 secret access key',
      MAX_SECRET_LENGTH
    ),
    ...(sessionToken ? { sessionToken } : {}),
  };
};

export const normalizeRemoteSyncConfig = (
  value: unknown
): RemoteSyncConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Remote sync configuration is invalid');
  }
  const config = value as Record<string, unknown>;
  if (config.provider === 'webdav') return normalizeWebDavConfig(config);
  if (config.provider === 's3') return normalizeS3Config(config);
  throw new Error('Remote sync provider is invalid');
};
