'use client'

/**
 * HeroSection — full-width hero with trust badge and enhanced 3-field search bar.
 * Client Component: search form requires controlled state + geolocation.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MapPin, ChevronDown, Building2, Calendar, Crosshair } from 'lucide-react'

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
  const [location, setLocation] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [detectingLocation, setDetectingLocation] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (clinicType && clinicType !== 'all') params.set('type', clinicType)
    if (location) params.set('postcode', location)
    if (dateTime) params.set('date', dateTime)
    router.push(`/clinics${params.size ? `?${params}` : ''}`)
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        setDetectingLocation(false)
      },
      () => {
        setLocation('Near me')
        setDetectingLocation(false)
      },
      { timeout: 5000 }
    )
  }

  const selectedLabel = CLINIC_TYPES.find((t) => t.value === clinicType)?.label ?? 'All Clinics'

  return (
    <section className="relative h-[520px] flex items-center justify-center overflow-hidden">
      {/* Background photo */}
      <Image
        src="/images/hero/hero-doctor-patient.png"
        alt="Doctor consulting with patient"
        fill
        className="object-cover object-center"
        priority
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 text-center space-y-5 max-w-3xl mx-auto">
        {/* Trust badge */}
        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
          <svg className="w-4 h-4 text-lhc-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-white text-xs font-medium">Trusted by 50,000+ Australians</span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
          Your Health, Your Way
        </h1>
        <p className="text-lg text-white/85 leading-relaxed max-w-[480px] mx-auto" style={{ lineHeight: 1.6 }}>
          Book appointments instantly, manage your health records, and
          connect with trusted healthcare providers across Australia.
        </p>

        {/* Enhanced 3-field search bar */}
        <form
          onSubmit={handleSearch}
          className="flex items-stretch bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl mx-auto mt-8 h-16"
        >
          {/* Clinic Type / Specialty */}
          <div className="relative flex-1 min-w-0 flex flex-col justify-center px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Specialty
              </span>
            </div>
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

          {/* Location with GPS detect */}
          <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                Location
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="flex-shrink-0 text-lhc-primary hover:text-lhc-primary-hover transition-colors disabled:opacity-50"
                title="Detect my location"
              >
                <Crosshair className={`w-3.5 h-3.5 ${detectingLocation ? 'animate-spin' : ''}`} />
              </button>
              <input
                type="text"
                placeholder="Suburb or postcode"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="text-sm font-semibold text-gray-800 placeholder:text-gray-300 focus:outline-none bg-transparent w-full"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 my-3 flex-shrink-0" />

          {/* Date/Time */}
          <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3 hidden sm:flex">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                When
              </span>
            </div>
            <input
              type="date"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="text-sm font-semibold text-gray-800 placeholder:text-gray-300 focus:outline-none bg-transparent w-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
              style={{ colorScheme: 'light' }}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="bg-[#00A86B] hover:bg-[#009960] text-white font-bold px-8 text-sm transition-colors flex-shrink-0 whitespace-nowrap rounded-r-2xl"
          >
            Find &amp; Book
          </button>
        </form>
      </div>
    </section>
  )
}
