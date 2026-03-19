'use client'

/**
 * HeroSection — full-width hero with labelled search bar.
 * Client Component: search form requires controlled state.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MapPin, ChevronDown, Building2 } from 'lucide-react'

const CLINIC_TYPES = [
  { value: 'all', label: 'All Clinics' },
  { value: 'General Practice', label: 'General Practice' },
  { value: 'Dental', label: 'Dental' },
  { value: 'Physiotherapy', label: 'Physiotherapy' },
  { value: 'Mental Health', label: 'Mental Health' },
  { value: 'Specialist', label: 'Specialist' },
  { value: 'Allied Health', label: 'Allied Health' },
  { value: 'Pharmacy', label: 'Pharmacy' },
]

export default function HeroSection() {
  const router = useRouter()
  const [clinicType, setClinicType] = useState('all')
  const [postcode, setPostcode] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (clinicType && clinicType !== 'all') params.set('type', clinicType)
    if (postcode) params.set('postcode', postcode)
    router.push(`/clinics${params.size ? `?${params}` : ''}`)
  }

  const selectedLabel = CLINIC_TYPES.find((t) => t.value === clinicType)?.label ?? 'All Clinics'

  return (
    <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background photo */}
      <Image
        src="/images/hero/hero-doctor-patient.png"
        alt="Doctor consulting with patient"
        fill
        className="object-cover object-center"
        priority
      />
      {/* Overlay — left-heavy so text is legible */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Content — centred */}
      <div className="relative z-10 w-full px-4 text-center space-y-6 max-w-3xl mx-auto">
        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
          Your Health, Your Way
        </h1>
        <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto">
          Book appointments instantly, manage your health records, and<br className="hidden sm:block" />
          connect with trusted healthcare providers across Australia.
        </p>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="flex items-stretch bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl mx-auto mt-8 h-16"
        >
          {/* Clinic Type */}
          <div className="relative flex-1 min-w-0 flex flex-col justify-center px-5 py-3">
            {/* Row 1: icon + label */}
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Clinic Type
              </span>
            </div>
            {/* Row 2: value + chevron (hidden select overlay) */}
            <div className="relative flex items-center gap-1">
              <select
                value={clinicType}
                onChange={(e) => setClinicType(e.target.value)}
                className="absolute inset-0 opacity-0 w-full cursor-pointer z-10"
              >
                {CLINIC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <span className="text-sm font-semibold text-gray-800 truncate">{selectedLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 my-3 flex-shrink-0" />

          {/* Postcode */}
          <div className="flex-1 min-w-0 flex flex-col justify-center px-5 py-3">
            {/* Row 1: icon + label */}
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Postcode
              </span>
            </div>
            {/* Row 2: input */}
            <input
              type="text"
              placeholder="e.g. 4000"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="text-sm font-semibold text-gray-800 placeholder:text-gray-300 focus:outline-none bg-transparent w-full"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="bg-lhc-primary hover:bg-lhc-primary-hover text-white font-bold px-8 text-sm transition-colors flex-shrink-0 whitespace-nowrap rounded-r-2xl"
          >
            Find &amp; Book
          </button>
        </form>
      </div>
    </section>
  )
}
