import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import bcrypt from 'bcryptjs'
import type { Database } from '@/integrations/supabase/types'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { documentId, clinicId, patientIds, sharedBy, notes, expiresAt } = body

    if (!documentId || !clinicId || !patientIds?.length || !sharedBy) {
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
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!limiter.check(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Verify the caller owns or is active staff of this clinic
    const { data: ownedClinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('id', clinicId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!ownedClinic) {
      const { data: staffRecord } = await supabase
        .from('clinic_users')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!staffRecord) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Verify document belongs to clinic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: doc, error: docError } = await (supabase as any)
      .from('clinic_documents')
      .select('id')
      .eq('id', documentId)
      .eq('clinic_id', clinicId)
      .single()
    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const defaultExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const results: { patientId: string; shareId: string; otp: string }[] = []

    for (const patientId of patientIds) {
      const otpArray = new Uint32Array(1)
      crypto.getRandomValues(otpArray)
      // Reject values above the largest multiple of 100_000_000 to avoid modulo bias
      let raw = otpArray[0]
      const maxUnbiased = Math.floor(0xFFFFFFFF / 100_000_000) * 100_000_000
      while (raw >= maxUnbiased) {
        crypto.getRandomValues(otpArray)
        raw = otpArray[0]
      }
      const otp = String(raw % 100_000_000).padStart(8, '0')
      const shareId = crypto.randomUUID()
      const hash = await bcrypt.hash(otp + shareId, 12)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('clinic_document_shares')
        .insert({
          id: shareId,
          document_id: documentId,
          clinic_id: clinicId,
          patient_id: patientId,
          shared_by: sharedBy,
          download_password_hash: hash,
          max_password_attempts: 5,
          password_attempts: 0,
          notes: notes ?? null,
          expires_at: expiresAt ?? defaultExpiry,
          shared_at: new Date().toISOString(),
          access_revoked: false,
        })

      if (!error) {
        results.push({ patientId, shareId, otp })
      }
    }

    // Fire-and-forget: notify each patient that a document has been shared with them
    for (const r of results) {
      supabase.functions
        .invoke('send-clinic-document-notification', {
          body: { shareId: r.shareId, documentId, clinicId, patientId: r.patientId },
        })
        .catch(() => {})
    }

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
