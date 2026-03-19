import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createHash } from 'crypto'
import type { Database } from '@/integrations/supabase/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { shareId, otp } = body

    if (!shareId || !otp) {
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

    // Fetch the share record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: share, error: shareError } = await (supabase as any)
      .from('patient_document_shares')
      .select('*, document:document_id(file_path, patient_id)')
      .eq('id', shareId)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // Validate share state
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

    // Verify OTP
    const hash = createHash('sha256').update(otp + shareId).digest('hex')
    if (hash !== share.download_password_hash) {
      const newAttempts = attempts + 1
      const shouldRevoke = newAttempts >= maxAttempts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('patient_document_shares')
        .update({
          password_attempts: newAttempts,
          ...(shouldRevoke ? { access_revoked: true, revoked_at: new Date().toISOString() } : {}),
        })
        .eq('id', shareId)
      return NextResponse.json({
        error: 'Invalid OTP',
        attemptsRemaining: maxAttempts - newAttempts,
      }, { status: 401 })
    }

    // OTP matched — generate signed URL using service role to bypass RLS
    const serviceSupabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    const { data: urlData, error: urlError } = await serviceSupabase.storage
      .from('patient-documents')
      .createSignedUrl(share.document.file_path, 300)

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 })
    }

    // Mark as downloaded
    const { data: { user } } = await supabase.auth.getUser()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('patient_document_shares')
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
