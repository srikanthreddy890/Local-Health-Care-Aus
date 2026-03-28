import { NextResponse } from 'next/server'
import { reportBookingUsage } from '@/lib/stripe/usage'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

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

    const { clinicId, bookingId, bookingSource } = (await request.json()) as {
      clinicId: string
      bookingId: string
      bookingSource: 'standard' | 'centaur' | 'custom_api'
    }

    if (!clinicId || !bookingId || !bookingSource) {
      return NextResponse.json(
        { error: 'clinicId, bookingId, and bookingSource are required' },
        { status: 400 }
      )
    }

    const validSources = ['standard', 'centaur', 'custom_api']
    if (!validSources.includes(bookingSource)) {
      return NextResponse.json({ error: 'Invalid bookingSource' }, { status: 400 })
    }

    const result = await reportBookingUsage(clinicId, bookingId, bookingSource)

    if (!result) {
      return NextResponse.json({ message: 'Already reported or no subscription' })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Report booking usage error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
