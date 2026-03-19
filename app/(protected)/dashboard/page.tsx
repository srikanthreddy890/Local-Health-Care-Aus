/**
 * Patient Dashboard — protected Server Component.
 * Fetches full profile server-side and passes to PatientDashboard client shell.
 */
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import PatientDashboard from './_components/PatientDashboard'

export const metadata: Metadata = { title: 'Patient Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch eligible clinics for the "New Chat" modal server-side.
  // Eligible = clinics the patient has booked with in the past 2 years,
  // that are active + chat-enabled, and don't already have an active conversation.
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookingsData } = await (supabase as any)
    .from('bookings')
    .select('clinic_id')
    .eq('patient_id', user.id)
    .gte('created_at', twoYearsAgo.toISOString())

  let eligibleClinics: Array<{ id: string; name: string; logo_url: string | null }> = []

  if (bookingsData && bookingsData.length > 0) {
    const allClinicIds = [
      ...new Set(bookingsData.map((b: { clinic_id: string }) => b.clinic_id)),
    ] as string[]

    // Exclude clinics that already have an active (non-archived) conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activeConvs } = await (supabase as any)
      .from('chat_conversations')
      .select('clinic_id')
      .eq('patient_id', user.id)
      .not('is_archived_by_patient', 'is', true)

    const existingClinicIds = new Set(
      ((activeConvs ?? []) as Array<{ clinic_id: string }>).map((c) => c.clinic_id)
    )
    const newClinicIds = allClinicIds.filter((id) => !existingClinicIds.has(id))

    if (newClinicIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clinicsData } = await (supabase as any)
        .from('clinics')
        .select('id, name, logo_url')
        .in('id', newClinicIds)
        .eq('is_active', true)
        .eq('chat_enabled', true)

      eligibleClinics = clinicsData ?? []
    }
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-lhc-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
        </div>
      }
    >
      <PatientDashboard
        userId={user.id}
        userEmail={user.email ?? ''}
        initialProfile={profile}
        eligibleClinics={eligibleClinics}
      />
    </Suspense>
  )
}
