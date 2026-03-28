import { stripe } from './server'
import { STRIPE_METER_EVENT_NAME } from './config'
import { createClient } from '@supabase/supabase-js'

/** Creates a Supabase admin client that bypasses RLS */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface UsageResult {
  bookingId: string
  bookingSource: 'standard' | 'centaur' | 'custom_api'
  isFree: boolean
  meterEventId: string | null
  valueCents: number
}

/**
 * Reports a single booking to Stripe Meters.
 * Determines whether the booking falls within the free tier or is chargeable.
 * Idempotent: skips if already logged in appointment_usage_log.
 */
export async function reportBookingUsage(
  clinicId: string,
  bookingId: string,
  bookingSource: 'standard' | 'centaur' | 'custom_api'
): Promise<UsageResult | null> {
  const supabase = getAdminClient()

  // 1. Check if already reported (idempotency)
  const { data: existing } = await supabase
    .from('appointment_usage_log')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('booking_source', bookingSource)
    .maybeSingle()

  if (existing) return null // Already reported

  // 2. Get Stripe customer for this clinic
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  if (!stripeCustomer?.stripe_subscription_id) return null // No subscription

  const periodStart = stripeCustomer.current_period_start
  const periodEnd = stripeCustomer.current_period_end
  if (!periodStart || !periodEnd) return null

  // 3. Get billing config
  const { data: billing } = await supabase
    .from('clinic_billing')
    .select('free_appointments_per_month, price_per_appointment')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  const freePerMonth = billing?.free_appointments_per_month ?? 0
  const pricePerAppointment = billing?.price_per_appointment ?? 0

  // 4. Count existing usage in this exact billing period
  const { count: usedCount } = await supabase
    .from('appointment_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq('billing_period_start', periodStart)
    .eq('billing_period_end', periodEnd)

  const currentUsage = usedCount ?? 0
  const isFree = currentUsage < freePerMonth

  let meterEventId: string | null = null
  let valueCents = 0

  // 5. If chargeable, report to Stripe Meter
  if (!isFree && pricePerAppointment > 0) {
    valueCents = Math.round(pricePerAppointment * 100)
    const meterEvent = await stripe.billing.meterEvents.create({
      event_name: STRIPE_METER_EVENT_NAME,
      payload: {
        stripe_customer_id: stripeCustomer.stripe_customer_id,
        value: String(valueCents),
      },
      identifier: `booking_${bookingId}_${bookingSource}`,
      timestamp: Math.floor(Date.now() / 1000),
    })
    meterEventId = meterEvent.identifier ?? null
  }

  // 6. Log to appointment_usage_log
  await supabase.from('appointment_usage_log').insert({
    clinic_id: clinicId,
    booking_id: bookingId,
    booking_source: bookingSource,
    stripe_meter_event_id: meterEventId,
    is_free_tier: isFree,
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
  })

  return { bookingId, bookingSource, isFree, meterEventId, valueCents }
}

/**
 * Reconcile usage — find all unreported bookings for a clinic in the current period.
 * Used as admin fallback if real-time reporting missed any bookings.
 */
export async function reconcileUsage(clinicId: string): Promise<UsageResult[]> {
  const supabase = getAdminClient()

  // Get current billing period
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('current_period_start, current_period_end')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  if (!stripeCustomer?.current_period_start || !stripeCustomer?.current_period_end) {
    return []
  }

  const { current_period_start: periodStart, current_period_end: periodEnd } = stripeCustomer

  // Get already-reported booking IDs for this period
  const { data: reportedLogs } = await supabase
    .from('appointment_usage_log')
    .select('booking_id, booking_source')
    .eq('clinic_id', clinicId)
    .gte('billing_period_start', periodStart)

  const reportedSet = new Set(
    (reportedLogs ?? []).map((r) => `${r.booking_id}:${r.booking_source}`)
  )

  // Find unreported bookings across all 3 sources
  const [standardRes, centaurRes, customRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id')
      .eq('clinic_id', clinicId)
      .gte('created_at', periodStart)
      .lt('created_at', periodEnd),
    supabase
      .from('centaur_bookings')
      .select('id')
      .eq('clinic_id', clinicId)
      .gte('created_at', periodStart)
      .lt('created_at', periodEnd),
    supabase
      .from('custom_api_bookings')
      .select('id')
      .eq('clinic_id', clinicId)
      .gte('created_at', periodStart)
      .lt('created_at', periodEnd),
  ])

  const unreported: Array<{ id: string; source: 'standard' | 'centaur' | 'custom_api' }> = []

  for (const b of standardRes.data ?? []) {
    if (!reportedSet.has(`${b.id}:standard`)) unreported.push({ id: b.id, source: 'standard' })
  }
  for (const b of centaurRes.data ?? []) {
    if (!reportedSet.has(`${b.id}:centaur`)) unreported.push({ id: b.id, source: 'centaur' })
  }
  for (const b of customRes.data ?? []) {
    if (!reportedSet.has(`${b.id}:custom_api`)) unreported.push({ id: b.id, source: 'custom_api' })
  }

  // Report each unreported booking — continue on individual failures
  const results: UsageResult[] = []
  for (const booking of unreported) {
    try {
      const result = await reportBookingUsage(clinicId, booking.id, booking.source)
      if (result) results.push(result)
    } catch (err) {
      console.error(`Failed to report usage for booking ${booking.id} (${booking.source}):`, err)
      // Continue with remaining bookings
    }
  }

  return results
}
