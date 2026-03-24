/**
 * /book — Public booking funnel.
 * Server Component: reads URL params and passes them to the Client Component.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import BookingFlow from './_components/BookingFlow'
import { getCategoryBySlug } from '@/lib/categories'
import { POPULAR_LOCATIONS } from '@/lib/constants/australianLocations'

interface Props {
  searchParams: Promise<{
    type?: string
    category?: string
    postcode?: string
    date?: string
    clinic_id?: string
    doctor_id?: string
    service_id?: string
    slot_id?: string
  }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const category = params.category ? getCategoryBySlug(params.category) : undefined
  const location = params.postcode
    ? POPULAR_LOCATIONS.find((l) => l.zip_code === params.postcode)
    : undefined

  // Dynamic title & description when both category and location are present
  if (category && location) {
    const title = `Book a ${category.label} Appointment in ${location.city}, ${location.state} ${location.zip_code}`
    const description = `Find and book a ${category.label.toLowerCase()} appointment in ${location.city}, ${location.state} ${location.zip_code}. Same day appointments, bulk billing, after hours. Compare providers and book online 24/7.`
    const url = `/book?category=${params.category}&postcode=${params.postcode}`

    return {
      title,
      description,
      keywords: [
        `${category.label.toLowerCase()} ${location.city}`,
        `book ${category.label.toLowerCase()} ${location.city}`,
        `${category.label.toLowerCase()} near ${location.zip_code}`,
        `${category.label.toLowerCase()} appointment ${location.state}`,
        `bulk billing ${category.label.toLowerCase()} ${location.city}`,
      ],
      openGraph: {
        type: 'website',
        title: `${title} | Local Health Care`,
        description,
        url,
      },
      alternates: { canonical: url },
    }
  }

  // Category-only
  if (category) {
    const title = `Book a ${category.label} Appointment Online`
    const description = `Find and book a ${category.label.toLowerCase()} appointment online across Australia. Same day appointments, bulk billing, after hours. Compare providers and book 24/7.`
    return {
      title,
      description,
      keywords: [
        `book ${category.label.toLowerCase()} online`,
        `${category.label.toLowerCase()} near me`,
        `${category.label.toLowerCase()} appointment`,
        `bulk billing ${category.label.toLowerCase()}`,
      ],
      openGraph: { type: 'website', title: `${title} | Local Health Care`, description, url: `/book?category=${params.category}` },
      alternates: { canonical: `/book?category=${params.category}` },
    }
  }

  // Default fallback
  return {
    title: 'Book a Doctor, GP, Dentist or Specialist Appointment Online',
    description:
      'Book a healthcare appointment online — GPs, dentists, physiotherapists, psychologists, chiropractors and specialists. Same day appointments, bulk billing, after hours. Find providers near you across Australia.',
    keywords: [
      'book doctor appointment online',
      'find a GP near me',
      'book health appointment',
      'same day doctor appointment',
      'bulk billing GP near me',
      'after hours doctor near me',
      'book dentist online',
      'doctor accepting new patients',
      'walk in clinic near me',
      'female doctor near me',
      'book physiotherapist',
      'book psychologist online',
      'same day GP appointment near me',
    ],
    openGraph: {
      type: 'website',
      title: 'Book a Doctor, GP, Dentist or Specialist Appointment Online | Local Health Care',
      description:
        'Book a healthcare appointment online — GPs, dentists, physiotherapists, psychologists and specialists. Bulk billing available. Book 24/7 across Australia.',
      url: '/book',
    },
    alternates: { canonical: '/book' },
  }
}

export default async function BookPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <HomeHeader />
      <Suspense>
        <BookingFlow
          initialType={params.type ?? ''}
          initialCategory={params.category ?? ''}
          initialPostcode={params.postcode ?? ''}
          initialDate={params.date ?? ''}
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
