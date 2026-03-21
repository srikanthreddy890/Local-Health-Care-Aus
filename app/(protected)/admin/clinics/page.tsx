import type { Metadata } from 'next'
import AdminClinics from '../_components/AdminClinics'

export const metadata: Metadata = { title: 'Clinics | Admin Portal' }

export default function ClinicsPage() {
  return <AdminClinics />
}
