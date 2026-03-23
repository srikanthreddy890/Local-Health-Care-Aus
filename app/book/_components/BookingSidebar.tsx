'use client'

import {
  MapPin, Phone, Mail, Globe, Clock,
  Stethoscope, CalendarDays, ClipboardList, BadgeCheck,
} from 'lucide-react'
import { cn, getInitials, fmt12, fmtDate } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'
import { useBookingContext } from './BookingContext'

interface ClinicInfo {
  id: string
  name: string
  logo_url?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  operating_hours_detailed?: Record<string, { open: string; close: string; closed?: boolean }> | null
}

interface DoctorInfo {
  id: string
  first_name: string
  last_name: string
  specialty?: string | null
  avatar_url?: string | null
}

interface ServiceInfo {
  id: string
  name: string
  price?: number | null
  duration_minutes?: number | null
}

interface SlotInfo {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
}

interface Props {
  clinicId?: string
  doctorId?: string
  serviceId?: string
  slotId?: string
  currentStep: number
  onChangeStep: (step: number) => void
}

export default function BookingSidebar({
  clinicId,
  doctorId,
  serviceId,
  slotId,
  currentStep,
  onChangeStep,
}: Props) {
  // Read from shared context — no independent fetches needed
  const { data: bookingData } = useBookingContext()
  const clinic = clinicId ? bookingData.clinic : null
  const doctor = doctorId ? bookingData.doctor : null
  const service = serviceId ? bookingData.service : null
  const slot = slotId ? bookingData.slot : null

  const todayDow = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
  const todayHours = clinic?.operating_hours_detailed?.[todayDow]

  return (
    <div className="space-y-4 sticky top-6">
      {/* Clinic info card */}
      {clinic ? (
        <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-lhc-primary/8 to-lhc-primary/3 px-5 pt-5 pb-4 border-b border-lhc-border">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden">
                {clinic.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinic.logo_url} alt={clinic.name} className="w-full h-full object-cover" />
                ) : (
                  <DefaultAvatar variant="clinic" className="w-full h-full rounded-xl" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lhc-text-main text-sm leading-snug">{clinic.name}</p>
                {todayHours && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1',
                      todayHours.closed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700',
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', todayHours.closed ? 'bg-red-500' : 'bg-green-500')} />
                    {todayHours.closed
                      ? 'Closed today'
                      : todayHours.open && todayHours.close
                        ? `Open · ${fmt12(todayHours.open)} – ${fmt12(todayHours.close)}`
                        : 'Open today'}
                  </span>
                )}
              </div>
            </div>
            {currentStep > 1 && (
              <button
                onClick={() => onChangeStep(1)}
                className="text-[11px] font-semibold text-lhc-primary hover:underline mt-2"
              >
                Change clinic
              </button>
            )}
          </div>
          <div className="px-5 py-4 space-y-2.5 text-sm">
            {(clinic.address_line1 || clinic.city) && (
              <div className="flex items-start gap-2.5 text-lhc-text-muted">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-lhc-primary/60" />
                <span className="leading-snug text-xs">{[clinic.address_line1, clinic.city, clinic.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {clinic.phone && (
              <div className="flex items-center gap-2.5 text-lhc-text-muted">
                <Phone className="w-4 h-4 flex-shrink-0 text-lhc-primary/60" />
                <a href={`tel:${clinic.phone}`} className="text-xs hover:text-lhc-primary transition-colors">{clinic.phone}</a>
              </div>
            )}
            {clinic.email && (
              <div className="flex items-center gap-2.5 text-lhc-text-muted">
                <Mail className="w-4 h-4 flex-shrink-0 text-lhc-primary/60" />
                <a href={`mailto:${clinic.email}`} className="text-xs hover:text-lhc-primary transition-colors truncate">{clinic.email}</a>
              </div>
            )}
            {clinic.website && (
              <div className="flex items-center gap-2.5 text-lhc-text-muted">
                <Globe className="w-4 h-4 flex-shrink-0 text-lhc-primary/60" />
                <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="text-xs hover:text-lhc-primary transition-colors truncate">
                  {clinic.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : clinicId ? (
        <div className="bg-white rounded-2xl border border-lhc-border p-5 shadow-sm animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-lhc-border/60" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-lhc-border/60 rounded w-3/4" />
              <div className="h-2.5 bg-lhc-border/40 rounded w-1/2" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 bg-lhc-border/40 rounded mb-2" />
          ))}
        </div>
      ) : null}

      {/* Your selection summary */}
      {currentStep >= 2 && (doctor || service || slot) && (
        <div className="bg-white border border-lhc-border rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide">Your Selection</p>

          {doctor && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-lhc-primary/10 flex items-center justify-center text-lhc-primary text-xs font-bold flex-shrink-0 overflow-hidden">
                  {doctor.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doctor.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(`${doctor.first_name} ${doctor.last_name}`)
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-lhc-text-main">Dr. {doctor.first_name} {doctor.last_name}</p>
                  {doctor.specialty && <p className="text-xs text-lhc-primary">{doctor.specialty}</p>}
                </div>
              </div>
              {currentStep > 2 && (
                <button onClick={() => onChangeStep(2)} className="text-[10px] font-semibold text-lhc-primary hover:underline">
                  Change
                </button>
              )}
            </div>
          )}

          {service && (
            <div className="flex items-center justify-between pt-1 border-t border-lhc-border/60">
              <div className="flex items-center gap-2 text-xs text-lhc-text-muted">
                <Stethoscope className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0" />
                <span>{service.name}</span>
                {service.duration_minutes && (
                  <span className="text-lhc-text-muted/60">({service.duration_minutes} min)</span>
                )}
              </div>
              {currentStep > 3 && (
                <button onClick={() => onChangeStep(3)} className="text-[10px] font-semibold text-lhc-primary hover:underline">
                  Change
                </button>
              )}
            </div>
          )}

          {slot && (
            <>
              <div className="flex items-center gap-2 text-xs text-lhc-text-muted pt-1 border-t border-lhc-border/60">
                <CalendarDays className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0" />
                {fmtDate(slot.appointment_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 text-xs text-lhc-text-muted">
                <Clock className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0" />
                <span className="font-semibold text-lhc-primary">{fmt12(slot.start_time)} – {fmt12(slot.end_time)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Booking tips */}
      <div className="bg-lhc-primary/5 border border-lhc-primary/15 rounded-2xl p-4">
        <p className="font-semibold text-lhc-primary text-sm mb-2 flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4" /> Booking Tips
        </p>
        <ul className="space-y-1.5 text-xs text-lhc-text-muted">
          <li className="flex items-start gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />
            Browse clinics and doctors without an account.
          </li>
          <li className="flex items-start gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />
            Sign in when you're ready to confirm your booking.
          </li>
          <li className="flex items-start gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />
            Cancellations require 24 hours notice.
          </li>
          <li className="flex items-start gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />
            You earn loyalty points for every completed visit.
          </li>
        </ul>
      </div>
    </div>
  )
}
