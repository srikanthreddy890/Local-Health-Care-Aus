/**
 * Privacy Policy — static Server Component.
 * Port your full 13-section content from src/pages/PrivacyPolicy.tsx.
 */
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Local Health Care — how we collect, use, and protect your personal and health information across our healthcare platform.',
  alternates: { canonical: '/privacy-policy' },
}

const LAST_UPDATED = '1 January 2025'
const CONTACT_EMAIL = 'info@localhealthcare.com.au'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-lhc-background">
      <header className="border-b border-lhc-border bg-lhc-surface sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/" className="font-bold text-lhc-primary text-lg">
            Local Health Care
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-lhc-text-main mb-2">Privacy Policy</h1>
        <p className="text-sm text-lhc-text-muted mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-lhc-text-main">
          <p className="text-lhc-text-muted leading-relaxed">
            Local Health Care Hub (&ldquo;we&rdquo;, &ldquo;our&rdquo;,
            &ldquo;us&rdquo;) is committed to protecting your privacy in
            accordance with the <em>Privacy Act 1988</em> (Cth) and the
            Australian Privacy Principles (APPs).
          </p>

          <Section title="1. Information We Collect">
            <p>We collect the following categories of personal information:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Identity data:</strong> name, date of birth, gender</li>
              <li><strong>Contact data:</strong> email address, phone number, postal address</li>
              <li><strong>Health data:</strong> appointment history, prescriptions, documents you upload</li>
              <li><strong>Technical data:</strong> IP address, browser type, device identifiers</li>
              <li><strong>Usage data:</strong> pages visited, features used, click patterns</li>
            </ul>
          </Section>

          <Section title="2. How We Collect Information">
            <p>We collect information when you:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Register for an account</li>
              <li>Book or attend an appointment</li>
              <li>Upload health documents or prescriptions</li>
              <li>Communicate with clinics via our chat feature</li>
              <li>Use our website or mobile application</li>
            </ul>
          </Section>

          <Section title="3. Use of Your Information">
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Facilitate appointment bookings and healthcare services</li>
              <li>Send appointment reminders and notifications</li>
              <li>Administer loyalty points and rewards</li>
              <li>Improve the Platform through analytics</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>
          </Section>

          <Section title="4. Sensitive Health Information">
            <p>
              Health information is &ldquo;sensitive information&rdquo; under the
              Privacy Act. We collect it only with your explicit consent and for
              the purpose of facilitating healthcare services. It is never sold
              or shared with third parties for commercial purposes.
            </p>
          </Section>

          <Section title="5. Disclosure of Your Information">
            <p>We may share your information with:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Healthcare providers</strong> you book with, to facilitate care</li>
              <li><strong>Service providers</strong> (e.g. cloud hosting, email, SMS) under strict data processing agreements</li>
              <li><strong>Regulatory authorities</strong> where required by law</li>
            </ul>
            <p className="mt-2">We do not sell your personal information.</p>
          </Section>

          <Section title="6. International Transfers">
            <p>
              Our infrastructure uses cloud services that may store data outside
              Australia. We take reasonable steps to ensure overseas recipients
              handle your data in accordance with the APPs.
            </p>
          </Section>

          <Section title="7. Data Security">
            <p>
              We implement industry-standard security measures including
              encryption at rest and in transit, role-based access controls, and
              end-to-end encryption for chat messages. No system is completely
              secure; please notify us immediately of any suspected breach.
            </p>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We retain personal information for as long as your account is
              active and for a period thereafter as required by law or legitimate
              business purposes. Health records are retained in accordance with
              applicable Australian health records legislation.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>Under the Privacy Act you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate or incomplete information</li>
              <li>Complain about a breach of your privacy</li>
              <li>Request deletion of your account and associated data</li>
            </ul>
          </Section>

          <Section title="10. Cookies and Tracking">
            <p>
              We use cookies and similar technologies for session management and
              analytics. You may disable cookies in your browser settings, though
              some features of the Platform may not function correctly as a
              result.
            </p>
          </Section>

          <Section title="11. Children's Privacy">
            <p>
              The Platform is not directed at children under 18. Parents or
              guardians may book appointments on behalf of minors. We do not
              knowingly collect personal information from children without
              parental consent.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes via email or a prominent notice on
              the Platform. Your continued use constitutes acceptance of the
              updated policy.
            </p>
          </Section>

          <Section title="13. Contact & Complaints">
            <p>
              For privacy enquiries or to lodge a complaint, contact our Privacy
              Officer:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-lhc-text-muted">
              <li>
                Email:{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-lhc-primary underline">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
            <p className="mt-3">
              If you are not satisfied with our response, you may lodge a
              complaint with the{' '}
              <a
                href="https://www.oaic.gov.au"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lhc-primary underline"
              >
                Office of the Australian Information Commissioner (OAIC)
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-lhc-text-main border-b border-lhc-border pb-2">
        {title}
      </h2>
      <div className="text-lhc-text-muted leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
