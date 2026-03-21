import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicContext } from '@/lib/clinic/getClinicContext'
import StaffManagement from '../_components/StaffManagement'

export const metadata: Metadata = { title: 'Staff | Clinic Portal' }

export default async function StaffPage() {
  const ctx = await getClinicContext()
  if (!ctx) redirect('/auth')
  if (!ctx.clinicId) redirect('/clinic/portal')

  return <StaffManagement clinicId={ctx.clinicId} userId={ctx.userId} />
}
