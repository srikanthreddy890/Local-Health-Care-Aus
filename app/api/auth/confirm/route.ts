/**
 * Email confirmation handler.
 *
 * Supabase may redirect here for email confirmations (signup, email
 * change, password recovery) using the token_hash + type flow.
 * We verify the OTP and redirect to the appropriate page.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/integrations/supabase/types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as
    | 'email_change'
    | 'signup'
    | 'recovery'
    | 'email'
    | null
  const next = searchParams.get('next') ?? '/'

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/auth?error=missing_token`)
  }

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

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=verification_failed`)
  }

  // Route to the right page based on confirmation type
  switch (type) {
    case 'email_change':
      return NextResponse.redirect(`${origin}/dashboard?tab=profile&email_changed=true`)
    case 'recovery':
      return NextResponse.redirect(`${origin}/reset-password`)
    default:
      return NextResponse.redirect(`${origin}${next}`)
  }
}
