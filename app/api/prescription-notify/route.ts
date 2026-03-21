import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { type, prescriptionId, shareId, status, responseNotes } = body

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (prescriptionId && (typeof prescriptionId !== 'string' || !UUID_RE.test(prescriptionId))) {
      return NextResponse.json({ ok: false, error: 'Invalid prescriptionId' }, { status: 400 })
    }
    if (shareId && (typeof shareId !== 'string' || !UUID_RE.test(shareId))) {
      return NextResponse.json({ ok: false, error: 'Invalid shareId' }, { status: 400 })
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
    if (!user) return NextResponse.json({ ok: true }, { status: 200 })

    // Fire-and-forget
    supabase.functions
      .invoke('send-prescription-notification', {
        body: { type, prescriptionId, shareId, status, responseNotes },
      })
      .catch((err: unknown) => console.error('send-prescription-notification failed:', err))
  } catch (err) {
    console.error('Prescription notify route error:', err)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
