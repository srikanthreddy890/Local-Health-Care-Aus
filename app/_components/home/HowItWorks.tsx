/**
 * HowItWorks — 3 numbered steps with dashed connecting lines.
 * Horizontal stepper on desktop, vertical on mobile.
 */

const STEPS = [
  {
    number: '01',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Search',
    description: 'Find clinics by type, location, or specialty. Filter by GP, Dentist, Allied Health, or Specialist.',
  },
  {
    number: '02',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Book',
    description: 'Choose your preferred doctor, date, and time. Confirm your appointment instantly online.',
  },
  {
    number: '03',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <div className="relative">
          {/* Desktop: horizontal layout */}
          <div className="hidden md:grid md:grid-cols-3 gap-10 relative">
            {/* Dashed connecting line between circles */}
            <div className="absolute top-[36px] left-[calc(16.66%+36px)] right-[calc(16.66%+36px)] flex items-center">
              <div className="w-full border-t-2 border-dashed border-lhc-primary/30" />
            </div>

            {STEPS.map((s) => (
              <div key={s.title} className="flex flex-col items-center text-center gap-5">
                {/* Numbered circle with icon */}
                <div className="relative z-10 w-[72px] h-[72px] rounded-full bg-lhc-primary flex items-center justify-center shadow-lg">
                  {s.icon}
                  {/* Step number badge */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-white border-2 border-lhc-primary rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-lhc-primary">{s.number}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lhc-text-main text-lg">{s.title}</h3>
                  <p className="text-sm text-lhc-text-muted leading-relaxed max-w-xs mx-auto">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: vertical layout with left-side dashed line */}
          <div className="md:hidden relative pl-10">
            {/* Vertical dashed line */}
            <div className="absolute left-[20px] top-0 bottom-0 border-l-2 border-dashed border-lhc-primary/30" />

            <div className="space-y-10">
              {STEPS.map((s) => (
                <div key={s.title} className="relative flex gap-5">
                  {/* Numbered circle */}
                  <div className="absolute -left-10 w-10 h-10 rounded-full bg-lhc-primary flex items-center justify-center shadow-lg flex-shrink-0 z-10">
                    {s.icon}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border-2 border-lhc-primary rounded-full flex items-center justify-center">
                      <span className="text-[9px] font-bold text-lhc-primary">{s.number}</span>
                    </div>
                  </div>

                  <div className="pt-3">
                    <h3 className="font-bold text-lhc-text-main text-base">{s.title}</h3>
                    <p className="text-sm text-lhc-text-muted leading-relaxed mt-1">
                      {s.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
