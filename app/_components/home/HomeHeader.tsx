'use client'

/**
 * HomeHeader — sticky navigation bar matching original design.
 * Client Component: mobile menu toggle requires useState.
 * Shows Dashboard/Sign Out when logged in, Login/Sign Up when not.
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Globe, ChevronDown, LayoutDashboard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clearDerivedSecretCache } from '@/lib/chatEncryption'

export default function HomeHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isDashboard = pathname?.startsWith('/dashboard')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id } : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    clearDerivedSecretCache()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

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
          {/* Language selector */}
          <button className="flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-lhc-text-main transition-colors px-2 py-1.5 rounded-lg hover:bg-lhc-background">
            <Globe className="w-4 h-4" />
            <span className="text-base leading-none">🇦🇺</span>
            <span>EN</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <div className="w-px h-5 bg-lhc-border" />

          {user ? (
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
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-red-500 font-medium transition-colors px-3 py-1.5 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? 'Signing out…' : 'Sign Out'}
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
          className="md:hidden text-lhc-text-muted p-1"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-lhc-border bg-white px-4 py-4 space-y-1">
          <Link
            href="/"
            className="block px-3 py-2 text-sm font-medium text-lhc-text-main rounded-lg hover:bg-lhc-background"
            onClick={() => setMobileOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/clinics"
            className="block px-3 py-2 text-sm text-lhc-text-muted rounded-lg hover:bg-lhc-background"
            onClick={() => setMobileOpen(false)}
          >
            Find a Clinic
          </Link>
          <hr className="border-lhc-border my-2" />

          {user ? (
            <>
              {!isDashboard && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-lhc-text-muted rounded-lg hover:bg-lhc-background"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => { setMobileOpen(false); handleSignOut() }}
                disabled={signingOut}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-lhc-text-muted rounded-lg hover:bg-lhc-background hover:text-red-500 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="block px-3 py-2 text-sm text-lhc-text-muted rounded-lg hover:bg-lhc-background"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/auth"
                className="block bg-lhc-primary hover:bg-lhc-primary-hover text-white text-sm font-semibold px-4 py-2.5 rounded-lg text-center transition-colors mt-2"
                onClick={() => setMobileOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
