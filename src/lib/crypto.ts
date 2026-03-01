import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { nanoid } from 'nanoid';

// ── Token encryption ─────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  if (hex.length !== 64) throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plain text token using AES-256-GCM.
 * Returns a base64-encoded string: iv(12) + authTag(16) + ciphertext.
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt a token previously encrypted with encryptToken.
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const bytes = Buffer.from(ciphertext, 'base64');
  const iv = bytes.subarray(0, 12);
  const authTag = bytes.subarray(12, 28);
  const encrypted = bytes.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ── PKCE helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a PKCE code verifier (random 64-char string, URL-safe).
 */
export function generateCodeVerifier(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Derive the PKCE code challenge (S256 method) from a verifier.
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate a random OAuth state parameter for CSRF protection.
 */
export function generateOAuthState(): string {
  return nanoid(32);
}
