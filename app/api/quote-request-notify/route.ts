import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { clinicId, serviceName, requestType, urgency, preferredDate, patientNotes } = body

    // Validate required fields
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!clinicId || typeof clinicId !== 'string' || !UUID_RE.test(clinicId)) {
      return NextResponse.json({ ok: false, error: 'Invalid clinicId' }, { status: 400 })
    }
    if (!serviceName || typeof serviceName !== 'string' || serviceName.length > 500) {
      return NextResponse.json({ ok: false, error: 'Invalid serviceName' }, { status: 400 })
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

    // Guard: only patients should trigger quote request notifications
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'patient') return NextResponse.json({ ok: true }, { status: 200 })

    // Fire-and-forget — errors are logged but never propagate to the caller
    supabase.functions
      .invoke('send-quote-request-notification', {
        body: { clinicId, serviceName, requestType, urgency, preferredDate, patientNotes },
      })
      .catch((err: unknown) => console.error('send-quote-request-notification failed:', err))
  } catch (err) {
    console.error('Quote request notify route error:', err)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
