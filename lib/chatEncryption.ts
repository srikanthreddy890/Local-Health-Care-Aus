// AES-256-GCM end-to-end encryption for chat messages.
// Uses the Web Crypto API (available in browsers and Node.js 18+).
// Never call any function here without first checking isCryptoAvailable().

// Legacy secret kept only for migrating old key_version=1 keys
const LEGACY_APP_KEY_SECRET = 'dental-health-portal-v1'

function toBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(buf)))
}

function fromBase64(str: string): Uint8Array<ArrayBuffer> {
  const binary = atob(str)
  const buf = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i)
  }
  return view
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

// Fetches the server-derived per-user secret for key wrapping.
// Cache is invalidated automatically when the auth user changes.
let cachedSecret: { userId: string; secret: string } | null = null
let cachedSecretPromise: Promise<string> | null = null
let cachedSecretForUserId: string | null = null

export async function fetchDerivedSecret(currentUserId?: string): Promise<string> {
  // Auto-invalidate if the user changed
  if (currentUserId && cachedSecret && cachedSecret.userId !== currentUserId) {
    cachedSecret = null
    cachedSecretPromise = null
  }

  if (cachedSecret) return cachedSecret.secret
  if (cachedSecretPromise && cachedSecretForUserId === currentUserId) return cachedSecretPromise

  cachedSecretForUserId = currentUserId ?? null
  cachedSecretPromise = fetch('/api/chat/derive-secret')
    .then(async (res) => {
      if (!res.ok) throw new Error('Failed to derive secret')
      const data = await res.json()
      cachedSecret = { userId: currentUserId ?? data.userId ?? 'unknown', secret: data.secret }
      cachedSecretPromise = null
      cachedSecretForUserId = null
      return data.secret as string
    })
    .catch((err) => {
      cachedSecretPromise = null
      cachedSecretForUserId = null
      throw err
    })

  return cachedSecretPromise
}

// Clear the cached secret (must be called on logout/login)
export function clearDerivedSecretCache(): void {
  cachedSecret = null
  cachedSecretPromise = null
  cachedSecretForUserId = null
}

async function deriveWrappingKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const passphraseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  )
}

// Derives a wrapping key from server-provided secret using PBKDF2 + AES-GCM-wrap.
// Output format: "base64(salt):base64(iv + wrappedKeyBytes)"
export async function prepareKeyForStorage(
  key: CryptoKey,
  userId: string,
  userSecret?: string
): Promise<string> {
  const secret = userSecret ?? await fetchDerivedSecret()
  const passphrase = `${userId}:${secret}`
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  const wrappingKey = await deriveWrappingKey(passphrase, salt, ['wrapKey', 'unwrapKey'])

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

// Recovers the CryptoKey from storage using the server-derived secret.
export async function retrieveKeyFromStorage(
  storedData: string,
  userId: string,
  userSecret?: string
): Promise<CryptoKey> {
  const secret = userSecret ?? await fetchDerivedSecret()
  return unwrapKeyWithPassphrase(storedData, `${userId}:${secret}`)
}

// Recovers the CryptoKey using the legacy hardcoded secret (for migration only).
export async function retrieveKeyFromStorageLegacy(
  storedData: string,
  userId: string
): Promise<CryptoKey> {
  return unwrapKeyWithPassphrase(storedData, `${userId}:${LEGACY_APP_KEY_SECRET}`)
}

// Legacy prepare function for re-wrapping during migration
export async function prepareKeyForStorageLegacy(
  key: CryptoKey,
  userId: string
): Promise<string> {
  const passphrase = `${userId}:${LEGACY_APP_KEY_SECRET}`
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  const wrappingKey = await deriveWrappingKey(passphrase, salt, ['wrapKey', 'unwrapKey'])

  const wrappedKey = await globalThis.crypto.subtle.wrapKey(
    'raw',
    key,
    wrappingKey,
    { name: 'AES-GCM', iv }
  )

  const wrappedBytes = new Uint8Array(wrappedKey)
  const ivPlusWrapped = new Uint8Array(iv.length + wrappedBytes.length)
  ivPlusWrapped.set(iv, 0)
  ivPlusWrapped.set(wrappedBytes, iv.length)

  return `${toBase64(salt)}:${toBase64(ivPlusWrapped)}`
}

async function unwrapKeyWithPassphrase(
  storedData: string,
  passphrase: string
): Promise<CryptoKey> {
  const colonIdx = storedData.indexOf(':')
  const saltB64 = storedData.slice(0, colonIdx)
  const ivPlusWrappedB64 = storedData.slice(colonIdx + 1)

  const salt = fromBase64(saltB64)
  const ivPlusWrapped = fromBase64(ivPlusWrappedB64)

  // First 12 bytes = IV, remainder = wrapped key
  const iv = ivPlusWrapped.slice(0, 12)
  const wrappedBytes = ivPlusWrapped.slice(12)

  const wrappingKey = await deriveWrappingKey(passphrase, salt, ['wrapKey', 'unwrapKey'])

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
