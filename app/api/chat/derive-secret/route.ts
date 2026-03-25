import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'
import { createHmac } from 'crypto'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

/**
 * Derives a per-user wrapping secret for chat E2E encryption.
 * The server-only CHAT_KEY_SECRET never leaves the server.
 * Returns HMAC-SHA256(CHAT_KEY_SECRET, userId) as a hex string.
 *
 * Requires: CHAT_KEY_SECRET environment variable to be set.
 */
export async function GET(): Promise<NextResponse> {
  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!limiter.check(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const serverSecret = process.env.CHAT_KEY_SECRET
    if (!serverSecret) {
      console.error('CHAT_KEY_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const derivedSecret = createHmac('sha256', serverSecret)
      .update(user.id)
      .digest('hex')

    return NextResponse.json({ secret: derivedSecret })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
