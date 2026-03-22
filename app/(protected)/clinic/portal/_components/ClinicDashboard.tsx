'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Users, Calendar, Activity, Gift, Clock, Phone,
  Loader2, AlertTriangle, DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
}

function bookingTypeBadge(type: BookingSource) {
  if (type === 'centaur') return <Badge variant="purple">Centaur</Badge>
  if (type === 'custom_api') return <Badge variant="orange">Custom API</Badge>
  return <Badge variant="secondary">Standard</Badge>
}

function statusBadge(status: string) {
  if (status === 'confirmed') return <Badge variant="success">Confirmed</Badge>
  if (status === 'pending') return <Badge variant="warning">Pending</Badge>
  if (status === 'cancelled') return <Badge variant="destructive">Cancelled</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

export default function ClinicDashboard({
  clinicId,
}: {
  clinicId: string
  userId: string
}) {
  const [visibleCount, setVisibleCount] = useState(10)

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

  const todaysBookings = dashboardData?.todaysBookings ?? []
  const pendingBookings = todaysBookings.filter((b) => b.status === 'pending')
  const confirmedBookings = todaysBookings.filter((b) => b.status === 'confirmed')
  const visibleConfirmed = confirmedBookings.slice(0, visibleCount)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Gift className="w-5 h-5 text-lhc-primary" />}
          label="Points Distributed"
          value={dashboardData?.pointsDistributed?.toLocaleString() ?? '—'}
          loading={dashboardLoading}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-lhc-primary" />}
          label="Total Patients"
          value={dashboardData?.totalPatients?.toLocaleString() ?? '—'}
          loading={dashboardLoading}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-lhc-primary" />}
          label="Today's Bookings"
          value={String(todaysBookings.length)}
          loading={dashboardLoading}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-lhc-primary" />}
          label="Pending Confirmations"
          value={String(pendingBookings.length)}
          loading={dashboardLoading}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-lhc-primary" />}
          label="Pending Quotes"
          value={String(dashboardData?.pendingQuotes ?? 0)}
          loading={dashboardLoading}
          href="/clinic/portal/quotes"
        />
      </div>

      {/* Today's schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <Clock className="w-5 h-5 text-lhc-primary" />
            Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {dashboardLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
            </div>
          ) : todaysBookings.length === 0 ? (
            <p className="text-lhc-text-muted text-sm text-center py-6">No bookings for today.</p>
          ) : (
            <>
              {pendingBookings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Pending Confirmations ({pendingBookings.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} colorScheme="yellow" />
                    ))}
                  </div>
                </div>
              )}

              {confirmedBookings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Confirmed ({confirmedBookings.length})
                  </h3>
                  <div className="space-y-2">
                    {visibleConfirmed.map((b) => (
                      <BookingCard key={b.id} booking={b} colorScheme="green" />
                    ))}
                  </div>
                  {confirmedBookings.length > visibleCount && (
                    <Button
                      variant="outline"
                      className="w-full"
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
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  loading,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  loading?: boolean
  href?: string
}) {
  const content = (
    <CardContent className="pt-5 pb-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-lhc-text-muted truncate">{label}</p>
          {loading ? (
            <div className="h-6 w-12 bg-lhc-border rounded animate-pulse mt-0.5" />
          ) : (
            <p className="text-xl font-bold text-lhc-text-main">{value}</p>
          )}
        </div>
      </div>
    </CardContent>
  )

  return (
    <Card className={href ? 'hover:border-lhc-primary/50 transition-colors' : undefined}>
      {href ? <Link href={href}>{content}</Link> : content}
    </Card>
  )
}

function BookingCard({
  booking,
  colorScheme,
}: {
  booking: NormalizedBooking
  colorScheme: 'yellow' | 'green'
}) {
  const border =
    colorScheme === 'yellow'
      ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'
      : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'

  return (
    <div className={cn('border rounded-lg p-3 space-y-1.5', border)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-lhc-text-main">{booking.patientName}</span>
          {bookingTypeBadge(booking.type)}
          {statusBadge(booking.status)}
        </div>
        <span className="text-xs font-mono text-lhc-text-muted">{booking.time}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-lhc-text-muted">
        {booking.doctorName && <span>Dr {booking.doctorName}</span>}
        {booking.serviceName && <span>{booking.serviceName}</span>}
        {booking.phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {booking.phone}
          </span>
        )}
      </div>
    </div>
  )
}
