'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConversationItem, UserType } from './types'

interface UseChatConversationsOptions {
  userType: UserType
  userId: string
  clinicId?: string
}

export function useChatConversations({
  userType,
  userId,
  clinicId,
}: UseChatConversationsOptions) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    const supabase = createClient()

    if (userType === 'patient') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: convs } = await (supabase as any)
        .from('chat_conversations')
        .select('id, patient_id, clinic_id, created_at, updated_at, last_message_at, last_message_preview_encrypted, is_archived_by_patient, is_archived_by_clinic')
        .eq('patient_id', userId)
        .not('is_archived_by_patient', 'is', true)
        .order('last_message_at', { ascending: false })

      if (!convs) { setIsLoading(false); return }

      const clinicIds = [...new Set(convs.map((c: { clinic_id: string }) => c.clinic_id))]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clinicsData } = await (supabase as any)
        .from('clinics_public')
        .select('id, name, logo_url')
        .in('id', clinicIds)

      const clinicMap: Record<string, { name: string; logo_url: string | null }> = {}
      if (clinicsData) {
        for (const c of clinicsData) clinicMap[c.id] = { name: c.name, logo_url: c.logo_url }
      }

      const enriched: ConversationItem[] = await Promise.all(
        convs.map(async (conv: { id: string; patient_id: string; clinic_id: string; created_at: string | null; updated_at: string | null; last_message_at: string | null; last_message_preview_encrypted: string | null; is_archived_by_patient: boolean | null; is_archived_by_clinic: boolean | null }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { count } = await (supabase as any)
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', userId)
          return {
            ...conv,
            display_name: clinicMap[conv.clinic_id]?.name ?? 'Clinic',
            avatar_url: clinicMap[conv.clinic_id]?.logo_url ?? null,
            unread_count: count ?? 0,
          }
        })
      )
      setConversations(enriched)
    } else {
      // Clinic side
      if (!clinicId) { setIsLoading(false); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: convs } = await (supabase as any)
        .from('chat_conversations')
        .select('id, patient_id, clinic_id, created_at, updated_at, last_message_at, last_message_preview_encrypted, is_archived_by_patient, is_archived_by_clinic')
        .eq('clinic_id', clinicId)
        .not('is_archived_by_clinic', 'is', true)
        .order('last_message_at', { ascending: false })

      if (!convs) { setIsLoading(false); return }

      const enriched: ConversationItem[] = await Promise.all(
        convs.map(async (conv: { id: string; patient_id: string; clinic_id: string; created_at: string | null; updated_at: string | null; last_message_at: string | null; last_message_preview_encrypted: string | null; is_archived_by_patient: boolean | null; is_archived_by_clinic: boolean | null }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: patientInfo } = await (supabase as any)
            .rpc('get_clinic_patient_info', { p_patient_id: conv.patient_id })
          const info = patientInfo?.[0]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { count } = await (supabase as any)
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .eq('sender_type', 'patient')
          return {
            ...conv,
            display_name: info
              ? [info.first_name, info.last_name].filter(Boolean).join(' ') || 'Patient'
              : 'Patient',
            avatar_url: null,
            unread_count: count ?? 0,
          }
        })
      )
      setConversations(enriched)
    }

    setIsLoading(false)
  }, [userType, userId, clinicId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Realtime: refetch on any conversation change
  useEffect(() => {
    const supabase = createClient()
    const channelName = `conversations-${userType}-${userId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'chat_conversations' }, fetchConversations)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userType, userId, fetchConversations])

  const createConversation = useCallback(async (targetClinicId: string): Promise<ConversationItem | null> => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('chat_conversations')
      .insert({ patient_id: userId, clinic_id: targetClinicId })
      .select()
      .single()
    if (error || !data) return null
    await fetchConversations()
    return {
      ...data,
      display_name: 'Clinic',
      avatar_url: null,
      unread_count: 0,
    }
  }, [userId, fetchConversations])

  const archiveConversation = useCallback(async (conversationId: string) => {
    const supabase = createClient()
    const field = userType === 'patient' ? 'is_archived_by_patient' : 'is_archived_by_clinic'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('chat_conversations')
      .update({ [field]: true })
      .eq('id', conversationId)
    await fetchConversations()
  }, [userType, fetchConversations])

  const deleteConversation = useCallback(async (conversationId: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('delete_conversation_completely', {
      p_conversation_id: conversationId,
    })
    await fetchConversations()
  }, [fetchConversations])

  return {
    conversations,
    isLoading,
    createConversation,
    archiveConversation,
    deleteConversation,
    refetch: fetchConversations,
  }
}
