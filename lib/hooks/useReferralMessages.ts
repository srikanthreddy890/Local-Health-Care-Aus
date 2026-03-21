'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export const MAX_MESSAGE_LENGTH = 5000

export interface ReferralMessage {
  id: string
  referral_id: string
  sender_clinic_id: string
  sender_clinic_name: string
  content: string
  created_at: string
}

export function useReferralMessages(referralId: string | null) {
  const [messages, setMessages] = useState<ReferralMessage[]>([])
  const [isLoading, setIsLoading] = useState(!!referralId)
  const [isSending, setIsSending] = useState(false)
  const [authClinicId, setAuthClinicId] = useState<string | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // Resolve auth clinic ID on mount
  useEffect(() => {
    let cancelled = false
    async function resolveClinic() {
      setIsAuthLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return

        // Check clinic_users first (staff), then clinics (owner)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: staffRow } = await (supabase as any)
          .from('clinic_users')
          .select('clinic_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (staffRow?.clinic_id && !cancelled) {
          setAuthClinicId(staffRow.clinic_id)
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: ownerRow } = await (supabase as any)
          .from('clinics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (ownerRow?.id && !cancelled) {
          setAuthClinicId(ownerRow.id)
        }
      } catch {
        // Silent — auth resolution failure is handled by isAuthLoading guard
      } finally {
        if (!cancelled) setIsAuthLoading(false)
      }
    }
    resolveClinic()
    return () => { cancelled = true }
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!referralId) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('referral_messages')
        .select('*, sender_clinic:sender_clinic_id(name)')
        .eq('referral_id', referralId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setMessages(
        (data ?? []).map((m: Record<string, unknown>) => ({
          id: m.id,
          referral_id: m.referral_id,
          sender_clinic_id: m.sender_clinic_id,
          sender_clinic_name: (m.sender_clinic as Record<string, unknown>)?.name ?? 'Unknown',
          content: m.content,
          created_at: m.created_at,
        }))
      )
    } catch {
      toast({ title: 'Error', description: 'Could not load messages.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [referralId])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Realtime subscription
  useEffect(() => {
    if (!referralId) return
    const supabase = createClient()
    const channelName = `referral-messages-${referralId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_messages',
          filter: `referral_id=eq.${referralId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          const newRow = payload.new
          // Fetch the full row with JOIN to get sender name
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase as any)
            .from('referral_messages')
            .select('*, sender_clinic:sender_clinic_id(name)')
            .eq('id', newRow.id)
            .single()
          if (data) {
            const mapped: ReferralMessage = {
              id: data.id,
              referral_id: data.referral_id,
              sender_clinic_id: data.sender_clinic_id,
              sender_clinic_name: data.sender_clinic?.name ?? 'Unknown',
              content: data.content,
              created_at: data.created_at,
            }
            setMessages(prev =>
              prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]
            )
          }
        }
      )
      .subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [referralId])

  const sendMessage = useCallback(async (content: string) => {
    if (!authClinicId || !referralId || !content.trim()) return
    if (content.length > MAX_MESSAGE_LENGTH) {
      toast({ title: 'Message too long', description: `Maximum ${MAX_MESSAGE_LENGTH} characters.`, variant: 'destructive' })
      return
    }
    setIsSending(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('referral_messages')
        .insert({
          referral_id: referralId,
          sender_clinic_id: authClinicId,
          content: content.trim(),
        })
        .select('*, sender_clinic:sender_clinic_id(name)')
        .single()
      if (error) throw error
      if (data) {
        const mapped: ReferralMessage = {
          id: data.id,
          referral_id: data.referral_id,
          sender_clinic_id: data.sender_clinic_id,
          sender_clinic_name: data.sender_clinic?.name ?? 'Unknown',
          content: data.content,
          created_at: data.created_at,
        }
        setMessages(prev =>
          prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]
        )
      }
    } catch {
      toast({ title: 'Error', description: 'Could not send message.', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }, [authClinicId, referralId])

  return { messages, isLoading, isSending, authClinicId, isAuthLoading, sendMessage }
}
