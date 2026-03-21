import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
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

  // Guard: no clinic yet → show registration
  if (!data.hasClinic) {
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
      staffRole={data.staffRole}
      userId={data.userId}
      userEmail={data.userEmail}
      isOwner={data.isOwner}
      featureFlags={data.featureFlags}
      centaurEnabled={data.centaurEnabled}
      emergencySlotsEnabled={data.emergencySlotsEnabled}
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
