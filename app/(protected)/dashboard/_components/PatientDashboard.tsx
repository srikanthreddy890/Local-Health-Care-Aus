'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home, Calendar, Heart, MessageSquare, FileText, User, Loader2,
  MapPin, FileBox, Settings, Users, Pill, Shield, Star, Building2,
  Stethoscope, MoreHorizontal,
} from 'lucide-react'
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
import { useFavoriteClinics } from '@/lib/hooks/useFavoriteClinics'
import { useFavoriteDoctors } from '@/lib/hooks/useFavoriteDoctors'
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

// ── Time-aware greeting ────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── User avatar ────────────────────────────────────────────────────────────
function UserAvatar({ name, size = 36, avatarUrl }: { name: string; size?: number; avatarUrl?: string | null }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full bg-lhc-primary text-white font-semibold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

// ── Favorites sub-tabs ─────────────────────────────────────────────────────
function FavoritesTab({ userId }: { userId: string }) {
  const router = useRouter()
  const { favorites: clinicFavs } = useFavoriteClinics(userId)
  const { favorites: doctorFavs } = useFavoriteDoctors(userId)
  return (
    <Tabs defaultValue="clinics">
      <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-lhc-background/80 border border-lhc-border p-1 rounded-xl">
        <TabsTrigger value="clinics" className="cursor-pointer gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-lhc-text-main text-lhc-text-muted hover:text-lhc-text-main transition-all duration-200">
          <Building2 className="w-4 h-4" />
          <span>Clinics</span>
          {clinicFavs.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] rounded-full">{clinicFavs.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="doctors" className="cursor-pointer gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-lhc-text-main text-lhc-text-muted hover:text-lhc-text-main transition-all duration-200">
          <Stethoscope className="w-4 h-4" />
          <span>Doctors</span>
          {doctorFavs.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] rounded-full">{doctorFavs.length}</Badge>
          )}
        </TabsTrigger>
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

// ── Quotes sub-tabs ────────────────────────────────────────────────────────
function QuotesTab({ userId }: { userId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { quotes, loading, refetch, createBatchQuoteRequests, updateQuoteStatus } = usePatientQuotes(userId)

  function handleBookFromQuote(clinicId: string, serviceName?: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', 'appointments')
    p.set('appt', 'book')
    p.set('clinic_id', clinicId)
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

// ── Nav tab definitions ────────────────────────────────────────────────────
const PRIMARY_TABS = [
  { value: 'overview', label: 'Overview', icon: Home },
  { value: 'appointments', label: 'Appointments', icon: Calendar },
  { value: 'messages', label: 'Messages', icon: MessageSquare },
  { value: 'loyalty', label: 'Loyalty', icon: Star },
  { value: 'documents', label: 'Documents', icon: FileBox },
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'nearby', label: 'Nearby', icon: MapPin },
  { value: 'favorites', label: 'Favorites', icon: Heart },
  { value: 'quotes', label: 'Quotes', icon: FileText },
  { value: 'family', label: 'Family', icon: Users },
  { value: 'prescriptions', label: 'Prescriptions', icon: Pill },
] as const

const HIDDEN_TABS = [
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'preferences', label: 'Preferences', icon: Settings },
] as const

// ── Mobile bottom nav ──────────────────────────────────────────────────────
const BOTTOM_NAV = [
  { value: 'overview', label: 'Home', icon: Home },
  { value: 'appointments', label: 'Appts', icon: Calendar },
  { value: 'messages', label: 'Messages', icon: MessageSquare },
  { value: 'loyalty', label: 'Loyalty', icon: Star },
] as const

// ── Types ──────────────────────────────────────────────────────────────────
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

  // Client-side tab state
  const [activeTab, setActiveTabState] = useState(searchParams.get('tab') ?? 'overview')
  const [, setAppointmentSubTabState] = useState(searchParams.get('appt') ?? 'book')

  // Mobile drawer & avatar dropdown
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  function setActiveTab(tab: string) {
    setActiveTabState(tab)
    const p = new URLSearchParams(window.location.search)
    p.set('tab', tab)
    for (const k of ['appt', 'clinic_id', 'clinic_name', 'doctor_id', 'doctor_name', 'slot_id', 'rx', 'rx_share', 'conversationId']) p.delete(k)
    window.history.pushState(null, '', `?${p.toString()}`)
    setMobileMenuOpen(false)
  }

  function setAppointmentSubTab(sub: string) {
    setActiveTabState('appointments')
    setAppointmentSubTabState(sub)
    const p = new URLSearchParams(window.location.search)
    p.set('tab', 'appointments')
    p.set('appt', sub)
    for (const k of ['clinic_id', 'clinic_name', 'doctor_id', 'doctor_name', 'slot_id']) p.delete(k)
    window.history.replaceState(null, '', `?${p.toString()}`)
  }

  const [isFindingEmergency, setIsFindingEmergency] = useState(false)
  const [profile, setProfile] = useState<Record<string, unknown> | null>(initialProfile)

  async function fetchProfile() {
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }

  // ── Deep-link sessionStorage reads ──────────────────────────────────────
  useEffect(() => {
    try {
      const searchCtx = sessionStorage.getItem('booking_search_context')
      if (searchCtx) {
        sessionStorage.removeItem('booking_search_context')
        setAppointmentSubTab('book')
        return
      }
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

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Emergency slot lookup ───────────────────────────────────────────────
  async function handleFindEmergencySlots() {
    setIsFindingEmergency(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('find-emergency-slots', {})
      if (error) throw error
      if (data?.slots?.length) {
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
  const greeting = useMemo(() => getGreeting(), [])

  const { unreadCount } = useChatUnreadCount(userId)

  return (
    <div className="min-h-screen bg-lhc-background pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* ── Portal header ─────────────────────────────────────────────── */}
      <div className="border-b border-lhc-border bg-lhc-surface sticky top-0 z-[110]">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: greeting */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-bold text-lhc-text-main text-sm sm:text-base">
                {greeting}, {firstName || displayName}
              </h1>
              <span className="inline-flex items-center text-[11px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-md">
                Patient Account
              </span>
            </div>
          </div>

          {/* Right: avatar dropdown (hidden on mobile — avatar already shown in greeting) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarDropdownOpen((v) => !v)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-lhc-background transition-colors"
              >
                <UserAvatar name={displayName} size={32} avatarUrl={profile?.avatar_url as string | null} />
              </button>
              {avatarDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-2rem)] bg-white border border-[#E5E7EB] rounded-xl shadow-xl py-1.5 z-[120]">
                  <button onClick={() => { setActiveTab('profile'); setAvatarDropdownOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-lhc-text-main hover:bg-[#F9FAFB] transition-colors">
                    <User className="w-4 h-4 text-lhc-text-muted shrink-0" /> My Profile
                  </button>
                  <button onClick={() => { setActiveTab('security'); setAvatarDropdownOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-lhc-text-main hover:bg-[#F9FAFB] transition-colors">
                    <Shield className="w-4 h-4 text-lhc-text-muted shrink-0" /> Security
                  </button>
                  <button onClick={() => { setActiveTab('preferences'); setAvatarDropdownOpen(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-lhc-text-main hover:bg-[#F9FAFB] transition-colors">
                    <Settings className="w-4 h-4 text-lhc-text-muted shrink-0" /> Preferences
                  </button>
                  <div className="border-t border-[#E5E7EB] my-1.5" />
                  <SignOutButton className="w-full flex items-center gap-3 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 text-sm transition-colors" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop icon+label tab bar (sticky) ───────────────────────── */}
      <nav className="hidden md:block sticky top-16 z-[100] bg-white border-b border-[#E5E7EB]">
        <div className="container mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center min-w-max">
            {PRIMARY_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'relative flex flex-col items-center justify-center h-14 px-3.5 transition-colors duration-150',
                    isActive
                      ? '[&>svg]:text-[#00A86B] [&>span]:text-[#00A86B] [&>span]:font-medium'
                      : '[&>svg]:text-[#9CA3AF] [&>span]:text-[#9CA3AF] hover:bg-[#F9FAFB]',
                  )}
                >
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                    {tab.value === 'messages' && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                    {tab.value === 'appointments' && (
                      <span className="absolute -top-1.5 -right-1.5 h-1.5 w-1.5 rounded-full bg-red-500 hidden" id="appt-dot" />
                    )}
                  </div>
                  <span className="text-[11px] mt-0.5 whitespace-nowrap">{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00A86B] rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom sheet drawer ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200" style={{ maxHeight: '60vh' }}>
            {/* Drawer handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Drawer nav items */}
            <nav className="flex-1 overflow-y-auto px-4 pb-4">
              <span className="block px-2 pt-2 pb-3 text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                More features
              </span>
              {[...PRIMARY_TABS, ...HIDDEN_TABS].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 h-12 text-sm font-medium transition-colors rounded-lg',
                      isActive
                        ? 'text-[#00A86B] bg-[#F0FDF4]'
                        : 'text-[#374151] hover:bg-[#F9FAFB]',
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
              <div className="border-t border-[#E5E7EB] mt-2 pt-2">
                <SignOutButton className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-3 py-2.5 text-sm" />
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* ── Content area ──────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="hidden" />

          {/* ── Overview ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-0 md:mt-0 space-y-6">
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

              {/* Card 2: Nearby Services — contextual suggestions */}
              <div className="bg-lhc-surface border border-lhc-border rounded-xl p-5 flex flex-col gap-3">
                <h3 className="font-semibold text-lhc-text-main flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-lhc-primary" />
                  Nearby Services
                </h3>
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center gap-2.5 text-sm text-lhc-text-main">
                    <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-3.5 h-3.5 text-lhc-primary" />
                    </div>
                    <span>Dental Care</span>
                    <span className="ml-auto text-xs text-lhc-text-muted bg-lhc-background px-2 py-0.5 rounded-full">Nearby</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-lhc-text-main">
                    <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-lhc-primary" />
                    </div>
                    <span>GP Clinic</span>
                    <span className="ml-auto text-xs text-lhc-text-muted bg-lhc-background px-2 py-0.5 rounded-full">Nearby</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-lhc-text-main">
                    <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-lhc-primary" />
                    </div>
                    <span>Specialist</span>
                    <span className="ml-auto text-xs text-lhc-text-muted bg-lhc-background px-2 py-0.5 rounded-full">Nearby</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-auto"
                  onClick={() => setActiveTab('nearby')}
                >
                  Find Services
                </Button>
              </div>

              {/* Card 3: Emergency / Urgent Care — softer default */}
              <div className="bg-lhc-surface border border-lhc-border border-l-4 border-l-amber-400 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lhc-text-main">Emergency / Urgent Care</h3>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <span className="text-xs text-green-600 font-medium">Slots available</span>
                  </div>
                  <p className="text-sm text-lhc-text-muted">
                    Need urgent care? Find available emergency slots at clinics near you right now.
                  </p>
                </div>
                <Button
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white border-0 w-full"
                  onClick={handleFindEmergencySlots}
                  disabled={isFindingEmergency}
                >
                  {isFindingEmergency ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Searching...</>
                  ) : (
                    'Find Emergency Slots'
                  )}
                </Button>
              </div>
            </div>

            {/* Loyalty Tracker */}
            <LoyaltyTracker userId={userId} />
          </TabsContent>

          {/* ── Appointments ──────────────────────────────────────────── */}
          <TabsContent value="appointments" className="mt-0 md:mt-0">
            <AppointmentsTab userId={userId} />
          </TabsContent>

          {/* ── Loyalty ───────────────────────────────────────────────── */}
          <TabsContent value="loyalty" className="mt-0 md:mt-0">
            <LoyaltyTracker userId={userId} />
          </TabsContent>

          {/* ── Favourites ────────────────────────────────────────────── */}
          <TabsContent value="favorites" className="mt-0 md:mt-0">
            <FavoritesTab userId={userId} />
          </TabsContent>

          {/* ── Messages ──────────────────────────────────────────────── */}
          <TabsContent value="messages" className="mt-0 md:mt-0">
            <MessagesTab userId={userId} userName={displayName} eligibleClinics={eligibleClinics} />
          </TabsContent>

          {/* ── Nearby Services ───────────────────────────────────────── */}
          <TabsContent value="nearby" className="mt-0 md:mt-0">
            <NearbyServices userId={userId} />
          </TabsContent>

          {/* ── Documents ─────────────────────────────────────────────── */}
          <TabsContent value="documents" className="mt-0 md:mt-0">
            <DocumentsTab userId={userId} />
          </TabsContent>

          {/* ── Preferences ───────────────────────────────────────────── */}
          <TabsContent value="preferences" className="mt-0 md:mt-0 space-y-6">
            <AppointmentPreferences userId={userId} />
            <UserPreferences userId={userId} />
          </TabsContent>

          {/* ── Family ────────────────────────────────────────────────── */}
          <TabsContent value="family" className="mt-0 md:mt-0">
            <FamilyMembersTab />
          </TabsContent>

          {/* ── Prescriptions ─────────────────────────────────────────── */}
          <TabsContent value="prescriptions" className="mt-0 md:mt-0">
            <PrescriptionsTab userId={userId} />
          </TabsContent>

          {/* ── Security ──────────────────────────────────────────────── */}
          <TabsContent value="security" className="mt-0 md:mt-0">
            <SecurityTab
              userId={userId}
              userEmail={userEmail}
              userType={profile?.user_type as string | undefined}
              createdAt={profile?.created_at as string | undefined}
            />
          </TabsContent>

          {/* ── Quotes ────────────────────────────────────────────────── */}
          <TabsContent value="quotes" className="mt-0 md:mt-0">
            <QuotesTab userId={userId} />
          </TabsContent>

          {/* ── Profile ───────────────────────────────────────────────── */}
          <TabsContent value="profile" className="mt-0 md:mt-0">
            <PersonalInfoTab
              profile={profile}
              userEmail={userEmail}
              userId={userId}
              onUpdate={fetchProfile}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Mobile bottom nav bar ─────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB]/50 z-30 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-[60px]">
          {BOTTOM_NAV.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 py-1.5 transition-colors',
                  isActive
                    ? '[&>svg]:text-[#00A86B] [&>span]:text-[#00A86B] [&>span]:font-medium'
                    : '[&>svg]:text-[#9CA3AF] [&>span]:text-[#9CA3AF]',
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {tab.value === 'messages' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </div>
                <span className="text-[10px]">{tab.label}</span>
              </button>
            )
          })}
          {/* More */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 py-1.5 transition-colors',
              mobileMenuOpen
                ? '[&>svg]:text-[#00A86B] [&>span]:text-[#00A86B] [&>span]:font-medium'
                : '[&>svg]:text-[#9CA3AF] [&>span]:text-[#9CA3AF]',
            )}
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </div>
    </div>
  )
}
