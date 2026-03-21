import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clinic Portal' }

export default function ClinicPortalPage() {
  redirect('/clinic/portal/dashboard')
}
