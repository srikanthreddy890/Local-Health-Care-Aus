'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

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

  // All operations go through manage-api-credentials edge function
  const invokeCredentials = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      if (!clinicId) throw new Error('clinicId is required')
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('manage-api-credentials', {
        body: { action, clinicId, ...payload },
      })
      if (error) throw new Error(error.message ?? `Action ${action} failed`)
      return data
    },
    [clinicId],
  )

  // ── Fetch all configs ─────────────────────────────────────────────────

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ApiConfiguration[]> => {
      if (!clinicId) return []
      const data = await invokeCredentials('get_configs')
      // Edge function may return { configs: [...] }, a direct array, or another shape
      const obj = data as Record<string, unknown> | unknown[] | null
      if (Array.isArray(obj)) return obj as ApiConfiguration[]
      if (obj && typeof obj === 'object' && Array.isArray((obj as Record<string, unknown>).configs)) {
        return (obj as Record<string, unknown>).configs as ApiConfiguration[]
      }
      return []
    },
    enabled: !!clinicId,
  })

  // ── Create config ─────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (config: CreateConfigInput) => {
      return invokeCredentials('create_config', { config })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  // ── Update config ─────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      return invokeCredentials('update_config', { configId: id, updates })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  // ── Delete config ─────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return invokeCredentials('delete_config', { configId: id })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  // ── Test connection ───────────────────────────────────────────────────

  const testMutation = useMutation({
    mutationFn: async (config: Record<string, unknown>) => {
      return invokeCredentials('test_connection', { config })
    },
  })

  // ── Set primary ───────────────────────────────────────────────────────

  const setPrimaryMutation = useMutation({
    mutationFn: async (configId: string) => {
      return invokeCredentials('set_primary', { configId })
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
