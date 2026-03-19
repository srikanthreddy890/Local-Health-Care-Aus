'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface UserPreferencesData {
  user_id: string
  notification_appointment_reminders: boolean
  notification_availability_alerts: boolean
  notification_promotional_emails: boolean
  notification_sms: boolean
  notification_loyalty_updates: boolean
  privacy_share_data_with_clinics: boolean
  privacy_allow_marketing: boolean
  privacy_profile_visibility: string
  communication_preferred_language: string
  communication_method: string
  updated_at: string
}

const DEFAULTS: Omit<UserPreferencesData, 'user_id' | 'updated_at'> = {
  notification_appointment_reminders: true,
  notification_availability_alerts: true,
  notification_promotional_emails: false,
  notification_sms: true,
  notification_loyalty_updates: true,
  privacy_share_data_with_clinics: true,
  privacy_allow_marketing: false,
  privacy_profile_visibility: 'private',
  communication_preferred_language: 'English',
  communication_method: 'Email',
}

export function useUserPreferences(userId: string | null) {
  const [prefs, setPrefs] = useState<UserPreferencesData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPreferences = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      setPrefs(data ?? null)
    } catch {
      // silently fail — component will use defaults
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchPreferences() }, [fetchPreferences])

  async function savePreferences(updates: Omit<UserPreferencesData, 'user_id' | 'updated_at'>): Promise<boolean> {
    if (!userId) return false
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('user_preferences')
      .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
      toast({ title: 'Error', description: 'Could not save preferences.', variant: 'destructive' })
      return false
    }
    await fetchPreferences()
    return true
  }

  // Merge DB data with defaults — so callers always get a full object
  const effective: Omit<UserPreferencesData, 'user_id' | 'updated_at'> = {
    ...DEFAULTS,
    ...(prefs ? {
      notification_appointment_reminders: prefs.notification_appointment_reminders,
      notification_availability_alerts: prefs.notification_availability_alerts,
      notification_promotional_emails: prefs.notification_promotional_emails,
      notification_sms: prefs.notification_sms,
      notification_loyalty_updates: prefs.notification_loyalty_updates,
      privacy_share_data_with_clinics: prefs.privacy_share_data_with_clinics,
      privacy_allow_marketing: prefs.privacy_allow_marketing,
      privacy_profile_visibility: prefs.privacy_profile_visibility,
      communication_preferred_language: prefs.communication_preferred_language,
      communication_method: prefs.communication_method,
    } : {}),
  }

  return { prefs: effective, loading, savePreferences, refetch: fetchPreferences }
}
