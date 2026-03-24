/**
 * Terms & Conditions — static Server Component.
 * Port your full 17-section content from src/pages/TermsAndConditions.tsx.
 */
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and Conditions for using the Local Health Care platform — appointment booking, clinic services, and patient responsibilities.',
  alternates: { canonical: '/terms-and-conditions' },
}

const LAST_UPDATED = '1 January 2025'
const CONTACT_EMAIL = 'info@localhealthcare.com.au'
const WEBSITE = 'localhealthcare.com.au'

export default function TermsAndConditionsPage() {
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
        <h1 className="text-4xl font-bold text-lhc-text-main mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-lhc-text-muted mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-lhc-text-main">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using the Local Health Care Hub platform
              (&ldquo;Platform&rdquo;), you agree to be bound by these Terms
              and Conditions (&ldquo;Terms&rdquo;). If you do not agree, please
              do not use the Platform.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Local Health Care Hub is an online platform that connects patients
              with registered healthcare providers in Australia. The Platform
              facilitates appointment bookings, health record management, and
              related services but does not itself provide medical advice or
              treatment.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 18 years of age to create an account. By
              registering, you confirm that all information you provide is
              accurate, current, and complete.
            </p>
          </Section>

          <Section title="4. User Accounts">
            <p>
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activity that occurs under your
              account. Notify us immediately at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-lhc-primary underline">
                {CONTACT_EMAIL}
              </a>{' '}
              if you suspect unauthorised access.
            </p>
          </Section>

          <Section title="5. Patient Obligations">
            <p>
              Patients must provide accurate health and contact information.
              Appointment bookings are subject to clinic availability and
              cancellation policies set by individual providers. Failure to
              attend a booked appointment without reasonable notice may result
              in account suspension.
            </p>
          </Section>

          <Section title="6. Healthcare Provider Obligations">
            <p>
              Healthcare providers must hold current registration with the
              Australian Health Practitioner Regulation Agency (AHPRA) or the
              relevant regulatory body. Providers are solely responsible for the
              clinical care they deliver and must comply with all applicable
              laws and professional standards.
            </p>
          </Section>

          <Section title="7. Bookings and Cancellations">
            <p>
              Appointment bookings are confirmed subject to provider acceptance.
              Cancellation policies vary by clinic. The Platform is not
              responsible for any loss arising from a cancelled or missed
              appointment.
            </p>
          </Section>

          <Section title="8. Loyalty Points">
            <p>
              Loyalty points earned through the Platform have no cash value and
              may be redeemed only as described in the Platform. We reserve the
              right to modify or terminate the loyalty programme at any time.
            </p>
          </Section>

          <Section title="9. Privacy">
            <p>
              Your use of the Platform is also governed by our{' '}
              <Link href="/privacy-policy" className="text-lhc-primary underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. We collect
              and handle personal and health information in accordance with the
              Privacy Act 1988 (Cth) and the Australian Privacy Principles.
            </p>
          </Section>

          <Section title="10. Intellectual Property">
            <p>
              All content, trademarks, and software on the Platform are the
              property of Local Health Care Hub or its licensors. You may not
              reproduce, distribute, or create derivative works without our
              express written permission.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Local Health Care Hub is
              not liable for any indirect, incidental, special, or consequential
              damages arising from your use of the Platform or reliance on
              information provided therein. Our total liability shall not exceed
              the amount paid by you (if any) in the 12 months preceding the
              claim.
            </p>
          </Section>

          <Section title="12. Disclaimers">
            <p>
              The Platform is provided &ldquo;as is&rdquo; without warranties
              of any kind. We do not warrant that the Platform will be
              uninterrupted or error-free. Medical information on the Platform
              is for informational purposes only and does not constitute medical
              advice.
            </p>
          </Section>

          <Section title="13. Termination">
            <p>
              We may suspend or terminate your account at any time for violation
              of these Terms. You may close your account by contacting us. Upon
              termination, your right to use the Platform ceases immediately.
            </p>
          </Section>

          <Section title="14. Changes to Terms">
            <p>
              We may update these Terms from time to time. We will notify you of
              material changes via email or a prominent notice on the Platform.
              Continued use after the effective date constitutes acceptance.
            </p>
          </Section>

          <Section title="15. Governing Law">
            <p>
              These Terms are governed by the laws of New South Wales, Australia.
              Any disputes shall be subject to the exclusive jurisdiction of the
              courts of New South Wales.
            </p>
          </Section>

          <Section title="16. Dispute Resolution">
            <p>
              We encourage you to contact us first to resolve any dispute. If a
              resolution cannot be reached, either party may refer the matter to
              mediation before commencing court proceedings.
            </p>
          </Section>

          <Section title="17. Contact Us">
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-lhc-text-muted">
              <li>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-lhc-primary underline">{CONTACT_EMAIL}</a></li>
              <li>Website: <a href={`https://${WEBSITE}`} className="text-lhc-primary underline">{WEBSITE}</a></li>
            </ul>
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
