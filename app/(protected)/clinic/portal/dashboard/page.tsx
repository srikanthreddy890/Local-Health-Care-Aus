import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicContext } from '@/lib/clinic/getClinicContext'
import ClinicDashboard from '../_components/ClinicDashboard'

export const metadata: Metadata = { title: 'Dashboard | Clinic Portal' }

export default async function DashboardPage() {
  const ctx = await getClinicContext()
  if (!ctx) redirect('/auth')

  return <ClinicDashboard clinicId={ctx.clinicId!} userId={ctx.userId} />
}
