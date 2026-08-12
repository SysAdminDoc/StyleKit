import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createCrx3Buffer,
  createZipBuffer,
  verifyCrx3Buffer,
  verifyZipBuffer,
} from './release-artifacts.mjs';

const withFixture = callback => {
  const directory = mkdtempSync(join(tmpdir(), 'stylekit-release-'));
  try {
    mkdirSync(join(directory, 'nested'));
    writeFileSync(join(directory, 'manifest.json'), '{"manifest_version":3}');
    writeFileSync(join(directory, 'nested', 'asset.txt'), 'StyleKit');
    return callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('release artifact packaging', () => {
  it('creates a deterministic POSIX-path ZIP and verifies every payload', () =>
    withFixture(directory => {
      const first = createZipBuffer(directory);
      const second = createZipBuffer(directory);
      const entries = verifyZipBuffer(first);

      expect(first.equals(second)).toBe(true);
      expect(entries).toEqual([
        { name: 'manifest.json', size: 22 },
        { name: 'nested/asset.txt', size: 8 },
      ]);
      expect(entries.every(entry => !entry.name.includes('\\'))).toBe(true);
    }));

  it('signs and verifies a CRX3 RSA proof and embedded ZIP', () =>
    withFixture(directory => {
      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      const zip = createZipBuffer(directory);
      const crx = createCrx3Buffer(
        zip,
        privateKey.export({ type: 'pkcs8', format: 'pem' })
      );
      const verified = verifyCrx3Buffer(crx);

      expect(crx.subarray(0, 8)).toEqual(
        Buffer.from([0x43, 0x72, 0x32, 0x34, 0x03, 0, 0, 0])
      );
      expect(verified.id).toMatch(/^[0-9a-f]{32}$/);
      expect(verified.zip.equals(zip)).toBe(true);
      expect(verified.entries).toHaveLength(2);
    }));

  it('rejects a CRX whose signed ZIP payload was changed', () =>
    withFixture(directory => {
      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      const crx = createCrx3Buffer(
        createZipBuffer(directory),
        privateKey.export({ type: 'pkcs8', format: 'pem' })
      );
      crx[crx.length - 30] ^= 0xff;

      expect(() => verifyCrx3Buffer(crx)).toThrow(
        'CRX RSA-SHA256 signature is invalid'
      );
    }));
});
