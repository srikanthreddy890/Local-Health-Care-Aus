import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createHmac } from 'crypto'
import type { Database } from '@/integrations/supabase/types'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

/**
 * Server-side conversation key generation using Web Crypto API.
 *
 * Uses the exact same Web Crypto functions as the client-side code
 * (globalThis.crypto.subtle) to guarantee format compatibility.
 * Only HMAC secret derivation uses Node.js crypto (never leaves server).
 */

function deriveUserSecret(serverSecret: string, userId: string): string {
  return createHmac('sha256', serverSecret).update(userId).digest('hex')
}

function toBase64(buf: Uint8Array): string {
  return Buffer.from(buf).toString('base64')
}

/**
 * Wraps a CryptoKey for a specific user using Web Crypto PBKDF2 + AES-GCM.
 * This is the exact same logic as client-side prepareKeyForStorage().
 */
async function wrapKeyForUser(key: CryptoKey, userId: string, userSecret: string): Promise<string> {
  const passphrase = `${userId}:${userSecret}`
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  // Import passphrase as PBKDF2 key material
  const passphraseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Derive wrapping key via PBKDF2
  const wrappingKey = await globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )

  // Wrap the conversation key
  const wrappedKey = await globalThis.crypto.subtle.wrapKey(
    'raw',
    key,
    wrappingKey,
    { name: 'AES-GCM', iv }
  )

  // Prepend IV to wrapped key bytes, then base64-encode
  const wrappedBytes = new Uint8Array(wrappedKey)
  const ivPlusWrapped = new Uint8Array(iv.length + wrappedBytes.length)
  ivPlusWrapped.set(iv, 0)
  ivPlusWrapped.set(wrappedBytes, iv.length)

  return `${toBase64(salt)}:${toBase64(ivPlusWrapped)}`
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { conversationId } = await request.json()
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const serverSecret = process.env.CHAT_KEY_SECRET
    if (!serverSecret) {
      console.error('CHAT_KEY_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    if (!limiter.check(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Fetch the conversation to get both participant IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conv, error: convError } = await (supabase as any)
      .from('chat_conversations')
      .select('patient_id, clinic_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Get clinic owner's auth user ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clinicOwnerId, error: ownerError } = await (supabase as any)
      .rpc('get_clinic_owner_id', { p_clinic_id: conv.clinic_id })

    if (ownerError || !clinicOwnerId) {
      return NextResponse.json({ error: 'Could not resolve clinic owner' }, { status: 500 })
    }

    const patientId: string = conv.patient_id
    const ownerId: string = clinicOwnerId

    // Verify the requesting user is a participant
    if (user.id !== patientId && user.id !== ownerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if keys already exist for both participants (idempotency guard)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingKeys } = await (supabase as any)
      .from('chat_encryption_keys')
      .select('user_id, encrypted_key')
      .eq('conversation_id', conversationId)

    const existingPatientKey = existingKeys?.find((k: { user_id: string }) => k.user_id === patientId)
    const existingClinicKey = existingKeys?.find((k: { user_id: string }) => k.user_id === ownerId)

    if (existingPatientKey && existingClinicKey) {
      // Both keys exist — return current user's existing key (no regeneration)
      const myKey = user.id === patientId ? existingPatientKey : existingClinicKey
      return NextResponse.json({ encryptedKey: myKey.encrypted_key, keyVersion: 2 })
    }

    // Generate a fresh AES-256 conversation key using Web Crypto
    const convKey = await globalThis.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable — needed for wrapKey
      ['encrypt', 'decrypt']
    )

    // Derive each user's secret and wrap the key for them
    const patientSecret = deriveUserSecret(serverSecret, patientId)
    const clinicSecret = deriveUserSecret(serverSecret, ownerId)

    const [patientWrappedKey, clinicWrappedKey] = await Promise.all([
      wrapKeyForUser(convKey, patientId, patientSecret),
      wrapKeyForUser(convKey, ownerId, clinicSecret),
    ])

    // Store both keys atomically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('regenerate_conversation_keys', {
      p_conversation_id: conversationId,
      p_patient_key: patientWrappedKey,
      p_clinic_key: clinicWrappedKey,
    })

    // Return the current user's wrapped key so the client can use it immediately
    const currentUserKey = user.id === patientId ? patientWrappedKey : clinicWrappedKey

    return NextResponse.json({
      encryptedKey: currentUserKey,
      keyVersion: 2,
    })
  } catch (err) {
    console.error('generate-keys error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
