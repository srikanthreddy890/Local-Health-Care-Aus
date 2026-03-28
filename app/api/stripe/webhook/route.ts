import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { GRACE_PERIOD_DAYS } from '@/lib/stripe/config'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  const supabase = getAdminClient()

  // Idempotency check — only skip if event was previously processed successfully
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id, processing_error')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existingEvent && !existingEvent.processing_error) {
    // Already processed successfully — skip
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Insert or update the event record (upsert for retries after failures)
  if (!existingEvent) {
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object as unknown as Record<string, unknown>,
    })
  } else {
    // Clear previous error for retry
    await supabase
      .from('stripe_webhook_events')
      .update({ processing_error: null, processed_at: new Date().toISOString() })
      .eq('id', existingEvent.id)
  }

  try {
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break

      case 'invoice.finalized':
        await handleInvoiceFinalized(supabase, event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
        break

      default:
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Error processing webhook ${event.type}:`, message)
    await supabase
      .from('stripe_webhook_events')
      .update({ processing_error: message })
      .eq('stripe_event_id', event.id)

    // Return 500 so Stripe retries the webhook.
    // The idempotency check at the top prevents double-processing on retry.
    return NextResponse.json({ error: `Processing failed: ${message}` }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleInvoicePaid(
  supabase: ReturnType<typeof getAdminClient>,
  invoice: Stripe.Invoice
) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  // Upsert invoice record
  await upsertInvoice(supabase, invoice)

  if (!customerId) return

  // Clear grace period and restore access
  const { data: sc } = await supabase
    .from('stripe_customers')
    .select('clinic_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (sc?.clinic_id) {
    await supabase
      .from('stripe_customers')
      .update({
        grace_period_ends_at: null,
        service_suspended_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    await supabase
      .from('clinics')
      .update({ billing_status: 'active' })
      .eq('id', sc.clinic_id)
  }
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof getAdminClient>,
  invoice: Stripe.Invoice
) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  await upsertInvoice(supabase, invoice)

  if (!customerId) return

  const { data: sc } = await supabase
    .from('stripe_customers')
    .select('clinic_id, grace_period_ends_at')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (sc?.clinic_id) {
    // Set grace period if not already set
    if (!sc.grace_period_ends_at) {
      const graceEnd = new Date()
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS)

      await supabase
        .from('stripe_customers')
        .update({
          grace_period_ends_at: graceEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId)

      await supabase
        .from('clinics')
        .update({ billing_status: 'grace_period' })
        .eq('id', sc.clinic_id)
    }
  }

  // Check ALL clinics with expired grace periods and suspend them
  await checkAndSuspendExpiredGracePeriods(supabase)
}

async function handleInvoiceFinalized(
  supabase: ReturnType<typeof getAdminClient>,
  invoice: Stripe.Invoice
) {
  await upsertInvoice(supabase, invoice)
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getAdminClient>,
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

  if (!customerId) return

  // Cast to access raw properties from the Stripe event payload
  const sub = subscription as unknown as {
    status: string
    current_period_start: number
    current_period_end: number
    cancel_at_period_end: boolean
  }

  await supabase
    .from('stripe_customers')
    .update({
      subscription_status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getAdminClient>,
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

  if (!customerId) return

  const { data: sc } = await supabase
    .from('stripe_customers')
    .select('clinic_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  await supabase
    .from('stripe_customers')
    .update({
      subscription_status: 'canceled',
      service_suspended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (sc?.clinic_id) {
    await supabase
      .from('clinics')
      .update({ billing_status: 'suspended' })
      .eq('id', sc.clinic_id)
  }
}

async function upsertInvoice(
  supabase: ReturnType<typeof getAdminClient>,
  rawInvoice: Stripe.Invoice
) {
  // Cast to access raw properties from the Stripe webhook payload
  const invoice = rawInvoice as unknown as {
    id: string
    customer: string | { id: string } | null
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

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

  // Find clinic_id via stripe_customers
  const { data: sc } = await supabase
    .from('stripe_customers')
    .select('clinic_id')
    .eq('stripe_customer_id', customerId ?? '')
    .maybeSingle()

  if (!sc?.clinic_id) return

  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription as { id: string } | null)?.id ?? null

  const invoiceData = {
    clinic_id: sc.clinic_id,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId ?? null,
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
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
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

  const { data: existing } = await supabase
    .from('stripe_invoices')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('stripe_invoices').update(invoiceData).eq('id', existing.id)
  } else {
    await supabase.from('stripe_invoices').insert(invoiceData)
  }
}

/**
 * Check all clinics with expired grace periods and suspend them.
 * Called piggyback on every invoice.payment_failed webhook.
 */
async function checkAndSuspendExpiredGracePeriods(supabase: ReturnType<typeof getAdminClient>) {
  const now = new Date().toISOString()

  const { data: expired } = await supabase
    .from('stripe_customers')
    .select('clinic_id')
    .lt('grace_period_ends_at', now)
    .is('service_suspended_at', null)

  if (!expired?.length) return

  for (const row of expired) {
    await supabase
      .from('stripe_customers')
      .update({
        service_suspended_at: now,
        updated_at: now,
      })
      .eq('clinic_id', row.clinic_id)

    await supabase
      .from('clinics')
      .update({ billing_status: 'suspended' })
      .eq('id', row.clinic_id)
  }
}
