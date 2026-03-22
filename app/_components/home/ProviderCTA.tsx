/**
 * ProviderCTA — dark green full-width CTA for healthcare providers.
 * Clear primary vs secondary button hierarchy with descriptors.
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

          {/* Right: buttons with clear hierarchy */}
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            {/* Primary CTA */}
            <div className="flex flex-col items-center gap-1.5">
              <Link
                href="/auth"
                className="bg-[#00A86B] hover:bg-[#009960] text-white font-bold px-7 py-3 rounded-xl transition-colors text-sm text-center whitespace-nowrap h-12 flex items-center justify-center min-w-[180px]"
              >
                Register Clinic
              </Link>
              <span className="text-white/40 text-[11px]">For multi-provider clinics</span>
            </div>

            {/* Secondary ghost CTA */}
            <div className="flex flex-col items-center gap-1.5">
              <Link
                href="/auth"
                className="border border-white/30 hover:border-white/60 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm text-center whitespace-nowrap h-12 flex items-center justify-center min-w-[180px]"
              >
                List Your Practice
              </Link>
              <span className="text-white/40 text-[11px]">For individual practitioners</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
