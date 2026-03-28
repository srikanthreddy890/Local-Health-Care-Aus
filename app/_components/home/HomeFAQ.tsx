'use client'

import { useState } from 'react'

const FAQS = [
  {
    question: 'How do I book an appointment with a doctor near me?',
    answer:
      'Simply use the search bar on our homepage to find doctors by specialty, location, or clinic name. Select your preferred provider, choose an available time slot, and confirm your booking — all in just a few clicks.',
  },
  {
    question: 'Is Local Health Care free to use for patients?',
    answer:
      'Yes, Local Health Care is completely free for patients. You can search for providers, book appointments, and manage your healthcare without any fees.',
  },
  {
    question: 'Can I find bulk-billing doctors on Local Health Care?',
    answer:
      'Absolutely. Many clinics listed on our platform offer bulk-billing services. You can filter your search results to find bulk-billing GPs and specialists in your area.',
  },
  {
    question: 'What types of healthcare providers are listed?',
    answer:
      'We list a wide range of providers including General Practitioners (GPs), dentists, physiotherapists, psychologists, optometrists, chiropractors, dermatologists, and many other specialists across Australia.',
  },
  {
    question: 'How do I cancel or reschedule my appointment?',
    answer:
      'Log in to your account and navigate to your upcoming appointments. From there you can cancel or reschedule with just a few taps. Please note that individual clinic cancellation policies may apply.',
  },
  {
    question: 'Is my personal and health information secure?',
    answer:
      'Yes. We use bank-level encryption and follow Australian privacy regulations to protect your data. Your personal and health information is never shared without your explicit consent.',
  },
  {
    question: 'Do I need Medicare to book an appointment?',
    answer:
      'No, Medicare is not required. While many providers offer Medicare-covered services, you can book appointments with any listed provider regardless of your insurance status. Private and self-pay options are available.',
  },
  {
    question: 'Can I book appointments for my family members?',
    answer:
      'Yes, you can book appointments on behalf of family members including children and elderly dependants through your account. Simply provide their details during the booking process.',
  },
]

export default function HomeFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  // FAQ structured data for SEO
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <section className="py-16 px-4 bg-lhc-background">
      {/* JSON-LD FAQ schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-lhc-text-main mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-lhc-text-muted text-sm">
            Everything you need to know about booking healthcare appointments in Australia.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-sm text-lhc-text-main">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-lhc-primary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-lhc-text-muted leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
