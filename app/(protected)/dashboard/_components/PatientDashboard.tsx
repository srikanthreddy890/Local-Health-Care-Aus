'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Home, Calendar, Heart, MessageSquare, FileText, User, Loader2, MapPin, FileBox, Settings, Users, Pill, Shield, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import SignOutButton from '@/app/_components/SignOutButton'
import UpcomingAppointmentPreview from './UpcomingAppointmentPreview'
import LoyaltyTracker from './LoyaltyTracker'
import PersonalInfoTab from './PersonalInfoTab'
import AppointmentsTab from './AppointmentsTab'
import MessagesTab from './MessagesTab'
import { useChatUnreadCount } from '@/lib/chat/useChatUnreadCount'
import FavoriteClinicsTab from './favorites/FavoriteClinicsTab'
import FavoriteDoctorsTab from './favorites/FavoriteDoctorsTab'
import QuoteRequestForm from './quotes/QuoteRequestForm'
import QuoteRequestsList from './quotes/QuoteRequestsList'
import { usePatientQuotes } from '@/lib/hooks/useQuoteRequests'
import DocumentsTab from './documents/DocumentsTab'
import NearbyServices from './NearbyServices'
import FamilyMembersTab from './family/FamilyMembersTab'
import PrescriptionsTab from './PrescriptionsTab'
import SecurityTab from './security/SecurityTab'
import AppointmentPreferences from './preferences/AppointmentPreferences'
import UserPreferences from './preferences/UserPreferences'

function FavoritesTab({ userId }: { userId: string }) {
  const router = useRouter()
  return (
    <Tabs defaultValue="clinics">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="clinics">Favorite Clinics</TabsTrigger>
        <TabsTrigger value="doctors">Favorite Doctors</TabsTrigger>
      </TabsList>
      <TabsContent value="clinics">
        <FavoriteClinicsTab
          userId={userId}
          onBookAppointment={(clinicId) => {
            const p = new URLSearchParams()
            p.set('tab', 'appointments')
            p.set('appt', 'book')
            p.set('clinic_id', clinicId)
            router.push(`?${p.toString()}`)
          }}
        />
      </TabsContent>
      <TabsContent value="doctors">
        <FavoriteDoctorsTab
          userId={userId}
          onBookAppointment={(clinicId, doctorId, doctorName) => {
            const p = new URLSearchParams()
            p.set('tab', 'appointments')
            p.set('appt', 'book')
            if (clinicId) p.set('clinic_id', clinicId)
            if (doctorId) p.set('doctor_id', doctorId)
            if (doctorName) p.set('doctor_name', doctorName)
            router.push(`?${p.toString()}`)
          }}
        />
      </TabsContent>
    </Tabs>
  )
}
function QuotesTab({ userId }: { userId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Single hook instance — shared between form and list so the list
  // updates immediately when the form submits a new quote.
  const { quotes, loading, refetch, createBatchQuoteRequests, updateQuoteStatus } = usePatientQuotes(userId)

  function handleBookFromQuote(clinicId: string, serviceName?: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', 'appointments')
    p.set('appt', 'book')
    p.set('clinic_id', clinicId)
    p.set('doctor_name', 'From Quote')
    if (serviceName) p.set('service_name', serviceName)
    router.push(`?${p.toString()}`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <QuoteRequestForm userId={userId} onSubmit={createBatchQuoteRequests} />
      <QuoteRequestsList
        quotes={quotes}
        loading={loading}
        refetch={refetch}
        updateQuoteStatus={updateQuoteStatus}
        onBookAppointment={handleBookFromQuote}
      />
    </div>
  )
}

interface EligibleClinic {
  id: string
  name: string
  logo_url: string | null
}

interface Props {
  userId: string
  userEmail: string
  initialProfile: Record<string, unknown> | null
  eligibleClinics: EligibleClinic[]
}


export default function PatientDashboard({ userId, userEmail, initialProfile, eligibleClinics }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-driven tab state (MPA pattern)
  const activeTab = searchParams.get('tab') ?? 'overview'
  const appointmentSubTab = searchParams.get('appt') ?? 'book'

  function setActiveTab(tab: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', tab)
    // Clear all booking flow params to avoid stale state when switching tabs
    for (const k of ['appt', 'clinic_id', 'clinic_name', 'doctor_id', 'doctor_name', 'slot_id', 'rx', 'rx_share']) p.delete(k)
    // Note: clinic_name / doctor_name intentionally cleared here — DoctorBooking
    // re-fetches names from DB on mount, they don't need to survive a tab switch.
    router.push(`?${p.toString()}`)
  }
  function setAppointmentSubTab(sub: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', 'appointments')
    p.set('appt', sub)
    // Clear booking flow params when jumping to a sub-tab directly
    for (const k of ['clinic_id', 'clinic_name', 'doctor_id', 'doctor_name', 'slot_id']) p.delete(k)
    router.replace(`?${p.toString()}`)
  }

  const [isFindingEmergency, setIsFindingEmergency] = useState(false)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(initialProfile)

  // Mutable profile re-fetch (called by PersonalInfoTab after save)
  async function fetchProfile() {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }

  // ── Deep-link sessionStorage reads (booking/service/emergency context) ──────
  useEffect(() => {
    try {
      // 1. Hero search deep-link
      const searchCtx = sessionStorage.getItem('booking_search_context')
      if (searchCtx) {
        sessionStorage.removeItem('booking_search_context')
        setAppointmentSubTab('book')
        return
      }

      // 2. Service card context (may set emergency flag)
      const serviceCtx = sessionStorage.getItem('service_card_context')
      if (serviceCtx) {
        sessionStorage.removeItem('service_card_context')
        const ctx = JSON.parse(serviceCtx) as { tab?: string; subTab?: string; emergency?: boolean }
        const p = new URLSearchParams()
        p.set('tab', ctx.tab ?? 'appointments')
        if (ctx.subTab) p.set('appt', ctx.subTab)
        router.replace(`?${p.toString()}`)
        return
      }

      // 3. Emergency direct-booking deep-link
      const emergencyCtx = sessionStorage.getItem('emergency_booking_context')
      if (emergencyCtx) {
        sessionStorage.removeItem('emergency_booking_context')
        setAppointmentSubTab('book')
      }
    } catch {
      // sessionStorage unavailable (SSR guard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Emergency slot lookup ────────────────────────────────────────────────
  async function handleFindEmergencySlots() {
    setIsFindingEmergency(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('find-emergency-slots', {})
      if (error) throw error
      if (data?.slots?.length) {
        // Store results and navigate to appointments/book
        sessionStorage.setItem('emergency_booking_context', JSON.stringify({ slots: data.slots }))
        setAppointmentSubTab('book')
      } else {
        toast({ title: 'No emergency slots', description: 'No emergency slots are available right now.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Could not find emergency slots. Please try again.', variant: 'destructive' })
    } finally {
      setIsFindingEmergency(false)
    }
  }

  const firstName = (profile?.first_name as string | null) ?? ''
  const lastName = (profile?.last_name as string | null) ?? ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || userEmail || 'Patient'

  const { unreadCount } = useChatUnreadCount(userId)

  return (
    <div className="min-h-screen bg-lhc-background">
      {/* Portal header */}
      <div className="border-b border-lhc-border bg-lhc-surface sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lhc-text-main">
              {`Welcome, ${firstName || displayName}`}
            </h1>
            <p className="text-xs text-lhc-text-muted">{userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Patient</Badge>
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-1 pb-1">
            <TabsList className="inline-flex h-auto min-w-max gap-1 bg-lhc-surface border border-lhc-border rounded-lg p-1">
              <TabsTrigger value="overview" className="flex items-center gap-1.5"><Home className="w-3.5 h-3.5" />Overview</TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Appointments</TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Messages
                {unreadCount > 0 && (
                  <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-lhc-primary text-white border-0">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" />Loyalty</TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" />Favorites</TabsTrigger>
              <TabsTrigger value="quotes" className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Quotes</TabsTrigger>
              <TabsTrigger value="nearby" className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Nearby Services</TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-1.5"><FileBox className="w-3.5 h-3.5" />Documents</TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" />Preferences</TabsTrigger>
              <TabsTrigger value="family" className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Family</TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex items-center gap-1.5"><Pill className="w-3.5 h-3.5" />Prescriptions</TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Security</TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Profile</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Overview ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* 3-column card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1: Upcoming Appointments */}
              <div className="bg-lhc-surface border border-lhc-border rounded-xl p-5 flex flex-col gap-3">
                <h3 className="font-semibold text-lhc-text-main flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-lhc-primary" />
                  Upcoming Appointments
                </h3>
                <UpcomingAppointmentPreview
                  userId={userId}
                  onViewAll={() => setAppointmentSubTab('booked')}
                  onBookNew={() => setAppointmentSubTab('book')}
                />
              </div>

              {/* Card 2: Nearby Services */}
              <div className="bg-lhc-surface border border-lhc-border rounded-xl p-5 flex flex-col gap-3">
                <h3 className="font-semibold text-lhc-text-main">Nearby Services</h3>
                <p className="text-sm text-lhc-text-muted">
                  Search for clinics, GPs, specialists, and allied health providers near you.
                </p>
                <Button
                  variant="outline"
                  className="mt-auto"
                  onClick={() => setActiveTab('nearby')}
                >
                  Find Services
                </Button>
              </div>

              {/* Card 3: Emergency Appointments */}
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex flex-col gap-3">
                <h3 className="font-semibold text-red-700 dark:text-red-400">Emergency Appointments</h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Need urgent care? Find available emergency slots at clinics near you right now.
                </p>
                <Button
                  variant="destructive"
                  className="mt-auto"
                  onClick={handleFindEmergencySlots}
                  disabled={isFindingEmergency}
                >
                  {isFindingEmergency ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Searching…</>
                  ) : (
                    'Find Emergency Slots'
                  )}
                </Button>
              </div>
            </div>

            {/* Loyalty Tracker — full width */}
            <LoyaltyTracker userId={userId} />
          </TabsContent>

          {/* ── Appointments ──────────────────────────────────────────── */}
          <TabsContent value="appointments" className="mt-6">
            <AppointmentsTab userId={userId} />
          </TabsContent>

          {/* ── Loyalty ───────────────────────────────────────────────── */}
          <TabsContent value="loyalty" className="mt-6">
            <LoyaltyTracker userId={userId} />
          </TabsContent>

          {/* ── Favourites ────────────────────────────────────────────── */}
          <TabsContent value="favorites" className="mt-6">
            <FavoritesTab userId={userId} />
          </TabsContent>

          {/* ── Messages ──────────────────────────────────────────────── */}
          <TabsContent value="messages" className="mt-6">
            <MessagesTab userId={userId} userName={displayName} eligibleClinics={eligibleClinics} />
          </TabsContent>

          {/* ── Nearby Services ───────────────────────────────────────── */}
          <TabsContent value="nearby" className="mt-6">
            <NearbyServices userId={userId} userEmail={userEmail} firstName={firstName} />
          </TabsContent>

          {/* ── Documents ─────────────────────────────────────────────── */}
          <TabsContent value="documents" className="mt-6">
            <DocumentsTab userId={userId} />
          </TabsContent>

          {/* ── Preferences ───────────────────────────────────────────── */}
          <TabsContent value="preferences" className="mt-6 space-y-6">
            <AppointmentPreferences userId={userId} />
            <UserPreferences userId={userId} />
          </TabsContent>

          {/* ── Family ────────────────────────────────────────────────── */}
          <TabsContent value="family" className="mt-6">
            <FamilyMembersTab />
          </TabsContent>

          {/* ── Prescriptions ─────────────────────────────────────────── */}
          <TabsContent value="prescriptions" className="mt-6">
            <PrescriptionsTab userId={userId} />
          </TabsContent>

          {/* ── Security ──────────────────────────────────────────────── */}
          <TabsContent value="security" className="mt-6">
            <SecurityTab
              userId={userId}
              userEmail={userEmail}
              userType={profile?.user_type as string | undefined}
              createdAt={profile?.created_at as string | undefined}
            />
          </TabsContent>

          {/* ── Quotes ────────────────────────────────────────────────── */}
          <TabsContent value="quotes" className="mt-6">
            <QuotesTab userId={userId} />
          </TabsContent>

          {/* ── Profile ───────────────────────────────────────────────── */}
          <TabsContent value="profile" className="mt-6">
            <PersonalInfoTab
              profile={profile}
              userEmail={userEmail}
              onUpdate={fetchProfile}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
