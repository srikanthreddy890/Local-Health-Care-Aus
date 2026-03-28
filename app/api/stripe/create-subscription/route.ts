import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { STRIPE_MODULE_PRICE_LOOKUP_KEYS } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 })

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!limiter.check(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Admin check
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!role) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { clinicId, moduleKeys } = (await request.json()) as {
      clinicId: string
      moduleKeys: string[]
    }

    if (!clinicId) return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get Stripe customer
    const { data: sc } = await adminDb
      .from('stripe_customers')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (!sc?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer not found. Create customer first.' },
        { status: 400 }
      )
    }

    if (sc.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Subscription already exists', subscription_id: sc.stripe_subscription_id },
        { status: 400 }
      )
    }

    // Look up module prices by lookup_key
    const lookupKeys = (moduleKeys ?? [])
      .filter((k) => k in STRIPE_MODULE_PRICE_LOOKUP_KEYS)
      .map((k) => STRIPE_MODULE_PRICE_LOOKUP_KEYS[k])

    const items: Array<{ price: string }> = []

    if (lookupKeys.length > 0) {
      const prices = await stripe.prices.list({ lookup_keys: lookupKeys, active: true })
      for (const price of prices.data) {
        items.push({ price: price.id })
      }
    }

    // Add metered appointment usage price
    const appointmentPriceId = process.env.STRIPE_APPOINTMENT_PRICE_ID
    if (appointmentPriceId) {
      items.push({ price: appointmentPriceId })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid prices found' }, { status: 400 })
    }

    // Create subscription
    const taxRateId = process.env.STRIPE_GST_TAX_RATE_ID
    const subscription = await stripe.subscriptions.create({
      customer: sc.stripe_customer_id,
      items,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      default_tax_rates: taxRateId ? [taxRateId] : undefined,
      metadata: {
        clinic_id: clinicId,
        platform: 'localhealthcare',
      },
    })

    // Extract period timestamps
    const sub = subscription as unknown as {
      id: string
      status: string
      current_period_start: number
      current_period_end: number
    }

    // Store subscription ID
    await adminDb
      .from('stripe_customers')
      .update({
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('clinic_id', clinicId)

    return NextResponse.json({
      subscription_id: sub.id,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    })
  } catch (err) {
    console.error('Create subscription error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
