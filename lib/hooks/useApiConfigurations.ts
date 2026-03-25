'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ApiConfiguration {
  id: string
  clinic_id: string
  config_name: string
  integration_type: string
  environment: string
  auth_method: string
  is_active: boolean
  is_primary: boolean
  auto_sync_enabled: boolean
  sync_schedule: string | null
  last_sync_at: string | null
  last_sync_status: string | null
  last_tested_at: string | null
  test_status: string | null
  endpoint_config: Record<string, unknown> | null
  field_mappings: Record<string, unknown> | null
  booking_response_config: Record<string, unknown> | null
  practice_id: string | null
  timeout_ms: number
  rate_limit_requests: number
  webhook_url: string | null
  created_at: string
  updated_at: string
}

export interface CreateConfigInput {
  clinic_id: string
  config_name: string
  integration_type: string
  environment?: string
  auth_method?: string
  endpoint_config?: Record<string, unknown>
  field_mappings?: Record<string, unknown>
  booking_response_config?: Record<string, unknown>
  practice_id?: string
  apiKey?: string
  [key: string]: unknown
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useApiConfigurations(clinicId: string | null) {
  const queryClient = useQueryClient()

  const queryKey = ['api-configurations', clinicId]

  // All operations go through /api/save-api-config server route
  const invokeApi = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      if (!clinicId) throw new Error('clinicId is required')

      const response = await fetch('/api/save-api-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, clinic_id: clinicId, ...payload }),
      })

      const text = await response.text()
      let data: Record<string, unknown> = {}
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        console.error(`[useApiConfigurations] ${action} non-JSON response (${response.status}):`, text.substring(0, 500))
        throw new Error(`Server returned non-JSON response (${response.status})`)
      }

      if (!response.ok || data.error) {
        console.error(`[useApiConfigurations] ${action} failed (${response.status}):`, data)
        throw new Error((data.error as string) || `Action ${action} failed (HTTP ${response.status})`)
      }

      return data
    },
    [clinicId],
  )

  // ── Fetch all configs ─────────────────────────────────────────────────

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ApiConfiguration[]> => {
      if (!clinicId) return []
      const data = await invokeApi('get_configs')
      return (data?.configs ?? []) as ApiConfiguration[]
    },
    enabled: !!clinicId,
  })

  // ── Create config ─────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (config: CreateConfigInput) => {
      return invokeApi('create_config', { config })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  // ── Update config ─────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      return invokeApi('update_config', { configId: id, updates })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  // ── Delete config ─────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return invokeApi('delete_config', { configId: id })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  // ── Test connection ───────────────────────────────────────────────────

  const testMutation = useMutation({
    mutationFn: async (config: Record<string, unknown>) => {
      return invokeApi('test_connection', { config })
    },
  })

  // ── Set primary ───────────────────────────────────────────────────────

  const setPrimaryMutation = useMutation({
    mutationFn: async (configId: string) => {
      return invokeApi('set_primary', { configId })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    configs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    createConfig: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteConfig: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    testConnection: testMutation.mutateAsync,
    isTesting: testMutation.isPending,

    setPrimary: setPrimaryMutation.mutateAsync,
    isSettingPrimary: setPrimaryMutation.isPending,
  }
}
