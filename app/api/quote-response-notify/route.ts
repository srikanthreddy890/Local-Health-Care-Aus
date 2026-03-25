import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { quoteId } = body

    // Validate quoteId
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!quoteId || typeof quoteId !== 'string' || !UUID_RE.test(quoteId)) {
      return NextResponse.json({ ok: false, error: 'Invalid quoteId' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Guard: only invoke if there is an authenticated session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // Guard: verify the caller belongs to the clinic that owns this quote
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: quote } = await (supabase as any)
      .from('quote_requests')
      .select('clinic_id')
      .eq('id', quoteId)
      .single()

    if (quote?.clinic_id) {
      const { data: ownedClinic } = await supabase
        .from('clinics')
        .select('id')
        .eq('id', quote.clinic_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!ownedClinic) {
        const { data: staffRecord } = await supabase
          .from('clinic_users')
          .select('id')
          .eq('clinic_id', quote.clinic_id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!staffRecord) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    // Fire-and-forget — errors are logged but never propagate to the caller
    supabase.functions
      .invoke('send-quote-response-notification', {
        body: { quoteId },
      })
      .catch((err: unknown) => console.error('send-quote-response-notification failed:', err))
  } catch (err) {
    console.error('Quote response notify route error:', err)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
