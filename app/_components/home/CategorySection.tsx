'use client'

/**
 * CategorySection — 4 premium cards with gradient overlay, hover zoom, and reveal arrow.
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

        {/* 4 cards — image with gradient overlay, text inside at bottom */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/clinics?type=${encodeURIComponent(cat.value)}`}
              className="group relative rounded-2xl overflow-hidden h-[220px] block"
            >
              {/* Photo with zoom on hover */}
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Gradient overlay — bottom 60% */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e1b]/90 via-[#0a2e1b]/40 to-transparent" />

              {/* Text inside card at bottom-left */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-bold text-white text-sm leading-snug mb-1">
                  {cat.label}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              {/* Hover arrow in bottom-right */}
              <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-lhc-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
