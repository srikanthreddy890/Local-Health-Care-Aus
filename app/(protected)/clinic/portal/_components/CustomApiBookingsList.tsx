'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Globe, Loader2, CalendarDays, Clock, User, Star } from 'lucide-react'
import CustomApiAttendanceButton from './CustomApiAttendanceButton'

interface CustomApiBooking {
  id: string
  external_booking_id: string | null
  external_doctor_id: string | null
  patient_id: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  doctor_name: string | null
  service_name: string | null
  service_performed: string | null
  appointment_date: string
  appointment_time: string | null
  booking_status: string | null
  booking_notes: string | null
  attendance_status: string | null
  service_points: number | null
  points_awarded: boolean | null
  created_at: string
}

interface Props {
  clinicId: string
  userId?: string
}

type TabFilter = 'upcoming' | 'past' | 'all'

export default function CustomApiBookingsList({ clinicId, userId }: Props) {
  const [tab, setTab] = useState<TabFilter>('upcoming')

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['custom-api-bookings', clinicId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data } = await supabase
        .from('custom_api_bookings')
        .select(
          'id, external_booking_id, external_doctor_id, patient_id, ' +
          'patient_first_name, patient_last_name, doctor_name, service_name, service_performed, ' +
          'appointment_date, appointment_time, booking_status, booking_notes, ' +
          'attendance_status, service_points, points_awarded, created_at'
        )
        .eq('clinic_id', clinicId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
      return (data ?? []) as CustomApiBooking[]
    },
    enabled: !!clinicId,
  })

  const today = new Date().toISOString().split('T')[0]

  const filtered = useMemo(() => {
    if (!bookings) return []
    switch (tab) {
      case 'upcoming':
        return bookings.filter((b) => b.appointment_date >= today)
      case 'past':
        return bookings.filter((b) => b.appointment_date < today)
      default:
        return bookings
    }
  }, [bookings, tab, today])

  function formatTime(time: string | null): string {
    if (!time) return ''
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
  }

  function formatDate(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  async function handleNoShow(bookingId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    await supabase
      .from('custom_api_bookings')
      .update({ attendance_status: 'no_show' })
      .eq('id', bookingId)
    refetch()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lhc-text-main flex items-center gap-2">
          <Globe className="w-5 h-5 text-lhc-primary" />
          Custom API Bookings
        </CardTitle>

        {/* Tab filter */}
        <div className="flex gap-1 mt-2">
          {(['upcoming', 'past', 'all'] as TabFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                tab === t
                  ? 'bg-lhc-primary text-white'
                  : 'bg-lhc-border/40 text-lhc-text-muted hover:bg-lhc-border'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-lhc-text-muted text-sm text-center py-8">
            No {tab === 'all' ? '' : tab + ' '}bookings found.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const patientName = [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown'
              const isPending = b.attendance_status === 'pending' || !b.attendance_status

              return (
                <div
                  key={b.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-lhc-border hover:bg-lhc-surface/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-lhc-text-main">{patientName}</span>
                      <StatusBadge status={b.booking_status} />
                      <AttendanceBadge status={b.attendance_status} />
                      {b.points_awarded && b.service_points ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          <Star className="w-3 h-3 mr-0.5" />
                          {b.service_points} pts
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-lhc-text-muted">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(b.appointment_date)}
                      </span>
                      {b.appointment_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(b.appointment_time)}
                        </span>
                      )}
                      {b.doctor_name && <span>Dr. {b.doctor_name}</span>}
                      {b.service_name && <span>{b.service_name}</span>}
                    </div>

                    {b.service_performed && (
                      <p className="text-xs text-green-700">Service: {b.service_performed}</p>
                    )}

                    {b.external_booking_id && (
                      <p className="text-[10px] text-lhc-text-muted font-mono">
                        Ref: {b.external_booking_id}
                      </p>
                    )}
                  </div>

                  {/* Actions for pending bookings */}
                  {isPending && b.appointment_date >= today && (
                    <div className="flex gap-1.5 shrink-0">
                      <CustomApiAttendanceButton
                        bookingId={b.id}
                        clinicId={clinicId}
                        patientId={b.patient_id ?? undefined}
                        patientName={patientName}
                        markedBy={userId ?? ''}
                        onSuccess={() => refetch()}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 text-xs"
                        onClick={() => handleNoShow(b.id)}
                      >
                        No Show
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const colors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <Badge className={`text-[10px] ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </Badge>
  )
}

function AttendanceBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') return null
  const colors: Record<string, string> = {
    attended: 'bg-green-100 text-green-800 border-green-200',
    no_show: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <Badge className={`text-[10px] ${colors[status] ?? ''}`}>
      {status === 'no_show' ? 'No Show' : status}
    </Badge>
  )
}
