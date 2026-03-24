import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Toaster } from 'sonner'
import QueryProvider from '@/app/_components/providers/QueryProvider'
import PostHogProvider from '@/app/_components/providers/PostHogProvider'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Book Doctor, GP, Dentist & Specialist Appointments Online | Local Health Care',
    template: '%s | Local Health Care',
  },
  description:
    'Find and book appointments with GPs, dentists, physiotherapists, psychologists and specialists near you. Bulk billing available. Book online 24/7 across Australia.',
  keywords: [
    'book doctor online Australia',
    'find a doctor near me',
    'healthcare appointment booking',
    'GP near me',
    'dentist near me',
    'bulk billing GP',
    'book GP appointment online',
    'physiotherapist near me',
    'psychologist near me',
    'medical centre near me',
    'find healthcare providers Australia',
    'book dentist online',
    'after hours doctor',
    'telehealth doctor Australia',
    'chiropractor near me',
    'optometrist near me',
    'skin check near me',
    'bulk billing doctor near me',
    'health services Australia',
    'local health care',
  ],
  metadataBase: new URL('https://localhealthcare.com.au'),
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://localhealthcare.com.au/',
    siteName: 'Local Health Care',
    locale: 'en_AU',
    title: 'Book Doctor, GP, Dentist & Specialist Appointments Online | Local Health Care',
    description:
      'Find and book appointments with GPs, dentists, physiotherapists, psychologists and specialists near you. Bulk billing available. Book online 24/7 across Australia.',
    images: [{ url: '/images/brand/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://localhealthcare.com.au/' },
  verification: {
    google: 'VOyKMDgCNlpyrOw2GXf2-iQijCx14frmw2WbDgH9fog',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-body antialiased`}>
        <PostHogProvider>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </PostHogProvider>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  )
}
