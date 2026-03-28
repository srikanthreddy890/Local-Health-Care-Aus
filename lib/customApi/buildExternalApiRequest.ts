/**
 * Build an external API request from a saved configuration.
 * Reconstructs credentials, builds URL with parameters, injects request body.
 *
 * Used by: clinic/sync-doctors (manual sync) and Supabase Edge Functions (deployed separately).
 */

import { decryptApiKey, isEncryptedValue } from './encryption'

interface ApiConfig {
  endpoint_config: Record<string, Record<string, unknown>> | null
  field_mappings: Record<string, unknown> | null
  custom_auth_headers: Record<string, Record<string, string>> | null
  api_key_encrypted: string | null
}

export interface ExternalApiRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

/**
 * Build a ready-to-send external API request from the stored configuration.
 *
 * @param config  - The API configuration from `get_active_api_config` RPC
 * @param endpointKey - Which endpoint to build: 'get_doctors' | 'get_appointments' | 'book_appointment'
 * @param params  - Runtime parameters: { doctorId, date, patient_first_name, ... }
 */
export function buildExternalApiRequest(
  config: ApiConfig,
  endpointKey: string,
  params: Record<string, unknown> = {},
): ExternalApiRequest {
  const endpointConfig = config.endpoint_config
  if (!endpointConfig?.[endpointKey]) {
    throw new Error(`Endpoint ${endpointKey} not configured`)
  }

  const endpoint = endpointConfig[endpointKey]
  const url = endpoint.url as string
  const method = (endpoint.method as string) || 'GET'
  const auth = endpoint.auth as {
    type?: string; token?: string; header?: string; username?: string; password?: string
  } | null
  const headers = { ...(endpoint.headers as Record<string, string> || {}) }
  const urlParameters = endpoint.urlParameters as {
    name: string; paramLocation: string; type?: string; defaultValue?: string
    source?: string; defaultTime?: string; datetimeFormat?: string
  }[] | null

  const customAuthHeaders = config.custom_auth_headers

  // Decrypt stored API key — only encrypted values are accepted (no plaintext fallback)
  let apiKeyDecrypted: string | null = null
  if (config.api_key_encrypted && isEncryptedValue(config.api_key_encrypted)) {
    apiKeyDecrypted = decryptApiKey(config.api_key_encrypted)
    if (!apiKeyDecrypted) {
      throw new Error('Failed to decrypt API key — check API_KEY_ENCRYPTION_SECRET')
    }
  }

  // ── Reconstruct credentials ─────────────────────────────────────

  // Merge back custom auth headers (extracted during config save for secure storage)
  if (customAuthHeaders?.[endpointKey]) {
    for (const [headerName, headerValue] of Object.entries(customAuthHeaders[endpointKey])) {
      headers[headerName] = headerValue
    }
  }

  // Reconstruct auth header from encrypted API key only — plaintext tokens are rejected
  if (auth) {
    if (auth.token === '[ENCRYPTED]' && apiKeyDecrypted) {
      if (auth.type === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKeyDecrypted}`
      } else if (auth.type === 'api_key') {
        headers[auth.header || 'X-API-Key'] = apiKeyDecrypted
      }
    } else if (auth.token && auth.token !== '[ENCRYPTED]') {
      // Reject plaintext tokens — all tokens must be encrypted
      throw new Error('Plaintext API tokens are not allowed — encrypt tokens via the API config UI')
    }
    if (auth.type === 'basic' && auth.username) {
      headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password || ''}`).toString('base64')}`
    }
  }

  // Replace any remaining [ENCRYPTED] header values with the API key as fallback
  for (const [key, value] of Object.entries(headers)) {
    if (value === '[ENCRYPTED]' && apiKeyDecrypted) {
      headers[key] = apiKeyDecrypted
    }
  }

  // ── Build URL with parameters ───────────────────────────────────

  let finalUrl = url
  const parsedUrl = new URL(finalUrl)

  if (urlParameters?.length) {
    for (const param of urlParameters) {
      if (!param.name) continue
      let value = param.defaultValue ?? ''

      // Resolve runtime sources (handle both camelCase and snake_case param names)
      const doctorIdValue = params.doctorId ?? params.doctor_id
      if (param.source === 'doctor_id' && doctorIdValue) {
        value = String(doctorIdValue)
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
  const fallbackDoctorId = params.doctorId ?? params.doctor_id
  if (fallbackDoctorId) {
    finalUrl = finalUrl.replace('{doctorId}', encodeURIComponent(String(fallbackDoctorId)))
  }

  // ── Build request body (for POST/PUT) ───────────────────────────

  const isPostLike = method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT'
  if (isPostLike && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  let body: string | undefined
  if (isPostLike && endpoint.requestBody) {
    const requestBody = endpoint.requestBody as { rawJson?: string }
    if (requestBody.rawJson) {
      try {
        const template = JSON.parse(requestBody.rawJson)
        const injected = injectPatientData(template, params)
        body = JSON.stringify(injected)
      } catch {
        body = requestBody.rawJson
      }
    } else {
      body = '{}'
    }
  }

  return { url: finalUrl, method, headers, body }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDatetime(date: string, time: string, format: string): string {
  const [y, mo, d] = date.split('-')
  const [h, mi, s] = (time || '00:00:00').split(':')
  return format
    .replace('yyyy', y).replace('MM', mo).replace('dd', d)
    .replace('HH', h).replace('mm', mi).replace('ss', s || '00')
}

/**
 * Inject real patient data into the JSON template by matching KEY NAMES
 * to known patient field patterns (firstName, email, mobile, slotId, etc.)
 */
function injectPatientData(
  template: Record<string, unknown>,
  params: Record<string, unknown>,
): Record<string, unknown> {
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

  const result = { ...template }

  for (const [key, value] of Object.entries(result)) {
    for (const [standardKey, aliases] of Object.entries(fieldMap)) {
      if (key === standardKey || aliases.some((a) => a.toLowerCase() === key.toLowerCase())) {
        const realValue = params[standardKey]
        if (realValue !== undefined && realValue !== null && realValue !== '') {
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

  // Clean up placeholder values (e.g. "string", "0") left in the template
  for (const [key, value] of Object.entries(result)) {
    if (value === 'string') {
      result[key] = ''
    }
  }

  return result
}
