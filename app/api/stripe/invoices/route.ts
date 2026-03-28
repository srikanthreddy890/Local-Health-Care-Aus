import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const clinicId = url.searchParams.get('clinicId')
    const rawLimit = parseInt(url.searchParams.get('limit') ?? '20', 10)
    const rawOffset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 20 : rawLimit, 1), 100)
    const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0)

    if (!clinicId) return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })

    // RLS handles access control — clinic owners/staff can only see their own invoices
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error, count } = await (supabase as any)
      .from('stripe_invoices')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Fetch invoices error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invoices: data ?? [], total: count ?? 0 })
  } catch (err) {
    console.error('Invoices route error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
