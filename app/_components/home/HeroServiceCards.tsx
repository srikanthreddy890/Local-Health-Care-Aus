/**
 * HeroServiceCards — Loyalty Rewards Program section.
 * Step-numbered cards with progress arrows connecting them.
 */

import Link from 'next/link'

const LOYALTY_CARDS = [
  {
    step: '01',
    badge: 'Automatic earning',
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Earn Points',
    description: 'Every time a clinic marks your attendance, you automatically earn loyalty points. The more you visit, the more you save.',
  },
  {
    step: '02',
    badge: '50 pts = $10 AUD',
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a4 4 0 00-4-4H5.45a2 2 0 00-1.902 1.38L3 5m9 3h.01M12 8H9m3 0h3M3 5l1.5 9A2 2 0 006.46 16H17.54a2 2 0 001.96-2l1.5-9" />
      </svg>
    ),
    title: 'First Booking Bonus',
    description: 'Complete your very first appointment through Local Health Care and receive 50 bonus points instantly — that\'s $10 AUD in value!',
  },
  {
    step: '03',
    badge: '5 pts = $1 AUD',
    icon: (
      <svg className="w-5 h-5 text-lhc-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Redeem Rewards',
    description: 'Use your accumulated points at checkout. Every 5 points gives you $1 AUD off your next booking. Points are clinic-specific.',
  },
]

export default function HeroServiceCards() {
  return (
    <section className="py-16 px-4 bg-lhc-background">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block border border-lhc-primary text-lhc-primary text-xs font-medium px-3 py-1 rounded-full mb-5">
            Exclusive to Local Health Care
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-lhc-text-main mb-3 flex items-center justify-center gap-2">
            Loyalty Rewards Program
            <Link
              href="/loyalty-program"
              title="View full terms & conditions"
              className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-lhc-primary/40 text-lhc-primary hover:bg-lhc-primary hover:text-white transition-colors text-xs font-bold leading-none"
            >
              i
            </Link>
          </h2>
          <p className="text-lhc-text-muted max-w-xl mx-auto text-sm leading-relaxed">
            The only healthcare platform in Australia that rewards you for every visit. Earn points, get bonuses, and save real money.
          </p>
        </div>

        {/* 3 cards with progress arrows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative">
          {/* Dashed progress line (desktop only) */}
          <div className="hidden sm:block absolute top-1/2 left-[calc(33.33%+8px)] right-[calc(33.33%+8px)] -translate-y-1/2 z-0">
            <div className="border-t-2 border-dashed border-lhc-primary/30 w-full" />
            <div className="absolute -right-1 top-1/2 -translate-y-1/2">
              <svg className="w-3 h-3 text-lhc-primary/40" fill="currentColor" viewBox="0 0 12 12">
                <path d="M2 1l8 5-8 5V1z" />
              </svg>
            </div>
            <div className="absolute left-[calc(50%-6px)] top-1/2 -translate-y-1/2">
              <svg className="w-3 h-3 text-lhc-primary/40" fill="currentColor" viewBox="0 0 12 12">
                <path d="M2 1l8 5-8 5V1z" />
              </svg>
            </div>
          </div>

          {LOYALTY_CARDS.map((card) => (
            <div
              key={card.title}
              className="relative z-10 bg-white rounded-2xl shadow-sm border border-lhc-border p-6 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default"
            >
              {/* Step number badge */}
              <div className="absolute -top-3 -left-2 w-8 h-8 bg-lhc-primary rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">{card.step}</span>
              </div>

              {/* Top row: icon left, badge right */}
              <div className="flex items-start justify-between pt-2">
                <div className="w-10 h-10 bg-lhc-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {card.icon}
                </div>
                <span className="text-xs font-semibold text-lhc-primary">
                  {card.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-lhc-text-main text-base">{card.title}</h3>

              {/* Description */}
              <p className="text-sm text-lhc-text-muted leading-relaxed">{card.description}</p>

              {/* Read more link */}
              <Link
                href="/loyalty-program"
                className="inline-flex items-center gap-1 text-xs font-medium text-lhc-primary hover:underline"
              >
                Read more →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
