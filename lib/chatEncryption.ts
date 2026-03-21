// AES-256-GCM end-to-end encryption for chat messages.
// Uses the Web Crypto API (available in browsers and Node.js 18+).
// Never call any function here without first checking isCryptoAvailable().

const APP_KEY_SECRET = 'dental-health-portal-v1'

function toBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(buf)))
}

function fromBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

export function isCryptoAvailable(): boolean {
  return typeof globalThis !== 'undefined' && !!globalThis.crypto?.subtle
}

export async function generateConversationKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(
  key: CryptoKey,
  plaintext: string
): Promise<{ encrypted: string; iv: string }> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  return {
    encrypted: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
  }
}

export async function decryptMessage(
  key: CryptoKey,
  encrypted: string,
  iv: string
): Promise<string> {
  const ciphertext = fromBase64(encrypted)
  const ivBytes = fromBase64(iv)
  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}

// Derives a wrapping key from userId using PBKDF2 + AES-GCM-wrap.
// Output format: "base64(salt):base64(iv + wrappedKeyBytes)"
export async function prepareKeyForStorage(
  key: CryptoKey,
  userId: string
): Promise<string> {
  const passphrase = `${userId}:${APP_KEY_SECRET}`
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  const passphraseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const wrappingKey = await globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )

  const wrappedKey = await globalThis.crypto.subtle.wrapKey(
    'raw',
    key,
    wrappingKey,
    { name: 'AES-GCM', iv }
  )

  // Prepend the 12-byte IV to the wrapped key bytes, then base64-encode together
  const wrappedBytes = new Uint8Array(wrappedKey)
  const ivPlusWrapped = new Uint8Array(iv.length + wrappedBytes.length)
  ivPlusWrapped.set(iv, 0)
  ivPlusWrapped.set(wrappedBytes, iv.length)

  return `${toBase64(salt)}:${toBase64(ivPlusWrapped)}`
}

// Recovers the CryptoKey from storage using the userId-derived passphrase.
export async function retrieveKeyFromStorage(
  storedData: string,
  userId: string
): Promise<CryptoKey> {
  const colonIdx = storedData.indexOf(':')
  const saltB64 = storedData.slice(0, colonIdx)
  const ivPlusWrappedB64 = storedData.slice(colonIdx + 1)

  const salt = fromBase64(saltB64)
  const ivPlusWrapped = fromBase64(ivPlusWrappedB64)

  // First 12 bytes = IV, remainder = wrapped key
  const iv = ivPlusWrapped.slice(0, 12)
  const wrappedBytes = ivPlusWrapped.slice(12)

  const passphrase = `${userId}:${APP_KEY_SECRET}`
  const passphraseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const wrappingKey = await globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )

  return globalThis.crypto.subtle.unwrapKey(
    'raw',
    wrappedBytes,
    wrappingKey,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}
