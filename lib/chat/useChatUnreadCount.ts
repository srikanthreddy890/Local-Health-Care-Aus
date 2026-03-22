'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useChatUnreadCount(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCount = useCallback(async () => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_unread_chat_count', {
        p_user_id: userId,
      })
      if (!error && typeof data === 'number') {
        setUnreadCount(data)
      }
    } catch {
      // Silently handle — badge just shows 0
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  useEffect(() => {
    const supabase = createClient()
    const channelName = `unread-count-${userId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'chat_messages' }, fetchCount)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, fetchCount)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchCount])

  return { unreadCount, isLoading }
}
