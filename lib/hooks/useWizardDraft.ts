'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WizardDraftData {
  id: string
  wizard_data: Record<string, unknown>
  sequential_state: Record<string, unknown> | null
  current_step: number
  integration_type: string
  updated_at: string | null
}

interface UseWizardDraftReturn {
  hasDraft: boolean
  draftData: WizardDraftData | null
  isLoading: boolean
  saveDraft: (data: {
    wizard_data: Record<string, unknown>
    sequential_state?: Record<string, unknown>
    current_step: number
  }) => void
  deleteDraft: () => Promise<void>
}

const DEBOUNCE_MS = 1000

export function useWizardDraft(
  clinicId: string | null,
  integrationType: string = 'custom',
): UseWizardDraftReturn {
  const [draftData, setDraftData] = useState<WizardDraftData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftIdRef = useRef<string | null>(null)

  // Load existing draft on mount
  useEffect(() => {
    if (!clinicId) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any
        const { data } = await supabase
          .from('api_wizard_drafts')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('integration_type', integrationType)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cancelled) return

        if (data) {
          const draft: WizardDraftData = {
            id: data.id,
            wizard_data: (data.wizard_data ?? {}) as Record<string, unknown>,
            sequential_state: data.sequential_state as Record<string, unknown> | null,
            current_step: data.current_step ?? 0,
            integration_type: data.integration_type,
            updated_at: data.updated_at,
          }
          setDraftData(draft)
          draftIdRef.current = data.id
        }
      } catch (err) {
        console.error('[useWizardDraft] Failed to load draft:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clinicId, integrationType])

  // Debounced save
  const saveDraft = useCallback(
    (data: {
      wizard_data: Record<string, unknown>
      sequential_state?: Record<string, unknown>
      current_step: number
    }) => {
      if (!clinicId) return

      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supabase = createClient() as any

          const payload = {
            clinic_id: clinicId,
            integration_type: integrationType,
            wizard_data: data.wizard_data,
            sequential_state: data.sequential_state ?? null,
            current_step: data.current_step,
            updated_at: new Date().toISOString(),
          }

          if (draftIdRef.current) {
            // Update existing draft
            await supabase
              .from('api_wizard_drafts')
              .update(payload)
              .eq('id', draftIdRef.current)
          } else {
            // Insert new draft
            const { data: inserted } = await supabase
              .from('api_wizard_drafts')
              .insert(payload)
              .select('id')
              .single()

            if (inserted) draftIdRef.current = inserted.id
          }
        } catch (err) {
          console.error('[useWizardDraft] Failed to save draft:', err)
        }
      }, DEBOUNCE_MS)
    },
    [clinicId, integrationType],
  )

  // Delete draft
  const deleteDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!draftIdRef.current) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      await supabase.from('api_wizard_drafts').delete().eq('id', draftIdRef.current)
      draftIdRef.current = null
      setDraftData(null)
    } catch (err) {
      console.error('[useWizardDraft] Failed to delete draft:', err)
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return {
    hasDraft: !!draftData,
    draftData,
    isLoading,
    saveDraft,
    deleteDraft,
  }
}
