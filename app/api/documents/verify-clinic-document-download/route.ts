import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import bcrypt from 'bcryptjs'
import type { Database } from '@/integrations/supabase/types'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 })

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { shareId, otp } = body

    if (!shareId || !otp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!limiter.check(shareId)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    // Fetch the share record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: share, error: shareError } = await (supabase as any)
      .from('clinic_document_shares')
      .select('*, document:document_id(file_path, clinic_id)')
      .eq('id', shareId)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    if (share.access_revoked) {
      return NextResponse.json({ error: 'Access has been revoked' }, { status: 403 })
    }
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 403 })
    }
    const maxAttempts = share.max_password_attempts ?? 5
    const attempts = share.password_attempts ?? 0
    if (attempts >= maxAttempts) {
      return NextResponse.json({ error: 'Too many failed attempts' }, { status: 403 })
    }

    const otpValid = await bcrypt.compare(otp + shareId, share.download_password_hash)
    if (!otpValid) {
      const newAttempts = attempts + 1
      const shouldRevoke = newAttempts >= maxAttempts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('clinic_document_shares')
        .update({
          password_attempts: newAttempts,
          ...(shouldRevoke ? { access_revoked: true, revoked_at: new Date().toISOString() } : {}),
        })
        .eq('id', shareId)
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 })
    }

    // If user is authenticated, verify they are the intended recipient (patient)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && share.patient_id && user.id !== share.patient_id) {
      console.warn(`[verify-clinic-download] User ${user.id} attempted to download share ${shareId} intended for patient ${share.patient_id}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role to generate signed URL (cross-ownership access)
    const serviceSupabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    const { data: urlData, error: urlError } = await serviceSupabase.storage
      .from('clinic-documents')
      .createSignedUrl(share.document.file_path, 300)

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('clinic_document_shares')
      .update({
        is_downloaded: true,
        downloaded_at: new Date().toISOString(),
        downloaded_by: user?.id ?? null,
      })
      .eq('id', shareId)

    return NextResponse.json({ signedUrl: urlData.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
