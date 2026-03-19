/**
 * /clinic/[id] — Detail page for registered clinics.
 * Server Component: fetches clinic data, passes to Client Component.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
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
      .from('clinics_public')
      .select('name,description')
      .eq('id', id)
      .single()
    return {
      title: data?.name ? `${data.name} | Local Health Care` : 'Clinic Details',
      description: data?.description ?? undefined,
    }
  } catch {
    return { title: 'Clinic Details | Local Health Care' }
  }
}

export default async function ClinicDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('clinics_public')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <HomeHeader />
      <ClinicDetailView clinic={{ ...data, source: 'registered' }} />
      <HomeFooter />
    </div>
  )
}
