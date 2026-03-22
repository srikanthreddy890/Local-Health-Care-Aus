'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import FavoriteButton from '@/components/FavoriteButton'
import {
  ChevronLeft, Share2, MapPin, Phone, Mail, Globe, Navigation,
  Clock, Star, BadgeCheck, Calendar, MessageCircle, User,
  Building2, CheckCircle, Heart, ShieldCheck, Languages,
  Stethoscope, Pill,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface ClinicDetail {
  id: string
  name: string
  description?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null
  is_verified?: boolean | null
  rating?: number | null
  reviews_count?: number | null
  google_maps_url?: string | null
  is_claimed?: boolean | null
  clinic_type?: string | null
  specializations?: unknown
  operating_hours?: unknown
  health_funds?: unknown
  amenities?: unknown
  languages?: unknown
  source: 'registered' | 'apify'
}

interface Props {
  clinic: ClinicDetail
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TODAY_INDEX = new Date().getDay()
const TODAY_NAME = DAYS[TODAY_INDEX]

function parseList(raw: unknown): string[] {
  try {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.startsWith('[')) return JSON.parse(trimmed)
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean)
    }
    return []
  } catch { return [] }
}

function parseHours(raw: unknown): { day: string; hours: string }[] {
  try {
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) {
      return parsed.map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const o = item as Record<string, unknown>
          return { day: String(o.day ?? ''), hours: String(o.hours ?? o.open ?? '') }
        }
        return { day: '', hours: '' }
      }).filter((h) => h.day)
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed as Record<string, string>).map(([day, hours]) => ({ day, hours }))
    }
    return []
  } catch { return [] }
}

// Returns 'open' | 'closed-today' | 'closed-now' | null
function computeOpenStatus(hoursStr: string): 'open' | 'closed-today' | 'closed-now' | null {
  if (!hoursStr || hoursStr.toLowerCase() === 'closed') return 'closed-today'
  const match = hoursStr.match(/(\d+):(\d+)\s*(AM|PM)\s*[–\-]\s*(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return null
  const toMins = (h: number, m: number, period: string) => {
    let hour = h
    if (period.toUpperCase() === 'PM' && h !== 12) hour += 12
    if (period.toUpperCase() === 'AM' && h === 12) hour = 0
    return hour * 60 + m
  }
  const openMins = toMins(parseInt(match[1]), parseInt(match[2]), match[3])
  const closeMins = toMins(parseInt(match[4]), parseInt(match[5]), match[6])
  const now = new Date()
  const currentMins = now.getHours() * 60 + now.getMinutes()
  return currentMins >= openMins && currentMins < closeMins ? 'open' : 'closed-now'
}


function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

// ── Component ─────────────────────────────────────────────────────────────────
type Tab = 'about' | 'doctors' | 'services'

export default function ClinicDetailView({ clinic }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('ctab') ?? 'about') as Tab
  const [userId, setUserId] = useState<string | null>(null)

  function setActiveTab(tab: Tab) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('ctab', tab)
    router.replace(`?${p.toString()}`)
  }

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  function handleBookAppointment() {
    if (userId) {
      const p = new URLSearchParams()
      p.set('tab', 'appointments')
      p.set('appt', 'book')
      p.set('clinic_id', clinic.id)
      p.set('clinic_name', clinic.name)
      router.push(`/dashboard?${p.toString()}`)
    } else {
      router.push('/auth')
    }
  }

  const address = [clinic.address_line1, clinic.city, clinic.state, clinic.zip_code]
    .filter(Boolean).join(', ')
  const specs = parseList(clinic.specializations)
  const hours = parseHours(clinic.operating_hours)
  const displayHours = hours  // real data only — no fabricated fallback
  const healthFunds = parseList(clinic.health_funds)
  const amenities = parseList(clinic.amenities)
  const languages = parseList(clinic.languages).length > 0 ? parseList(clinic.languages) : ['English']

  return (
    <main className="flex-1 bg-lhc-background">
      {/* ── Top nav bar ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-lhc-border px-4 py-3.5">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <Link
            href="/clinics"
            className="inline-flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-lhc-text-main transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Clinics
          </Link>
          <button
            onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.href : '')}
            className="inline-flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-lhc-primary border border-lhc-border hover:border-lhc-primary px-3.5 py-1.5 rounded-lg transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── LEFT — main content ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Clinic name card */}
            <div className="bg-white rounded-xl border border-lhc-border p-5 space-y-3">
              <div className="flex items-start gap-4">
                {/* Logo / initials avatar */}
                <div className="w-14 h-14 rounded-xl bg-lhc-primary/10 flex items-center justify-center flex-shrink-0 border border-lhc-primary/20">
                  <span className="text-lhc-primary font-bold text-lg">{getInitials(clinic.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold text-lhc-text-main leading-tight">{clinic.name}</h1>
                    {clinic.is_verified && (
                      <BadgeCheck className="w-5 h-5 text-lhc-primary flex-shrink-0" />
                    )}
                    {(() => {
                      const todayEntry = displayHours.find((h) => h.day.toLowerCase() === TODAY_NAME.toLowerCase())
                      if (!todayEntry) return null
                      const openStatus = computeOpenStatus(todayEntry.hours)
                      if (openStatus === null) return null
                      if (openStatus === 'open') return (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Open Now
                        </span>
                      )
                      return (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          {openStatus === 'closed-today' ? 'Closed Today' : 'Closed Now'}
                        </span>
                      )
                    })()}
                  </div>
                  {/* Rating */}
                  {clinic.rating && clinic.rating > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-bold text-amber-700">{clinic.rating.toFixed(1)}</span>
                      </div>
                      {clinic.reviews_count ? (
                        <span className="text-xs text-lhc-text-muted">{clinic.reviews_count.toLocaleString()} reviews</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Description */}
              {clinic.description && (
                <p className="text-sm text-lhc-text-muted leading-relaxed">{clinic.description}</p>
              )}

              {/* Quick info row */}
              <div className="flex flex-wrap gap-2 pt-1">
                {address && (
                  <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted bg-lhc-background rounded-lg px-3 py-1.5">
                    <MapPin className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
                    {address}
                  </div>
                )}
                {clinic.phone && (
                  <a href={`tel:${clinic.phone}`} className="flex items-center gap-1.5 text-xs text-lhc-text-muted bg-lhc-background rounded-lg px-3 py-1.5 hover:text-lhc-primary transition-colors">
                    <Phone className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
                    {clinic.phone}
                  </a>
                )}
              </div>
            </div>

            {/* ── Tab bar ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-lhc-border overflow-hidden">
              <div className="flex border-b border-lhc-border">
                {(['about', 'doctors', 'services'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-colors border-b-2 ${
                      activeTab === tab
                        ? 'text-lhc-primary border-lhc-primary bg-lhc-primary/5'
                        : 'text-lhc-text-muted border-transparent hover:text-lhc-text-main hover:bg-lhc-background'
                    }`}
                  >
                    {tab === 'about' ? 'About' : tab === 'doctors' ? 'Doctors' : 'Services'}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === 'about' && <AboutTab clinic={clinic} address={address} displayHours={displayHours} specs={specs} languages={languages} healthFunds={healthFunds} amenities={amenities} />}
                {activeTab === 'doctors' && <DoctorsTab />}
                {activeTab === 'services' && <ServicesTab clinic={clinic} specs={specs} onBook={handleBookAppointment} />}
              </div>
            </div>
          </div>

          {/* ── RIGHT sidebar ─────────────────────────────────────────────── */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">

            {/* Action buttons */}
            <div className="bg-white rounded-xl border border-lhc-border p-4 space-y-2.5">
              <button
                onClick={handleBookAppointment}
                className="w-full h-11 bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Book Appointment
              </button>
              <button className="w-full h-11 border-2 border-lhc-primary text-lhc-primary hover:bg-lhc-primary/5 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Contact Clinic
              </button>
              <FavoriteButton
                clinicId={clinic.id}
                clinicName={clinic.name}
                userId={userId}
                showLabel
                className="w-full h-11 border border-lhc-border hover:border-red-300 hover:bg-red-50 rounded-xl text-sm font-semibold text-lhc-text-muted hover:text-red-500 transition-colors gap-2"
              />
              {clinic.google_maps_url && (
                <a
                  href={clinic.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 border border-lhc-border hover:border-lhc-primary text-lhc-text-muted hover:text-lhc-primary font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              )}
              {clinic.website && (
                <a
                  href={clinic.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 border border-lhc-border hover:border-lhc-primary text-lhc-text-muted hover:text-lhc-primary font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                </a>
              )}
            </div>

            {/* Contact info card */}
            <div className="bg-white rounded-xl border border-lhc-border p-4 space-y-3">
              <h3 className="font-bold text-lhc-text-main text-sm">Contact Information</h3>
              <div className="space-y-2.5">
                {clinic.phone && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-lhc-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-lhc-text-muted uppercase tracking-wider">Phone</p>
                      <a href={`tel:${clinic.phone}`} className="text-sm font-medium text-lhc-text-main hover:text-lhc-primary transition-colors">{clinic.phone}</a>
                    </div>
                  </div>
                )}
                {clinic.email && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-lhc-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-lhc-text-muted uppercase tracking-wider">Email</p>
                      <a href={`mailto:${clinic.email}`} className="text-sm font-medium text-lhc-text-main hover:text-lhc-primary transition-colors break-all">{clinic.email}</a>
                    </div>
                  </div>
                )}
                {address && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-lhc-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-lhc-text-muted uppercase tracking-wider">Address</p>
                      <p className="text-sm font-medium text-lhc-text-main">{address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Today's hours */}
            <div className="bg-white rounded-xl border border-lhc-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-lhc-primary" />
                <h3 className="font-bold text-lhc-text-main text-sm">Today&apos;s Hours</h3>
              </div>
              {displayHours.length > 0 ? (() => {
                const todayEntry = displayHours.find((h) => h.day.toLowerCase() === TODAY_NAME.toLowerCase())
                const isOpen = todayEntry && todayEntry.hours.toLowerCase() !== 'closed'
                return (
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${isOpen ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <span className="font-semibold text-lhc-text-main">{TODAY_NAME}</span>
                    <span className={`font-medium ${isOpen ? 'text-emerald-700' : 'text-gray-500'}`}>
                      {todayEntry?.hours ?? 'Not listed'}
                    </span>
                  </div>
                )
              })() : (
                <p className="text-sm text-lhc-text-muted py-1">Hours not available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── About Tab ─────────────────────────────────────────────────────────────────
function AboutTab({ clinic, address, displayHours, specs, languages, healthFunds, amenities }: {
  clinic: ClinicDetail
  address: string
  displayHours: { day: string; hours: string }[]
  specs: string[]
  languages: string[]
  healthFunds: string[]
  amenities: string[]
}) {
  return (
    <div className="space-y-6">
      {/* Location & Contact */}
      <section>
        <h2 className="font-bold text-lhc-text-main text-base mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-lhc-primary" />
          Location &amp; Contact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {address && (
            <div className="bg-lhc-background rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-[10px] font-bold text-lhc-text-muted uppercase tracking-wider">Address</p>
              <p className="text-sm font-medium text-lhc-text-main">{address}</p>
            </div>
          )}
          {clinic.phone && (
            <div className="bg-lhc-background rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-[10px] font-bold text-lhc-text-muted uppercase tracking-wider">Phone</p>
              <a href={`tel:${clinic.phone}`} className="text-sm font-medium text-lhc-text-main hover:text-lhc-primary transition-colors">{clinic.phone}</a>
            </div>
          )}
          {clinic.email && (
            <div className="bg-lhc-background rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-[10px] font-bold text-lhc-text-muted uppercase tracking-wider">Email</p>
              <a href={`mailto:${clinic.email}`} className="text-sm font-medium text-lhc-text-main hover:text-lhc-primary transition-colors break-all">{clinic.email}</a>
            </div>
          )}
          {clinic.website && (
            <div className="bg-lhc-background rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-[10px] font-bold text-lhc-text-muted uppercase tracking-wider">Website</p>
              <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-lhc-primary hover:underline truncate block">{clinic.website.replace(/^https?:\/\//, '')}</a>
            </div>
          )}
        </div>
      </section>

      {/* Operating Hours */}
      <section>
        <h2 className="font-bold text-lhc-text-main text-base mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-lhc-primary" />
          Operating Hours
        </h2>
        {displayHours.length > 0 ? (
          <div className="rounded-xl border border-lhc-border overflow-hidden divide-y divide-lhc-border">
            {displayHours.map(({ day, hours }) => {
              const isToday = day.toLowerCase() === TODAY_NAME.toLowerCase()
              const isClosed = hours.toLowerCase() === 'closed'
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    isToday ? 'bg-lhc-primary/5 border-l-2 border-l-lhc-primary' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isToday ? 'text-lhc-primary' : 'text-lhc-text-main'}`}>{day}</span>
                    {isToday && (
                      <span className="text-[10px] font-bold text-lhc-primary bg-lhc-primary/10 border border-lhc-primary/30 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Today</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${isClosed ? 'text-gray-400' : isToday ? 'text-lhc-primary' : 'text-lhc-text-main'}`}>
                    {hours}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-lhc-text-muted py-2">Operating hours not provided by this clinic.</p>
        )}
      </section>

      {/* Specializations + Languages (2-col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {specs.length > 0 && (
          <section>
            <h2 className="font-bold text-lhc-text-main text-base mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-lhc-primary" />
              Specializations
            </h2>
            <div className="space-y-1.5">
              {specs.map((s) => (
                <div key={s} className="flex items-center gap-2 border-l-2 border-lhc-primary pl-3 py-0.5">
                  <span className="text-sm text-lhc-text-muted">{s}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <section>
          <h2 className="font-bold text-lhc-text-main text-base mb-3 flex items-center gap-2">
            <Languages className="w-4 h-4 text-lhc-primary" />
            Languages Spoken
          </h2>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <span key={lang} className="text-xs font-medium text-lhc-text-muted border border-lhc-border px-3 py-1 rounded-full">{lang}</span>
            ))}
          </div>
        </section>
      </div>

      {/* Health Funds */}
      {healthFunds.length > 0 && (
        <section>
          <h2 className="font-bold text-lhc-text-main text-base mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-lhc-primary" />
            Health Funds Accepted
          </h2>
          <div className="flex flex-wrap gap-2">
            {healthFunds.map((fund) => (
              <div key={fund} className="flex items-center gap-1.5 text-xs font-medium text-lhc-text-muted border border-lhc-border px-3 py-1.5 rounded-lg bg-white">
                <CheckCircle className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
                {fund}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Medical Facilities + Amenities */}
      {amenities.length > 0 && (
        <section>
          <h2 className="font-bold text-lhc-text-main text-base mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-lhc-primary" />
            Medical Facilities &amp; Amenities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {amenities.map((item) => (
              <div key={item} className="flex items-center gap-2 border-l-2 border-lhc-primary pl-3 py-1">
                <ShieldCheck className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
                <span className="text-sm text-lhc-text-muted">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Doctors Tab ───────────────────────────────────────────────────────────────
function DoctorsTab() {
  return (
    <div className="py-10 flex flex-col items-center text-center gap-3">
      <User className="w-10 h-10 text-lhc-text-muted/30" />
      <p className="text-sm font-medium text-lhc-text-main">No doctor information available</p>
      <p className="text-xs text-lhc-text-muted max-w-xs">
        This clinic has not listed their medical team. Contact the clinic directly for doctor availability.
      </p>
    </div>
  )
}

// ── Services Tab ──────────────────────────────────────────────────────────────
function ServicesTab({ clinic, specs, onBook }: { clinic: ClinicDetail; specs: string[]; onBook: () => void }) {
  const defaultServices = [
    { icon: <Stethoscope className="w-4 h-4 text-lhc-primary" />, name: 'General Consultations', desc: 'Comprehensive health assessments and treatment planning.' },
    { icon: <ShieldCheck className="w-4 h-4 text-lhc-primary" />, name: 'Preventive Care', desc: 'Health screenings, vaccinations, and wellness checks.' },
    { icon: <Pill className="w-4 h-4 text-lhc-primary" />, name: 'Prescriptions', desc: 'Medication management and specialist referrals.' },
    { icon: <Calendar className="w-4 h-4 text-lhc-primary" />, name: 'Telehealth', desc: 'Online consultations available for eligible patients.' },
  ]

  const services = specs.length > 0
    ? specs.map((s) => ({ icon: <CheckCircle className="w-4 h-4 text-lhc-primary" />, name: s, desc: '' }))
    : defaultServices

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-lhc-text-main text-base mb-1">Services Offered</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((svc) => (
          <div key={svc.name} className="bg-lhc-background rounded-xl p-4 flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-lhc-primary/10 flex items-center justify-center flex-shrink-0">
              {svc.icon}
            </div>
            <div>
              <p className="font-semibold text-lhc-text-main text-sm">{svc.name}</p>
              {svc.desc && <p className="text-xs text-lhc-text-muted mt-0.5 leading-relaxed">{svc.desc}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center pt-4">
        <button
          onClick={onBook}
          className="bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors inline-flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Book an Appointment
        </button>
      </div>
    </div>
  )
}
