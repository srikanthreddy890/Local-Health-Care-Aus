'use client'

/**
 * HomeHeader — sticky navigation bar matching original design.
 * Client Component: mobile menu toggle requires useState.
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X, Globe, ChevronDown } from 'lucide-react'

export default function HomeHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

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
        </div>
      )}
    </header>
  )
}
