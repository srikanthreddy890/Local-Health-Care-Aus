import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'
import { createRateLimiter } from '@/lib/rateLimit'

/**
 * Server-side sign-in endpoint with dual rate limiting:
 *   - Per IP:    5 failed attempts → 15-minute lockout
 *   - Per email: 5 failed attempts → 15-minute lockout
 *
 * This prevents brute-force attacks that bypass client-side lockouts.
 */

const LOCKOUT_WINDOW = 15 * 60_000 // 15 minutes
const MAX_FAILURES = 5

const ipLimiter = createRateLimiter({ maxRequests: MAX_FAILURES, windowMs: LOCKOUT_WINDOW })
const emailLimiter = createRateLimiter({ maxRequests: MAX_FAILURES, windowMs: LOCKOUT_WINDOW })

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string
      password?: string
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const ip = getClientIp(req)

    // Check both IP and email rate limits BEFORE attempting auth
    const ipAllowed = ipLimiter.check(`auth:ip:${ip}`)
    const emailAllowed = emailLimiter.check(`auth:email:${normalizedEmail}`)

    if (!ipAllowed || !emailAllowed) {
      return NextResponse.json(
        {
          error: 'Too many failed attempts. Please try again in 15 minutes.',
          retryAfter: 900,
        },
        { status: 429 }
      )
    }

    // Create Supabase server client with cookie forwarding
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      // Auth failed — the rate limiter already counted this attempt above.
      // Return the Supabase error message so the client can display it.
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // Success — check MFA requirement
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalError) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Unable to verify security status. Please try again.' },
        { status: 500 }
      )
    }

    const requiresMfa =
      aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2'

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      },
      requiresMfa,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
