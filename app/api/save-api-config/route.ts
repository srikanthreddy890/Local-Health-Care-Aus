import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side API route for saving custom API configurations.
 * Handles insert/update to api_configurations table directly,
 * bypassing the manage-api-credentials edge function.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    console.log('[save-api-config] Received:', { action: body.action, clinic_id: body.clinic_id, configId: body.configId, hasUpdates: !!body.updates, hasConfig: !!body.config })
    const { action, clinic_id, config, configId, updates } = body as {
      action: string
      clinic_id: string
      config?: Record<string, unknown>
      configId?: string
      updates?: Record<string, unknown>
    }

    if (!clinic_id) {
      return NextResponse.json({ error: 'clinic_id is required' }, { status: 400 })
    }

    // Verify clinic ownership
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, user_id')
      .eq('id', clinic_id)
      .single()

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    // Check ownership or staff membership
    if (clinic.user_id !== user.id) {
      const { data: staffMember } = await supabase
        .from('clinic_users')
        .select('id')
        .eq('clinic_id', clinic_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!staffMember) {
        return NextResponse.json({ error: 'Not authorized for this clinic' }, { status: 403 })
      }
    }

    // ── CREATE CONFIG ──────────────────────────────────────────────────
    if (action === 'create_config' && config) {
      // Clean endpoint_config: strip headerEntries, keep only headers Record
      const endpointConfig = cleanEndpointConfig(config.endpoint_config as Record<string, unknown> | undefined)

      // Extract API key from auth tokens for separate secure storage
      const apiKey = extractApiKey(config, endpointConfig)

      const insertPayload = {
        clinic_id,
        config_name: config.config_name || 'Custom API',
        integration_type: config.integration_type || 'custom',
        environment: config.environment || 'production',
        auth_method: config.auth_method || 'custom',
        practice_id: config.practice_id || '',
        endpoint_config: endpointConfig,
        field_mappings: config.field_mappings || {},
        booking_response_config: config.booking_response_config || {},
        custom_auth_headers: config.custom_auth_headers || null,
        api_key_encrypted: apiKey || null,
        is_active: true,
        is_primary: false,
        timeout_ms: 30000,
        rate_limit_requests: 100,
        created_by: user.id,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('api_configurations')
        .insert(insertPayload)
        .select('id')
        .single()

      if (error) {
        console.error('[save-api-config] Insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Check if this is the first config for this clinic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from('api_configurations')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinic_id)

      const isFirstConfig = (count ?? 0) <= 1

      // If first config, set as primary
      if (isFirstConfig) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('api_configurations')
          .update({ is_primary: true })
          .eq('id', data.id)
      }

      // Always update clinic's custom_api_config_id to point to the primary config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('clinics')
        .update({
          custom_api_config_id: data.id,
          custom_api_enabled: true,
        })
        .eq('id', clinic_id)

      return NextResponse.json({ success: true, id: data.id })
    }

    // ── GET CONFIGS ────────────────────────────────────────────────────
    if (action === 'get_configs') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('api_configurations_safe')
        .select('*')
        .eq('clinic_id', clinic_id)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ configs: data ?? [] })
    }

    // ── UPDATE CONFIG ──────────────────────────────────────────────────
    if (action === 'update_config' && configId) {
      const updatePayload = {
        ...(updates ?? {}),
        updated_at: new Date().toISOString(),
      }
      console.log('[save-api-config] Updating config:', configId, 'with:', Object.keys(updatePayload))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('api_configurations')
        .update(updatePayload)
        .eq('id', configId)
        .eq('clinic_id', clinic_id)

      if (error) {
        console.error('[save-api-config] Update error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }

    // ── DELETE CONFIG ──────────────────────────────────────────────────
    if (action === 'delete_config' && configId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('api_configurations')
        .delete()
        .eq('id', configId)
        .eq('clinic_id', clinic_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }

    // ── SET PRIMARY ────────────────────────────────────────────────────
    if (action === 'set_primary' && configId) {
      // Unset all other primary configs for this clinic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('api_configurations')
        .update({ is_primary: false })
        .eq('clinic_id', clinic_id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('api_configurations')
        .update({ is_primary: true })
        .eq('id', configId)
        .eq('clinic_id', clinic_id)

      // Update clinic's custom_api_config_id and ensure custom_api_enabled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('clinics')
        .update({ custom_api_config_id: configId, custom_api_enabled: true })
        .eq('id', clinic_id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[save-api-config] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Clean endpoint_config: remove headerEntries (frontend-only), keep headers Record */
function cleanEndpointConfig(endpointConfig: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!endpointConfig) return {}

  const cleaned: Record<string, unknown> = {}
  for (const [key, endpoint] of Object.entries(endpointConfig)) {
    if (!endpoint || typeof endpoint !== 'object') {
      cleaned[key] = endpoint
      continue
    }

    const ep = { ...(endpoint as Record<string, unknown>) }

    // Strip headerEntries (frontend-only field), keep headers Record
    if ('headerEntries' in ep) {
      delete ep.headerEntries
    }

    // Strip auth.token and auth.password — these should be encrypted separately
    if (ep.auth && typeof ep.auth === 'object') {
      const auth = { ...(ep.auth as Record<string, unknown>) }
      if (auth.token && auth.token !== '[ENCRYPTED]') {
        auth.token = '[ENCRYPTED]'
      }
      if (auth.password && auth.password !== '[ENCRYPTED]') {
        auth.password = '[ENCRYPTED]'
      }
      ep.auth = auth
    }

    cleaned[key] = ep
  }

  return cleaned
}

/** Extract API key from config for separate encrypted storage */
function extractApiKey(
  config: Record<string, unknown>,
  endpointConfig: Record<string, unknown>
): string | null {
  // Check explicit apiKey field
  if (config.apiKey && typeof config.apiKey === 'string' && config.apiKey !== '[ENCRYPTED]') {
    return config.apiKey
  }

  // Check auth.token from any endpoint
  for (const endpoint of Object.values(endpointConfig)) {
    if (!endpoint || typeof endpoint !== 'object') continue
    const ep = endpoint as Record<string, unknown>
    const auth = ep.auth as Record<string, unknown> | undefined
    if (auth?.token && typeof auth.token === 'string' && auth.token !== '[ENCRYPTED]') {
      return auth.token as string
    }
  }

  return null
}
