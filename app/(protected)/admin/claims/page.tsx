import type { Metadata } from 'next'
import AdminClaims from '../_components/AdminClaims'

export const metadata: Metadata = { title: 'Claims | Admin Portal' }

export default function ClaimsPage() {
  return <AdminClaims />
}
