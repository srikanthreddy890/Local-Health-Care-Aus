import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClinicPortalData } from '@/lib/clinic/getClinicContext'
import { createClient } from '@/lib/supabase/server'
import ClinicBlogManager from '../_components/ClinicBlogManager'

export const metadata: Metadata = { title: 'Blog | Clinic Portal' }

export default async function BlogPage() {
  const data = await getClinicPortalData()
  if (!data) redirect('/auth')
  if (!data.isOwner) redirect('/clinic/portal/dashboard')

  // Fetch clinic logo for blog author avatar
  let clinicLogo: string | undefined
  if (data.clinicId) {
    const supabase = await createClient()
    const { data: clinic } = await supabase
      .from('clinics')
      .select('logo_url')
      .eq('id', data.clinicId)
      .single()
    clinicLogo = clinic?.logo_url ?? undefined
  }

  return (
    <ClinicBlogManager
      clinicId={data.clinicId!}
      clinicName={data.clinicName}
      clinicLogo={clinicLogo}
    />
  )
}
