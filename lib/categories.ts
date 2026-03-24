/**
 * Shared healthcare categories used on the home page grid and /book filters.
 * Each category maps to a clinic_type or specialization for filtering.
 */

export interface Category {
  label: string
  /** URL-safe slug used as ?category= param */
  slug: string
  /** Lucide icon name */
  icon: string
  /** Maps to clinic_type values in the database */
  clinicType?: string
}

export const CATEGORIES: Category[] = [
  { label: 'GP Telehealth',          slug: 'gp-telehealth',          icon: 'MonitorSmartphone', clinicType: 'gp' },
  { label: 'General Practice',       slug: 'general-practice',       icon: 'Briefcase',         clinicType: 'gp' },
  { label: 'Dentistry',              slug: 'dentistry',              icon: 'Heart',              clinicType: 'dental' },
  { label: 'Mental Health',          slug: 'mental-health',          icon: 'Brain',              clinicType: 'mental_health' },
  { label: 'Physiotherapy',          slug: 'physiotherapy',          icon: 'Activity',           clinicType: 'allied_health' },
  { label: 'Medical Certificates',   slug: 'medical-certificates',   icon: 'FileCheck',          clinicType: 'gp' },
  { label: 'Chiropractic',           slug: 'chiropractic',           icon: 'Bone',               clinicType: 'allied_health' },
  { label: 'Podiatry',               slug: 'podiatry',               icon: 'Footprints',         clinicType: 'allied_health' },
  { label: 'Natural Medicine',       slug: 'natural-medicine',       icon: 'Plus',               clinicType: 'allied_health' },
  { label: 'Psychology',             slug: 'psychology',             icon: 'BrainCircuit',       clinicType: 'mental_health' },
  { label: 'Skin Cancer',            slug: 'skin-cancer',            icon: 'Fingerprint',        clinicType: 'specialist' },
  { label: 'Audiology',              slug: 'audiology',              icon: 'Ear',                clinicType: 'specialist' },
  { label: 'Optometry',              slug: 'optometry',              icon: 'Eye',                clinicType: 'specialist' },
  { label: 'Counselling',            slug: 'counselling',            icon: 'MessageCircleHeart', clinicType: 'mental_health' },
  { label: 'Telehealth Psychology',  slug: 'telehealth-psychology',  icon: 'BrainCircuit',       clinicType: 'mental_health' },
  { label: 'Flu Vaccinations',       slug: 'flu-vaccinations',       icon: 'Syringe',            clinicType: 'gp' },
  { label: 'COVID-19 Vaccinations',  slug: 'covid-19-vaccinations',  icon: 'ShieldCheck',        clinicType: 'gp' },
  { label: 'Radiology',              slug: 'radiology',              icon: 'ScanLine',           clinicType: 'specialist' },
]

/** Find a category by its slug */
export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}
