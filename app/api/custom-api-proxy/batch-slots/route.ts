import { NextRequest, NextResponse } from 'next/server'

/**
 * Thin proxy to the Supabase Edge Function `batch-slots`.
 * Kept for backward compatibility — the web client now calls the
 * Edge Function directly, but this route ensures nothing breaks
 * if any caller still hits the Next.js endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/batch-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body,
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('[batch-slots proxy] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
