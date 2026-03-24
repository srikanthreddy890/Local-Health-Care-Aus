/**
 * /clinics — Clinic Directory page.
 * Server Component: reads URL params and passes them to the Client Component.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import ClinicsDirectory from './_components/ClinicsDirectory'

export const metadata: Metadata = {
  title: 'Find Medical Centres, GP Clinics & Healthcare Providers Near You',
  description:
    'Search and compare medical centres, GP clinics, dental practices, physiotherapy clinics and allied health providers near you. Bulk billing clinics, after hours and weekend availability across Australia.',
  keywords: [
    'medical centres near me',
    'GP clinics near me',
    'health clinics Australia',
    'bulk billing clinic near me',
    'family medical centre near me',
    'health services near me',
    'find a doctor near me',
    'medical centre bulk billing',
    'after hours medical centre near me',
    'dental clinic near me',
    'physiotherapy clinic near me',
    'allied health providers near me',
  ],
  openGraph: {
    type: 'website',
    title: 'Find Medical Centres, GP Clinics & Healthcare Providers Near You | Local Health Care',
    description:
      'Search and compare medical centres, GP clinics, dental practices and allied health providers near you. Bulk billing available across Australia.',
    url: '/clinics',
  },
  alternates: { canonical: '/clinics' },
}

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
