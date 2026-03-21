import { Suspense } from 'react'
import type { Metadata } from 'next'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import BlogListing from './_components/BlogListing'

function BlogListingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-10 w-48 bg-lhc-border/30 rounded animate-pulse mx-auto mb-8" />
      <div className="h-10 w-full max-w-md bg-lhc-border/30 rounded animate-pulse mx-auto mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 rounded-xl bg-lhc-border/30 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'Health Blog',
  description:
    'Health tips, medical insights, and wellness advice from trusted healthcare providers across Australia.',
  openGraph: {
    type: 'website',
    title: 'Health Blog | Local Health Care',
    description:
      'Health tips, medical insights, and wellness advice from trusted healthcare providers.',
    url: '/blog',
  },
  alternates: { canonical: '/blog' },
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <HomeHeader />
      <main className="flex-1">
        <Suspense fallback={<BlogListingSkeleton />}>
          <BlogListing />
        </Suspense>
      </main>
      <HomeFooter />
    </div>
  )
}
