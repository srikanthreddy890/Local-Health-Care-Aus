/**
 * Popular Searches — featured categories × cities for the SEO grid
 * and sitemap generation. Shared between PopularSearches component
 * and app/sitemap.ts.
 */

export interface FeaturedCategory {
  label: string
  slug: string
}

export interface FeaturedCity {
  /** Short display name (e.g. "Sydney") */
  displayName: string
  /** Postcode passed as ?postcode= param (e.g. "2000") */
  postcodeParam: string
}

/** High-value categories chosen for the Popular Searches grid */
export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  { label: 'General Practice', slug: 'general-practice' },
  { label: 'Dentistry', slug: 'dentistry' },
  { label: 'Physiotherapy', slug: 'physiotherapy' },
  { label: 'Mental Health', slug: 'mental-health' },
  { label: 'Skin Cancer', slug: 'skin-cancer' },
  { label: 'Optometry', slug: 'optometry' },
  { label: 'COVID-19 Vaccinations', slug: 'covid-19-vaccinations' },
  { label: 'Chiropractic', slug: 'chiropractic' },
]

/** Major Australian cities for the Popular Searches grid */
export const FEATURED_CITIES: FeaturedCity[] = [
  { displayName: 'Sydney',    postcodeParam: '2000' },
  { displayName: 'Melbourne', postcodeParam: '3000' },
  { displayName: 'Brisbane',  postcodeParam: '4000' },
  { displayName: 'Perth',     postcodeParam: '6000' },
  { displayName: 'Adelaide',  postcodeParam: '5000' },
  { displayName: 'Gold Coast', postcodeParam: '4217' },
  { displayName: 'Canberra',  postcodeParam: '2601' },
  { displayName: 'Hobart',    postcodeParam: '7000' },
]

/** Build a /book URL with category and postcode params */
export function buildBookingUrl(categorySlug: string, postcodeParam: string): string {
  return `/book?category=${encodeURIComponent(categorySlug)}&postcode=${encodeURIComponent(postcodeParam)}`
}
