import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import { createClient } from '@/lib/supabase/server'
import ClinicChatTab from '../_components/ClinicChatTab'

export const metadata: Metadata = { title: 'Chat | Clinic Portal' }

export default async function ChatPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.featureFlags.showChat) redirect('/clinic/portal/dashboard')
  if (!data.staffPermissions?.can_view_chat) redirect('/clinic/portal/dashboard')

  // Resolve clinic owner ID server-side to avoid client-side loading flash
  let clinicOwnerId = data.userId
  if (data.clinicId) {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ownerId } = await (supabase as any)
      .rpc('get_clinic_owner_id', { p_clinic_id: data.clinicId })
    if (ownerId) clinicOwnerId = ownerId
  }

  return <ClinicChatTab clinicId={data.clinicId!} userId={data.userId} clinicOwnerId={clinicOwnerId} />
}
