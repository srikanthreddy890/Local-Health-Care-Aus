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

    const { data: sc } = await adminDb
      .from('stripe_customers')
      .select('stripe_subscription_id')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (!sc?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found for this clinic' }, { status: 400 })
    }

    // Get current subscription items
    const subscription = await stripe.subscriptions.retrieve(sc.stripe_subscription_id, {
      expand: ['items.data.price'],
    })

    // Resolve desired module lookup keys
    const desiredLookupKeys = new Set(
      (moduleKeys ?? [])
        .filter((k) => k in STRIPE_MODULE_PRICE_LOOKUP_KEYS)
        .map((k) => STRIPE_MODULE_PRICE_LOOKUP_KEYS[k])
    )

    // Get all available module prices by lookup_key
    const allLookupKeys = Object.values(STRIPE_MODULE_PRICE_LOOKUP_KEYS)
    const allPrices = await stripe.prices.list({ lookup_keys: allLookupKeys, active: true })
    const priceByLookupKey = new Map(allPrices.data.map((p) => [p.lookup_key, p]))

    // Determine items to add and remove
    const existingModuleItems = subscription.items.data.filter((item) => {
      const lk = item.price.lookup_key
      return lk && allLookupKeys.includes(lk)
    })

    const existingLookupKeys = new Set(existingModuleItems.map((item) => item.price.lookup_key!))

    const itemsParam: Array<{
      id?: string
      price?: string
      deleted?: boolean
    }> = []

    // Add new modules
    for (const lk of desiredLookupKeys) {
      if (!existingLookupKeys.has(lk)) {
        const price = priceByLookupKey.get(lk)
        if (price) {
          itemsParam.push({ price: price.id })
        }
      }
    }

    // Remove modules no longer desired
    for (const item of existingModuleItems) {
      if (!desiredLookupKeys.has(item.price.lookup_key!)) {
        itemsParam.push({ id: item.id, deleted: true })
      }
    }

    if (itemsParam.length === 0) {
      return NextResponse.json({ message: 'No changes needed' })
    }

    // Update subscription with proration
    const updated = await stripe.subscriptions.update(sc.stripe_subscription_id, {
      items: itemsParam,
      proration_behavior: 'create_prorations',
    })

    return NextResponse.json({
      subscription_id: updated.id,
      status: updated.status,
      items_changed: itemsParam.length,
    })
  } catch (err) {
    console.error('Update subscription error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
