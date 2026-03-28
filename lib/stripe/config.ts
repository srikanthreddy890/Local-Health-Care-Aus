/** Maps internal module keys to Stripe Price lookup_keys */
export const STRIPE_MODULE_PRICE_LOOKUP_KEYS: Record<string, string> = {
  bulk_import: 'module_bulk_import',
  quotes: 'module_quotes',
  emergency_slots: 'module_emergency_slots',
  chat: 'module_chat',
  referrals: 'module_referrals',
  patient_documents: 'module_patient_documents',
}

/** Stripe Meter event name for appointment usage */
export const STRIPE_METER_EVENT_NAME = 'appointment_usage'

/** Grace period in days before service suspension after payment failure */
export const GRACE_PERIOD_DAYS = 14

/** Module price per month in dollars */
export const MODULE_PRICE_PER_MONTH = 19.99

/** All module keys */
export const MODULE_KEYS = [
  'bulk_import',
  'quotes',
  'emergency_slots',
  'chat',
  'referrals',
  'patient_documents',
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]
