import type { Metadata } from 'next'
import AdminRegisterClinic from '../_components/AdminRegisterClinic'

export const metadata: Metadata = { title: 'Register Clinic | Admin Portal' }

export default function RegisterClinicPage() {
  return <AdminRegisterClinic />
}
