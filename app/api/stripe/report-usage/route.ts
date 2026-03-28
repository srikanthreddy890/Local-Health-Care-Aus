import { NextResponse } from 'next/server'
import { reconcileUsage } from '@/lib/stripe/usage'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const results = await reconcileUsage(clinicId)

    return NextResponse.json({
      reconciled: results.length,
      results,
    })
  } catch (err) {
    console.error('Reconcile usage error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
