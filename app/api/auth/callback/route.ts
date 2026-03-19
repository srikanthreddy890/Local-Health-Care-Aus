/**
 * OAuth callback handler.
 *
 * Supabase redirects here after Google OAuth. We exchange the `code`
 * query-param for a session, then redirect to the home page which
 * will server-side route the user to their correct portal.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/integrations/supabase/types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Home page will server-side redirect to the correct portal
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — redirect to auth with an error flag
  return NextResponse.redirect(`${origin}/auth?error=oauth_callback_failed`)
}
