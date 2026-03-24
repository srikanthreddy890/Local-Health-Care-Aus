'use client'

/**
 * HomeHeader — sticky navigation bar with premium mobile drawer.
 * Client Component: mobile menu toggle requires useState.
 * Shows personalized drawer when logged in, value-prop drawer when not.
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, X, Globe, ChevronDown, ChevronRight, LayoutDashboard, LogOut,
  MapPin, CalendarDays, MessageSquare, Star, FileText, Users, Lock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clearDerivedSecretCache } from '@/lib/chatEncryption'

/* ── Types ─────────────────────────────────────────────────────── */
interface UserProfile {
  id: string
  first_name?: string | null
  last_name?: string | null
  loyalty_points?: number | null
  account_status?: string | null
}

/* ── Nav item component ────────────────────────────────────────── */
function NavItem({
  href, icon, label, active, badge, iconBg, onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: React.ReactNode
  iconBg: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg mx-1.5 min-h-[44px] transition-colors ${
        active ? 'bg-[#F0FDF4]' : 'hover:bg-gray-50'
      }`}
    >
      <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${iconBg}`}>
        {icon}
      </span>
      <span className={`text-[13px] flex-1 ${active ? 'text-[#059669] font-medium' : 'text-gray-800'}`}>
        {label}
      </span>
      {badge}
      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#059669]/40' : 'text-gray-300'}`} />
    </Link>
  )
}

/* ── Section label ─────────────────────────────────────────────── */
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-medium tracking-[0.06em] uppercase text-gray-400 px-5 pt-2.5 pb-1">
      {children}
    </p>
  )
}

/* ── Main component ────────────────────────────────────────────── */
export default function HomeHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)

  const isDashboard = pathname?.startsWith('/dashboard')

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', user.id)
          .single()
        setProfile(prof ? (prof as UserProfile) : { id: user.id })
      } else {
        setProfile(null)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser()
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /* Drawer open/close with animation */
  const openDrawer = useCallback(() => {
    setMobileOpen(true)
    requestAnimationFrame(() => setDrawerVisible(true))
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false)
    setConfirmSignOut(false)
    setTimeout(() => setMobileOpen(false), 250)
  }, [])

  /* Lock body scroll when drawer open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleSignOut() {
    if (!confirmSignOut) {
      setConfirmSignOut(true)
      return
    }
    setSigningOut(true)
    clearDerivedSecretCache()
    const supabase = createClient()
    await supabase.auth.signOut()
    closeDrawer()
    router.replace('/')
  }

  /* Derived values */
  const firstName = profile?.first_name || ''
  const lastName = profile?.last_name || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User'
  const initials = (firstName?.[0] || '') + (lastName?.[0] || '') || 'U'
  const loyaltyPts = profile?.loyalty_points ?? 0
  const dollarValue = (loyaltyPts * 0.2).toFixed(2)
  const nextReward = 35
  const progressPct = Math.min((loyaltyPts / nextReward) * 100, 100)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-lhc-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/brand/logo.png"
            alt="Local Health Care"
            width={34}
            height={34}
            className="object-contain"
            priority
          />
          <span className="font-bold text-lhc-text-main text-base leading-tight">
            Local Health Care
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <Link href="/" className="text-lhc-text-main font-medium hover:text-lhc-primary transition-colors">
            Home
          </Link>
          <Link href="/clinics" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
            Find a Clinic
          </Link>
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-lhc-text-main transition-colors px-2 py-1.5 rounded-lg hover:bg-lhc-background">
            <Globe className="w-4 h-4" />
            <span className="text-base leading-none">🇦🇺</span>
            <span>EN</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <div className="w-px h-5 bg-lhc-border" />

          {profile ? (
            <>
              {!isDashboard && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-lhc-primary font-medium transition-colors px-3 py-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => { setSigningOut(true); clearDerivedSecretCache(); createClient().auth.signOut().then(() => router.replace('/')) }}
                disabled={signingOut}
                className="flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-red-500 font-medium transition-colors px-3 py-1.5 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="text-sm text-lhc-text-muted hover:text-lhc-text-main font-medium transition-colors px-3 py-1.5"
              >
                Login
              </Link>
              <Link
                href="/auth"
                className="bg-lhc-primary hover:bg-lhc-primary-hover text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-lhc-text-muted p-2.5 -mr-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={openDrawer}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* ── Mobile Drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/35 transition-opacity duration-250 ${
              drawerVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeDrawer}
          />

          {/* Drawer panel */}
          <div
            ref={drawerRef}
            className={`absolute top-0 left-0 h-full w-[85%] max-w-[340px] bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              drawerVisible ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-gray-100">
              <Link href="/" onClick={closeDrawer} className="flex items-center gap-2">
                <span className="flex items-center justify-center w-[34px] h-[34px] rounded-[9px] bg-lhc-primary">
                  <MapPin className="w-[18px] h-[18px] text-white" />
                </span>
                <span className="text-sm font-medium text-gray-900">Local Health Care</span>
              </Link>
              <button
                onClick={closeDrawer}
                className="flex items-center justify-center w-[30px] h-[30px] rounded-[7px] border border-gray-200 hover:bg-gray-50 transition-colors min-w-[44px] min-h-[44px]"
                aria-label="Close menu"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>

            {/* ── Scrollable body ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">

              {profile ? (
                /* ━━━━ LOGGED-IN STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
                <>
                  {/* User identity */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-[42px] h-[42px] rounded-full bg-[#DCFCE7] text-[#059669] text-sm font-medium shrink-0">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
                        <p className="text-[11px] text-gray-500">
                          Patient Account{' '}
                          <span className="text-[#00A86B]">&middot; Active</span>
                        </p>
                      </div>
                    </div>

                    {/* Loyalty progress */}
                    <div className="mt-3 bg-gray-50 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-[#059669]">
                          <span className="text-[#059669]">&#9733;</span> {loyaltyPts} pts &middot; ${dollarValue} AUD
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {loyaltyPts} / {nextReward} to next reward
                        </span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00A86B] rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <Link
                        href="/dashboard?tab=loyalty"
                        onClick={closeDrawer}
                        className="text-[11px] text-[#059669] font-medium mt-1.5 inline-block hover:underline"
                      >
                        Redeem your points &rarr;
                      </Link>
                    </div>
                  </div>

                  {/* My Account section */}
                  <SectionLabel>My Account</SectionLabel>
                  <nav className="space-y-0.5">
                    <NavItem
                      href="/dashboard"
                      icon={<LayoutDashboard className="w-4 h-4 text-[#059669]" />}
                      iconBg="bg-[#F0FDF4]"
                      label="Overview"
                      active={pathname === '/dashboard'}
                      onClick={closeDrawer}
                    />
                    <NavItem
                      href="/dashboard?tab=appointments"
                      icon={<CalendarDays className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50"
                      label="Appointments"
                      onClick={closeDrawer}
                      badge={
                        <span className="text-[9px] font-medium bg-[#ECFDF5] text-[#065F46] px-1.5 py-0.5 rounded-full">
                          1 upcoming
                        </span>
                      }
                    />
                    <NavItem
                      href="/dashboard?tab=messages"
                      icon={<MessageSquare className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50"
                      label="Messages"
                      onClick={closeDrawer}
                      badge={<span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    />
                    <NavItem
                      href="/dashboard?tab=loyalty"
                      icon={<Star className="w-4 h-4 text-[#059669]" />}
                      iconBg="bg-[#F0FDF4]"
                      label={`Loyalty \u00B7 ${loyaltyPts} pts`}
                      onClick={closeDrawer}
                    />
                    <NavItem
                      href="/dashboard?tab=documents"
                      icon={<FileText className="w-4 h-4 text-gray-500" />}
                      iconBg="bg-gray-100"
                      label="Documents"
                      onClick={closeDrawer}
                    />
                  </nav>

                  {/* Discover section */}
                  <div className="border-t border-gray-100 mt-2" />
                  <SectionLabel>Discover</SectionLabel>
                  <nav className="space-y-0.5">
                    <NavItem
                      href="/clinics"
                      icon={<MapPin className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50"
                      label="Find a clinic"
                      onClick={closeDrawer}
                    />
                    <NavItem
                      href="/dashboard?tab=family"
                      icon={<Users className="w-4 h-4 text-[#059669]" />}
                      iconBg="bg-[#F0FDF4]"
                      label="Family"
                      onClick={closeDrawer}
                    />
                  </nav>
                </>
              ) : (
                /* ━━━━ GUEST STATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
                <>
                  {/* Hero context card */}
                  <div className="mx-3.5 mt-3.5 bg-[#F0FDF4] border border-[#A7F3D0] rounded-[10px] p-3">
                    <p className="text-[13px] font-medium text-[#065F46]">
                      Australia&apos;s trusted healthcare directory
                    </p>
                    <p className="text-[11px] text-[#059669] mt-0.5">
                      Book, manage and track your health &mdash; all in one place
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-[#065F46]">
                      <span>1,000+ <span className="font-normal text-[#059669]">Clinics</span></span>
                      <span className="w-px h-3 bg-[#A7F3D0]" />
                      <span>50,000+ <span className="font-normal text-[#059669]">Patients</span></span>
                      <span className="w-px h-3 bg-[#A7F3D0]" />
                      <span>4.8<span className="text-[#065F46]">&#9733;</span> <span className="font-normal text-[#059669]">Rating</span></span>
                    </div>
                  </div>

                  {/* Auth CTAs — equal weight */}
                  <div className="grid grid-cols-2 gap-2 px-3.5 py-2.5">
                    <Link
                      href="/auth"
                      onClick={closeDrawer}
                      className="flex items-center justify-center text-[13px] font-medium text-[#00A86B] border-[1.5px] border-[#00A86B] rounded-[9px] py-2.5 hover:bg-[#F0FDF4] transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth"
                      onClick={closeDrawer}
                      className="flex items-center justify-center text-[13px] font-semibold text-white bg-[#00A86B] rounded-[9px] py-2.5 hover:bg-[#0FA968] transition-colors"
                    >
                      Sign up free
                    </Link>
                  </div>

                  {/* Browse section */}
                  <div className="border-t border-gray-100" />
                  <SectionLabel>Browse</SectionLabel>
                  <nav className="space-y-0.5">
                    <NavItem
                      href="/"
                      icon={<LayoutDashboard className="w-4 h-4 text-[#059669]" />}
                      iconBg="bg-[#F0FDF4]"
                      label="Home"
                      active={pathname === '/'}
                      onClick={closeDrawer}
                    />
                    <NavItem
                      href="/clinics"
                      icon={<MapPin className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50"
                      label="Find a clinic"
                      onClick={closeDrawer}
                    />
                  </nav>
                </>
              )}
            </div>

            {/* ── Footer ───────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-gray-100">
              {/* Sign out (logged in only) */}
              {profile && (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex items-center gap-2 w-full px-3.5 py-2.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-[13px] h-[13px]" />
                  {signingOut
                    ? 'Signing out...'
                    : confirmSignOut
                      ? 'Tap again to sign out'
                      : 'Sign out'}
                </button>
              )}

              {/* Trust signal */}
              <div className="flex items-center justify-center gap-1.5 px-3.5 py-3 border-t border-gray-50">
                <Lock className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-400">256-bit encrypted &middot; HIPAA compliant</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
