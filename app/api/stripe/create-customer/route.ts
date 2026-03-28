import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
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

    const { clinicId } = await request.json()
    if (!clinicId) return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })

    // Get clinic details
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, email, phone')
      .eq('id', clinicId)
      .single()

    if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

    // Check if Stripe customer already exists
    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing } = await adminDb
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        stripe_customer_id: existing.stripe_customer_id,
        message: 'Stripe customer already exists',
      })
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      name: clinic.name ?? undefined,
      email: clinic.email ?? undefined,
      phone: clinic.phone ?? undefined,
      metadata: {
        clinic_id: clinicId,
        platform: 'localhealthcare',
      },
    })

    // Store in our database
    await adminDb.from('stripe_customers').insert({
      clinic_id: clinicId,
      stripe_customer_id: customer.id,
      billing_email: clinic.email ?? null,
    })

    return NextResponse.json({ stripe_customer_id: customer.id })
  } catch (err) {
    console.error('Create customer error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
