import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicContext } from '@/lib/clinic/getClinicContext'
import ClinicBillingView from '../_components/ClinicBillingView'

export const metadata: Metadata = { title: 'Billing | Clinic Portal' }

export default async function BillingPage() {
  const ctx = await getClinicContext()
  if (!ctx) redirect('/auth')

  return <ClinicBillingView clinicId={ctx.clinicId!} />
}
