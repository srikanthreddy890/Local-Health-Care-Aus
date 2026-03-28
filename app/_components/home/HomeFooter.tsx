/**
 * HomeFooter — site footer matching original design.
 * Server Component — all links are <Link> tags, no interactivity.
 *
 * White background, actual brand logo (heart+cross+leaves), 3 link columns.
 */

import Link from 'next/link'
import Image from 'next/image'

export default function HomeFooter() {
  return (
    <footer className="bg-white border-t border-lhc-border py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/brand/logo.png"
                alt="Local Health Care"
                width={34}
                height={34}
                className="object-contain"
              />
              <span className="font-bold text-lhc-text-main text-base">Local Health Care</span>
            </div>
            <p className="text-lhc-text-muted leading-relaxed text-xs">
              Connecting patients with trusted healthcare providers across Australia.
            </p>
          </div>

          {/* Patients */}
          <div className="space-y-4">
            <p className="font-semibold text-lhc-text-main text-sm">Patients</p>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/clinics" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
                  Find a Doctor
                </Link>
              </li>
              <li>
                <Link href="/clinics" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link href="/loyalty-program" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
                  Loyalty Program
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <p className="font-semibold text-lhc-text-main text-sm">Company</p>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/blog" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/loyalty-program" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
                  Loyalty Program
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <p className="font-semibold text-lhc-text-main text-sm">Legal</p>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/privacy-policy" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="text-lhc-text-muted hover:text-lhc-primary transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div className="mt-10 pt-6 border-t border-lhc-border text-center text-xs text-lhc-text-muted">
          © 2026 Local Health Care Australia. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
