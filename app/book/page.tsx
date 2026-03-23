/**
 * /book — Public booking funnel.
 * Server Component: reads URL params and passes them to the Client Component.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import BookingFlow from './_components/BookingFlow'

export const metadata: Metadata = { title: 'Book an Appointment' }

interface Props {
  searchParams: Promise<{
    type?: string
    postcode?: string
    date?: string
    service?: string
    clinic_id?: string
    doctor_id?: string
    service_id?: string
    slot_id?: string
  }>
}

export default async function BookPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <HomeHeader />
      <Suspense>
        <BookingFlow
          initialType={params.type ?? ''}
          initialPostcode={params.postcode ?? ''}
          initialDate={params.date ?? ''}
          initialService={params.service ?? ''}
          clinicId={params.clinic_id}
          doctorId={params.doctor_id}
          serviceId={params.service_id}
          slotId={params.slot_id}
        />
      </Suspense>
      <HomeFooter />
    </div>
  )
}
