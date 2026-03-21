import type { Metadata } from 'next'
import AdminAppointments from '../_components/AdminAppointments'

export const metadata: Metadata = { title: 'Appointments | Admin Portal' }

export default function AppointmentsPage() {
  return <AdminAppointments />
}
