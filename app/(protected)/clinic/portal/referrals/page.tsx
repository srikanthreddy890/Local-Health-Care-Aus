import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import ClinicReferralsTab from '../_components/ClinicReferralsTab'

export const metadata: Metadata = { title: 'Referrals | Clinic Portal' }

export default async function ReferralsPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.featureFlags.showReferrals) redirect('/clinic/portal/dashboard')

  return <ClinicReferralsTab clinicId={data.clinicId!} />
}
