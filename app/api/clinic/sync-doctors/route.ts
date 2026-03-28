import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExternalApiRequest } from '@/lib/customApi/buildExternalApiRequest'
import { transformResponse, normalizeArray } from '@/lib/customApi/transformResponse'
import { validateNotPrivate } from '@/lib/customApi/ssrfProtection'
import { createRateLimiter } from '@/lib/rateLimit'

const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 })

/**
 * Manual doctor sync trigger for clinic portal.
 * Validates the user is a clinic owner/staff, then runs the sync
 * for that specific clinic using SECURITY DEFINER RPCs directly.
 *
 * No CRON_SECRET needed — uses the authenticated user's session.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { clinicId } = body as { clinicId: string }

    if (!clinicId) {
      return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })
    }

    // Rate limit per clinic
    if (!limiter.check(clinicId)) {
      return NextResponse.json({ error: 'Too many sync requests. Please wait a minute.' }, { status: 429 })
    }

    // Verify user is clinic owner or active staff with can_manage_settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clinic } = await (supabase as any)
      .from('clinics')
      .select('id, user_id, custom_api_enabled')
      .eq('id', clinicId)
      .single()

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    const isOwner = clinic.user_id === user.id

    if (!isOwner) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: staffRecord } = await (supabase as any)
        .from('clinic_users')
        .select('role, permissions, is_active')
        .eq('clinic_id', clinicId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!staffRecord) {
        return NextResponse.json({ error: 'You are not authorized to manage this clinic' }, { status: 403 })
      }

      const permissions = staffRecord.permissions as Record<string, boolean> | null
      if (!permissions?.can_manage_settings) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    if (!clinic.custom_api_enabled) {
      return NextResponse.json({ error: 'Custom API is not enabled for this clinic' }, { status: 400 })
    }

    // Fetch config via SECURITY DEFINER RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configs } = await (supabase as any).rpc('sync_get_active_configs', {
      p_clinic_id: clinicId,
    })

    const configList = (configs ?? []) as {
      id: string; clinic_id: string; endpoint_config: Record<string, Record<string, unknown>>
      field_mappings: Record<string, unknown>; custom_auth_headers: Record<string, Record<string, string>>
      api_key_encrypted: string; config_name: string
    }[]

    if (configList.length === 0) {
      return NextResponse.json({ error: 'No active API configuration found' }, { status: 404 })
    }

    const config = configList[0]
    const clinicSyncStart = Date.now()

    // Start sync log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: syncLogId } = await (supabase as any).rpc('sync_log_start', {
      p_config_id: config.id,
      p_clinic_id: config.clinic_id,
    })

    try {
      const endpointConfig = config.endpoint_config as Record<string, Record<string, unknown>> | null
      if (!endpointConfig?.get_doctors) {
        throw new Error('get_doctors endpoint not configured')
      }

      const request = buildExternalApiRequest(
        {
          endpoint_config: endpointConfig,
          field_mappings: config.field_mappings,
          custom_auth_headers: config.custom_auth_headers,
          api_key_encrypted: config.api_key_encrypted,
        },
        'get_doctors',
        {},
      )

      const urlObj = new URL(request.url)
      await validateNotPrivate(urlObj.hostname)

      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        throw new Error(`External API returned ${response.status}: ${response.statusText}`)
      }

      const responseText = await response.text()
      let responseData: Record<string, unknown>
      try {
        responseData = JSON.parse(responseText)
      } catch {
        throw new Error('Failed to parse API response as JSON')
      }

      // Transform using field mappings
      const fieldMappings = config.field_mappings as Record<string, unknown> | null
      const mappings = fieldMappings?.get_doctors as Record<string, Record<string, string>> | null
      const responseMappings = mappings?.response

      let processedData = responseData
      if (responseMappings && typeof responseData === 'object') {
        processedData = transformResponse(responseData, responseMappings)
      }

      const doctorsArray = normalizeArray(processedData, ['doctors', 'data', 'practitioners', 'results', 'items'])

      if (doctorsArray.length === 0) {
        throw new Error('No doctors found in API response')
      }

      let added = 0
      let updated = 0
      const syncedExternalIds: string[] = []

      for (const doc of doctorsArray) {
        const externalDoctorId = String(doc.id ?? doc.doctor_id ?? doc.DoctorId ?? doc.PractitionerId ?? '')
        const doctorName = String(doc.name ?? doc.doctor_name ?? doc.fullName ?? doc.FullName ?? '')
        if (!externalDoctorId || !doctorName) continue

        syncedExternalIds.push(externalDoctorId)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: action } = await (supabase as any).rpc('sync_upsert_doctor', {
          p_clinic_id: config.clinic_id,
          p_config_id: config.id,
          p_external_id: externalDoctorId,
          p_name: doctorName,
          p_specialty: (doc.specialization ?? doc.specialty ?? doc.Specialty ?? null) as string | null,
          p_bio: (doc.bio ?? doc.Bio ?? null) as string | null,
          p_data: doc,
        })

        if (action === 'inserted') added++
        else updated++
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deactivatedCount } = await (supabase as any).rpc('sync_deactivate_stale_doctors', {
        p_config_id: config.id,
        p_clinic_id: config.clinic_id,
        p_active_ids: syncedExternalIds,
      })

      if (syncLogId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('sync_log_complete', {
          p_log_id: syncLogId, p_status: 'success',
          p_added: added, p_updated: updated, p_deactivated: deactivatedCount ?? 0,
          p_error: null, p_duration_ms: Date.now() - clinicSyncStart,
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('sync_update_config_status', { p_config_id: config.id, p_status: 'success' })

      return NextResponse.json({
        status: 'success',
        doctors_added: added,
        doctors_updated: updated,
        doctors_deactivated: deactivatedCount ?? 0,
        duration_ms: Date.now() - clinicSyncStart,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'

      if (syncLogId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('sync_log_complete', {
          p_log_id: syncLogId, p_status: 'failed',
          p_added: 0, p_updated: 0, p_deactivated: 0,
          p_error: errorMsg, p_duration_ms: Date.now() - clinicSyncStart,
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('sync_update_config_status', { p_config_id: config.id, p_status: 'failed' })

      return NextResponse.json({ error: errorMsg }, { status: 502 })
    }
  } catch (err) {
    console.error('[clinic/sync-doctors] Error:', {
      message: err instanceof Error ? err.message : 'Unknown error',
    })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
