/**
 * WhyChooseUs — 4 benefit columns, no card borders, circular mint-green icons.
 * Server Component — pure markup, no interactivity.
 */

const BENEFITS = [
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Verified Providers',
    description: 'All healthcare professionals are verified and registered with Australian health authorities.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure Platform',
    description: 'Bank-level encryption protects your health data and personal information.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Multi-Language Support',
    description: 'Available in 8 languages including Chinese, Hindi, Indonesian, and more.',
  },
  {
    icon: (
      <svg className="w-6 h-6 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Australian-Focused',
    description: 'Built specifically for the Australian healthcare system and Medicare.',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-lhc-text-main mb-3">
            Why choose Local Health Care?
          </h2>
          <p className="text-lhc-text-muted text-sm">
            Trusted by thousands of Australians for their healthcare needs.
          </p>
        </div>

        {/* 4 columns — no card borders, just icon + title + text */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex flex-col items-center text-center gap-4">
              {/* Circular mint-green icon — no box border */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-lhc-primary/10 rounded-full flex items-center justify-center">
                {b.icon}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lhc-text-main text-sm">{b.title}</h3>
                <p className="text-xs text-lhc-text-muted leading-relaxed">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
