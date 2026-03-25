import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side proxy for custom API integration calls.
 * Fetches the saved config from DB, reconstructs credentials,
 * and makes the actual API call to the external service.
 *
 * Supports: get_doctors, get_appointments, book_appointment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, configId, clinicId, ...params } = body as {
      action: string
      configId: string
      clinicId: string
      doctorId?: string
      date?: string
      [key: string]: unknown
    }

    if (!configId || !action) {
      return NextResponse.json({ error: 'configId and action are required' }, { status: 400 })
    }

    // Read-only actions (get_doctors, get_appointments) are public — patients browse without logging in.
    // Write actions (book_appointment) require authentication.
    const READ_ONLY_ACTIONS = ['get_doctors', 'get_appointments', 'get_availability']
    if (!READ_ONLY_ACTIONS.includes(action)) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Use SECURITY DEFINER RPC to safely fetch the config
    // This bypasses RLS in a controlled way — only returns configs for active, enabled clinics
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configJson, error: configError } = await (supabase as any)
      .rpc('get_active_api_config', { p_config_id: configId })

    if (configError || !configJson) {
      return NextResponse.json({ error: 'Configuration not found or inactive' }, { status: 404 })
    }

    const config = configJson as Record<string, unknown>

    // Verify clinic access
    if (config.clinic_id !== clinicId) {
      return NextResponse.json({ error: 'Config does not belong to this clinic' }, { status: 403 })
    }

    const endpointConfig = config.endpoint_config as Record<string, Record<string, unknown>> | null
    const fieldMappings = config.field_mappings as Record<string, unknown> | null
    const customAuthHeaders = config.custom_auth_headers as Record<string, Record<string, string>> | null
    const apiKeyEncrypted = config.api_key_encrypted as string | null

    // Determine which endpoint to call based on action
    const endpointKey = action === 'get_doctors' ? 'get_doctors'
      : action === 'get_appointments' || action === 'get_availability' ? 'get_appointments'
      : action === 'book_appointment' ? 'book_appointment'
      : null

    if (!endpointKey || !endpointConfig?.[endpointKey]) {
      return NextResponse.json({ error: `Endpoint ${action} not configured` }, { status: 400 })
    }

    const endpoint = endpointConfig[endpointKey]
    const url = endpoint.url as string
    const method = (endpoint.method as string) || 'GET'
    const auth = endpoint.auth as { type?: string; token?: string; header?: string; username?: string; password?: string } | null
    const headers = { ...(endpoint.headers as Record<string, string> || {}) }
    const urlParameters = endpoint.urlParameters as { name: string; paramLocation: string; type?: string; defaultValue?: string; source?: string; defaultTime?: string; datetimeFormat?: string }[] | null

    // ── Reconstruct credentials ─────────────────────────────────────

    // Merge back custom auth headers (these were extracted for secure storage)
    if (customAuthHeaders?.[endpointKey]) {
      for (const [headerName, headerValue] of Object.entries(customAuthHeaders[endpointKey])) {
        headers[headerName] = headerValue
      }
    }

    // Reconstruct auth header from encrypted API key
    if (auth) {
      if (auth.token === '[ENCRYPTED]' && apiKeyEncrypted) {
        // Use the stored API key
        if (auth.type === 'bearer') {
          headers['Authorization'] = `Bearer ${apiKeyEncrypted}`
        } else if (auth.type === 'api_key') {
          headers[auth.header || 'X-API-Key'] = apiKeyEncrypted
        }
      } else if (auth.token && auth.token !== '[ENCRYPTED]') {
        // Token is in plaintext (shouldn't happen in production but handle it)
        if (auth.type === 'bearer') {
          headers['Authorization'] = `Bearer ${auth.token}`
        } else if (auth.type === 'api_key') {
          headers[auth.header || 'X-API-Key'] = auth.token
        }
      }
      if (auth.type === 'basic' && auth.username) {
        headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password || ''}`).toString('base64')}`
      }
    }

    // Replace any remaining [ENCRYPTED] header values with the API key as fallback
    for (const [key, value] of Object.entries(headers)) {
      if (value === '[ENCRYPTED]' && apiKeyEncrypted) {
        headers[key] = apiKeyEncrypted
      }
    }

    // ── Build URL with parameters ───────────────────────────────────

    let finalUrl = url
    const parsedUrl = new URL(finalUrl)

    if (urlParameters?.length) {
      for (const param of urlParameters) {
        if (!param.name) continue
        let value = param.defaultValue ?? ''

        // Resolve runtime sources
        if (param.source === 'doctor_id' && params.doctorId) {
          value = String(params.doctorId)
        } else if (param.source === 'start_date' && params.date) {
          const time = param.defaultTime || '07:00:00'
          value = formatDatetime(String(params.date), time, param.datetimeFormat || 'yyyy-MM-dd HH:mm:ss')
        } else if (param.source === 'end_date' && params.date) {
          const time = param.defaultTime || '20:00:00'
          value = formatDatetime(String(params.date), time, param.datetimeFormat || 'yyyy-MM-dd HH:mm:ss')
        }

        if (!value) continue

        if (param.paramLocation === 'path' && finalUrl.includes(`{${param.name}}`)) {
          finalUrl = finalUrl.replace(`{${param.name}}`, encodeURIComponent(value))
        } else if (!parsedUrl.searchParams.has(param.name)) {
          parsedUrl.searchParams.set(param.name, value)
          finalUrl = parsedUrl.toString()
        }
      }
    }

    // Substitute {doctorId} in path if not handled by urlParameters
    if (params.doctorId) {
      finalUrl = finalUrl.replace('{doctorId}', encodeURIComponent(String(params.doctorId)))
    }

    // ── Make the request ────────────────────────────────────────────

    console.log(`[custom-api-proxy] ${action}:`, { url: finalUrl, method })

    const isPostLike = method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT'
    if (isPostLike && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
    }

    // For booking, build request body by injecting real patient data into the JSON template
    if (isPostLike && endpoint.requestBody) {
      const requestBody = endpoint.requestBody as { rawJson?: string }
      if (requestBody.rawJson) {
        try {
          const template = JSON.parse(requestBody.rawJson)
          const injected = injectPatientData(template, params)
          fetchOptions.body = JSON.stringify(injected)
        } catch {
          fetchOptions.body = requestBody.rawJson
        }
      } else {
        fetchOptions.body = '{}'
      }
    }

    const response = await fetch(finalUrl, fetchOptions)
    const responseText = await response.text()

    let responseData: unknown
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { _rawText: responseText }
    }

    if (!response.ok) {
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

    // No field mappings — auto-normalize the response so normalizeArray() can find the data
    // If the response is a plain array (e.g. Centaur returns [...]), wrap it as { data: [...] }
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

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Inject real patient data into the JSON template by matching KEY NAMES
 * to known patient field patterns (firstName, email, mobile, slotId, etc.)
 */
function injectPatientData(
  template: Record<string, unknown>,
  params: Record<string, unknown>,
): Record<string, unknown> {
  // Map of template key patterns → standard param keys
  const fieldMap: Record<string, string[]> = {
    patient_first_name: ['firstName', 'first_name', 'fname', 'givenName', 'given_name'],
    patient_last_name: ['lastName', 'last_name', 'lname', 'surname', 'familyName', 'family_name'],
    patient_email: ['email', 'emailAddress', 'email_address', 'patientEmail'],
    patient_mobile: ['mobile', 'phone', 'phoneNumber', 'phone_number', 'cellphone', 'telephone', 'contactNumber'],
    patient_dob: ['dob', 'dateOfBirth', 'date_of_birth', 'birthDate', 'birth_date', 'birthday'],
    slot_id: ['slotId', 'slot_id', 'appointmentId', 'appointment_id', 'timeSlotId', 'timeslot_id'],
    doctor_id: ['doctorId', 'doctor_id', 'practitionerId', 'practitioner_id', 'providerId', 'provider_id'],
    notes: ['notes', 'comment', 'comments', 'reason', 'booking_notes', 'bookingNotes'],
    appointment_date: ['appointmentDate', 'appointment_date', 'date', 'bookingDate'],
    appointment_time: ['appointmentTime', 'appointment_time', 'time', 'startTime', 'start_time'],
  }

  // Reverse map: template key name → which standard param to use
  const result = { ...template }

  for (const [key, value] of Object.entries(result)) {
    // Find which standard field this key maps to
    for (const [standardKey, aliases] of Object.entries(fieldMap)) {
      if (key === standardKey || aliases.some((a) => a.toLowerCase() === key.toLowerCase())) {
        // Replace with real value from params
        const realValue = params[standardKey]
        if (realValue !== undefined && realValue !== null && realValue !== '') {
          // Preserve the original type (number vs string)
          if (typeof value === 'number' && typeof realValue === 'string' && /^\d+$/.test(realValue)) {
            result[key] = parseInt(realValue, 10)
          } else {
            result[key] = realValue
          }
        }
        break
      }
    }
  }

  return result
}

function formatDatetime(date: string, time: string, format: string): string {
  const [y, mo, d] = date.split('-')
  const [h, mi, s] = (time || '00:00:00').split(':')
  return format
    .replace('yyyy', y).replace('MM', mo).replace('dd', d)
    .replace('HH', h).replace('mm', mi).replace('ss', s || '00')
}

/** Transform API response using field mappings */
function transformResponse(
  data: Record<string, unknown>,
  mappings: Record<string, string>,
): Record<string, unknown> {
  // Find the array in the response (doctors, slots, etc.)
  const arrayKeys = ['doctors', 'appointments', 'slots', 'data', 'results', 'items']
  let items: Record<string, unknown>[] | null = null

  if (Array.isArray(data)) {
    items = data as Record<string, unknown>[]
  } else {
    // Check for array path in mappings
    for (const key of arrayKeys) {
      if (mappings[key]) {
        items = getValueByPath(data, mappings[key]) as Record<string, unknown>[] | null
        if (Array.isArray(items)) break
        items = null
      }
    }
    // Auto-detect array
    if (!items) {
      for (const key of arrayKeys) {
        if (Array.isArray(data[key])) {
          items = data[key] as Record<string, unknown>[]
          break
        }
      }
    }
  }

  if (!items) {
    return data // Return as-is if no array found
  }

  // Map each item's fields
  const mapped = items.map((item) => {
    const result: Record<string, unknown> = {}
    for (const [standardKey, externalPath] of Object.entries(mappings)) {
      if (arrayKeys.includes(standardKey)) continue // Skip array path keys
      if (externalPath.startsWith('@request.')) continue // Skip request context mappings
      const value = getValueByPath(item, externalPath)
      if (value !== undefined) result[standardKey] = value
    }
    // Also keep the original item data for unmapped fields
    return { ...item, ...result }
  })

  return { data: mapped }
}

function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
