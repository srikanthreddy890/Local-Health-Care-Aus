import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import PharmacyPrescriptionsTab from '../../_components/PharmacyPrescriptionsTab'

export const metadata: Metadata = { title: 'Rx Inbox | Clinic Portal' }

export default async function IncomingPrescriptionsPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.featureFlags.showIncomingPrescriptions) redirect('/clinic/portal/dashboard')
  if (!data.staffPermissions?.can_manage_prescriptions) redirect('/clinic/portal/dashboard')

  return <PharmacyPrescriptionsTab clinicId={data.clinicId!} />
}
