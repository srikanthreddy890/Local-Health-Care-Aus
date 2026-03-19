/**
 * Admin Panel — protected route.
 *
 * Server Component shell: verifies admin role via the `user_roles` table
 * before rendering. Non-admins are bounced back to the home page.
 *
 * Port `src/components/AdminPanel.tsx` from the original project.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Panel' }

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Authorisation: admin role is source of truth
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (userRole?.role !== 'admin') redirect('/')

  /**
   * TODO: import your ported AdminPanel Client Component here.
   *
   * Example:
   *   import AdminPanel from '@/components/AdminPanel'
   *   return <AdminPanel />
   *
   * Key changes required in AdminPanel.tsx:
   *  - Add 'use client' at the top
   *  - Replace useNavigate → useRouter from 'next/navigation'
   *  - Replace the singleton `supabase` import with createClient() from '@/lib/supabase/client'
   *  - Remove the `onBack` prop (use router.push('/') instead)
   */
  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center">
      <p className="text-lhc-text-muted">
        Admin Panel — import your AdminPanel component here.
      </p>
    </div>
  )
}
