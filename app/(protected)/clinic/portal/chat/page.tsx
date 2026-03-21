import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import ClinicChatTab from '../_components/ClinicChatTab'

export const metadata: Metadata = { title: 'Chat | Clinic Portal' }

export default async function ChatPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.featureFlags.showChat) redirect('/clinic/portal/dashboard')

  return <ClinicChatTab clinicId={data.clinicId!} userId={data.userId} />
}
