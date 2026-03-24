/**
 * /local-clinic/[id] — Detail page for apify-imported clinics.
 * Server Component: fetches clinic data, passes to Client Component.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getMedicalBusinessSchema } from '@/lib/utils/blogUtils'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import ClinicDetailView from '@/app/clinics/_components/ClinicDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const supabase = await createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('apify_clinics_public')
      .select('name,description,suburb,state,clinic_type')
      .eq('id', id)
      .single()

    const clinicName = data?.name ?? 'Clinic'
    const location = [data?.suburb, data?.state].filter(Boolean).join(', ')
    const title = location
      ? `${clinicName} — ${location} | Book Online`
      : `${clinicName} | Book Online`
    const description = data?.description
      ?? `Book an appointment at ${clinicName}${location ? ` in ${location}` : ''}. View services, opening hours and book online on Local Health Care.`

    const keywords = [
      `${clinicName}`,
      data?.suburb ? `medical centre ${data.suburb}` : null,
      data?.suburb ? `doctor ${data.suburb}` : null,
      data?.suburb ? `${clinicName} ${data.suburb}` : null,
      `${clinicName} book online`,
      data?.suburb ? `bulk billing ${data.suburb}` : null,
      data?.clinic_type ? `${data.clinic_type} clinic ${data?.suburb ?? ''}`.trim() : null,
    ].filter(Boolean) as string[]

    return {
      title,
      description,
      keywords,
      openGraph: {
        type: 'website',
        title,
        description,
        url: `/local-clinic/${id}`,
      },
      twitter: { card: 'summary' },
      alternates: { canonical: `/local-clinic/${id}` },
    }
  } catch {
    return { title: 'Clinic Details | Local Health Care' }
  }
}

export default async function LocalClinicDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('apify_clinics_public')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const schema = getMedicalBusinessSchema({
    id,
    name: data.name,
    description: data.description,
    address: data.address,
    suburb: data.suburb,
    state: data.state,
    postcode: data.postcode,
    phone: data.phone,
    logo_url: data.logo_url,
    source: 'apify',
  })

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <HomeHeader />
      <ClinicDetailView clinic={{ ...data, source: 'apify' }} />
      <HomeFooter />
    </div>
  )
}
