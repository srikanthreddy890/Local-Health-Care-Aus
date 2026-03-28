import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy (formerly middleware) — runs on every matched request.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session cookie on every request
 *  2. Redirect unauthenticated users away from protected routes
 *  3. Gate Google OAuth users who haven't completed their profile
 *  4. Gate MFA-enrolled users who haven't verified their TOTP code yet
 *
 * The T&C acceptance check is NOT here because it requires a DB lookup
 * (profiles.terms_accepted) — that stays in app/(protected)/layout.tsx.
 */

const PUBLIC_PREFIXES = [
  '/auth',
  '/reset-password',
  '/api',
  '/invite',
  '/terms-and-conditions',
  '/privacy-policy',
  '/blog',
  '/book',
  '/clinics',
  '/local-clinic',
  '/sitemap.xml',
  '/loyalty-program',
]

function isPublicRoute(pathname: string) {
  if (pathname === '/') return true
  // /clinic/[id] is public but /clinic/portal is protected
  if (pathname.startsWith('/clinic/') && !pathname.startsWith('/clinic/portal')) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Always refresh the session so cookies stay fresh
  // IMPORTANT: must call getUser() (not getSession()) to validate the JWT
  // server-side. getSession() trusts the client cookie without verification.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Auth service unreachable — allow request through; layout will handle redirect
  }

  const { pathname } = request.nextUrl

  // Public routes — allow through (session already refreshed above)
  if (isPublicRoute(pathname)) {
    // Authenticated user visiting /auth → redirect home
    if (pathname === '/auth' && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return response
  }

  // ── Gate 1: unauthenticated → /auth ────────────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // ── Gate 2: Google user without completed profile → /auth/complete-profile
  const isGoogleUser = user.app_metadata?.provider === 'google'
  if (isGoogleUser && !user.user_metadata?.profile_completed) {
    if (!pathname.startsWith('/auth/complete-profile')) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/complete-profile'
      return NextResponse.redirect(url)
    }
    return response
  }

  // ── Gate 3: MFA enrolled but not yet verified → /auth/mfa ──────────────
  try {
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (!aalError && aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      if (!pathname.startsWith('/auth/mfa')) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/mfa'
        return NextResponse.redirect(url)
      }
    }
  } catch {
    // If we can't determine MFA status, let the page-level check handle it
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
