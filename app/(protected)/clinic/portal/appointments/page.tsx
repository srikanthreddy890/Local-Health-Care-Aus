import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicContext } from '@/lib/clinic/getClinicContext'
import AppointmentsView from '../_components/AppointmentsView'

export const metadata: Metadata = { title: 'Appointments | Clinic Portal' }

export default async function AppointmentsPage() {
  const ctx = await getClinicContext()
  if (!ctx) redirect('/auth')

  return <AppointmentsView clinicId={ctx.clinicId} userId={ctx.userId} />
}
