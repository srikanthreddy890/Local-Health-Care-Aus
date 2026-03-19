/**
 * PatientFeaturesSection — feature grid with mint-green icon backgrounds.
 * Server Component — pure markup, no interactivity.
 */

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Instant Booking',
    description: 'Book appointments with any clinic in minutes, 24 hours a day, 7 days a week.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Health Records',
    description: 'Securely store, manage, and share your medical documents with healthcare providers.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Family Care',
    description: 'Manage health bookings and records for your entire family from one account.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Loyalty Rewards',
    description: 'Earn and redeem points across all your clinic visits and save on future appointments.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Secure Chat',
    description: 'Message your clinic directly with end-to-end encryption keeping your health private.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Emergency Finder',
    description: 'Find available urgent care slots near you quickly when you need it most.',
  },
]

export default function PatientFeaturesSection() {
  return (
    <section className="py-16 px-4 bg-lhc-background">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-lhc-text-main mb-3">
            Everything you need to manage your health
          </h2>
          <p className="text-lhc-text-muted max-w-xl mx-auto">
            One platform to handle all your healthcare needs — bookings, records, and rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-lhc-border rounded-2xl p-6 flex gap-4 hover:shadow-sm hover:border-lhc-primary/30 transition-all"
            >
              {/* Mint-green icon square */}
              <div className="flex-shrink-0 w-12 h-12 bg-lhc-primary/10 rounded-xl flex items-center justify-center">
                {f.icon}
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-lhc-text-main text-sm">{f.title}</h3>
                <p className="text-xs text-lhc-text-muted leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
