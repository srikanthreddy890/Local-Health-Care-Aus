import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import ClinicSecurityTab from '../_components/ClinicSecurityTab'

export const metadata: Metadata = { title: 'Security | Clinic Portal' }

export default async function SecurityPage() {
  const ctx = await getClinicPortalData()
  if (!ctx) redirect('/auth')
  if (!ctx.clinicId) redirect('/clinic/portal')

  return (
    <ClinicSecurityTab
      userId={ctx.userId}
      userEmail={ctx.userEmail}
      clinicId={ctx.clinicId}
      clinicName={ctx.clinicName}
    />
  )
}
