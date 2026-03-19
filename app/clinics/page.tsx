/**
 * /clinics — Clinic Directory page.
 * Server Component: reads URL params and passes them to the Client Component.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import ClinicsDirectory from './_components/ClinicsDirectory'

export const metadata: Metadata = { title: 'Find Healthcare Providers' }

interface Props {
  searchParams: Promise<{ type?: string; postcode?: string }>
}

export default async function ClinicsPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <HomeHeader />
      <Suspense>
        <ClinicsDirectory
          initialType={params.type ?? ''}
          initialPostcode={params.postcode ?? ''}
        />
      </Suspense>
      <HomeFooter />
    </div>
  )
}
