import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicContext } from '@/lib/clinic/getClinicContext'
import ClinicPrescriptionsTab from '../_components/ClinicPrescriptionsTab'

export const metadata: Metadata = { title: 'Prescriptions | Clinic Portal' }

export default async function PrescriptionsPage() {
  const ctx = await getClinicContext()
  if (!ctx) redirect('/auth')

  return <ClinicPrescriptionsTab clinicId={ctx.clinicId!} userId={ctx.userId} />
}
