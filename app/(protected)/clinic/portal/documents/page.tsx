import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import DocumentsView from '../_components/DocumentsView'

export const metadata: Metadata = { title: 'Documents | Clinic Portal' }

export default async function DocumentsPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.featureFlags.showPatientDocuments) redirect('/clinic/portal/dashboard')

  return <DocumentsView clinicId={data.clinicId!} />
}
