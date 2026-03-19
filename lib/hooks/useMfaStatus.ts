'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MfaFactor {
  id: string
  friendly_name?: string
  factor_type: string
  status: string
  created_at: string
  updated_at: string
}

interface UseMfaStatusReturn {
  isEnrolled: boolean
  factors: MfaFactor[]
  currentLevel: string | null
  nextLevel: string | null
  loading: boolean
  refetch: () => Promise<void>
}

export function useMfaStatus(): UseMfaStatusReturn {
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [currentLevel, setCurrentLevel] = useState<string | null>(null)
  const [nextLevel, setNextLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data: factorsData }, { data: aalData }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])

      const verifiedTotp = (factorsData?.totp ?? []).filter(
        (f) => f.status === 'verified'
      )
      setIsEnrolled(verifiedTotp.length > 0)
      setFactors(verifiedTotp as MfaFactor[])
      setCurrentLevel(aalData?.currentLevel ?? null)
      setNextLevel(aalData?.nextLevel ?? null)
    } catch {
      // silently fail — UI will show not-enrolled state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return { isEnrolled, factors, currentLevel, nextLevel, loading, refetch: fetchStatus }
}
