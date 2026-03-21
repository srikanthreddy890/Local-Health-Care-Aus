import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import AdminPortalShell from './_components/AdminPortalShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <AdminPortalShell userId={user.id} userEmail={user.email ?? ''}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
          </div>
        }
      >
        {children}
      </Suspense>
    </AdminPortalShell>
  )
}
