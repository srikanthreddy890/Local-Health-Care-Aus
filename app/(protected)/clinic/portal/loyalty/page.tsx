import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import LoyaltyView from '../_components/LoyaltyView'

export const metadata: Metadata = { title: 'Loyalty | Clinic Portal' }

export default async function LoyaltyPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.featureFlags.showLoyaltyPoints) redirect('/clinic/portal/dashboard')
  if (!data.staffPermissions?.can_manage_loyalty) redirect('/clinic/portal/dashboard')

  return <LoyaltyView clinicId={data.clinicId!} />
}
