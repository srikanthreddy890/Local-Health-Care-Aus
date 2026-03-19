'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Users, Calendar, Star, Clock, Phone,
  Activity, Gift, Loader2, ChevronRight, AlertTriangle,
} from 'lucide-react'
import SignOutButton from '@/app/_components/SignOutButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import DoctorManagement from './DoctorManagement'
import ClinicBookingsList from './ClinicBookingsList'
import ClinicChatTab from './ClinicChatTab'
import PatientSharedDocuments from './PatientSharedDocuments'
import ClinicDocumentsTab from './ClinicDocumentsTab'
import ClinicReferralsTab from './ClinicReferralsTab'
import QuoteRequestsTab from './QuoteRequestsTab'
import ClinicBillingView from './ClinicBillingView'
import StaffManagement from './StaffManagement'
import EnhancedClinicProfile from './EnhancedClinicProfile'
import ClinicSecurityTab from './ClinicSecurityTab'
import ClinicPrescriptionsTab from './ClinicPrescriptionsTab'
import PharmacyPrescriptionsTab from './PharmacyPrescriptionsTab'
import CentaurSyncPanel from './CentaurSyncPanel'
import CentaurLogsViewer from './CentaurLogsViewer'
import ClinicBlogManager from './ClinicBlogManager'
import ClinicDoctorSidebar from './ClinicDoctorSidebar'

interface Props {
  clinicId: string | null
  staffRole?: string | null
  userId: string
  userEmail: string
}

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

function isPharmacy(clinicData: { clinic_type?: string | null } | null | undefined): boolean {
  return clinicData?.clinic_type === 'pharmacy'
}

function getPharmacyFeatureFlags(clinicData: { clinic_type?: string | null } | null | undefined) {
  const pharmacy = isPharmacy(clinicData)
  return {
    showChat: !pharmacy,
    showPatientDocuments: !pharmacy,
    showReferrals: !pharmacy,
    showQuotes: !pharmacy,
    showLoyaltyPoints: !pharmacy,
  }
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

export default function ClinicProfile({ clinicId, staffRole, userId, userEmail }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-driven tab state — enables deep-linking, bookmarks, back/forward
  const activeTab = searchParams.get('tab') ?? 'dashboard'
  const appointmentViewFilter = (searchParams.get('appt') ?? 'booked') as 'booked' | 'available'

  function setActiveTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    params.delete('appt') // reset nested filter when switching main tab
    router.push(`?${params.toString()}`)
  }

  function setAppointmentViewFilter(v: 'booked' | 'available') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('appt', v)
    router.replace(`?${params.toString()}`)
  }

  const [isDoctorSidebarOpen, setIsDoctorSidebarOpen] = useState(false)
  const [visibleAppointmentsCount, setVisibleAppointmentsCount] = useState(10)

  // ── Clinic data ──────────────────────────────────────────────────────────
  const { data: clinicData, isLoading: clinicLoading } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      if (!clinicId) return null
      const supabase = createClient()
      const { data } = await supabase
        .from('clinics_public')
        .select('*')
        .eq('id', clinicId)
        .is('deleted_at', null)
        .single()
      return data
    },
    enabled: !!clinicId,
  })

  // ── Permissions ──────────────────────────────────────────────────────────
  const { data: permissionsData } = useQuery({
    queryKey: ['clinic-permissions', clinicId, userId],
    queryFn: async () => {
      if (!clinicId || !userId) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data } = await supabase
        .from('clinic_users')
        .select('role, can_manage_doctors, can_manage_appointments, can_view_chat, can_manage_billing, can_manage_staff')
        .eq('clinic_id', clinicId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()
      // If no record → user is the clinic owner
      const isOwner = !data || data.role === 'owner' || staffRole === null
      return { ...data, isOwner }
    },
    enabled: !!clinicId && !!userId,
  })

  // ── Dashboard: stats + today's schedule ──────────────────────────────────
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
      ] = await Promise.all([
        supabase
          .from('loyalty_transactions')
          .select('points')
          .eq('clinic_id', clinicId)
          .eq('transaction_type', 'earn'),

        supabase
          .from('bookings')
          .select('patient_id')
          .eq('clinic_id', clinicId),

        supabase
          .from('bookings')
          .select('id, status, booking_time, profiles!patient_id(first_name, last_name, phone), doctors(name), services(name)')
          .eq('clinic_id', clinicId)
          .eq('booking_date', today)
          .in('status', ['pending', 'confirmed'])
          .order('booking_time'),

        supabase
          .from('centaur_bookings')
          .select('id, status, appointment_time, reason, profiles!patient_id(first_name, last_name, phone), doctors(name)')
          .eq('clinic_id', clinicId)
          .eq('appointment_date', today)
          .in('status', ['pending', 'confirmed']),

        supabase
          .from('custom_api_bookings')
          .select('id, status, appointment_time, notes, profiles!patient_id(first_name, last_name, phone)')
          .eq('clinic_id', clinicId)
          .eq('appointment_date', today)
          .in('status', ['pending', 'confirmed']),
      ])

      const pointsDistributed = (loyaltyTxns ?? []).reduce((s: number, t: Record<string, unknown>) => s + ((t.points as number) ?? 0), 0)
      const totalPatients = new Set((allPatients ?? []).map((b: Record<string, unknown>) => b.patient_id)).size

      const normalize = (
        items: Record<string, unknown>[] | null,
        type: BookingSource,
        getTime: (item: Record<string, unknown>) => string | null,
        getDoctor: (item: Record<string, unknown>) => string,
        getService: (item: Record<string, unknown>) => string,
      ): NormalizedBooking[] =>
        (items ?? []).map((b: Record<string, unknown>) => {
          const profile = b.profiles as { first_name?: string; last_name?: string; phone?: string } | null
          const doctor = b.doctors as { name?: string } | null
          return {
            id: b.id as string,
            type,
            status: b.status as string,
            time: (getTime(b) ?? '') as string,
            patientName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unknown',
            phone: profile?.phone ?? '',
            doctorName: doctor?.name ?? getDoctor(b),
            serviceName: getService(b),
          }
        })

      const todaysBookings: NormalizedBooking[] = [
        ...normalize(
          (standardBookings ?? []) as Record<string, unknown>[],
          'standard',
          (b) => (b.booking_time as string | undefined) ?? null,
          () => 'Unknown',
          (b) => {
            const s = b.services as { name?: string } | null
            return s?.name ?? ''
          },
        ),
        ...normalize(
          (centaurBookings ?? []) as Record<string, unknown>[],
          'centaur',
          (b) => (b.appointment_time as string | undefined) ?? null,
          () => 'Unknown',
          (b) => (b.reason as string | undefined) ?? '',
        ),
        ...normalize(
          (customBookings ?? []) as Record<string, unknown>[],
          'custom_api',
          (b) => (b.appointment_time as string | undefined) ?? null,
          () => 'Unknown',
          (b) => (b.notes as string | undefined) ?? '',
        ),
      ].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

      return { pointsDistributed, totalPatients, todaysBookings }
    },
    enabled: !!clinicId,
    refetchInterval: 60_000,
  })

  // ── Available appointment slots ───────────────────────────────────────────
  const { data: availableSlots } = useQuery({
    queryKey: ['clinic-available-slots', clinicId],
    queryFn: async () => {
      if (!clinicId) return []
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('appointments')
        .select('*, doctors(name, specialization), services(name, price)')
        .eq('clinic_id', clinicId)
        .eq('is_available', true)
        .is('deleted_at', null)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
      return data ?? []
    },
    enabled: !!clinicId && activeTab === 'appointments' && appointmentViewFilter === 'available',
  })

  // ── Loyalty stats ─────────────────────────────────────────────────────────
  const { data: loyaltyData } = useQuery({
    queryKey: ['clinic-loyalty', clinicId],
    queryFn: async () => {
      if (!clinicId) return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [{ data: txns }, { data: redemptions }, { count: monthlyBookings }] = await Promise.all([
        supabase
          .from('loyalty_transactions')
          .select('points, transaction_type, patient_id')
          .eq('clinic_id', clinicId),

        supabase
          .from('loyalty_transactions')
          .select('id, points, created_at, profiles!patient_id(first_name, last_name)')
          .eq('clinic_id', clinicId)
          .eq('transaction_type', 'redeem')
          .order('created_at', { ascending: false })
          .limit(20),

        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('created_at', startOfMonth.toISOString()),
      ])

      const all = (txns ?? []) as Record<string, unknown>[]
      const pointsGiven = all.filter((t) => t.transaction_type === 'earn').reduce((s: number, t: Record<string, unknown>) => s + ((t.points as number) ?? 0), 0)
      const pointsRedeemed = all.filter((t) => t.transaction_type === 'redeem').reduce((s: number, t: Record<string, unknown>) => s + ((t.points as number) ?? 0), 0)
      const activePatients = new Set(all.map((t: Record<string, unknown>) => t.patient_id)).size

      return { pointsGiven, pointsRedeemed, activePatients, monthlyBookings: monthlyBookings ?? 0, redemptions: redemptions ?? [] }
    },
    enabled: !!clinicId && activeTab === 'loyalty',
  })

  // ── Derived feature flags ────────────────────────────────────────────────
  const { showChat, showPatientDocuments, showReferrals, showQuotes, showLoyaltyPoints } =
    getPharmacyFeatureFlags(clinicData)
  const centaurEnabled = !!clinicData?.centaur_api_enabled
  const centaurPracticeId = clinicData?.centaur_practice_id ?? ''

  // ── No clinic guard ──────────────────────────────────────────────────────
  if (!clinicId) {
    return (
      <div className="min-h-screen bg-lhc-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
          <p className="text-lhc-text-muted">No clinic found for your account.</p>
        </div>
      </div>
    )
  }

  if (clinicLoading) {
    return (
      <div className="min-h-screen bg-lhc-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
      </div>
    )
  }

  const todaysBookings = dashboardData?.todaysBookings ?? []
  const pendingBookings = todaysBookings.filter((b) => b.status === 'pending')
  const confirmedBookings = todaysBookings.filter((b) => b.status === 'confirmed')

  const visibleSlots = (availableSlots ?? []).slice(0, visibleAppointmentsCount)

  return (
    <div className="min-h-screen bg-lhc-background relative">
      <div className={cn('transition-all duration-300', isDoctorSidebarOpen ? 'mr-[420px] lg:mr-[420px]' : '')}>
        {/* Portal header */}
        <div className="border-b border-lhc-border bg-lhc-surface sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lhc-text-main text-lg">{clinicData?.name ?? 'Clinic Portal'}</h1>
              {clinicData?.clinic_type && (
                <p className="text-xs text-lhc-text-muted capitalize">{clinicData.clinic_type.replace(/_/g, ' ')}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {staffRole && (
                <Badge variant="secondary" className="capitalize">{staffRole}</Badge>
              )}
              <SignOutButton />
            </div>
          </div>
        </div>

        {/* Main tabs */}
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab list — horizontally scrollable on mobile */}
            <div className="overflow-x-auto -mx-1 pb-1">
              <TabsList className="inline-flex h-auto min-w-max flex-wrap gap-1 bg-lhc-surface border border-lhc-border rounded-lg p-1">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="doctors">Doctors</TabsTrigger>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                {showChat && <TabsTrigger value="chat">Chat</TabsTrigger>}
                {showPatientDocuments && <TabsTrigger value="documents">Documents</TabsTrigger>}
                {showReferrals && <TabsTrigger value="referrals">Referrals</TabsTrigger>}
                {showQuotes && <TabsTrigger value="quotes">Quotes</TabsTrigger>}
                {showLoyaltyPoints && <TabsTrigger value="loyalty">Loyalty</TabsTrigger>}
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="profile">Settings</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                {isPharmacy(clinicData) && (
                  <TabsTrigger value="incoming-prescriptions">Rx Inbox</TabsTrigger>
                )}
                {centaurEnabled && <TabsTrigger value="centaur">Centaur</TabsTrigger>}
                {permissionsData?.isOwner && <TabsTrigger value="blog">Blog</TabsTrigger>}
              </TabsList>
            </div>

            {/* ── Dashboard ────────────────────────────────────────────── */}
            <TabsContent value="dashboard" className="mt-6 space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                      {/* Pending confirmations */}
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

                      {/* Confirmed appointments */}
                      {confirmedBookings.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            Confirmed ({confirmedBookings.length})
                          </h3>
                          <div className="space-y-2">
                            {confirmedBookings.map((b) => (
                              <BookingCard key={b.id} booking={b} colorScheme="green" />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Doctors ──────────────────────────────────────────────── */}
            <TabsContent value="doctors" className="mt-6">
              <DoctorManagement clinicId={clinicId} />
            </TabsContent>

            {/* ── Appointments ─────────────────────────────────────────── */}
            <TabsContent value="appointments" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <Tabs
                    value={appointmentViewFilter}
                    onValueChange={(v) => setAppointmentViewFilter(v as 'booked' | 'available')}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="booked">Booked Appointments</TabsTrigger>
                      <TabsTrigger value="available">Available Slots</TabsTrigger>
                    </TabsList>

                    <TabsContent value="booked" className="mt-4">
                      <ClinicBookingsList clinicId={clinicId} />
                    </TabsContent>

                    <TabsContent value="available" className="mt-4 space-y-4">
                      {/* Available slots stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-lhc-surface border border-lhc-border rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-lhc-text-main">{availableSlots?.length ?? 0}</p>
                          <p className="text-xs text-lhc-text-muted">Total Available Slots</p>
                        </div>
                        <div className="bg-lhc-surface border border-lhc-border rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-lhc-text-main">
                            {new Set(availableSlots?.map((s) => (s as Record<string, unknown>).doctor_id)).size}
                          </p>
                          <p className="text-xs text-lhc-text-muted">Doctors with Availability</p>
                        </div>
                        <div className="bg-lhc-surface border border-lhc-border rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-lhc-text-main">
                            {new Set(availableSlots?.map((s) => (s as Record<string, unknown>).date)).size}
                          </p>
                          <p className="text-xs text-lhc-text-muted">Days with Slots</p>
                        </div>
                      </div>

                      {/* Slots list */}
                      <div className="space-y-2">
                        {visibleSlots.length === 0 ? (
                          <p className="text-lhc-text-muted text-sm text-center py-6">No available slots.</p>
                        ) : (
                          visibleSlots.map((slot) => {
                            const s = slot as Record<string, unknown>
                            const doctor = s.doctors as { name?: string; specialization?: string } | null
                            const service = s.services as { name?: string; price?: number } | null
                            return (
                              <div
                                key={s.id as string}
                                className="flex items-center justify-between border border-lhc-border rounded-lg p-3 bg-lhc-surface"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-lhc-text-main">
                                      {s.date as string} at {s.time as string}
                                    </span>
                                    {!!s.is_emergency && <Badge variant="destructive">Emergency</Badge>}
                                  </div>
                                  <p className="text-xs text-lhc-text-muted">
                                    {doctor?.name ?? 'Unknown Doctor'}
                                    {doctor?.specialization ? ` · ${doctor.specialization}` : ''}
                                  </p>
                                  {service?.name && (
                                    <p className="text-xs text-lhc-text-muted">{service.name}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-lhc-text-muted">{s.duration_minutes as number}min</p>
                                  {service?.price != null && (
                                    <p className="text-sm font-medium text-lhc-text-main">${service.price}</p>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {(availableSlots?.length ?? 0) > visibleAppointmentsCount && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setVisibleAppointmentsCount((n) => n + 10)}
                        >
                          Load 10 More
                        </Button>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Chat ─────────────────────────────────────────────────── */}
            {showChat && (
              <TabsContent value="chat" className="mt-6">
                <ClinicChatTab clinicId={clinicId} userId={userId} />
              </TabsContent>
            )}

            {/* ── Documents ────────────────────────────────────────────── */}
            {showPatientDocuments && (
              <TabsContent value="documents" className="mt-6">
                <Tabs defaultValue="from-patients">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="from-patients">From Patients</TabsTrigger>
                    <TabsTrigger value="to-patients">Shared with Patients</TabsTrigger>
                  </TabsList>
                  <TabsContent value="from-patients" className="mt-4">
                    <PatientSharedDocuments clinicId={clinicId} />
                  </TabsContent>
                  <TabsContent value="to-patients" className="mt-4">
                    <ClinicDocumentsTab clinicId={clinicId} />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            )}

            {/* ── Referrals ────────────────────────────────────────────── */}
            {showReferrals && (
              <TabsContent value="referrals" className="mt-6">
                <ClinicReferralsTab clinicId={clinicId} />
              </TabsContent>
            )}

            {/* ── Quotes ───────────────────────────────────────────────── */}
            {showQuotes && (
              <TabsContent value="quotes" className="mt-6">
                <QuoteRequestsTab clinicId={clinicId} />
              </TabsContent>
            )}

            {/* ── Loyalty ──────────────────────────────────────────────── */}
            {showLoyaltyPoints && (
              <TabsContent value="loyalty" className="mt-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Gift className="w-5 h-5 text-lhc-primary" />}
                    label="Points Given"
                    value={loyaltyData?.pointsGiven?.toLocaleString() ?? '—'}
                    loading={!loyaltyData}
                  />
                  <StatCard
                    icon={<Users className="w-5 h-5 text-lhc-primary" />}
                    label="Active Patients"
                    value={loyaltyData?.activePatients?.toLocaleString() ?? '—'}
                    loading={!loyaltyData}
                  />
                  <StatCard
                    icon={<Calendar className="w-5 h-5 text-lhc-primary" />}
                    label="Monthly Bookings"
                    value={loyaltyData?.monthlyBookings?.toLocaleString() ?? '—'}
                    loading={!loyaltyData}
                  />
                  <StatCard
                    icon={<Star className="w-5 h-5 text-lhc-primary" />}
                    label="Points Redeemed"
                    value={loyaltyData?.pointsRedeemed?.toLocaleString() ?? '—'}
                    loading={!loyaltyData}
                  />
                </div>

                {/* Redemption history */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lhc-text-main">Redemption History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!loyaltyData ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
                      </div>
                    ) : (loyaltyData.redemptions ?? []).length === 0 ? (
                      <p className="text-lhc-text-muted text-sm text-center py-6">No redemptions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(loyaltyData.redemptions as Array<Record<string, unknown>>).map((r) => {
                          const profile = r.profiles as { first_name?: string; last_name?: string } | null
                          const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unknown'
                          const date = r.created_at
                            ? new Date(r.created_at as string).toLocaleDateString('en-AU')
                            : '—'
                          return (
                            <div
                              key={r.id as string}
                              className="flex items-center justify-between border border-lhc-border rounded-lg p-3 bg-lhc-surface"
                            >
                              <div>
                                <p className="text-sm font-medium text-lhc-text-main">{name}</p>
                                <p className="text-xs text-lhc-text-muted">{date}</p>
                              </div>
                              <Badge variant="purple">−{r.points as number} pts</Badge>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Explainer */}
                <Card className="bg-lhc-surface border-lhc-border">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lhc-text-main mb-2">How Points Redemption Works</h3>
                    <ul className="space-y-1 text-sm text-lhc-text-muted list-disc list-inside">
                      <li>Patients earn points for every completed appointment.</li>
                      <li>Points can be redeemed against future bookings at your clinic.</li>
                      <li>Redemption requests are processed automatically at booking time.</li>
                      <li>Points have no cash value and cannot be transferred between clinics.</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ── Billing ──────────────────────────────────────────────── */}
            <TabsContent value="billing" className="mt-6">
              <ClinicBillingView clinicId={clinicId} />
            </TabsContent>

            {/* ── Staff ────────────────────────────────────────────────── */}
            <TabsContent value="staff" className="mt-6">
              <StaffManagement clinicId={clinicId} />
            </TabsContent>

            {/* ── Profile / Settings ───────────────────────────────────── */}
            <TabsContent value="profile" className="mt-6">
              <EnhancedClinicProfile clinicId={clinicId} />
            </TabsContent>

            {/* ── Security ─────────────────────────────────────────────── */}
            <TabsContent value="security" className="mt-6">
              <ClinicSecurityTab userId={userId} userEmail={userEmail} clinicId={clinicId} />
            </TabsContent>

            {/* ── Prescriptions ────────────────────────────────────────── */}
            <TabsContent value="prescriptions" className="mt-6">
              <ClinicPrescriptionsTab clinicId={clinicId} />
            </TabsContent>

            {/* ── Pharmacy Rx Inbox ────────────────────────────────────── */}
            {isPharmacy(clinicData) && (
              <TabsContent value="incoming-prescriptions" className="mt-6">
                <PharmacyPrescriptionsTab clinicId={clinicId} />
              </TabsContent>
            )}

            {/* ── Centaur ──────────────────────────────────────────────── */}
            {centaurEnabled && (
              <TabsContent value="centaur" className="mt-6 space-y-6">
                <CentaurSyncPanel practiceId={centaurPracticeId} clinicId={clinicId} />
                <CentaurLogsViewer clinicId={clinicId} />
              </TabsContent>
            )}

            {/* ── Blog ─────────────────────────────────────────────────── */}
            {permissionsData?.isOwner && (
              <TabsContent value="blog" className="mt-6">
                <ClinicBlogManager
                  clinicId={clinicId}
                  clinicName={clinicData?.name ?? ''}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Fixed Doctor Sidebar — rendered outside main container */}
      <ClinicDoctorSidebar
        clinicId={clinicId}
        isOpen={isDoctorSidebarOpen}
        onToggle={() => setIsDoctorSidebarOpen((prev) => !prev)}
        emergencySlotsEnabled={clinicData?.emergency_slots_enabled ?? false}
      />
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: string
  loading?: boolean
}) {
  return (
    <Card>
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
  const border = colorScheme === 'yellow' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'

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
