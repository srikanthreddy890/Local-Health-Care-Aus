import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import DoctorManagement from '../_components/DoctorManagement'

export const metadata: Metadata = { title: 'Doctors | Clinic Portal' }

export default async function DoctorsPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.staffPermissions?.can_manage_doctors) redirect('/clinic/portal/dashboard')

  return <DoctorManagement clinicId={data.clinicId} />
}
