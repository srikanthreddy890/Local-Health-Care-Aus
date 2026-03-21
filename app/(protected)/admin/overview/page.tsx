import type { Metadata } from 'next'
import AdminOverview from '../_components/AdminOverview'

export const metadata: Metadata = { title: 'Overview | Admin Portal' }

export default function OverviewPage() {
  return <AdminOverview />
}
