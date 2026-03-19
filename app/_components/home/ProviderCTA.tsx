/**
 * ProviderCTA — dark green full-width CTA for healthcare providers.
 * Server Component — links are <Link> tags; no client JS needed.
 *
 * Layout: text block on left, two action buttons on right (two-column).
 */

import Link from 'next/link'

export default function ProviderCTA() {
  return (
    <section className="py-16 px-4 bg-lhc-cta-dark">
      <div className="container mx-auto max-w-5xl">
        {/* Inner rounded card with subtle gradient */}
        <div
          className="rounded-3xl p-10 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8"
          style={{ background: 'linear-gradient(135deg, rgba(15,35,24,0.9) 0%, rgba(15,90,55,0.4) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Left: text */}
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
              Are you a healthcare provider?
            </h2>
            <p className="text-white/65 leading-relaxed max-w-lg text-sm sm:text-base">
              Manage your doctors, accept online bookings, communicate with patients
              securely, and streamline billing — all in one platform. Join Local Health Care today.
            </p>
          </div>

          {/* Right: buttons */}
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              href="/auth"
              className="bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm text-center whitespace-nowrap"
            >
              Register Clinic
            </Link>
            <Link
              href="/auth"
              className="border border-lhc-primary/60 hover:border-lhc-primary text-lhc-primary font-semibold px-7 py-3 rounded-xl transition-colors text-sm text-center whitespace-nowrap"
              style={{ background: 'rgba(15,169,104,0.08)' }}
            >
              List Your Practice
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
