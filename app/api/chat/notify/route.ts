import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { conversationId, senderType } = body

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

    // Fire-and-forget — errors are logged but never propagate
    supabase.functions
      .invoke('send-chat-notification', {
        body: { conversationId, senderType },
      })
      .catch(() => {})
  } catch {
    // Always return 200 — caller must not be blocked by notification failures
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
