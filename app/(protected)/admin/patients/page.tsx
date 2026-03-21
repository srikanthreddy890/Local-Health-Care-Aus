import type { Metadata } from 'next'
import AdminPatients from '../_components/AdminPatients'

export const metadata: Metadata = { title: 'Patients | Admin Portal' }

export default function PatientsPage() {
  return <AdminPatients />
}
