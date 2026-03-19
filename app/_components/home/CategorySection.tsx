'use client'

/**
 * CategorySection — 4 cards with photo on top, text below (not overlaid).
 * Matches design: image top, title + description below in white area.
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const CATEGORIES = [
  {
    label: 'General Practitioner',
    value: 'General Practice',
    description: "GPs, Family Doctors, Women's & Men's Health",
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop',
  },
  {
    label: 'Dentist',
    value: 'Dental',
    description: 'General Dentistry, Orthodontics, Oral Surgery',
    image: '/images/categories/dentist.png',
  },
  {
    label: 'Allied Health',
    value: 'Allied Health',
    description: 'Physio, Podiatry, Psychology, Pharmacy',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop',
  },
  {
    label: 'Specialists',
    value: 'Specialist',
    description: 'Cardiology, Dermatology, Orthopaedics & more',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2080&auto=format&fit=crop',
  },
]

export default function CategorySection() {
  return (
    <section className="py-14 px-4 bg-white">
      <div className="container mx-auto max-w-5xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-2xl sm:text-3xl font-bold text-lhc-text-main">
            Browse by Category
          </h2>
          <Link
            href="/clinics"
            className="flex items-center gap-1 text-sm font-medium text-lhc-primary hover:text-lhc-primary-hover transition-colors"
          >
            View all categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 cards — image on top, text below */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/clinics?type=${encodeURIComponent(cat.value)}`}
              className="group rounded-2xl overflow-hidden border border-lhc-border hover:border-lhc-primary/40 hover:shadow-md transition-all"
            >
              {/* Photo */}
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Text below image */}
              <div className="p-4 bg-white">
                <h3 className="font-bold text-lhc-text-main text-sm leading-snug mb-1">
                  {cat.label}
                </h3>
                <p className="text-xs text-lhc-text-muted leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
