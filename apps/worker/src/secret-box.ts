import { createDecipheriv, createHash } from 'node:crypto';

/**
 * Decrypt-only copy of the API's AES-256-GCM secret helper
 * (apps/api/src/common/crypto/secret-box.ts) — the worker only needs to read
 * the stored Anthropic API key. Keep the algorithm and encoding in sync with
 * the API; both processes share the SETTINGS_ENC_KEY master secret.
 */
const ALGORITHM = 'aes-256-gcm';

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.SETTINGS_ENC_KEY);
}

export function decryptSecret(encoded: string): string {
  const secret = process.env.SETTINGS_ENC_KEY;
  if (!secret) throw new Error('SETTINGS_ENC_KEY is not set — cannot decrypt secrets.');
  const key = createHash('sha256').update(secret, 'utf8').digest();
  const [ivB64, tagB64, dataB64] = encoded.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted secret.');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
