'use client'

import type React from 'react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Users, Calendar, Gift, Clock, Phone,
  Loader2, AlertTriangle, DollarSign, CheckCircle2, Eye, MessageSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type BookingSource = 'standard' | 'centaur' | 'custom_api'

interface NormalizedBooking {
  id: string
  type: BookingSource
  status: string
  time: string
  patientName: string
  phone: string
  doctorName: string
  serviceName: string
  duration?: number
}

function bookingTypeBadge(type: BookingSource) {
  if (type === 'centaur') return <Badge variant="purple">Centaur</Badge>
  if (type === 'custom_api') return <Badge variant="orange">Custom API</Badge>
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Standard</Badge>
}

function statusBadge(status: string) {
  if (status === 'confirmed') return <Badge variant="success" className="text-[10px] px-1.5 py-0">Confirmed</Badge>
  if (status === 'completed') return <Badge variant="success" className="text-[10px] px-1.5 py-0">Completed</Badge>
  if (status === 'pending') return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Pending</Badge>
  if (status === 'no_show') return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">No Show</Badge>
  if (status === 'cancelled') return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Cancelled</Badge>
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{status}</Badge>
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatTodayDate() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ClinicDashboard({
  clinicId,
}: {
  clinicId: string
  userId: string
}) {
  const [visibleCount, setVisibleCount] = useState(10)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all')
  const queryClient = useQueryClient()

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['clinic-dashboard', clinicId],
    queryFn: async () => {
      if (!clinicId) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const today = new Date().toISOString().split('T')[0]

      const [
        { data: loyaltyTxns },
        { data: allPatients },
        { data: standardBookings },
        { data: centaurBookings },
        { data: customBookings },
        { count: pendingQuotesCount },
      ] = await Promise.all([
        supabase
          .from('loyalty_transactions')
          .select('points')
          .eq('clinic_id', clinicId)
          .eq('transaction_type', 'earned'),

        supabase
          .from('bookings')
          .select('patient_id')
          .eq('clinic_id', clinicId),

        supabase
          .from('bookings')
          .select('id, status, start_time, doctor_name, service_name, patient_first_name, patient_last_name')
          .eq('clinic_id', clinicId)
          .eq('appointment_date', today)
          .in('status', ['pending', 'confirmed'])
          .order('start_time'),

        supabase
          .from('centaur_bookings')
          .select('id, booking_status, appointment_time, booking_notes, patient_first_name, patient_last_name, patient_mobile')
          .eq('clinic_id', clinicId)
          .eq('appointment_date', today)
          .eq('booking_status', 'confirmed'),

        supabase
          .from('custom_api_bookings')
          .select('id, booking_status, appointment_time, booking_notes, patient_first_name, patient_last_name, patient_mobile, doctor_name')
          .eq('clinic_id', clinicId)
          .eq('appointment_date', today)
          .in('booking_status', ['pending', 'confirmed']),

        supabase
          .from('quote_requests')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .in('status', ['pending', 'in_review']),
      ])

      const pointsDistributed = (loyaltyTxns ?? []).reduce(
        (s: number, t: Record<string, unknown>) => s + ((t.points as number) ?? 0),
        0,
      )
      const totalPatients = new Set(
        (allPatients ?? []).map((b: Record<string, unknown>) => b.patient_id),
      ).size

      const normalize = (
        items: Record<string, unknown>[] | null,
        type: BookingSource,
        getTime: (item: Record<string, unknown>) => string | null,
        getDoctor: (item: Record<string, unknown>) => string,
        getService: (item: Record<string, unknown>) => string,
        getStatus: (item: Record<string, unknown>) => string,
        getPatientName: (item: Record<string, unknown>) => string,
        getPhone: (item: Record<string, unknown>) => string,
      ): NormalizedBooking[] =>
        (items ?? []).map((b: Record<string, unknown>) => ({
          id: b.id as string,
          type,
          status: getStatus(b),
          time: (getTime(b) ?? '') as string,
          patientName: getPatientName(b) || 'Unknown',
          phone: getPhone(b),
          doctorName: getDoctor(b),
          serviceName: getService(b),
        }))

      const todaysBookings: NormalizedBooking[] = [
        ...normalize(
          (standardBookings ?? []) as Record<string, unknown>[],
          'standard',
          (b) => (b.start_time as string | undefined) ?? null,
          (b) => (b.doctor_name as string | undefined) ?? 'Unknown',
          (b) => (b.service_name as string | undefined) ?? '',
          (b) => (b.status as string | undefined) ?? '',
          (b) => [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' '),
          () => '',
        ),
        ...normalize(
          (centaurBookings ?? []) as Record<string, unknown>[],
          'centaur',
          (b) => (b.appointment_time as string | undefined) ?? null,
          () => 'Unknown',
          (b) => (b.booking_notes as string | undefined) ?? '',
          (b) => (b.booking_status as string | undefined) ?? '',
          (b) => [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' '),
          (b) => (b.patient_mobile as string | undefined) ?? '',
        ),
        ...normalize(
          (customBookings ?? []) as Record<string, unknown>[],
          'custom_api',
          (b) => (b.appointment_time as string | undefined) ?? null,
          (b) => (b.doctor_name as string | undefined) ?? 'Unknown',
          (b) => (b.booking_notes as string | undefined) ?? '',
          (b) => (b.booking_status as string | undefined) ?? '',
          (b) => [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' '),
          (b) => (b.patient_mobile as string | undefined) ?? '',
        ),
      ].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

      return { pointsDistributed, totalPatients, todaysBookings, pendingQuotes: pendingQuotesCount ?? 0 }
    },
    enabled: !!clinicId,
    refetchInterval: 60_000,
  })

  // Confirm / Decline mutations
  const confirmBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-dashboard', clinicId] })
      toast.success('Appointment confirmed.')
    },
    onError: () => toast.error('Failed to confirm appointment.'),
  })

  const declineBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-dashboard', clinicId] })
      toast.success('Appointment declined.')
    },
    onError: () => toast.error('Failed to decline appointment.'),
  })

  const todaysBookings = dashboardData?.todaysBookings ?? []
  const pendingBookings = todaysBookings.filter((b) => b.status === 'pending')
  const confirmedBookings = todaysBookings.filter((b) => b.status === 'confirmed')

  const filteredPending = statusFilter === 'confirmed' ? [] : pendingBookings
  const filteredConfirmed = statusFilter === 'pending' ? [] : confirmedBookings
  const visibleConfirmed = filteredConfirmed.slice(0, visibleCount)
  const needsActionCount = pendingBookings.length

  return (
    <div className="space-y-6">
      {/* D2 — Color-coded stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Gift className="w-4.5 h-4.5" />}
          iconBg="bg-[#F3F4F6]"
          iconColor="text-[#6B7280]"
          label="Points Distributed"
          sublabel="This month"
          value={dashboardData?.pointsDistributed?.toLocaleString() ?? '—'}
          valueColor="text-lhc-text-main"
          loading={dashboardLoading}
        />
        <StatCard
          icon={<Users className="w-4.5 h-4.5" />}
          iconBg="bg-[#F0FDF4]"
          iconColor="text-[#059669]"
          label="Total Patients"
          sublabel="Registered"
          value={dashboardData?.totalPatients?.toLocaleString() ?? '—'}
          valueColor="text-[#059669]"
          loading={dashboardLoading}
        />
        <StatCard
          icon={<Calendar className="w-4.5 h-4.5" />}
          iconBg="bg-[#EFF6FF]"
          iconColor="text-[#1E40AF]"
          label="Today's Bookings"
          sublabel={formatTodayDate()}
          value={String(todaysBookings.length)}
          valueColor="text-[#1E40AF]"
          loading={dashboardLoading}
        />
        <StatCard
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          iconBg="bg-[#FFFBEB]"
          iconColor="text-[#D97706]"
          label="Pending Confirmations"
          sublabel="Needs action"
          sublabelColor="text-[#D97706]"
          value={String(pendingBookings.length)}
          valueColor="text-[#D97706]"
          loading={dashboardLoading}
        />
        <StatCard
          icon={<DollarSign className="w-4.5 h-4.5" />}
          iconBg="bg-[#F3F4F6]"
          iconColor="text-[#6B7280]"
          label="Pending Quotes"
          sublabel="No action needed"
          value={String(dashboardData?.pendingQuotes ?? 0)}
          valueColor="text-lhc-text-main"
          loading={dashboardLoading}
          href="/clinic/portal/quotes"
        />
      </div>

      {/* D3-D5 — Today's schedule with filters */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-lhc-primary" />
            <h2 className="text-base font-semibold text-lhc-text-main">Today&apos;s Schedule</h2>
            <span className="text-xs text-lhc-text-muted">{formatTodayDate()}</span>
          </div>
          {/* D5 — Filter pills */}
          <div className="flex items-center gap-1.5">
            {(['all', 'pending', 'confirmed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors capitalize',
                  statusFilter === filter
                    ? 'bg-[#00A86B] text-white'
                    : 'border border-[var(--color-border-secondary,#E5E7EB)] text-[#6B7280] hover:bg-[#F9FAFB]',
                )}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="px-5 pb-5 space-y-4">
          {dashboardLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
            </div>
          ) : todaysBookings.length === 0 ? (
            <p className="text-lhc-text-muted text-sm text-center py-6">No bookings for today.</p>
          ) : (
            <>
              {/* Pending section */}
              {filteredPending.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#D97706] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Pending Confirmations ({filteredPending.length})
                  </h3>
                  <div className="space-y-2">
                    {filteredPending.map((b) => (
                      <BookingRow
                        key={b.id}
                        booking={b}
                        variant="pending"
                        onConfirm={() => confirmBooking.mutate(b.id)}
                        onDecline={() => declineBooking.mutate(b.id)}
                        confirming={confirmBooking.isPending}
                        declining={declineBooking.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmed section */}
              {filteredConfirmed.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#059669] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmed ({filteredConfirmed.length})
                  </h3>
                  <div className="space-y-2">
                    {visibleConfirmed.map((b) => (
                      <BookingRow key={b.id} booking={b} variant="confirmed" />
                    ))}
                  </div>
                  {filteredConfirmed.length > visibleCount && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setVisibleCount((n) => n + 10)}
                    >
                      Load 10 More
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>

        {/* D5 — Footer summary */}
        {!dashboardLoading && todaysBookings.length > 0 && (
          <div className="border-t border-[var(--color-border-tertiary,#E5E7EB)] px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-lhc-text-muted">
              {todaysBookings.length} appointment{todaysBookings.length !== 1 ? 's' : ''} today
              {needsActionCount > 0 && <> &middot; <span className="text-[#D97706]">{needsActionCount} needs action</span></>}
            </span>
            <Link href="/clinic/portal/appointments" className="text-xs text-[#00A86B] font-medium hover:underline">
              View full schedule &rarr;
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── D2 — Stat Card ──────────────────────────────────────────── */
function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  sublabelColor,
  value,
  valueColor,
  loading,
  href,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  sublabel?: string
  sublabelColor?: string
  value: string
  valueColor: string
  loading?: boolean
  href?: string
}) {
  const content = (
    <CardContent className="pt-4 pb-3.5 px-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg, iconColor)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-lhc-text-muted truncate leading-tight">{label}</p>
          {loading ? (
            <div className="h-7 w-10 bg-lhc-border rounded animate-pulse mt-0.5" />
          ) : (
            <p className={cn('text-[26px] font-medium leading-tight mt-0.5', valueColor)}>{value}</p>
          )}
          {sublabel && (
            <p className={cn('text-[10px] leading-tight mt-0.5', sublabelColor || 'text-lhc-text-muted')}>{sublabel}</p>
          )}
        </div>
      </div>
    </CardContent>
  )

  return (
    <Card className={cn('border-[0.5px] rounded-xl', href ? 'hover:border-lhc-primary/50 transition-colors' : undefined)}>
      {href ? <Link href={href}>{content}</Link> : content}
    </Card>
  )
}

/* ── D3/D4 — Booking Row ─────────────────────────────────────── */
function BookingRow({
  booking,
  variant,
  onConfirm,
  onDecline,
  confirming,
  declining,
}: {
  booking: NormalizedBooking
  variant: 'pending' | 'confirmed'
  onConfirm?: () => void
  onDecline?: () => void
  confirming?: boolean
  declining?: boolean
}) {
  const isPending = variant === 'pending'
  const initials = getInitials(booking.patientName)

  return (
    <div
      className={cn(
        'flex items-center gap-3 border rounded-[10px] px-3 py-2.5 mx-0',
        isPending
          ? 'border-[#FDE68A] bg-[#FFFBEB] dark:border-yellow-800 dark:bg-yellow-950/20'
          : 'border-[#A7F3D0] bg-[#F0FDF4] dark:border-green-800 dark:bg-green-950/20',
      )}
    >
      {/* Time column */}
      <div className="min-w-[54px] text-[13px] font-bold tabular-nums text-lhc-text-main shrink-0">
        {booking.time?.slice(0, 5) || '—'}
      </div>

      {/* Divider */}
      <div className={cn(
        'w-px h-9 shrink-0',
        isPending ? 'bg-[#FDE68A]' : 'bg-[#A7F3D0]',
      )} />

      {/* Avatar */}
      <div
        className={cn(
          'w-[34px] h-[34px] rounded-full flex items-center justify-center text-xs font-medium shrink-0',
          isPending
            ? 'bg-[#F3F4F6] text-[#6B7280]'
            : 'bg-[#DCFCE7] text-[#059669]',
        )}
      >
        {booking.patientName === 'Unknown' ? '?' : initials}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-lhc-text-main truncate">{booking.patientName}</p>
        <p className="text-[11px] text-lhc-text-muted truncate">
          {[booking.doctorName ? `Dr. ${booking.doctorName}` : null, booking.serviceName, booking.duration ? `${booking.duration} min` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        {bookingTypeBadge(booking.type)}
        {statusBadge(booking.status)}
      </div>

      {/* D3 — Inline action buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isPending ? (
          <>
            <Button
              size="sm"
              className="h-[30px] px-3 text-[11px] font-medium bg-[#00A86B] hover:bg-[#009060] text-white rounded-[7px]"
              onClick={(e) => { e.stopPropagation(); onConfirm?.() }}
              disabled={confirming}
            >
              Confirm
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-[30px] px-3 text-[11px] font-medium border-[#FCA5A5] text-[#EF4444] hover:bg-red-50 rounded-[7px]"
              onClick={(e) => { e.stopPropagation(); onDecline?.() }}
              disabled={declining}
            >
              Decline
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-[30px] px-3 text-[11px] text-lhc-text-muted rounded-[7px]"
            >
              <Eye className="w-3 h-3 mr-1" /> View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-[30px] px-3 text-[11px] text-lhc-text-muted rounded-[7px]"
            >
              <MessageSquare className="w-3 h-3 mr-1" /> Message
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
