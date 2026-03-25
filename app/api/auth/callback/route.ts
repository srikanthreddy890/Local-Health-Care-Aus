/**
 * Auth callback handler.
 *
 * Supabase redirects here after Google OAuth and email change
 * confirmations. We exchange the `code` query-param for a session,
 * then redirect to the `next` URL (defaults to home page which
 * will server-side route the user to their correct portal).
 *
 * Also handles the legacy `token_hash` + `type` flow that Supabase
 * may use for email change confirmations.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/integrations/supabase/types'

function createSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient<Database>(
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
}

/** Prevent open redirect via double-slash or non-relative paths. */
function sanitizeNext(next: string): string {
  if (!next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = sanitizeNext(searchParams.get('next') ?? '/')

  const cookieStore = await cookies()

  // PKCE flow — used by OAuth and newer Supabase email confirmations
  if (code) {
    const supabase = createSupabaseClient(cookieStore)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Legacy flow — token_hash + type (used by some email change confirmations)
  if (tokenHash && type) {
    const supabase = createSupabaseClient(cookieStore)
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email_change' | 'signup' | 'recovery' | 'email',
    })

    if (!error) {
      // For email changes, redirect to the profile/security page with success flag
      if (type === 'email_change') {
        return NextResponse.redirect(`${origin}/dashboard?tab=profile&email_changed=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — redirect to auth with an error flag
  return NextResponse.redirect(`${origin}/auth?error=oauth_callback_failed`)
}
