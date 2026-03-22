'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isCryptoAvailable } from '@/lib/chatEncryption'
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

    // Single RPC call replaces N+1 queries for unread counts + display names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_enriched_conversations', {
      p_user_id: userId,
      p_user_type: userType,
      p_clinic_id: clinicId ?? null,
    })

    if (error || !data) {
      setIsLoading(false)
      return
    }

    const enriched: ConversationItem[] = data.map((row: {
      id: string
      patient_id: string
      clinic_id: string
      created_at: string | null
      updated_at: string | null
      last_message_at: string | null
      last_message_preview_encrypted: string | null
      is_archived_by_patient: boolean | null
      is_archived_by_clinic: boolean | null
      display_name: string
      avatar_url: string | null
      unread_count: number
    }) => ({
      id: row.id,
      patient_id: row.patient_id,
      clinic_id: row.clinic_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_message_at: row.last_message_at,
      last_message_preview_encrypted: row.last_message_preview_encrypted,
      is_archived_by_patient: row.is_archived_by_patient,
      is_archived_by_clinic: row.is_archived_by_clinic,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      unread_count: Number(row.unread_count),
    }))

    setConversations(enriched)
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

  // Create conversation: targetId is a clinicId (patient side) or patientId (clinic side)
  const createConversation = useCallback(async (targetId: string): Promise<ConversationItem | null> => {
    const supabase = createClient()

    const insertData = userType === 'patient'
      ? { patient_id: userId, clinic_id: targetId }
      : { patient_id: targetId, clinic_id: clinicId }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('chat_conversations')
      .insert(insertData)
      .select()
      .single()
    if (error || !data) return null

    // Generate shared AES key server-side (wraps correctly for both participants)
    if (isCryptoAvailable()) {
      try {
        await fetch('/api/chat/generate-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: data.id }),
        })
      } catch {
        // Non-fatal — useChatMessages will auto-generate keys on first send
      }
    }

    await fetchConversations()
    return {
      ...data,
      display_name: userType === 'patient' ? 'Clinic' : 'Patient',
      avatar_url: null,
      unread_count: 0,
    }
  }, [userId, userType, clinicId, fetchConversations])

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

  // Update local preview for a conversation (called by message hooks)
  const updateLocalPreview = useCallback((conversationId: string, preview: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === conversationId
          ? { ...c, local_preview: preview.length > 50 ? preview.slice(0, 50) + '...' : preview, last_message_at: new Date().toISOString() }
          : c
      )
      // Re-sort by last_message_at (most recent first)
      return updated.sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        return bTime - aTime
      })
    })
  }, [])

  return {
    conversations,
    isLoading,
    createConversation,
    archiveConversation,
    deleteConversation,
    updateLocalPreview,
    refetch: fetchConversations,
  }
}
