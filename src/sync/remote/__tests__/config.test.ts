import {
  normalizeRemoteSyncConfig,
  normalizeRemoteSyncUrl,
} from '../config';

describe('remote sync configuration', () => {
  it('accepts HTTPS and loopback object URLs', () => {
    expect(
      normalizeRemoteSyncUrl('https://dav.example.com/backups/stylekit.json')
    ).toBe('https://dav.example.com/backups/stylekit.json');
    expect(normalizeRemoteSyncUrl('http://127.0.0.1:9000/stylekit.json')).toBe(
      'http://127.0.0.1:9000/stylekit.json'
    );
  });

  it('rejects insecure remote, credential-bearing, and directory URLs', () => {
    expect(() =>
      normalizeRemoteSyncUrl('http://dav.example.com/stylekit.json')
    ).toThrow('HTTPS');
    expect(() =>
      normalizeRemoteSyncUrl('https://user:secret@example.com/stylekit.json')
    ).toThrow('credentials');
    expect(() => normalizeRemoteSyncUrl('https://example.com/backups/')).toThrow(
      'file'
    );
  });

  it('normalizes provider fields and rejects malformed regions', () => {
    expect(
      normalizeRemoteSyncConfig({
        provider: 's3',
        url: 'https://bucket.s3.example.com/stylekit.json',
        region: 'US-EAST-1',
        accessKeyId: ' key ',
        secretAccessKey: ' secret ',
      })
    ).toEqual({
      provider: 's3',
      url: 'https://bucket.s3.example.com/stylekit.json',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });
    expect(() =>
      normalizeRemoteSyncConfig({
        provider: 's3',
        url: 'https://bucket.s3.example.com/stylekit.json',
        region: '../bad',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      })
    ).toThrow('region');
  });
});
