/**
 * Loyalty Program — public page detailing the Local Health Care
 * points system, terms & conditions, and APRA compliance notes.
 */

import Link from 'next/link'
import Image from 'next/image'
import { POINTS_PER_DOLLAR } from '@/lib/constants/loyalty'

export const metadata = {
  title: 'Loyalty Rewards Program — Terms & Conditions | Local Health Care',
  description:
    'Learn how the Local Health Care loyalty points system works, how to earn and redeem points, expiry rules, and full terms and conditions.',
}

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Program Overview',
    content: [
      'The Local Health Care Loyalty Rewards Program ("Program") is a patient rewards initiative operated by Local Health Care Australia. The Program allows registered patients to earn loyalty points when they attend appointments booked through the Local Health Care platform and redeem those points for discounts on future bookings.',
      'This Program is available to all registered patients aged 18 years or older who hold a valid Local Health Care account. By participating in the Program, you agree to these Terms and Conditions.',
    ],
  },
  {
    id: 'earning',
    title: '2. Earning Points',
    content: [
      'Points are awarded automatically when a participating clinic marks your attendance for a completed appointment. Points are not awarded at the time of booking — only upon confirmed attendance.',
      'The number of points earned per appointment is determined by the clinic and may vary based on the type of service, duration, and any promotional multipliers the clinic has configured.',
      'As a general guide, base point allocations are:',
    ],
    list: [
      '15-minute appointment — approximately 20 points',
      '30-minute appointment — approximately 40 points',
      '45-minute appointment — approximately 60 points',
      '60-minute appointment — approximately 80 points',
      'Extended appointments (60+ minutes) — approximately 100 points',
    ],
    afterList:
      'Clinics may apply multipliers (e.g., Premium 1.5×, Specialty 2×, VIP 3×) that increase the points earned for specific services. The exact points for each service are set at the clinic\'s discretion.',
  },
  {
    id: 'first-booking',
    title: '3. First Booking Bonus',
    content: [
      `New patients receive a one-time bonus of 50 points (valued at $${(50 / POINTS_PER_DOLLAR).toFixed(2)} AUD) upon completing their very first attended appointment through Local Health Care.`,
      'This bonus is automatically credited to your loyalty account and is subject to the same expiry and redemption rules as standard earned points.',
    ],
  },
  {
    id: 'redemption',
    title: '4. Redeeming Points',
    content: [
      `Points can be redeemed at checkout when booking a new appointment. The conversion rate is ${POINTS_PER_DOLLAR} points = $1.00 AUD.`,
      `A minimum of ${POINTS_PER_DOLLAR} points is required to redeem. You may redeem any number of points (in whole numbers) up to the total cost of the appointment or your available balance, whichever is less.`,
      'Points are redeemed on a first-earned, first-redeemed basis. Points closest to expiry will be used first.',
    ],
  },
  {
    id: 'expiry',
    title: '5. Points Expiry',
    content: [
      'Earned points expire 12 months from the date they were credited to your account if they remain unredeemed.',
      'You will receive notifications when points are approaching expiry. Points that have expired cannot be reinstated or recovered.',
      'Bonus points (including first booking bonuses and referral bonuses) are subject to the same 12-month expiry period.',
    ],
  },
  {
    id: 'cancellations',
    title: '6. Cancellations & Refunds',
    content: [
      'If a booking for which you have redeemed points is cancelled, the redeemed points will be automatically refunded to your loyalty account.',
      'Refunded points retain their original expiry date. If the original expiry date has already passed, the refunded points will be credited with a new 30-day expiry window.',
      'Points earned from an appointment that is subsequently cancelled or reversed by the clinic may be deducted from your account.',
    ],
  },
  {
    id: 'clinic-specific',
    title: '7. Clinic-Specific Points',
    content: [
      'Points are earned at a specific clinic and are tracked at the clinic level. Your loyalty account maintains a record of which clinic issued each set of points.',
      'Points may be redeemed for bookings at the same clinic where they were earned, or across participating clinics on the Local Health Care platform, depending on clinic policies.',
    ],
  },
  {
    id: 'referrals',
    title: '8. Referral Bonuses',
    content: [
      'From time to time, Local Health Care may offer referral bonuses where you can earn additional points by referring new patients to the platform.',
      'Referral bonus amounts and eligibility criteria will be communicated at the time of the promotion. Standard expiry and redemption rules apply to referral points.',
    ],
  },
  {
    id: 'account',
    title: '9. Account & Eligibility',
    content: [
      'Points are non-transferable between accounts. Each patient maintains their own individual loyalty balance.',
      'Points have no cash value and cannot be exchanged for cash, gift cards, or any monetary equivalent outside of the discount-at-checkout mechanism described herein.',
      'Local Health Care reserves the right to suspend or terminate a patient\'s participation in the Program if there is evidence of misuse, fraudulent activity, or violation of these Terms.',
      'If your Local Health Care account is closed or deactivated, any unredeemed points will be forfeited.',
    ],
  },
  {
    id: 'regulatory',
    title: '10. Regulatory & Compliance',
    content: [
      'The Local Health Care Loyalty Rewards Program is designed as a non-monetary rewards program. Points do not constitute stored value, currency, or a financial product under the Australian Prudential Regulation Authority (APRA) guidelines or the Payment Systems (Regulation) Act 1998.',
      'The Program does not involve the issuance of electronic money, prepaid facilities, or any product classified as a stored-value facility under APRA\'s Prudential Standards. Points represent a conditional right to a future discount and have no independent monetary value.',
      'Local Health Care operates this Program in compliance with:',
    ],
    list: [
      'Australian Consumer Law (ACL) — Competition and Consumer Act 2010 (Cth)',
      'Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs)',
      'Spam Act 2003 (Cth) — for promotional communications',
      'APRA guidelines regarding non-cash payment facilities — the Program is structured to remain below the thresholds that would require an Australian Financial Services Licence (AFSL) or authorised deposit-taking institution (ADI) status',
    ],
    afterList:
      'Local Health Care does not hold funds on behalf of patients. No monetary deposits are accepted through the loyalty system. The discount is applied as a reduction in the service fee at the time of booking, not as a withdrawal or transfer of funds.',
  },
  {
    id: 'data',
    title: '11. Data & Privacy',
    content: [
      'Your loyalty points balance, transaction history, and related data are stored securely in accordance with our Privacy Policy and the Australian Privacy Principles.',
      'We collect and process loyalty data solely for the purpose of administering the Program. This data is not sold or shared with third parties for marketing purposes.',
      'You may request access to your loyalty transaction history at any time through your patient dashboard.',
    ],
  },
  {
    id: 'changes',
    title: '12. Changes to the Program',
    content: [
      'Local Health Care reserves the right to modify, suspend, or discontinue the Program (or any part of it) at any time with reasonable notice to participants.',
      'Changes may include adjustments to the points-per-dollar conversion rate, expiry periods, earning rules, or redemption terms. Significant changes will be communicated via email and/or in-app notification.',
      'Any points earned prior to a change in terms will be honoured at the conversion rate in effect at the time they were earned, unless otherwise stated.',
    ],
  },
  {
    id: 'contact',
    title: '13. Contact & Disputes',
    content: [
      'If you have questions about your points balance, a missing transaction, or any aspect of the Program, please contact Local Health Care support through the in-app chat or via our Contact Us page.',
      'Disputes regarding points will be investigated and resolved within 14 business days. Local Health Care\'s decision on all matters relating to the Program is final.',
    ],
  },
]

export default function LoyaltyProgramPage() {
  return (
    <div className="min-h-screen bg-lhc-background">
      {/* Header */}
      <header className="bg-white border-b border-lhc-border">
        <div className="container mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/brand/logo.png"
              alt="Local Health Care"
              width={30}
              height={30}
              className="object-contain"
            />
            <span className="font-bold text-lhc-text-main text-sm">Local Health Care</span>
          </Link>
          <Link
            href="/"
            className="text-xs text-lhc-text-muted hover:text-lhc-primary transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <span className="inline-block border border-lhc-primary text-lhc-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
            Loyalty Rewards Program
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-lhc-text-main mb-3">
            Points System — Terms &amp; Conditions
          </h1>
          <p className="text-lhc-text-muted max-w-2xl mx-auto text-sm leading-relaxed">
            Everything you need to know about earning, redeeming, and managing your loyalty
            points on Local Health Care.
          </p>
        </div>

        {/* Quick summary card */}
        <div className="bg-white border border-lhc-border rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-bold text-lhc-text-main text-lg mb-4">At a Glance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-lhc-primary/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-lhc-primary">{POINTS_PER_DOLLAR} pts</p>
              <p className="text-xs text-lhc-text-muted mt-1">= $1.00 AUD</p>
            </div>
            <div className="bg-lhc-primary/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-lhc-primary">50 pts</p>
              <p className="text-xs text-lhc-text-muted mt-1">First booking bonus</p>
            </div>
            <div className="bg-lhc-primary/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-lhc-primary">12 months</p>
              <p className="text-xs text-lhc-text-muted mt-1">Points validity</p>
            </div>
          </div>
        </div>

        {/* Table of contents */}
        <div className="bg-white border border-lhc-border rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-bold text-lhc-text-main text-sm mb-3">Contents</h2>
          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs text-lhc-text-muted hover:text-lhc-primary transition-colors py-1"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="bg-white border border-lhc-border rounded-2xl p-6 shadow-sm scroll-mt-6"
            >
              <h2 className="font-bold text-lhc-text-main text-base mb-3">{section.title}</h2>
              <div className="space-y-3">
                {section.content.map((paragraph, i) => (
                  <p key={i} className="text-sm text-lhc-text-muted leading-relaxed">
                    {paragraph}
                  </p>
                ))}
                {section.list && (
                  <ul className="list-disc list-inside space-y-1.5 text-sm text-lhc-text-muted ml-2">
                    {section.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.afterList && (
                  <p className="text-sm text-lhc-text-muted leading-relaxed">
                    {section.afterList}
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Effective date */}
        <div className="text-center mt-8 mb-4">
          <p className="text-xs text-lhc-text-muted">
            These terms are effective as of 1 January 2026 and were last updated on 26 March 2026.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-lhc-primary hover:underline font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t border-lhc-border py-6 px-4 mt-8">
        <div className="container mx-auto max-w-4xl text-center text-xs text-lhc-text-muted">
          © 2026 Local Health Care Australia. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
