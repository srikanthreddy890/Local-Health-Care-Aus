import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import AppointmentsView from '../_components/AppointmentsView'

export const metadata: Metadata = { title: 'Appointments | Clinic Portal' }

export default async function AppointmentsPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.staffPermissions?.can_manage_appointments) redirect('/clinic/portal/dashboard')

  return <AppointmentsView clinicId={data.clinicId} userId={data.userId} />
}
