import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import ClinicPortalShell from './_components/ClinicPortalShell'
import ClinicRegistration from './_components/ClinicRegistration'
import ClinicOnboarding from './_components/ClinicOnboarding'

export default async function ClinicPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const data = await getClinicPortalData()

  if (!data) redirect('/auth')

  // Role guard: if the user has no clinic (not owner, not staff) check their
  // profile type. Patients with no clinic association must not see the clinic
  // portal — redirect them to / so the home-page router sends them to /dashboard.
  // This avoids blocking patients who ARE active clinic staff (dual-role users).
  if (!data.hasClinic) {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', data.userId)
      .single()

    if (!profile || profile.user_type === 'patient') redirect('/')

    // Clinic-type user with no clinic yet → show registration
    return <ClinicRegistration userId={data.userId} userEmail={data.userEmail} />
  }

  // Guard: onboarding not complete (owners only) → show wizard
  if (!data.onboardingCompleted && !data.staffRole) {
    return <ClinicOnboarding clinicId={data.clinicId!} />
  }

  return (
    <ClinicPortalShell
        clinicId={data.clinicId!}
        clinicName={data.clinicName}
        clinicType={data.clinicType}
        clinicLogoUrl={data.clinicLogoUrl}
        staffRole={data.staffRole}
        userId={data.userId}
        userEmail={data.userEmail}
        isOwner={data.isOwner}
        staffPermissions={data.staffPermissions}
        featureFlags={data.featureFlags}
        centaurEnabled={data.centaurEnabled}
        customApiEnabled={data.customApiEnabled}
        emergencySlotsEnabled={data.emergencySlotsEnabled}
        billingStatus={data.billingStatus}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
            </div>
          }
        >
          {children}
        </Suspense>
      </ClinicPortalShell>
  )
}
