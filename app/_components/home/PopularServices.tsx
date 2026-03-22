/**
 * PopularServices — 2x3 grid with ghost/outline buttons and provider count badges.
 */

import Link from 'next/link'

const SERVICES = [
  {
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'GP Consultations',
    category: 'General Practitioner',
    description: 'General health checkups, prescriptions, and referrals',
    href: '/clinics?type=General+Practice',
    providerCount: '320+',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14s1.5 2 3.5 2 3.5-2 3.5-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={2} strokeLinecap="round" />
        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
    title: 'Dental Checkups',
    category: 'Dentist',
    description: 'Routine cleaning, fillings, and oral health care',
    href: '/clinics?type=Dental',
    providerCount: '180+',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l3-9 3 18 3-9h3" />
      </svg>
    ),
    title: 'Physiotherapy',
    category: 'Allied Health',
    description: 'Injury rehabilitation, pain management, and mobility',
    href: '/clinics?type=Allied+Health',
    providerCount: '240+',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Mental Health',
    category: 'Allied Health',
    description: 'Psychology sessions, counselling, and mental health plans',
    href: '/clinics?type=Mental+Health',
    providerCount: '150+',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    title: 'Vaccinations',
    category: 'General Practitioner',
    description: 'Flu shots, travel vaccines, and immunisations',
    href: '/clinics?type=General+Practice',
    providerCount: '280+',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: 'Skin Cancer Checks',
    category: 'General Practitioner',
    description: 'Full body skin examinations and mole mapping',
    href: '/clinics?type=General+Practice',
    providerCount: '200+',
  },
]

export default function PopularServices() {
  return (
    <section className="py-14 px-4 bg-white">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-9">
          <h2 className="text-2xl sm:text-3xl font-bold text-lhc-text-main mb-1">
            Popular Services
          </h2>
          <p className="text-sm text-lhc-text-muted">
            Book these commonly requested healthcare services today.
          </p>
        </div>

        {/* 2x3 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="bg-white border border-lhc-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              {/* Icon + title + category + provider count */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-lhc-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lhc-text-main text-sm leading-tight">{s.title}</h3>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                      {s.providerCount} Providers
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-lhc-text-muted uppercase tracking-wider mt-0.5">
                    {s.category}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-lhc-text-muted leading-relaxed flex-1">
                {s.description}
              </p>

              {/* Ghost/outline button — fills on hover */}
              <Link
                href={s.href}
                className="block w-full border-2 border-lhc-primary text-lhc-primary bg-transparent hover:bg-lhc-primary hover:text-white text-sm font-semibold text-center py-2.5 rounded-xl transition-all duration-200"
              >
                Find Providers
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
