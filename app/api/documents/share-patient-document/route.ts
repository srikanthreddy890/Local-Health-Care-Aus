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
    const { documentId, clinicId, patientId, notes, expiresAt } = body

    if (!documentId || !clinicId || !patientId) {
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
    if (!user || user.id !== patientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!limiter.check(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Verify document belongs to patient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: doc, error: docError } = await (supabase as any)
      .from('patient_documents')
      .select('id')
      .eq('id', documentId)
      .eq('patient_id', patientId)
      .single()
    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Generate a cryptographically random 6-digit OTP
    const otpArray = new Uint32Array(1)
    crypto.getRandomValues(otpArray)
    const otp = String(otpArray[0] % 1000000).padStart(6, '0')

    // We need the shareId as a salt — generate it first
    const shareId = crypto.randomUUID()

    // Hash OTP with bcrypt for secure storage
    const hash = await bcrypt.hash(otp + shareId, 12)

    // Default expiry: 48 hours from now
    const defaultExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('patient_document_shares')
      .insert({
        id: shareId,
        document_id: documentId,
        clinic_id: clinicId,
        patient_id: patientId,
        shared_by: user.id,
        download_password_hash: hash,
        max_password_attempts: 5,
        password_attempts: 0,
        notes: notes ?? null,
        expires_at: expiresAt ?? defaultExpiry,
        shared_at: new Date().toISOString(),
        access_revoked: false,
      })
    if (insertError) throw insertError

    // Fire-and-forget: notify the clinic that a document has been shared with them
    supabase.functions
      .invoke('send-document-share-notification', {
        body: { shareId, documentId, clinicId, patientId },
      })
      .catch(() => {})

    return NextResponse.json({ shareId, otp })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
