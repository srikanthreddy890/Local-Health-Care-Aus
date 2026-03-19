/**
 * HowItWorks — 3 steps with large circular icons and connecting line.
 * Server Component — pure markup, no interactivity.
 */

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Search',
    description: 'Find clinics by type, location, or specialty. Filter by GP, Dentist, Allied Health, or Specialist.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Book',
    description: 'Choose your preferred doctor, date, and time. Confirm your appointment instantly online.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Manage',
    description: 'Track your appointments, store health records, earn loyalty points, and message your clinic.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-16 px-4 bg-lhc-background">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-lhc-text-main mb-3">
            How it works
          </h2>
          <p className="text-lhc-text-muted text-sm">
            Simple steps to get the care you need, when you need it.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.66%+2.5rem)] right-[calc(16.66%+2.5rem)] h-px bg-lhc-border" />

          {STEPS.map((s) => (
            <div key={s.title} className="flex flex-col items-center text-center gap-5">
              {/* Large circular icon */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-lhc-background border border-lhc-border flex items-center justify-center shadow-sm">
                {s.icon}
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lhc-text-main text-base">{s.title}</h3>
                <p className="text-sm text-lhc-text-muted leading-relaxed max-w-xs mx-auto">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
