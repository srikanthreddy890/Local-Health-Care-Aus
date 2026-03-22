import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import EnhancedClinicProfile from '../_components/EnhancedClinicProfile'

export const metadata: Metadata = { title: 'Settings | Clinic Portal' }

export default async function SettingsPage() {
  const ctx = await getClinicPortalData()
  if (!ctx) redirect('/auth')
  if (!ctx.clinicId) redirect('/clinic/portal')
  if (!ctx.isOwner && !ctx.staffPermissions?.can_manage_settings) redirect('/clinic/portal/dashboard')

  return <EnhancedClinicProfile clinicId={ctx.clinicId} isOwner={ctx.isOwner} />
}
