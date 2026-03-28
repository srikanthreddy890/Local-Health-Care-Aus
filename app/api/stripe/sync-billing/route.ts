import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 })

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

    const adminDb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: sc } = await adminDb
      .from('stripe_customers')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    if (!sc?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    // Sync subscription
    if (sc.stripe_subscription_id) {
      const subResponse = await stripe.subscriptions.retrieve(sc.stripe_subscription_id)
      const subscription = subResponse as unknown as {
        status: string
        current_period_start: number
        current_period_end: number
        cancel_at_period_end: boolean
        default_payment_method: string | { id: string } | null
      }
      await adminDb
        .from('stripe_customers')
        .update({
          subscription_status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          default_payment_method:
            typeof subscription.default_payment_method === 'string'
              ? subscription.default_payment_method
              : subscription.default_payment_method?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('clinic_id', clinicId)
    }

    // Sync invoices (last 12)
    const invoices = await stripe.invoices.list({
      customer: sc.stripe_customer_id,
      limit: 12,
    })

    let syncedInvoices = 0
    for (const rawInvoice of invoices.data) {
      // Cast to access raw properties from the Stripe API response
      const invoice = rawInvoice as unknown as {
        id: string
        subscription?: string | { id: string } | null
        status: string | null
        currency: string | null
        amount_due: number
        amount_paid: number
        amount_remaining: number
        tax: number | null
        subtotal: number
        total: number
        hosted_invoice_url: string | null
        invoice_pdf: string | null
        period_start: number | null
        period_end: number | null
        due_date: number | null
        attempt_count: number
        next_payment_attempt: number | null
        lines?: { data: Array<{ description: string | null; amount: number; quantity: number | null; period: { start: number; end: number } | null }> }
      }

      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as { id: string } | null)?.id ?? null

      const invoiceData = {
        clinic_id: clinicId,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscriptionId,
        status: invoice.status ?? 'draft',
        currency: invoice.currency ?? 'aud',
        amount_due: invoice.amount_due ?? 0,
        amount_paid: invoice.amount_paid ?? 0,
        amount_remaining: invoice.amount_remaining ?? 0,
        tax: invoice.tax ?? 0,
        subtotal: invoice.subtotal ?? 0,
        total: invoice.total ?? 0,
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        invoice_pdf: invoice.invoice_pdf ?? null,
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
        attempt_count: invoice.attempt_count ?? 0,
        next_payment_attempt: invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null,
        line_items: (invoice.lines?.data ?? []).map((li) => ({
          description: li.description,
          amount: li.amount,
          quantity: li.quantity,
          period: li.period,
        })),
        updated_at: new Date().toISOString(),
      }

      const { data: existing } = await adminDb
        .from('stripe_invoices')
        .select('id')
        .eq('stripe_invoice_id', invoice.id)
        .maybeSingle()

      if (existing) {
        await adminDb.from('stripe_invoices').update(invoiceData).eq('id', existing.id)
      } else {
        await adminDb.from('stripe_invoices').insert(invoiceData)
      }
      syncedInvoices++
    }

    // Also check and suspend expired grace periods
    const now = new Date().toISOString()
    const { data: expired } = await adminDb
      .from('stripe_customers')
      .select('clinic_id')
      .lt('grace_period_ends_at', now)
      .is('service_suspended_at', null)

    for (const row of expired ?? []) {
      await adminDb
        .from('stripe_customers')
        .update({ service_suspended_at: now, updated_at: now })
        .eq('clinic_id', row.clinic_id)

      await adminDb
        .from('clinics')
        .update({ billing_status: 'suspended' })
        .eq('id', row.clinic_id)
    }

    return NextResponse.json({
      synced: true,
      invoices_synced: syncedInvoices,
      expired_suspended: expired?.length ?? 0,
    })
  } catch (err) {
    console.error('Sync billing error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
