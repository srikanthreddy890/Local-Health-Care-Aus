import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import ApiConfigurationManager from '../_components/api/ApiConfigurationManager'
import CustomApiBookingsList from '../_components/CustomApiBookingsList'

export const metadata: Metadata = { title: 'Integrations | Clinic Portal' }

export default async function IntegrationsPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.isOwner && !data.staffPermissions?.can_manage_settings) redirect('/clinic/portal/dashboard')

  return (
    <div className="space-y-6">
      <ApiConfigurationManager clinicId={data.clinicId!} />
      <div className="container mx-auto px-4 sm:px-6">
        <CustomApiBookingsList clinicId={data.clinicId!} userId={data.userId} />
      </div>
    </div>
  )
}
