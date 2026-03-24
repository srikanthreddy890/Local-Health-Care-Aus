/**
 * PopularSearches — SEO grid of category × city links.
 * Server Component — no interactivity, just <Link> tags.
 */

import Link from 'next/link'
import {
  FEATURED_CATEGORIES,
  FEATURED_CITIES,
  buildBookingUrl,
} from '@/lib/constants/popularSearches'

export default function PopularSearches() {
  return (
    <section className="py-14 px-4 bg-gray-50">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold text-lhc-text-main mb-8">
          Popular Searches
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-x-6 gap-y-8">
          {FEATURED_CATEGORIES.map((cat) => (
            <div key={cat.slug}>
              <p className="font-semibold text-lhc-text-main text-sm mb-3">
                {cat.label}
              </p>
              <ul className="space-y-2">
                {FEATURED_CITIES.map((city) => (
                  <li key={city.displayName}>
                    <Link
                      href={buildBookingUrl(cat.slug, city.postcodeParam)}
                      className="text-lhc-primary hover:underline text-xs leading-snug"
                    >
                      {cat.label} {city.displayName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
