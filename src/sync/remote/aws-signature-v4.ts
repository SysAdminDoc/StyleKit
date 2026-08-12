import type { S3SyncConfig } from '@stylekit/types';

type SignS3RequestInput = {
  method: 'GET' | 'PUT';
  config: S3SyncConfig;
  body?: string;
  date?: Date;
};

const encoder = new TextEncoder();

const toHex = (value: ArrayBuffer): string =>
  Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');

const sha256 = async (value: string): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

const hmac = async (
  key: BufferSource,
  value: string
): Promise<ArrayBuffer> => {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value));
};

const awsEncode = (value: string): string =>
  Array.from(encoder.encode(value), byte => {
    const character = String.fromCharCode(byte);
    return /[A-Za-z0-9_.~-]/.test(character)
      ? character
      : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }).join('');

const compareCodeUnits = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const canonicalPath = (url: URL): string =>
  url.pathname
    .split('/')
    .map(segment => {
      try {
        return awsEncode(decodeURIComponent(segment));
      } catch {
        return awsEncode(segment);
      }
    })
    .join('/') || '/';

const canonicalQuery = (url: URL): string =>
  Array.from(url.searchParams.entries())
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? compareCodeUnits(leftValue, rightValue)
        : compareCodeUnits(leftKey, rightKey)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

const amzTimestamp = (date: Date): string =>
  date.toISOString().replace(/[:-]|\.\d{3}/g, '');

export const signS3Request = async ({
  method,
  config,
  body = '',
  date = new Date(),
}: SignS3RequestInput): Promise<Record<string, string>> => {
  const url = new URL(config.url);
  const timestamp = amzTimestamp(date);
  const dateStamp = timestamp.slice(0, 8);
  const payloadHash = await sha256(body);
  const canonicalHeaders: Array<[string, string]> = [
    ['host', url.host],
    ['x-amz-content-sha256', payloadHash],
    ['x-amz-date', timestamp],
  ];
  if (config.sessionToken) {
    canonicalHeaders.push(['x-amz-security-token', config.sessionToken]);
  }
  canonicalHeaders.sort(([left], [right]) => compareCodeUnits(left, right));
  const signedHeaders = canonicalHeaders.map(([name]) => name).join(';');
  const canonicalRequest = [
    method,
    canonicalPath(url),
    canonicalQuery(url),
    canonicalHeaders.map(([name, value]) => `${name}:${value.trim()}\n`).join(''),
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    scope,
    await sha256(canonicalRequest),
  ].join('\n');
  const dateKey = await hmac(
    encoder.encode(`AWS4${config.secretAccessKey}`),
    dateStamp
  );
  const regionKey = await hmac(dateKey, config.region);
  const serviceKey = await hmac(regionKey, 's3');
  const signingKey = await hmac(serviceKey, 'aws4_request');
  const signature = toHex(await hmac(signingKey, stringToSign));

  return {
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope},` +
      `SignedHeaders=${signedHeaders},Signature=${signature}`,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': timestamp,
    ...(config.sessionToken
      ? { 'x-amz-security-token': config.sessionToken }
      : {}),
  };
};
