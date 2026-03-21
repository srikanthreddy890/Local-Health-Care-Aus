/**
 * Clinic specialization utilities.
 * Central place for pharmacy detection and feature flag derivation.
 */

interface ClinicLike {
  clinic_type?: string | null
  sub_type?: string | null
  specialization?: string | null
  chat_enabled?: boolean | null
}

export function isPharmacy(clinicData: ClinicLike | null | undefined): boolean {
  return (
    clinicData?.sub_type === 'pharmacy' ||
    clinicData?.clinic_type === 'pharmacy' ||
    /pharmacy/i.test(clinicData?.specialization ?? '')
  )
}

export interface PharmacyFeatureFlags {
  showChat: boolean
  showPatientDocuments: boolean
  showReferrals: boolean
  showQuotes: boolean
  showLoyaltyPoints: boolean
  showIncomingPrescriptions: boolean
}

export function getPharmacyFeatureFlags(
  clinicData: ClinicLike | null | undefined,
): PharmacyFeatureFlags {
  const pharmacy = isPharmacy(clinicData)
  return {
    showChat: clinicData?.chat_enabled !== false, // respects DB flag; null treated as enabled
    showPatientDocuments: true,          // all clinics
    showReferrals: !pharmacy,
    showQuotes: !pharmacy,
    showLoyaltyPoints: !pharmacy,
    showIncomingPrescriptions: pharmacy, // pharmacy-exclusive
  }
}

// ── Clinic type options ────────────────────────────────────────────────────────

export const clinicTypeOptions = [
  { value: 'gp', label: 'General Practice (GP)' },
  { value: 'specialist', label: 'Specialist Clinic' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'allied_health', label: 'Allied Health' },
  { value: 'dental', label: 'Dental' },
  { value: 'psychology', label: 'Psychology / Mental Health' },
  { value: 'physio', label: 'Physiotherapy' },
  { value: 'chiropractic', label: 'Chiropractic' },
  { value: 'optometry', label: 'Optometry' },
  { value: 'other', label: 'Other' },
] as const

export const alliedHealthSubTypes = [
  { value: 'occupational_therapy', label: 'Occupational Therapy' },
  { value: 'speech_pathology', label: 'Speech Pathology' },
  { value: 'dietetics', label: 'Dietetics' },
  { value: 'podiatry', label: 'Podiatry' },
  { value: 'osteopathy', label: 'Osteopathy' },
  { value: 'exercise_physiology', label: 'Exercise Physiology' },
  { value: 'audiology', label: 'Audiology' },
  { value: 'pharmacy', label: 'Pharmacy' },
] as const

// ── Specializations per clinic type ────────────────────────────────────────────

const SPECIALIZATIONS: Record<string, string[]> = {
  gp: [
    'General Practice', 'Family Medicine', "Women's Health", "Men's Health",
    'Paediatrics', 'Geriatrics', 'Sports Medicine', 'Skin Cancer',
    'Travel Medicine', 'Occupational Health',
  ],
  specialist: [
    'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
    'Neurology', 'Oncology', 'Ophthalmology', 'Orthopaedics',
    'Psychiatry', 'Rheumatology', 'Urology', 'ENT',
  ],
  dental: [
    'General Dentistry', 'Orthodontics', 'Periodontics', 'Endodontics',
    'Oral Surgery', 'Paediatric Dentistry', 'Cosmetic Dentistry', 'Prosthodontics',
  ],
  psychology: [
    'Clinical Psychology', 'Counselling', 'CBT', 'Child Psychology',
    'Neuropsychology', 'Forensic Psychology', 'Health Psychology',
  ],
  physio: [
    'Sports Physiotherapy', 'Musculoskeletal', 'Rehabilitation',
    'Paediatric Physiotherapy', 'Neurological Physiotherapy',
    'Hydrotherapy', 'Dry Needling',
  ],
  chiropractic: [
    'Spinal Health', 'Sports Chiropractic', 'Paediatric Chiropractic',
    'Rehabilitative Chiropractic', 'Pregnancy Care',
  ],
  optometry: [
    'General Optometry', 'Contact Lenses', 'Paediatric Optometry',
    'Behavioural Optometry', 'Low Vision', 'Ocular Disease',
  ],
  allied_health: [
    'Occupational Therapy', 'Speech Pathology', 'Dietetics',
    'Podiatry', 'Osteopathy', 'Exercise Physiology', 'Audiology',
  ],
  pharmacy: [
    'Compounding', 'Clinical Pharmacy', 'Medication Reviews',
    'Vaccinations', 'Diabetes Management', 'Sleep Apnoea',
  ],
}

export function getSpecializationsByClinicType(clinicType: string): string[] {
  return SPECIALIZATIONS[clinicType] ?? []
}
