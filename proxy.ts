import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/clinic/portal', '/admin']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: must call getUser() (not getSession()) to validate the JWT
  // server-side. getSession() trusts the client cookie without verification.
  // Wrapped in try/catch so a Supabase outage doesn't crash every page load;
  // the protected layout acts as a safety net.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Auth service unreachable — allow request through; layout will handle redirect
  }

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  // ── Unauthenticated → /auth ────────────────────────────────────────────
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // ── MFA gate ───────────────────────────────────────────────────────────
  // getAuthenticatorAssuranceLevel() reads from the JWT — no extra DB call.
  if (isProtected && user) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/mfa'
      return NextResponse.redirect(url)
    }
  }

  // ── Authenticated user visiting /auth → home (which re-routes them) ────
  if (pathname === '/auth' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
