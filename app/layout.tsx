import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import QueryProvider from '@/app/_components/providers/QueryProvider'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Local Health Care – Book Healthcare Appointments Online',
    template: '%s | Local Health Care',
  },
  description:
    'Find and book appointments with trusted healthcare providers across Australia. Access your medical records, manage appointments, and earn loyalty rewards.',
  keywords: [
    'healthcare',
    'medical appointments',
    'book doctor',
    'clinic finder',
    'health services',
    'Australia',
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
    title: 'Local Health Care – Your Health, Your Way',
    description:
      'Book appointments, manage health records, and earn rewards with Australia\'s trusted healthcare platform.',
    images: [{ url: '/images/brand/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://localhealthcare.com.au/' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-body antialiased`}>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  )
}
