/**
 * Clinic Portal — protected route.
 *
 * Server Component: resolves whether the authenticated user is a
 * clinic owner or a staff member, then passes the resolved IDs to
 * the ClinicProfile Client Component.
 */
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import ClinicProfile from './_components/ClinicProfile'

export const metadata: Metadata = { title: 'Clinic Portal' }

export default async function ClinicPortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Resolve clinic ID: staff membership takes priority over owner lookup
  let clinicId: string | null = null
  let staffRole: string | null = null

  const { data: staffMembership } = await supabase
    .from('clinic_users')
    .select('clinic_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (staffMembership) {
    clinicId = staffMembership.clinic_id
    staffRole = staffMembership.role
  } else {
    // Clinic owner: look up their clinic by user_id
    const { data: clinic } = await supabase
      .from('clinics_public')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    clinicId = clinic?.id ?? null
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-lhc-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
        </div>
      }
    >
      <ClinicProfile
        clinicId={clinicId}
        staffRole={staffRole}
        userId={user.id}
        userEmail={user.email ?? ''}
      />
    </Suspense>
  )
}
