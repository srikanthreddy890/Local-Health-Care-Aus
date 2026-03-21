'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TypingUser } from './types'

interface UseChatTypingOptions {
  conversationId: string
  currentUserId: string
  currentUserName: string
}

export function useChatTyping({
  conversationId,
  currentUserId,
  currentUserName,
}: UseChatTypingOptions) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const others: TypingUser[] = Object.values(state)
        .flat()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((p: any) => p.userId !== currentUserId && p.typing === true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => ({ userId: p.userId, userName: p.userName }))
      setTypingUsers(others)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, currentUserName])

  const stopTyping = useCallback(() => {
    if (!channelRef.current) return
    channelRef.current.track({
      userId: currentUserId,
      userName: currentUserName,
      typing: false,
    })
  }, [currentUserId, currentUserName])

  const startTyping = useCallback(() => {
    if (!channelRef.current) return
    channelRef.current.track({
      userId: currentUserId,
      userName: currentUserName,
      typing: true,
    })
    // Auto-stop after 3s
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(stopTyping, 3000)
  }, [currentUserId, currentUserName, stopTyping])

  return { typingUsers, startTyping, stopTyping }
}
