import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 1, windowMs: 5 * 60_000 })

/**
 * GET /api/clinic/export-data
 *
 * Exports all clinic data as a downloadable JSON file.
 * Authenticated clinic owners and active staff can access this.
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Determine which clinic the user belongs to (owner or staff)
  let clinicId: string | null = null

  // Check ownership first
  const { data: ownedClinic } = await supabase
    .from('clinics')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (ownedClinic) {
    clinicId = ownedClinic.id
  } else {
    // Check staff membership
    const { data: staffRecord } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (staffRecord) {
      clinicId = staffRecord.clinic_id
    }
  }

  if (!clinicId) {
    return NextResponse.json({ error: 'No clinic found for this user' }, { status: 403 })
  }

  if (!limiter.check(clinicId)) {
    return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 })
  }

  // Fetch all clinic data in parallel
  const [
    clinicResult,
    doctorsResult,
    servicesResult,
    appointmentsResult,
    bookingsResult,
    documentsResult,
    billingResult,
    billingHistoryResult,
    referralsResult,
    staffResult,
  ] = await Promise.all([
    supabase.from('clinics').select('*').eq('id', clinicId).single(),
    supabase.from('doctors').select('id, name, specialization, qualification, experience_years, bio, is_active, created_at').eq('clinic_id', clinicId),
    supabase.from('services').select('id, name, description, category, price, duration_minutes, is_active').eq('clinic_id', clinicId),
    supabase.from('appointments').select('id, doctor_id, date, start_time, end_time, status, service_id, created_at').eq('clinic_id', clinicId).order('date', { ascending: false }).limit(500),
    supabase.from('bookings').select('id, appointment_id, patient_first_name, patient_last_name, patient_email, patient_mobile, status, appointment_date, patient_notes, clinic_notes, created_at').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(500),
    supabase.from('clinic_documents').select('id, title, description, file_type, created_at').eq('clinic_id', clinicId),
    supabase.from('clinic_billing').select('*').eq('clinic_id', clinicId),
    supabase.from('clinic_billing_history').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(100),
    supabase.from('clinic_referrals').select('id, source_clinic_id, target_clinic_id, document_id, patient_name, referral_notes, is_downloaded, downloaded_at, access_revoked, revoked_at, expires_at, created_at').or(`source_clinic_id.eq.${clinicId},target_clinic_id.eq.${clinicId}`),
    supabase.from('clinic_users').select('id, user_id, role, is_active, created_at').eq('clinic_id', clinicId),
  ])

  const exportData = {
    export_date: new Date().toISOString(),
    export_version: '1.0',
    clinic: clinicResult.data,
    doctors: doctorsResult.data ?? [],
    services: servicesResult.data ?? [],
    appointments: appointmentsResult.data ?? [],
    bookings: bookingsResult.data ?? [],
    documents: documentsResult.data ?? [],
    billing: billingResult.data ?? [],
    billing_history: billingHistoryResult.data ?? [],
    referrals: referralsResult.data ?? [],
    staff: staffResult.data ?? [],
  }

  const json = JSON.stringify(exportData, null, 2)

  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="clinic-export-${clinicId}-${Date.now()}.json"`,
    },
  })
}
