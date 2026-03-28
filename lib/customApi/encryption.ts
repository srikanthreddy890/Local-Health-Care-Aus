/**
 * AES-256-GCM encryption for API keys and secrets stored in the database.
 *
 * Requires env var: API_KEY_ENCRYPTION_SECRET (min 32 chars).
 * Format: base64(iv:ciphertext:authTag)
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const SALT = 'lhc-api-key-enc-v1' // static salt — key uniqueness comes from the secret

// Fail-fast: validate encryption secret at startup (server-side only)
if (typeof process !== 'undefined' && process.env) {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET
  if (secret !== undefined && secret.length < 32) {
    throw new Error(
      'API_KEY_ENCRYPTION_SECRET is set but too short (minimum 32 characters). Fix or remove it.'
    )
  }
}

function getDerivedKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be set and at least 32 characters')
  }
  return scryptSync(secret, SALT, 32)
}

/** Encrypt a plaintext string → base64-encoded ciphertext. */
export function encryptApiKey(plaintext: string): string {
  const key = getDerivedKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // iv + ciphertext + tag → single base64 blob
  const combined = Buffer.concat([iv, encrypted, tag])
  return combined.toString('base64')
}

/** Decrypt a base64-encoded ciphertext → plaintext string. Returns null on failure. */
export function decryptApiKey(ciphertext: string): string | null {
  try {
    const key = getDerivedKey()
    const combined = Buffer.from(ciphertext, 'base64')

    const iv = combined.subarray(0, IV_LENGTH)
    const tag = combined.subarray(combined.length - TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}

/**
 * Returns true if the value looks like our encrypted format (base64, correct min length).
 * Used to avoid double-encrypting already-encrypted values.
 */
export function isEncryptedValue(value: string): boolean {
  if (!value || value === '[ENCRYPTED]') return false
  try {
    const buf = Buffer.from(value, 'base64')
    // Minimum: IV (12) + 1 byte ciphertext + tag (16) = 29
    return buf.length >= IV_LENGTH + 1 + TAG_LENGTH && value === buf.toString('base64')
  } catch {
    return false
  }
}
