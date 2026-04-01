import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExternalApiRequest } from '@/lib/customApi/buildExternalApiRequest'
import { transformResponse } from '@/lib/customApi/transformResponse'
import { validateNotPrivate } from '@/lib/customApi/ssrfProtection'
import { getConfigCached } from '@/lib/customApi/configCache'

// Requires Node.js runtime for dns/promises (SSRF protection)
export const runtime = 'nodejs'

/**
 * Batch slot fetching endpoint.
 *
 * Instead of N separate requests (one per doctor), the client sends a single
 * request with all doctor IDs. This endpoint:
 *
 *   1. Fetches the API config ONCE (with in-memory cache)
 *   2. Validates SSRF ONCE (same external host for all doctors)
 *   3. Fans out external API calls in parallel with no browser connection limit
 *   4. Returns all results in a single response
 *
 * This reduces latency from O(N * config_fetch + N * api_call / 6) to
 * O(1 * config_fetch + max(api_call_1..N)), typically 3-5x faster.
 *
 * Request body:
 *   { configId, clinicId, doctorIds: string[], date: string }
 *
 * Response:
 *   { results: Record<doctorId, { slots: RawSlot[], error?: string }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { configId, clinicId, doctorIds, date } = body as {
      configId: string
      clinicId: string
      doctorIds: string[]
      date: string
    }

    // ── Validation ──────────────────────────────────────────────────
    if (!configId || !clinicId || !date) {
      return NextResponse.json(
        { error: 'configId, clinicId, and date are required' },
        { status: 400 },
      )
    }

    if (!Array.isArray(doctorIds) || doctorIds.length === 0) {
      return NextResponse.json(
        { error: 'doctorIds must be a non-empty array' },
        { status: 400 },
      )
    }

    // Cap batch size to prevent abuse
    const MAX_BATCH_SIZE = 50
    if (doctorIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}` },
        { status: 400 },
      )
    }

    // ── Fetch config ONCE (cached) ──────────────────────────────────
    const supabase = await createClient()
    const config = await getConfigCached(configId, supabase)

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found or inactive' },
        { status: 404 },
      )
    }

    if (config.clinic_id !== clinicId) {
      return NextResponse.json(
        { error: 'Config does not belong to this clinic' },
        { status: 403 },
      )
    }

    const batchStart = Date.now()
    console.log(`[batch-slots] ⏱ Request received: ${doctorIds.length} doctors, date=${date}, configId=${configId.slice(0, 8)}...`)

    // ── SSRF check ONCE (same host for all doctors) ─────────────────
    // Build a test request for the first doctor to extract the hostname
    const testRequest = buildExternalApiRequest(
      config as unknown as Parameters<typeof buildExternalApiRequest>[0],
      'get_appointments',
      { doctorId: doctorIds[0], date },
    )
    const targetUrl = new URL(testRequest.url)
    await validateNotPrivate(targetUrl.hostname)

    // ── Field mappings (resolved once) ──────────────────────────────
    const fieldMappings = config.field_mappings as Record<string, unknown> | null
    const mappings = fieldMappings?.get_appointments as Record<string, Record<string, string>> | null
    const responseMappings = mappings?.response

    // ── Fan out all doctor slot fetches in parallel ──────────────────
    const results: Record<string, { slots: unknown[]; error?: string }> = {}

    const fetchPromises = doctorIds.map(async (doctorId) => {
      try {
        const apiRequest = buildExternalApiRequest(
          config as unknown as Parameters<typeof buildExternalApiRequest>[0],
          'get_appointments',
          { doctorId, date },
        )

        const fetchOptions: RequestInit = {
          method: apiRequest.method,
          headers: apiRequest.headers,
          signal: AbortSignal.timeout(15_000), // 15s per doctor (tighter than single endpoint)
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
          results[doctorId] = {
            slots: [],
            error: `External API returned ${response.status}`,
          }
          return
        }

        // Transform response if mappings exist
        let finalData = responseData
        if (responseMappings && responseData && typeof responseData === 'object') {
          finalData = transformResponse(responseData as Record<string, unknown>, responseMappings)
        }

        // Normalize to array
        const slots = extractSlotArray(finalData)
        results[doctorId] = { slots }
      } catch (err) {
        results[doctorId] = {
          slots: [],
          error: err instanceof Error ? err.message : 'Fetch failed',
        }
      }
    })

    await Promise.allSettled(fetchPromises)

    const totalMs = Date.now() - batchStart
    const successCount = Object.values(results).filter((r) => !r.error).length
    const totalSlotCount = Object.values(results).reduce((sum, r) => sum + r.slots.length, 0)
    console.log(`[batch-slots] ✅ Done in ${totalMs}ms: ${successCount}/${doctorIds.length} doctors succeeded, ${totalSlotCount} total slots`)

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[batch-slots] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * Extract the slot array from various response shapes.
 * Handles: direct arrays, { data: [...] }, { slots: [...] }, { appointments: [...] }
 */
function extractSlotArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['slots', 'appointments', 'data', 'results', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[]
    }
    // One level deeper: data.data, data.slots, etc.
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      const nested = obj.data as Record<string, unknown>
      for (const key of ['slots', 'appointments', 'data', 'results', 'items']) {
        if (Array.isArray(nested[key])) return nested[key] as unknown[]
      }
    }
  }

  return []
}
