import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicContext } from '@/lib/clinic/getClinicContext'
import DoctorManagement from '../_components/DoctorManagement'

export const metadata: Metadata = { title: 'Doctors | Clinic Portal' }

export default async function DoctorsPage() {
  const ctx = await getClinicContext()
  if (!ctx) redirect('/auth')

  return <DoctorManagement clinicId={ctx.clinicId} />
}
