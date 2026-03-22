/**
 * Auth page — Server Component shell.
 * Dynamic headings, contextual left panel, pill tab toggle.
 */
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Authentication from './_components/Authentication'

export const metadata: Metadata = {
  title: 'Sign In | Local Health Care',
  description: 'Sign in or create your Local Health Care account.',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ next?: string }>
}

export default async function AuthPage({ searchParams }: Props) {
  // Defence-in-depth: redirect authenticated users to home (server-side router)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  const { next } = await searchParams
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="border-b border-lhc-border bg-white flex-shrink-0">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/brand/logo.png" alt="Local Health Care" width={32} height={32} priority />
            <span className="font-bold text-lhc-text-main text-base">Local Health Care</span>
          </Link>
          <Link href="/clinics" className="text-sm text-lhc-text-muted hover:text-lhc-primary transition-colors font-medium">
            Browse Clinics
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex">

        {/* Left brand panel (desktop only) — contextual content handled client-side */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-14"
          style={{ background: 'linear-gradient(135deg, #0B1F16 0%, #12B780 100%)' }}
        >
          {/* Background circles */}
          <div className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full bg-white/5" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.03]" />

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full justify-center space-y-10">
            {/* Logo — 48px with brand name at 18px */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Image src="/images/brand/logo.png" alt="Local Health Care" width={32} height={32} />
              </div>
              <div>
                <p className="text-white font-semibold text-lg leading-none">Local Health Care</p>
                <p className="text-white/60 text-xs mt-0.5">Australia&apos;s Trusted Directory</p>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold text-white leading-tight">
                Your Health,<br />Your Way
              </h1>
              <p className="text-white/75 text-base leading-relaxed max-w-sm">
                Connect with thousands of trusted healthcare providers across Australia. Book instantly, manage your care, and never miss an appointment.
              </p>
            </div>

            {/* Benefits */}
            <ul className="space-y-3.5">
              {[
                'Book appointments with trusted clinics instantly',
                'Manage your health records in one secure place',
                'Access telehealth and in-person care across Australia',
                'Earn loyalty rewards for every visit',
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-lhc-primary flex-shrink-0 mt-0.5 drop-shadow" style={{ filter: 'drop-shadow(0 0 6px rgba(18,183,128,0.6))' }} />
                  <span className="text-white/85 text-sm leading-snug">{b}</span>
                </li>
              ))}
            </ul>

            {/* Stats — repositioned directly below benefits with divider */}
            <div className="pt-2">
              <div className="border-t border-white/20 pt-6 flex gap-8">
                {[['1,000+', 'Clinics'], ['50,000+', 'Patients'], ['4.8\u2605', 'Rating']].map(([num, label]) => (
                  <div key={label} className="flex items-center gap-3">
                    <div>
                      <p className="text-[28px] font-extrabold text-white leading-none">{num}</p>
                      <p className="text-white/55 text-[13px] mt-0.5">{label}</p>
                    </div>
                    {label !== 'Rating' && (
                      <div className="h-10 w-px bg-white/20 ml-5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-lhc-background">
          <div className="w-full max-w-[420px]">

            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
              <Image src="/images/brand/logo.png" alt="Local Health Care" width={36} height={36} />
              <span className="font-bold text-lhc-text-main text-lg">Local Health Care</span>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-xl border border-lhc-border/60 p-8">
              {/* Dynamic heading is handled inside Authentication component */}
              <Authentication redirectTo={next} />
            </div>

            <p className="text-center text-xs text-lhc-text-muted mt-5">
              By continuing, you agree to our{' '}
              <Link href="/terms-and-conditions" className="text-lhc-primary hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy-policy" className="text-lhc-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
