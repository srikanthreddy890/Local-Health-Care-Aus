/**
 * Protected layout — server-side defence-in-depth.
 *
 * Middleware already handles:
 *   • unauthenticated access  → redirect /auth
 *   • MFA gate (AAL)          → redirect /auth/mfa
 *
 * This layout adds the one gate middleware cannot cheaply enforce
 * (requires a DB lookup): the Terms & Conditions acceptance check.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already redirects unauthenticated users; this is a safety net.
  if (!user) redirect('/auth')

  // Admin users bypass the T&C gate.
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (userRole?.role !== 'admin') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('terms_accepted')
      .eq('id', user.id)
      .single()

    if (!profile?.terms_accepted) redirect('/auth/terms')
  }

  return <>{children}</>
}
