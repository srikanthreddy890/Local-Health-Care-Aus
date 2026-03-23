'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search } from 'lucide-react'
import SearchAutocomplete from '@/app/book/_components/SearchAutocomplete'
import LocationAutocomplete from '@/app/book/_components/LocationAutocomplete'

export default function HeroSection() {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingService, setPendingService] = useState<string | null>(null)
  const locationRef = useRef(location)
  locationRef.current = location

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!location.trim()) return
    const params = new URLSearchParams()
    const service = pendingService || searchTerm.trim()
    if (!service) return
    params.set('service', service)
    params.set('postcode', location.trim())
    router.push(`/book?${params}`)
  }

  const canSearch = (searchTerm.trim().length > 0 || !!pendingService) && location.trim().length > 0

  const handleSelectClinic = (clinicId: string) => {
    router.push(`/book?clinic_id=${clinicId}`)
  }

  const handleSelectDoctor = (clinicId: string, doctorId: string) => {
    router.push(`/book?clinic_id=${clinicId}&doctor_id=${doctorId}`)
  }

  const handleSelectService = (_serviceId: string, serviceName: string, _clinicId: string) => {
    if (locationRef.current.trim()) {
      const params = new URLSearchParams()
      params.set('service', serviceName)
      params.set('postcode', locationRef.current.trim())
      router.push(`/book?${params}`)
    } else {
      setPendingService(serviceName)
      setSearchTerm(serviceName)
    }
  }

  return (
    <section className="relative z-20 min-h-[440px] sm:min-h-[420px] md:min-h-[520px] py-10 sm:py-12 md:py-16 flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/images/hero/hero-doctor-patient.png"
          alt="Doctor consulting with patient"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-4 text-center space-y-4 sm:space-y-5 max-w-3xl mx-auto">
        {/* Trust badge */}
        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
          <svg className="w-4 h-4 text-lhc-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-white text-xs font-medium">Trusted by 50,000+ Australians</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          Your Health, Your Way
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-white/85 leading-relaxed max-w-[480px] mx-auto">
          Book appointments instantly, manage your health records, and
          connect with trusted healthcare providers across Australia.
        </p>

        {/* ── Search bar ── */}
        <form onSubmit={handleSearch} className="mt-6 md:mt-8 max-w-3xl mx-auto">

          {/* Desktop */}
          <div className="hidden sm:flex items-stretch bg-white rounded-2xl shadow-2xl h-[56px]">
            <div className="flex-[1.2] min-w-0">
              <SearchAutocomplete
                onSelectClinic={handleSelectClinic}
                onSelectDoctor={handleSelectDoctor}
                onSelectService={handleSelectService}
                onInputChange={(v) => { setSearchTerm(v); setPendingService(null) }}
                placeholder="Service, clinic, or practitioner..."
                variant="embedded"
              />
            </div>

            <div className="w-px bg-gray-200 my-3 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <LocationAutocomplete
                value={location}
                onChange={setLocation}
                placeholder="Suburb or postcode"
                variant="embedded"
              />
            </div>

            <button
              type="submit"
              disabled={!canSearch}
              className="bg-lhc-primary hover:bg-lhc-primary-hover disabled:bg-lhc-primary/50 disabled:cursor-not-allowed text-white font-bold px-7 text-sm transition-colors flex-shrink-0 whitespace-nowrap rounded-r-2xl flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Find &amp; Book
            </button>
          </div>

          {/* Mobile */}
          <div className="sm:hidden bg-white rounded-2xl shadow-2xl">
            <div className="border-b border-gray-100">
              <SearchAutocomplete
                onSelectClinic={handleSelectClinic}
                onSelectDoctor={handleSelectDoctor}
                onSelectService={handleSelectService}
                onInputChange={(v) => { setSearchTerm(v); setPendingService(null) }}
                placeholder="Service, clinic, or practitioner..."
                variant="embedded"
              />
            </div>

            <div className="border-b border-gray-100">
              <LocationAutocomplete
                value={location}
                onChange={setLocation}
                placeholder="Suburb or postcode"
                variant="embedded"
              />
            </div>

            <button
              type="submit"
              disabled={!canSearch}
              className="w-full bg-lhc-primary hover:bg-lhc-primary-hover disabled:bg-lhc-primary/50 disabled:cursor-not-allowed text-white font-bold py-4 text-base transition-colors rounded-b-2xl flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Find &amp; Book
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
