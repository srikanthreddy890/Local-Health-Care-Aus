import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExternalApiRequest } from '@/lib/customApi/buildExternalApiRequest'
import { transformResponse } from '@/lib/customApi/transformResponse'
import { validateNotPrivate } from '@/lib/customApi/ssrfProtection'
import { createStandardizedBookingParams } from '@/lib/customApi/customApiStandardFields'
import { getConfigCached } from '@/lib/customApi/configCache'

// Requires Node.js runtime for dns/promises (SSRF protection)
export const runtime = 'nodejs'

/**
 * Server-side proxy for custom API integration calls.
 * Fetches the saved config from DB, reconstructs credentials,
 * and makes the actual API call to the external service.
 *
 * For book_appointment: patient PII is resolved entirely server-side
 * from the authenticated user's profile — never sent from the browser.
 *
 * Supports: get_doctors, get_appointments, book_appointment, cancel_appointment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, configId, clinicId, ...clientParams } = body as {
      action: string
      configId: string
      clinicId: string
      [key: string]: unknown
    }

    if (!configId || !action) {
      return NextResponse.json({ error: 'configId and action are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // ── Authentication ─────────────────────────────────────────────
    // Read-only actions are public — patients browse without logging in.
    // Write actions require authentication.
    const READ_ONLY_ACTIONS = ['get_doctors', 'get_appointments', 'get_availability']
    let authenticatedUser: { id: string; email?: string } | null = null

    if (!READ_ONLY_ACTIONS.includes(action)) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      authenticatedUser = user
    }

    // ── Fetch API config (cached) ────────────────────────────────────
    const config = await getConfigCached(configId, supabase)

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found or inactive' }, { status: 404 })
    }

    if (config.clinic_id !== clinicId) {
      return NextResponse.json({ error: 'Config does not belong to this clinic' }, { status: 403 })
    }

    // ── Determine endpoint ─────────────────────────────────────────
    const endpointKey = action === 'get_doctors' ? 'get_doctors'
      : action === 'get_appointments' || action === 'get_availability' ? 'get_appointments'
      : action === 'book_appointment' ? 'book_appointment'
      : action === 'cancel_appointment' ? 'cancel_appointment'
      : null

    if (!endpointKey) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    // ── Resolve params ─────────────────────────────────────────────
    // For book_appointment: build patient params server-side from DB.
    // Patient PII never leaves the server.
    let resolvedParams: Record<string, unknown> = clientParams

    if (action === 'book_appointment' && authenticatedUser) {
      const bookingParams = await resolveBookingParams(supabase, authenticatedUser, clientParams)
      if ('error' in bookingParams) {
        return NextResponse.json({ error: bookingParams.error }, { status: 400 })
      }
      resolvedParams = bookingParams
    }

    // ── Build external API request ─────────────────────────────────
    const fieldMappings = config.field_mappings as Record<string, unknown> | null

    let apiRequest: ReturnType<typeof buildExternalApiRequest>
    try {
      apiRequest = buildExternalApiRequest(
        config as unknown as Parameters<typeof buildExternalApiRequest>[0],
        endpointKey,
        resolvedParams,
      )
    } catch (buildErr) {
      console.error(`[custom-api-proxy] buildExternalApiRequest failed for ${action}:`, buildErr)
      return NextResponse.json(
        { error: buildErr instanceof Error ? buildErr.message : 'Failed to build request' },
        { status: 400 }
      )
    }

    // SSRF protection
    const targetUrl = new URL(apiRequest.url)
    await validateNotPrivate(targetUrl.hostname)

    // ── Make the request ────────────────────────────────────────────

    console.log(`[custom-api-proxy] ${action}:`, {
      url: apiRequest.url,
      method: apiRequest.method,
      // Only log body structure, never PII
      ...(apiRequest.body ? { bodyLength: apiRequest.body.length } : {}),
    })

    const fetchOptions: RequestInit = {
      method: apiRequest.method,
      headers: apiRequest.headers,
      signal: AbortSignal.timeout(30000),
    }

    if (apiRequest.body) {
      fetchOptions.body = apiRequest.body
    }

    const response = await fetch(apiRequest.url, fetchOptions)
    const responseText = await response.text()

    let responseData: unknown
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { _rawText: responseText }
    }

    if (!response.ok) {
      console.error(`[custom-api-proxy] External API error ${response.status}:`, responseText.slice(0, 500))
      return NextResponse.json({
        error: `External API returned ${response.status}`,
        status: response.status,
        data: responseData,
      }, { status: 200 }) // Return 200 so the client can read the error details
    }

    // ── Transform response using field mappings ─────────────────────

    const mappings = fieldMappings?.[endpointKey] as Record<string, Record<string, string>> | null
    const responseMappings = mappings?.response

    if (responseMappings && responseData && typeof responseData === 'object') {
      const transformed = transformResponse(responseData as Record<string, unknown>, responseMappings)
      return NextResponse.json(transformed)
    }

    if (Array.isArray(responseData)) {
      return NextResponse.json({ data: responseData })
    }

    return NextResponse.json(responseData)
  } catch (err) {
    console.error('[custom-api-proxy] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── Server-side patient data resolution ──────────────────────────────────

/**
 * Resolve booking params entirely server-side.
 * Fetches patient PII from DB so it never passes through the browser.
 *
 * Client sends only: slotId, doctorId, familyMemberId?, notes?,
 *                     appointmentDate?, appointmentTime?, doctorName?
 */
async function resolveBookingParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  user: { id: string; email?: string },
  clientParams: Record<string, unknown>,
): Promise<Record<string, string> | { error: string }> {
  const {
    slotId, slot_id,
    doctorId, doctor_id,
    familyMemberId, family_member_id,
    notes,
    appointmentDate, appointment_date,
    appointmentTime, appointment_time,
    doctorName, doctor_name,
  } = clientParams as Record<string, string | undefined>

  const resolvedSlotId = slotId ?? slot_id
  const resolvedDoctorId = doctorId ?? doctor_id
  const resolvedFamilyMemberId = familyMemberId ?? family_member_id

  if (!resolvedSlotId || !resolvedDoctorId) {
    return { error: 'slotId and doctorId are required' }
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone, date_of_birth')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Could not load user profile' }
  }

  // Determine patient data — use family member if specified
  let patientFirstName = profile.first_name
  let patientLastName = profile.last_name
  let patientEmail = user.email ?? ''
  let patientMobile = profile.phone ?? ''
  let patientDob = profile.date_of_birth ?? undefined

  if (resolvedFamilyMemberId) {
    // Fetch family member — verify ownership via user_id
    const { data: fm } = await supabase
      .from('family_members')
      .select('first_name, last_name, email, mobile, date_of_birth')
      .eq('id', resolvedFamilyMemberId)
      .eq('user_id', user.id)
      .single()

    if (fm) {
      patientFirstName = fm.first_name
      patientLastName = fm.last_name
      if (fm.email) patientEmail = fm.email
      if (fm.mobile) patientMobile = fm.mobile
      if (fm.date_of_birth) patientDob = fm.date_of_birth
    }
  }

  // Build standardized params using the shared utility
  return createStandardizedBookingParams({
    patientFirstName,
    patientLastName,
    patientEmail,
    patientMobile,
    patientDob,
    slotId: resolvedSlotId,
    doctorId: resolvedDoctorId,
    appointmentDate: appointmentDate ?? appointment_date,
    appointmentTime: appointmentTime ?? appointment_time,
    notes: (notes as string) || undefined,
  })
}
