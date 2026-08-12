import { signS3Request } from '../aws-signature-v4';

describe('AWS Signature Version 4', () => {
  it('matches the official S3 GET lifecycle example', async () => {
    const headers = await signS3Request({
      method: 'GET',
      config: {
        provider: 's3',
        url: 'https://examplebucket.s3.amazonaws.com/?lifecycle',
        region: 'us-east-1',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
      date: new Date('2013-05-24T00:00:00.000Z'),
    });

    expect(headers.Authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/' +
        '20130524/us-east-1/s3/aws4_request,' +
        'SignedHeaders=host;x-amz-content-sha256;x-amz-date,' +
        'Signature=fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543'
    );
  });

  it('signs temporary credentials and the complete PUT payload', async () => {
    const headers = await signS3Request({
      method: 'PUT',
      config: {
        provider: 's3',
        url: 'https://s3.example.test/bucket/stylekit.json',
        region: 'us-test-1',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        sessionToken: 'temporary-token',
      },
      body: '{"styles":{}}',
      date: new Date('2026-08-12T12:00:00.000Z'),
    });

    expect(headers.Authorization).toContain(
      'SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token'
    );
    expect(headers['x-amz-content-sha256']).toMatch(/^[a-f0-9]{64}$/);
    expect(headers['x-amz-security-token']).toBe('temporary-token');
  });
});
