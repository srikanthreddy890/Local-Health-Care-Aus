'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, MapPin, Phone, Mail, CalendarX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn, getInitials, fmtDate, fmt12 } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface NormalizedBooking {
  id: string
  source: 'bookings' | 'centaur' | 'custom'
  clinic_id: string | null
  booking_reference: string | null
  status: string
  appointment_date: string | null
  start_time: string | null
  end_time: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  doctor_name: string | null
  service_name: string | null
  patient_notes: string | null
  cancellation_reason: string | null
  created_at: string
}

interface ClinicDetails {
  id: string
  name: string
  logo_url: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
}

const CANCELLATION_REASONS = [
  'Change of plans',
  'Found another provider',
  'Feeling better',
  'Scheduling conflict',
  'Cost concerns',
  'Other',
]


function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const variant =
    s === 'confirmed' ? 'success' :
    s === 'pending'   ? 'warning' :
    s === 'cancelled' ? 'destructive' :
    'default'
  return (
    <Badge variant={variant as 'success' | 'warning' | 'destructive' | 'default'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

interface AppointmentsListProps {
  userId: string
}

const PAGE_SIZE = 10

export default function AppointmentsList({ userId }: AppointmentsListProps) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [upcoming, setUpcoming] = useState<NormalizedBooking[]>([])
  const [past, setPast] = useState<NormalizedBooking[]>([])
  const [pastPage, setPastPage] = useState(0)
  const [pastHasMore, setPastHasMore] = useState(true)
  const [pastLoaded, setPastLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingPast, setLoadingPast] = useState(false)
  const [clinicMap, setClinicMap] = useState<Record<string, ClinicDetails>>({})
  // Ref mirrors clinicMap so fetchClinics stays stable without closing over state
  const clinicMapRef = useRef<Record<string, ClinicDetails>>({})
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState<string>('')
  const [cancelOther, setCancelOther] = useState('')
  const [submittingCancel, setSubmittingCancel] = useState(false)

  // Stable fetch — uses ref so it never triggers re-creation when clinicMap updates,
  // which would cause fetchUpcoming to be re-created and loop.
  const fetchClinics = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !clinicMapRef.current[id])
    if (missing.length === 0) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('clinics_public')
      .select('id, name, logo_url, address_line1, city, state, phone, email')
      .in('id', missing)
    if (data) {
      const map: Record<string, ClinicDetails> = {}
      for (const c of data) map[c.id] = c
      clinicMapRef.current = { ...clinicMapRef.current, ...map }
      setClinicMap((prev) => ({ ...prev, ...map }))
    }
  }, []) // stable — no state deps

  const fetchUpcoming = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    // bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookingsData } = await (supabase as any)
      .from('bookings')
      .select('id, clinic_id, booking_reference, status, appointment_date, start_time, end_time, patient_first_name, patient_last_name, doctor_name, service_name, patient_notes, cancellation_reason, created_at')
      .eq('patient_id', userId)
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })

    // centaur_bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: centaurData } = await (supabase as any)
      .from('centaur_bookings')
      .select('id, clinic_id, booking_status, created_at, appointment_date, appointment_time, patient_first_name, patient_last_name, booking_notes')
      .eq('local_patient_id', userId)
      .gte('appointment_date', today)
      .not('booking_status', 'in', '("cancelled","completed","no_show")')
      .order('appointment_date', { ascending: true })

    // custom_api_bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customData } = await (supabase as any)
      .from('custom_api_bookings')
      .select('id, clinic_id, booking_status, created_at, appointment_date, appointment_time, patient_first_name, patient_last_name, doctor_name, service_name, booking_notes')
      .eq('patient_id', userId)
      .gte('appointment_date', today)
      .not('booking_status', 'in', '("cancelled","completed","no_show")')
      .order('appointment_date', { ascending: true })

    const normalized: NormalizedBooking[] = []

    if (bookingsData) {
      for (const b of bookingsData) {
        normalized.push({
          id: b.id,
          source: 'bookings',
          clinic_id: b.clinic_id,
          booking_reference: b.booking_reference,
          status: b.status,
          appointment_date: b.appointment_date,
          start_time: b.start_time,
          end_time: b.end_time,
          patient_first_name: b.patient_first_name,
          patient_last_name: b.patient_last_name,
          doctor_name: b.doctor_name,
          service_name: b.service_name,
          patient_notes: b.patient_notes,
          cancellation_reason: b.cancellation_reason,
          created_at: b.created_at,
        })
      }
    }
    if (centaurData) {
      for (const b of centaurData) {
        normalized.push({
          id: b.id,
          source: 'centaur',
          clinic_id: b.clinic_id ?? null,
          booking_reference: null,
          status: b.booking_status ?? 'pending',
          appointment_date: b.appointment_date ?? null,
          start_time: b.appointment_time ?? null,
          end_time: null,
          patient_first_name: b.patient_first_name ?? null,
          patient_last_name: b.patient_last_name ?? null,
          doctor_name: null,
          service_name: null,
          patient_notes: b.booking_notes ?? null,
          cancellation_reason: null,
          created_at: b.created_at,
        })
      }
    }
    if (customData) {
      for (const b of customData) {
        normalized.push({
          id: b.id,
          source: 'custom',
          clinic_id: b.clinic_id ?? null,
          booking_reference: null,
          status: b.booking_status ?? 'pending',
          appointment_date: b.appointment_date ?? null,
          start_time: b.appointment_time ?? null,
          end_time: null,
          patient_first_name: b.patient_first_name ?? null,
          patient_last_name: b.patient_last_name ?? null,
          doctor_name: b.doctor_name ?? null,
          service_name: b.service_name ?? null,
          patient_notes: b.booking_notes ?? null,
          cancellation_reason: null,
          created_at: b.created_at,
        })
      }
    }

    setUpcoming(normalized)
    const clinicIds = [...new Set(normalized.map((b) => b.clinic_id).filter(Boolean) as string[])]
    fetchClinics(clinicIds)
    setLoading(false)
  }, [userId, fetchClinics])

  const fetchPast = useCallback(async (page: number) => {
    if (page === 0) setLoadingPast(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data }, { data: pastCentaur }, { data: pastCustom }] = await Promise.all([
      (supabase as any)
        .from('bookings')
        .select('id, clinic_id, booking_reference, status, appointment_date, start_time, end_time, patient_first_name, patient_last_name, doctor_name, service_name, patient_notes, cancellation_reason, created_at')
        .eq('patient_id', userId)
        .lt('appointment_date', today)
        .order('appointment_date', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
      // Only fetch API bookings on first page to avoid complexity with pagination
      page === 0
        ? (supabase as any)
            .from('centaur_bookings')
            .select('id, clinic_id, booking_status, created_at, appointment_date, appointment_time, patient_first_name, patient_last_name, booking_notes')
            .eq('local_patient_id', userId)
            .lt('appointment_date', today)
            .order('appointment_date', { ascending: false })
            .limit(PAGE_SIZE)
        : { data: null },
      page === 0
        ? (supabase as any)
            .from('custom_api_bookings')
            .select('id, clinic_id, booking_status, created_at, appointment_date, appointment_time, patient_first_name, patient_last_name, doctor_name, service_name, booking_notes')
            .eq('patient_id', userId)
            .lt('appointment_date', today)
            .order('appointment_date', { ascending: false })
            .limit(PAGE_SIZE)
        : { data: null },
    ])

    const normalized: NormalizedBooking[] = []

    if (data) {
      for (const b of data) {
        normalized.push({
          id: b.id,
          source: 'bookings' as const,
          clinic_id: b.clinic_id,
          booking_reference: b.booking_reference,
          status: b.status,
          appointment_date: b.appointment_date,
          start_time: b.start_time,
          end_time: b.end_time,
          patient_first_name: b.patient_first_name,
          patient_last_name: b.patient_last_name,
          doctor_name: b.doctor_name,
          service_name: b.service_name,
          patient_notes: b.patient_notes,
          cancellation_reason: b.cancellation_reason,
          created_at: b.created_at,
        })
      }
    }
    if (pastCentaur) {
      for (const b of pastCentaur) {
        normalized.push({
          id: b.id,
          source: 'centaur' as const,
          clinic_id: b.clinic_id ?? null,
          booking_reference: null,
          status: b.booking_status ?? 'completed',
          appointment_date: b.appointment_date ?? null,
          start_time: b.appointment_time ?? null,
          end_time: null,
          patient_first_name: b.patient_first_name ?? null,
          patient_last_name: b.patient_last_name ?? null,
          doctor_name: null,
          service_name: null,
          patient_notes: b.booking_notes ?? null,
          cancellation_reason: null,
          created_at: b.created_at,
        })
      }
    }
    if (pastCustom) {
      for (const b of pastCustom) {
        normalized.push({
          id: b.id,
          source: 'custom' as const,
          clinic_id: b.clinic_id ?? null,
          booking_reference: null,
          status: b.booking_status ?? 'completed',
          appointment_date: b.appointment_date ?? null,
          start_time: b.appointment_time ?? null,
          end_time: null,
          patient_first_name: b.patient_first_name ?? null,
          patient_last_name: b.patient_last_name ?? null,
          doctor_name: b.doctor_name ?? null,
          service_name: b.service_name ?? null,
          patient_notes: b.booking_notes ?? null,
          cancellation_reason: null,
          created_at: b.created_at,
        })
      }
    }

    // Sort by appointment_date descending
    normalized.sort((a, b) => (b.appointment_date ?? '').localeCompare(a.appointment_date ?? ''))

    setPast((prev) => (page === 0 ? normalized : [...prev, ...normalized]))
    setPastHasMore((data?.length ?? 0) === PAGE_SIZE)
    const clinicIds = [...new Set(normalized.map((b) => b.clinic_id).filter(Boolean) as string[])]
    fetchClinics(clinicIds)
    setLoadingPast(false)
  }, [userId, fetchClinics])

  useEffect(() => {
    fetchUpcoming()
  }, [fetchUpcoming])

  const handleTabChange = (newTab: 'upcoming' | 'past') => {
    setTab(newTab)
    if (newTab === 'past' && !pastLoaded) {
      setPastLoaded(true)
      fetchPast(0)
    }
  }

  const handleLoadMorePast = () => {
    const nextPage = pastPage + 1
    setPastPage(nextPage)
    fetchPast(nextPage)
  }

  const canCancel = (booking: NormalizedBooking) => {
    // Only standard bookings can be cancelled online; API bookings must be cancelled via the clinic
    if (booking.source !== 'bookings') return false
    if (!['pending', 'confirmed'].includes(booking.status.toLowerCase())) return false
    if (!booking.appointment_date) return false
    const apptDateTime = new Date(`${booking.appointment_date}T${booking.start_time ?? '00:00:00'}`)
    const now = new Date()
    const diffHours = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours > 24
  }

  const handleCancelConfirm = async (bookingId: string) => {
    const reason = cancelReason === 'Other' ? cancelOther : cancelReason
    if (!reason) {
      toast({ title: 'Please select a cancellation reason', variant: 'destructive' })
      return
    }
    setSubmittingCancel(true)
    const supabase = createClient()
    const { error } = await supabase.functions.invoke('cancel-appointment', {
      body: { booking_id: bookingId, cancellation_reason: reason },
    })
    setSubmittingCancel(false)
    if (error) {
      toast({ title: 'Cancellation failed', description: error.message, variant: 'destructive' })
    } else {
      toast.success('Appointment cancelled')
      setCancellingId(null)
      setCancelReason('')
      setCancelOther('')
      fetchUpcoming()
    }
  }

  const bookings = tab === 'upcoming' ? upcoming : past

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-lhc-text-main">My Appointments</h2>
        <button
          onClick={() => { fetchUpcoming(); if (tab === 'past') fetchPast(0) }}
          className="flex items-center gap-1.5 border border-lhc-border hover:border-lhc-primary text-lhc-text-muted hover:text-lhc-primary rounded-xl px-3 py-1.5 text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Toggle tabs */}
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              tab === t
                ? 'bg-lhc-primary text-white border-lhc-primary'
                : 'border-lhc-border text-lhc-text-muted hover:border-lhc-primary hover:text-lhc-primary'
            )}
          >
            {t === 'upcoming' ? 'Upcoming' : 'Past'}
          </button>
        ))}
      </div>

      {(loading && tab === 'upcoming') || (loadingPast && tab === 'past') ? (
        <div className="text-sm text-lhc-text-muted py-8 text-center">Loading appointments...</div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarX className="w-12 h-12 text-lhc-text-muted/30 mb-3" />
          <p className="font-semibold text-lhc-text-main mb-1">
            {tab === 'upcoming' ? 'No Upcoming Appointments' : 'No Past Appointments'}
          </p>
          <p className="text-sm text-lhc-text-muted">
            {tab === 'upcoming'
              ? "You don't have any upcoming appointments scheduled."
              : "You don't have any past appointments."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const clinic = booking.clinic_id ? clinicMap[booking.clinic_id] : null
            const isCancelling = cancellingId === booking.id
            return (
              <div
                key={`${booking.source}-${booking.id}`}
                className="bg-white rounded-2xl border border-lhc-border p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-lhc-primary/10 flex items-center justify-center text-lhc-primary font-bold text-sm flex-shrink-0">
                    {clinic?.logo_url ? (
                      <img src={clinic.logo_url} alt={clinic.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      getInitials(clinic?.name ?? 'Clinic')
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-lhc-text-main">{clinic?.name ?? 'Clinic'}</p>
                        {booking.booking_reference && (
                          <p className="text-xs text-lhc-primary font-medium mt-0.5">{booking.booking_reference}</p>
                        )}
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-lhc-text-muted">
                      {booking.appointment_date && (
                        <p className="font-medium text-lhc-text-main">
                          {fmtDate(booking.appointment_date)}
                          {(booking.start_time || booking.end_time) && (
                            <span className="ml-2 font-normal text-lhc-text-muted">
                              {fmt12(booking.start_time)}
                              {booking.end_time && ` – ${fmt12(booking.end_time)}`}
                            </span>
                          )}
                        </p>
                      )}
                      {(booking.patient_first_name || booking.patient_last_name) && (
                        <p>Patient: {[booking.patient_first_name, booking.patient_last_name].filter(Boolean).join(' ')}</p>
                      )}
                      {booking.doctor_name && <p>Doctor: {booking.doctor_name}</p>}
                      {booking.service_name && <p>Service: {booking.service_name}</p>}
                    </div>

                    {/* Clinic Details */}
                    {clinic && (
                      <>
                        <div className="mt-3 pt-3 border-t border-lhc-border space-y-1 text-sm text-lhc-text-muted">
                          {(clinic.address_line1 || clinic.city || clinic.state) && (
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>
                                {[clinic.address_line1, clinic.city, clinic.state].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          {clinic.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              <a href={`tel:${clinic.phone}`} className="hover:text-lhc-primary">
                                {clinic.phone}
                              </a>
                            </div>
                          )}
                          {clinic.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                              <a href={`mailto:${clinic.email}`} className="hover:text-lhc-primary truncate">
                                {clinic.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    {tab === 'upcoming' && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {canCancel(booking) && !isCancelling && (
                          <button
                            onClick={() => { setCancellingId(booking.id); setCancelReason(''); setCancelOther('') }}
                            className="border border-lhc-border hover:border-red-400 text-lhc-text-muted hover:text-red-500 rounded-xl px-3 py-1.5 text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}

                    {/* Inline cancel form */}
                    {isCancelling && (
                      <div className="mt-3 border border-red-200 bg-red-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-lhc-text-main mb-2">Select cancellation reason:</p>
                        <div className="space-y-1.5">
                          {CANCELLATION_REASONS.map((reason) => (
                            <label key={reason} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name={`cancel-reason-${booking.id}`}
                                value={reason}
                                checked={cancelReason === reason}
                                onChange={() => setCancelReason(reason)}
                                className="accent-red-500"
                              />
                              {reason}
                            </label>
                          ))}
                        </div>
                        {cancelReason === 'Other' && (
                          <input
                            type="text"
                            value={cancelOther}
                            onChange={(e) => setCancelOther(e.target.value)}
                            placeholder="Please specify..."
                            className="mt-2 w-full border border-lhc-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                          />
                        )}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleCancelConfirm(booking.id)}
                            disabled={submittingCancel}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-1.5 text-sm font-semibold disabled:opacity-50 transition-colors"
                          >
                            {submittingCancel ? 'Cancelling...' : 'Confirm Cancel'}
                          </button>
                          <button
                            onClick={() => setCancellingId(null)}
                            className="border border-lhc-border text-lhc-text-muted hover:text-lhc-text-main rounded-xl px-4 py-1.5 text-sm transition-colors"
                          >
                            Keep
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {tab === 'past' && pastHasMore && (
            <div className="text-center">
              <button
                onClick={handleLoadMorePast}
                className="border border-lhc-border hover:border-lhc-primary text-lhc-text-muted hover:text-lhc-primary rounded-xl px-5 py-2 text-sm transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
