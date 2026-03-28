import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { clinicId } = await request.json()
    if (!clinicId) return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })

    // Verify user has billing access (owner or can_manage_billing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { data: clinicOwner } = await sb
      .from('clinics')
      .select('id')
      .eq('id', clinicId)
      .eq('user_id', user.id)
      .maybeSingle()

    let hasBillingAccess = !!clinicOwner

    if (!hasBillingAccess) {
      const { data: staff } = await sb
        .from('clinic_users')
        .select('permissions')
        .eq('clinic_id', clinicId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      hasBillingAccess = staff?.permissions?.can_manage_billing === true
    }

    // Also allow admins
    if (!hasBillingAccess) {
      const { data: adminRole } = await sb
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      hasBillingAccess = !!adminRole
    }

    if (!hasBillingAccess) {
      return NextResponse.json({ error: 'Billing access required' }, { status: 403 })
    }

    // Get Stripe customer
    const { data: sc } = await sb
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (!sc?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe customer not found. Contact admin to set up billing.' },
        { status: 404 }
      )
    }

    // Create portal session
    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const session = await stripe.billingPortal.sessions.create({
      customer: sc.stripe_customer_id,
      return_url: `${origin}/clinic/portal/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Customer portal error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
