import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import QuoteRequestsTab from '../_components/QuoteRequestsTab'

export const metadata: Metadata = { title: 'Quotes | Clinic Portal' }

export default async function QuotesPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.featureFlags.showQuotes) redirect('/clinic/portal/dashboard')

  return <QuoteRequestsTab clinicId={data.clinicId!} />
}
