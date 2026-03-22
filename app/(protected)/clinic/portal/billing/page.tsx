import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import ClinicBillingView from '../_components/ClinicBillingView'

export const metadata: Metadata = { title: 'Billing | Clinic Portal' }

export default async function BillingPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.isOwner && !data.staffPermissions?.can_manage_billing) redirect('/clinic/portal/dashboard')

  return <ClinicBillingView clinicId={data.clinicId!} />
}
