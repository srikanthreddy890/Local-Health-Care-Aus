import type { Metadata } from 'next'
import AdminBillingOverview from '../_components/AdminBillingOverview'

export const metadata: Metadata = { title: 'Billing Overview | Admin Portal' }

export default function BillingPage() {
  return <AdminBillingOverview />
}
