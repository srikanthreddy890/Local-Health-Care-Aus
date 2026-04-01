'use client'

import { MapPin, BadgeCheck, Video, Calendar } from 'lucide-react'
import { cn, getInitials, fmt12, fmtDate } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'

interface Doctor {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  specialty?: string | null
}

interface NextSlot {
  appointment_date: string
  start_time: string
}

interface Clinic {
  id: string
  name: string
  description?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  logo_url?: string | null
  is_verified?: boolean | null
  clinic_type?: string | null
  specializations?: unknown
}

const TYPE_STYLES: Record<string, { badge: string; initials: string; avatarBg: string }> = {
  dental:        { badge: 'bg-sky-50 text-sky-700 border-sky-200',              initials: 'text-sky-600',     avatarBg: 'bg-sky-50' },
  gp:            { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',  initials: 'text-emerald-600', avatarBg: 'bg-emerald-50' },
  allied_health: { badge: 'bg-violet-50 text-violet-700 border-violet-200',     initials: 'text-violet-600',  avatarBg: 'bg-violet-50' },
  specialist:    { badge: 'bg-amber-50 text-amber-700 border-amber-200',        initials: 'text-amber-600',   avatarBg: 'bg-amber-50' },
  mental_health: { badge: 'bg-pink-50 text-pink-700 border-pink-200',           initials: 'text-pink-600',    avatarBg: 'bg-pink-50' },
  pharmacy:      { badge: 'bg-teal-50 text-teal-700 border-teal-200',           initials: 'text-teal-600',    avatarBg: 'bg-teal-50' },
}

const TYPE_LABELS: Record<string, string> = {
  dental: 'Dental', gp: 'GP / Medical', allied_health: 'Allied Health',
  specialist: 'Specialist', mental_health: 'Mental Health', pharmacy: 'Pharmacy',
}

interface Props {
  clinic: Clinic
  doctors: Doctor[]
  nextSlot: NextSlot | null
  hasTelehealth: boolean
  isCustomApi?: boolean
  onSelect: () => void
}

export default function ClinicResultCard({ clinic, doctors, nextSlot, hasTelehealth, isCustomApi, onSelect }: Props) {
  const clinicType = clinic.clinic_type ?? 'gp'
  const style = TYPE_STYLES[clinicType] ?? TYPE_STYLES['gp']
  const typeLabel = TYPE_LABELS[clinicType] ?? 'Clinic'
  const location = [clinic.city, clinic.state].filter(Boolean).join(', ')
  const visibleDoctors = doctors.slice(0, 5)
  const extraDoctors = doctors.length - 5

  return (
    <button
      onClick={onSelect}
      className="w-full bg-white rounded-2xl border-2 border-lhc-border hover:border-lhc-primary shadow-sm hover:shadow-lg transition-all duration-200 text-left group"
    >
      <div className="p-5 sm:p-6 space-y-3">
        <div className="flex gap-5">
          {/* Left: info */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Name + badges */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lhc-text-main text-base leading-snug">{clinic.name}</h3>
                {clinic.is_verified && <BadgeCheck className="w-4 h-4 text-lhc-primary flex-shrink-0" />}
              </div>

            </div>

            {/* Location */}
            {location && (
              <div className="flex items-center gap-1.5 text-sm text-lhc-text-muted">
                <MapPin className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
                <span>{clinic.address_line1 ? `${clinic.address_line1}, ${location}` : location}</span>
              </div>
            )}

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${style.badge}`}>
                {typeLabel}
              </span>
              {hasTelehealth && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  <Video className="w-3 h-3" />
                  Telehealth available
                </span>
              )}
            </div>

            {/* Doctor avatars */}
            {visibleDoctors.length > 0 && (
              <div className="flex items-center -space-x-2">
                {visibleDoctors.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm"
                    title={`Dr. ${doc.first_name} ${doc.last_name}${doc.specialty ? ` · ${doc.specialty}` : ''}`}
                  >
                    {doc.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={doc.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <DefaultAvatar variant="doctor" className="w-full h-full rounded-full" iconScale={0.55} colorIndex={idx} />
                    )}
                  </div>
                ))}
                {extraDoctors > 0 && (
                  <div className="w-9 h-9 rounded-full border-2 border-white bg-lhc-background flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-lhc-text-muted">+{extraDoctors}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: logo */}
          <div className="hidden sm:flex items-start justify-center flex-shrink-0 w-24 h-24">
            <div className={cn(
              'w-full h-full rounded-xl border border-lhc-border/60 overflow-hidden flex items-center justify-center',
              style.avatarBg,
            )}>
              {clinic.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clinic.logo_url} alt={clinic.name} className="w-full h-full object-contain p-1" />
              ) : (
                <span className={`text-2xl font-extrabold ${style.initials}`}>{getInitials(clinic.name)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Next available + CTA */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {nextSlot ? (
              <>
                <span className="text-xs text-lhc-text-muted">Next available:</span>
                <span className="text-sm font-bold text-lhc-primary">
                  {fmtDate(nextSlot.appointment_date, { weekday: 'short', day: 'numeric', month: 'short' })}, {fmt12(nextSlot.start_time)}
                </span>
              </>
            ) : isCustomApi ? (
              <span className="text-xs text-lhc-primary font-medium">Check available appointments</span>
            ) : (
              <span className="text-xs text-lhc-text-muted italic">No online availability</span>
            )}
          </div>

          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0',
            (nextSlot || isCustomApi)
              ? 'bg-lhc-primary text-white group-hover:bg-lhc-primary-hover shadow-sm'
              : 'bg-lhc-border/60 text-lhc-text-muted',
          )}>
            <Calendar className="w-3.5 h-3.5" />
            {isCustomApi && !nextSlot ? 'Book Now' : 'All availabilities'}
          </span>
        </div>
      </div>
    </button>
  )
}
