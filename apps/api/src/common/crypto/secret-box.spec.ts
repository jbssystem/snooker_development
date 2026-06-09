import { decryptSecret, encryptSecret, isEncryptionConfigured, maskSecret } from './secret-box';

describe('secret-box', () => {
  const original = process.env.SETTINGS_ENC_KEY;
  beforeAll(() => {
    process.env.SETTINGS_ENC_KEY = 'test-master-secret';
  });
  afterAll(() => {
    if (original === undefined) delete process.env.SETTINGS_ENC_KEY;
    else process.env.SETTINGS_ENC_KEY = original;
  });

  it('round-trips a secret', () => {
    const secret = 'sk-ant-api03-abcDEF1234567890';
    const encoded = encryptSecret(secret);
    expect(encoded).not.toContain(secret);
    expect(decryptSecret(encoded)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('fails to decrypt a tampered payload', () => {
    const encoded = encryptSecret('secret');
    const [iv, tag, data] = encoded.split(':');
    const tampered = [iv, tag, Buffer.from('different').toString('base64')].join(':');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('reports whether encryption is configured', () => {
    expect(isEncryptionConfigured()).toBe(true);
    delete process.env.SETTINGS_ENC_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    process.env.SETTINGS_ENC_KEY = 'test-master-secret';
  });

  it('masks a secret without revealing the middle', () => {
    expect(maskSecret('sk-ant-api03-7Xb2')).toBe('sk-ant…7Xb2');
    expect(maskSecret('short')).toBe('…');
  });
});
