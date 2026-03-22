import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import ClinicPrescriptionsTab from '../_components/ClinicPrescriptionsTab'

export const metadata: Metadata = { title: 'Prescriptions | Clinic Portal' }

export default async function PrescriptionsPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.staffPermissions?.can_manage_prescriptions) redirect('/clinic/portal/dashboard')

  return <ClinicPrescriptionsTab clinicId={data.clinicId!} userId={data.userId} />
}
