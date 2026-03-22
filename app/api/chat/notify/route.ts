import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/integrations/supabase/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { conversationId, senderType } = body

    if (!conversationId || !senderType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Verify the caller is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the caller has access to this conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hasAccess } = await (supabase as any).rpc('has_chat_access', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
