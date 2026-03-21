import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import CentaurView from '../_components/CentaurView'

export const metadata: Metadata = { title: 'Centaur | Clinic Portal' }

export default async function CentaurPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.centaurEnabled) redirect('/clinic/portal/dashboard')

  return <CentaurView clinicId={data.clinicId!} centaurPracticeId={data.centaurPracticeId} />
}
