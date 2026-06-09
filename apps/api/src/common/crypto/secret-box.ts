import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Small AES-256-GCM helper for secrets at rest (currently the Anthropic API key
 * stored in AppSetting). The master key comes from the SETTINGS_ENC_KEY env var;
 * any string is accepted and hashed to a 32-byte key so operators can use a
 * passphrase. Ciphertext is encoded as `iv:tag:ciphertext` in base64.
 *
 * Worker has an identical copy (apps/worker/src/secret-box.ts) — keep them in
 * sync; both processes must decrypt the same value.
 */
const ALGORITHM = 'aes-256-gcm';

function masterKey(): Buffer {
  const secret = process.env.SETTINGS_ENC_KEY;
  if (!secret) {
    throw new Error('SETTINGS_ENC_KEY is not set — cannot encrypt/decrypt secrets.');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.SETTINGS_ENC_KEY);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted secret.');
  }
  const decipher = createDecipheriv(ALGORITHM, masterKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Best-effort masked hint for display, e.g. "sk-ant-…7Xb2". Never reveals the full key. */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 8) return '…';
  return `${plaintext.slice(0, 6)}…${plaintext.slice(-4)}`;
}
